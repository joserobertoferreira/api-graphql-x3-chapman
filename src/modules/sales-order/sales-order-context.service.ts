import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Company, Prisma } from '@prisma/client';
import { createSelectScalars } from '../../common/helpers/scalar-select-fields.helper';
import { AccountService } from '../../common/services/account.service';
import { CommonService } from '../../common/services/common.service';
import { Ledgers } from '../../common/types/common.types';
import { isDateInRange } from '../../common/utils/date.utils';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyService } from '../companies/company.service';
import { CustomerService } from '../customers/customer.service';
import { CreateSalesOrderInput, SalesOrderLineInput } from './dto/create-sales-order.input';

export interface ValidatedSalesOrderContext {
  customer: Prisma.CustomerGetPayload<{ include: { addresses: true; businessPartner: true } }>;
  site: Prisma.SiteGetPayload<{ include: { company: true } }>;
  ledgers: Ledgers;
}

@Injectable()
export class SalesOrderContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerService: CustomerService,
    private readonly companyService: CompanyService,
    private readonly commonService: CommonService,
    private readonly accountService: AccountService,
  ) {}

  /**
   * Busca e valida os dados de cabeçalho para a criação de uma encomenda.
   * @param input - O DTO da API.
   * @returns Um objeto de contexto com os dados validados.
   */
  async buildHeaderContext(input: CreateSalesOrderInput): Promise<ValidatedSalesOrderContext> {
    const customerReturn = await this.customerService.findOne(input.soldToCustomer);

    const customer = customerReturn.raw as Prisma.CustomerGetPayload<{
      include: { addresses: true; businessPartner: true };
    }>;

    const site = await this.companyService.getSiteByCode(input.salesSite, { company: true });
    if (!site || !site.company) {
      throw new NotFoundException(`Sales site "${input.salesSite}" or its associated company not found.`);
    }

    const ledgers = await this.accountService.getLedgers(site.company.accountingModel);
    if (!ledgers) {
      throw new NotFoundException(`No ledgers found for company associated with site "${input.salesSite}".`);
    }

    // Check if tax rules is valid.
    if (input.taxRule !== undefined) {
      if (input.taxRule === null || input.taxRule.trim() === '') {
        throw new BadRequestException('Tax rule cannot be null or an empty string.');
      }

      // Verify if tax rule exists for the legislation of the site
      const taxRule = await this.commonService.taxCodeExists(input.taxRule, site.legislation);
      if (!taxRule) {
        throw new NotFoundException(`Tax rule "${input.taxRule}" not found for legislation "${site.legislation}".`);
      }
    }

    // Valida os produtos informados nas linhas da encomenda
    await this.validateProducts(input.lines, site.legislation);

    // Valida as dimensões informadas no payload da encomenda
    await this.validateDimensions(input.lines, site.company, 'APP', input.orderDate, input.soldToCustomer);

    return {
      customer,
      site,
      ledgers,
    };
  }

  /**
   * Check if the products informed in the order lines exist in the database.
   * @param lines - order lines to validate.
   * @param legislation - Legislation to check the tax level.
   * @returns void if all products exist.
   * @throws NotFoundException if one or more products do not exist.
   */
  private async validateProducts(lines: SalesOrderLineInput[], legislation: string): Promise<void> {
    if (!lines || lines.length === 0) return;

    // Extract unique product codes from the lines
    const productsToValidate = [...new Set(lines.map((line) => line.product))];

    const existingProducts = await this.prisma.products.findMany({
      where: {
        code: { in: productsToValidate },
      },
      select: {
        code: true,
      },
    });

    // Check if the number of products found matches the number of unique products to validate.
    if (existingProducts.length !== productsToValidate.length) {
      // If not, it means one or more products were not found. Create a set of found product codes for quick lookup
      const foundProductCodes = new Set(existingProducts.map((p) => p.code));
      const missingProducts = productsToValidate.filter((code) => !foundProductCodes.has(code));

      throw new NotFoundException(`The following products do not exist: ${missingProducts.join(', ')}.`);
    }

    // Check if the tax level is valid for each product
    for (const line of lines) {
      const product = existingProducts.find((p) => p.code === line.product);
      if (!product) {
        // This should not happen as we already checked for missing products, but just in case
        throw new NotFoundException(`Product "${line.product}" not found.`);
      }

      if (line.taxLevelCode !== undefined) {
        if (line.taxLevelCode === null || line.taxLevelCode.trim() === '') {
          throw new BadRequestException('Tax level cannot be null or an empty string.');
        }

        const taxLevelExists = await this.commonService.productTaxRuleExists(line.taxLevelCode, legislation);
        if (!taxLevelExists) {
          throw new NotFoundException(`Tax level "${line.taxLevelCode}" not found for product "${product.code}".`);
        }
      }

      if (line.grossPrice !== undefined) {
        if (line.grossPrice === null || line.grossPrice < 0) {
          throw new BadRequestException('Gross price cannot be null or negative.');
        }
      }
    }
  }

  /**
   * Validate order lines dimensions.
   * @param lines - order lines to validate.
   * @param company - Company entity.
   * @param orderTransaction - Transaction code for the order.
   * @param orderDate - Order date to check dimension validity.
   * @param soldToCustomer - Sold-to customer code to validate fixture dimension.
   * @returns - void if all dimensions are valid.
   * @throws BadRequestException if any dimension is invalid.
   */
  private async validateDimensions(
    lines: SalesOrderLineInput[],
    company: Company,
    orderTransaction: string,
    orderDate: Date = new Date(),
    soldToCustomer: string,
  ): Promise<void> {
    if (!lines || lines.length === 0) return;

    // Check for duplicate dimension types within each line
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const lineDimensions = line.dimensions ?? [];

      const seenDimensionTypes = new Set<string>();
      for (const dimension of lineDimensions) {
        if (seenDimensionTypes.has(dimension.typeCode)) {
          throw new BadRequestException(
            `Line ${lineNumber}: Duplicate dimension type provided: "${dimension.typeCode}". ` +
              `Each dimension type can only be specified once per line.`,
          );
        }
        seenDimensionTypes.add(dimension.typeCode);
      }
    });

    // Fetch mandatory dimensions from the company
    const mandatoryDimensions = new Map<string, number>();
    for (let i = 1; i <= 20; i++) {
      if (company[`isMandatoryDimension${i}`] === 2) {
        const typeCode = company[`dimensionType${i}`];
        if (typeCode) {
          mandatoryDimensions.set(typeCode as string, i);
        }
      }
    }

    // Fetch dimensions for the sales order transaction
    const transactionDimensions = await this.commonService.getAnalyticalTransactionData({
      tableAbbreviation: 'SLT',
      transaction: orderTransaction,
    });
    if (!transactionDimensions || transactionDimensions.length === 0) {
      const allProvidedDimensions = lines.flatMap((line) => line.dimensions ?? []);
      if (allProvidedDimensions.length > 0) {
        throw new BadRequestException(
          `No dimensions are applicable for order transaction "${orderTransaction}", but some were provided.`,
        );
      }
    }

    const allowedDimensions = new Set(transactionDimensions?.map((td) => td.dimensionType) ?? []);

    for (const [index, line] of lines.entries()) {
      const lineNumber = index + 1;

      // Create a map of the dimensions provided in the line
      const providedDimensions = new Map(line.dimensions?.map((d) => [d.typeCode, d.value]) ?? []);

      // Check if mandatory dimensions are present
      const missingMandatory: string[] = [];

      for (const [mandatoryType] of mandatoryDimensions.entries()) {
        if (mandatoryType === 'PDT') {
          // PDT dimension is system generated and should not be provided by the user
          continue;
        }

        // Dimension is mandatory and allowed for the transaction
        if (allowedDimensions.has(mandatoryType)) {
          // Was it provided in the line?
          if (!providedDimensions.has(mandatoryType)) {
            missingMandatory.push(mandatoryType);
          }
        }
      }

      if (missingMandatory.length > 0) {
        throw new BadRequestException(
          `Line ${lineNumber}: Missing required dimensions: ${missingMandatory.join(', ')}.`,
        );
      }

      // Check if provided dimensions are valid
      const invalidDimensions: string[] = [];

      for (const [providedType] of providedDimensions.entries()) {
        // The provided dimension is not allowed for the transaction
        if (!allowedDimensions.has(providedType)) {
          invalidDimensions.push(providedType);
        }
      }

      if (invalidDimensions.length > 0) {
        throw new BadRequestException(
          `Line ${lineNumber}: Invalid dimensions provided for this transaction: ${invalidDimensions.join(', ')}.`,
        );
      }

      // Add valid dimensions to the payload
      if (line.dimensions && line.dimensions.length > 0) {
        for (const dim of line.dimensions) {
          const dimensionToValidate = [{ dimensionType: dim.typeCode, dimension: dim.value }];

          // Check if dimension values exist
          const dimensionsData = await this.validateDimensionValuesExist(dimensionToValidate);

          if (dim.typeCode === 'FIX' && dimensionsData[0].fixtureCustomer.trim() !== '') {
            // If the dimension is fixture, check if the fixture customer is valid
            if (dimensionsData[0].fixtureCustomer !== soldToCustomer) {
              throw new BadRequestException(
                `Line ${lineNumber}: Fixture dimension value "${dim.value}" is associated with customer ` +
                  `"${dimensionsData[0].fixtureCustomer}", which does not match the sold-to customer ` +
                  `"${soldToCustomer}".`,
              );
            }
          }

          if (!isDateInRange(orderDate, dimensionsData[0].validityStartDate, dimensionsData[0].validityEndDate)) {
            throw new BadRequestException(`${dim.typeCode} dimension ${dim.value} is out of date.`);
          }
        }
      }

      // Special handling for PDT dimension
      if (mandatoryDimensions.has('PDT')) {
        // Prepare PDT dimension to validate
        const pdtDimensionToValidate = [{ dimensionType: 'PDT', dimension: line.product }];

        // Check if PDT dimension value exists (it should not exist as it's system generated)
        const existingPDT = await this.validateDimensionValuesExist(pdtDimensionToValidate, { dimension: true });
      }
    }
  }

  /**
   * Validate if dimension values exist in the database.
   * @param pairs a list of dimension type and value pairs to validate.
   * @param select (Optional) fields to return from the found dimension values.
   * @returns an array of found dimension values with the selected fields.
   * @throws BadRequestException if one or more dimension values do not exist.
   */
  private async validateDimensionValuesExist(
    pairs: { dimensionType: string; dimension: string }[],
    select?: Prisma.DimensionsSelectScalar,
  ): Promise<any[]> {
    let selectFields: Prisma.DimensionsSelectScalar;

    if (select) {
      // Select passed by parameter
      selectFields = { ...select, dimensionType: true, dimension: true };
    } else {
      // Define a regular expression to exclude array fields from the selection
      // \d+ matches any field that ends with a number (e.g., dimension1, dimensionType2, etc.)
      const exclusionRegex = /^(otherDimension|defaultDimension|nonFinancialUnit|quantity)\d+$/;

      // Call the helper to get all scalar fields of the Dimensions model and exclude the array fields
      selectFields = createSelectScalars('Dimensions', {
        exclude: [
          exclusionRegex,
          'exportNumber',
          'updateDate',
          'createDate',
          'updateTime',
          'createTime',
          'updateUser',
          'createUser',
          'createDatetime',
          'updateDatetime',
          'singleID',
          'UPDTICK_0',
          'ROWID',
        ],
      });
    }

    const existingValues = await this.prisma.dimensions.findMany({
      where: { OR: pairs },
      select: selectFields,
    });

    const foundValues = new Set(existingValues.map((v) => `${v.dimensionType}:${v.dimension}`));
    const nonExistentValues = pairs.filter((p) => !foundValues.has(`${p.dimensionType}:${p.dimension}`));

    if (nonExistentValues.length > 0) {
      const errorMsg = nonExistentValues.map((p) => `value '${p.dimension}' for type '${p.dimensionType}'`).join('; ');
      throw new BadRequestException(`The following dimension values do not exist: ${errorMsg}.`);
    }

    return existingValues;
  }
}
