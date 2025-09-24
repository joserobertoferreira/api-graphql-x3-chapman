import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createSelectScalars } from '../../common/helpers/scalar-select-fields.helper';
import { AccountService } from '../../common/services/account.service';
import { CommonService } from '../../common/services/common.service';
import { CurrencyService } from '../../common/services/currency.service';
import { Ledgers } from '../../common/types/common.types';
import { SiteTypes } from '../../common/types/site.types';
import { isDateInRange } from '../../common/utils/date.utils';
import { LocalMenus } from '../../common/utils/enums/local-menu';
import { PrismaService } from '../../prisma/prisma.service';
import { CompanyService } from '../companies/company.service';
import { CustomerService } from '../customers/customer.service';
import { SiteService } from '../sites/site.service';
import { CreateSalesOrderInput, SalesOrderLineInput } from './dto/create-sales-order.input';

export interface ValidatedSalesOrderContext {
  customer: Prisma.CustomerGetPayload<{ include: { addresses: true; businessPartner: true } }>;
  site: Prisma.SiteGetPayload<{ include: { company: true } }>;
  ledgers: Ledgers;
  salesOrderType: Prisma.SalesOrderTypeGetPayload<{}>;
}

@Injectable()
export class SalesOrderContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerService: CustomerService,
    private readonly companyService: CompanyService,
    private readonly commonService: CommonService,
    private readonly accountService: AccountService,
    private readonly siteService: SiteService,
    private readonly currencyService: CurrencyService,
  ) {}

  /**
   * Fetches and validates header data for creating a sales order.
   * @param input - The API DTO.
   * @returns A context object with validated data.
   */
  async buildHeaderContext(input: CreateSalesOrderInput): Promise<ValidatedSalesOrderContext> {
    // Check if sales order type provided is valid
    if (input.salesOrderType !== undefined) {
      if (input.salesOrderType === null || input.salesOrderType.trim() === '') {
        throw new BadRequestException('Sales order type cannot be null or an empty string.');
      }
    } else {
      input.salesOrderType = 'SOI'; // Default sales order type
    }

    const salesOrderType = await this.commonService.getSalesOrderType(input.salesOrderType);
    if (!salesOrderType) {
      throw new NotFoundException(`Sales order type "${input.salesOrderType}" not found.`);
    }
    if (salesOrderType.orderCategory !== LocalMenus.OrderCategory.DIRECT_INVOICING) {
      throw new BadRequestException(
        `Sales order type "${input.salesOrderType}" is not allowed to use. Use "Direct Invoicing" instead.`,
      );
    }

    // Check if sold-to-customer is valid
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

    // Check if currency is provided and valid
    if (input.currency !== undefined) {
      if (input.currency === null || input.currency.trim() === '') {
        throw new BadRequestException('Currency cannot be null or an empty string.');
      }

      const currencyExists = await this.currencyService.currencyExists(input.currency);
      if (!currencyExists) {
        throw new NotFoundException(`Currency "${input.currency}" not found.`);
      }
    }

    // Check if tax rules is valid.
    if (input.taxRule !== undefined) {
      if (input.taxRule === null || input.taxRule.trim() === '') {
        throw new BadRequestException('Tax rule cannot be null or an empty string.');
      }
    } else {
      input.taxRule = customerReturn.raw.taxRule; // Default tax rule from customer
    }

    // Verify if tax rule exists for the legislation of the site
    const taxRule = await this.commonService.businessPartnerTaxRuleExists(input.taxRule, site.legislation, true);
    if (!taxRule) {
      // Check if exists without legislation
      const taxRuleExists = await this.commonService.businessPartnerTaxRuleExists(input.taxRule, '', true);
      if (!taxRuleExists) {
        throw new NotFoundException(`Tax rule "${input.taxRule}" not found for legislation "${site.legislation}".`);
      }
    }

    // Validates the products provided in the order lines
    await this.validateProducts(input.lines, site.legislation, input.taxRule);

    // Validates the dimensions provided in the sales order payload
    await this.validateDimensions(input.lines, site, 'APP', input.orderDate, input.soldToCustomer);

    return {
      customer,
      site,
      ledgers,
      salesOrderType,
    };
  }

  /**
   * Check if the products informed in the order lines exist in the database.
   * @param lines - order lines to validate.
   * @param legislation - Legislation to check the tax level.
   * @param taxRule - Tax rule to validate tax determination.
   * @returns void if all products exist.
   * @throws NotFoundException if one or more products do not exist.
   */
  private async validateProducts(lines: SalesOrderLineInput[], legislation: string, taxRule: string): Promise<void> {
    if (!lines || lines.length === 0) return;

    // Extract unique product codes from the lines
    const productsToValidate = [...new Set(lines.map((line) => line.product))];

    const existingProducts = await this.prisma.products.findMany({
      where: {
        code: { in: productsToValidate },
      },
      select: {
        code: true,
        taxLevel1: true,
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
      } else {
        line.taxLevelCode = product.taxLevel1; // Default tax level from product
      }

      const taxLevelExists = await this.commonService.productTaxRuleExists(line.taxLevelCode, legislation, true);
      if (!taxLevelExists) {
        const taxLevelExistsNoLeg = await this.commonService.productTaxRuleExists(line.taxLevelCode, '', true);
        if (!taxLevelExistsNoLeg) {
          throw new NotFoundException(`Tax level "${line.taxLevelCode}" not found for product "${product.code}".`);
        }
      }

      // Validate if tax determination exists for the business partner tax rule and product tax level
      const taxDetermination = `${taxRule}_${line.taxLevelCode}`;
      const taxDeterminationExists = await this.commonService.taxDeterminationExists(
        taxDetermination,
        legislation,
        true,
      );
      if (!taxDeterminationExists) {
        const taxDeterminationExistsNoLeg = await this.commonService.taxDeterminationExists(taxDetermination, '', true);
        if (!taxDeterminationExistsNoLeg) {
          throw new NotFoundException(
            `Tax determination "${taxDetermination}" not found for business partner & product "${taxDetermination}".`,
          );
        }
      }

      // Validate gross price if provided
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
   * @param site - Site entity.
   * @param orderTransaction - Transaction code for the order.
   * @param orderDate - Order date to check dimension validity.
   * @param soldToCustomer - Sold-to customer code to validate fixture dimension.
   * @returns - void if all dimensions are valid.
   * @throws BadRequestException if any dimension is invalid.
   */
  private async validateDimensions(
    lines: SalesOrderLineInput[],
    site: SiteTypes.Payload<{ company: true }>,
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
    if (!site || !site.company) {
      throw new BadRequestException(`Company associated with site "${site?.siteCode ?? 'unknown'}" not found.`);
    }
    const company = site.company;

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

    // Collect all dimensions provided in the lines
    const allProvidedDimensions = lines.flatMap((line, index) =>
      (line.dimensions ?? []).map((dim) => ({ ...dim, lineNumber: index + 1 })),
    );

    // Extract unique dimension types from the provided dimensions
    const uniqueDimensionPairs = [
      ...new Map(
        allProvidedDimensions.map((d) => [
          `${d.typeCode}:${d.value}`,
          { dimensionType: d.typeCode, dimension: d.value },
        ]),
      ).values(),
    ];

    // Check if dimension values exist
    const existingDimensionsData =
      uniqueDimensionPairs.length > 0 ? await this.validateDimensionValuesExist(uniqueDimensionPairs) : [];

    const dimensionToValidate = new Map<string, any>(
      existingDimensionsData.map((d) => [`${d.dimensionType}:${d.dimension}`, d]),
    );

    for (const [index, line] of lines.entries()) {
      const lineNumber = index + 1;

      // Create a map of the dimensions provided in the line
      const providedDimensions = new Map(line.dimensions?.map((d) => [d.typeCode, d.value]) ?? []);

      // Check if mandatory dimensions are present
      // const missingMandatory: string[] = [];

      for (const [mandatoryType] of mandatoryDimensions.entries()) {
        // if (mandatoryType === 'PDT') {
        //   // PDT dimension is system generated and should not be provided by the user
        //   continue;
        // }

        // Dimension is mandatory and allowed for the transaction
        // Apagar
        // if (allowedDimensions.has(mandatoryType)) {
        // Was it provided in the line?
        if (!providedDimensions.has(mandatoryType)) {
          throw new BadRequestException(`Line ${lineNumber}: Missing required dimension: ${mandatoryType}.`);
          // missingMandatory.push(mandatoryType);
        }
        // }
      }

      // Apagar
      // if (missingMandatory.length > 0) {
      //   throw new BadRequestException(
      //     `Line ${lineNumber}: Missing required dimensions: ${missingMandatory.join(', ')}.`,
      //   );
      // }

      // Check if provided dimensions are valid
      for (const [providedType] of providedDimensions.entries()) {
        if (!allowedDimensions.has(providedType)) {
          throw new BadRequestException(
            `Line ${lineNumber}: Invalid dimension provided for this transaction: ${providedType}.`,
          );
        }
      }
      // Apagar
      // const invalidDimensions: string[] = [];

      // for (const [providedType] of providedDimensions.entries()) {
      //   // The provided dimension is not allowed for the transaction
      //   if (!allowedDimensions.has(providedType)) {
      //     invalidDimensions.push(providedType);
      //   }
      // }

      // if (invalidDimensions.length > 0) {
      //   throw new BadRequestException(
      //     `Line ${lineNumber}: Invalid dimensions provided for this transaction: ${invalidDimensions.join(', ')}.`,
      //   );
      // }

      // Add valid dimensions to the payload
      if (line.dimensions && line.dimensions.length > 0) {
        for (const dim of line.dimensions) {
          // const dimensionToValidate = [{ dimensionType: dim.typeCode, dimension: dim.value }];
          const dimensionsData = dimensionToValidate.get(`${dim.typeCode}:${dim.value}`);

          // Check if dimension values exist
          // const dimensionsData = await this.validateDimensionValuesExist(dimensionToValidate);

          // Check if dimension is active
          if (dimensionsData.isActive !== LocalMenus.NoYes.YES) {
            throw new BadRequestException(`Line ${lineNumber}: Dimension ${dim.typeCode} ${dim.value} is inactive.`);
          }

          // Check if the dimension is valid for the order date
          if (!isDateInRange(orderDate, dimensionsData.validityStartDate, dimensionsData.validityEndDate)) {
            throw new BadRequestException(`${dim.typeCode} dimension ${dim.value} is out of date.`);
          }

          // Verify if the dimension is valid for company/site/group
          if (dimensionsData.site && dimensionsData.site.trim() !== '') {
            const isLegalCompany = company.isLegalCompany === LocalMenus.NoYes.YES;

            await this.validateDimensionCompanySiteGroup(
              dimensionsData.site,
              site.siteCode,
              isLegalCompany,
              company.company,
              dim.value,
            );
          }

          // Check if the dimension is imputable
          if (dimensionsData.posting !== LocalMenus.NoYes.YES) {
            throw new BadRequestException(
              `Line ${lineNumber}: Dimension ${dim.typeCode} ${dim.value} is not chargeable.`,
            );
          }

          // Special handling for FIX dimension
          if (dim.typeCode === 'FIX' && dimensionsData.fixtureCustomer.trim() !== '') {
            // If the dimension is fixture, check if the fixture customer is valid
            if (dimensionsData.fixtureCustomer !== soldToCustomer) {
              throw new BadRequestException(
                `Line ${lineNumber}: Fixture dimension value "${dim.value}" is associated with customer ` +
                  `"${dimensionsData.fixtureCustomer}", which does not match the sold-to customer ` +
                  `"${soldToCustomer}".`,
              );
            }
          }
        }
      }

      // Special handling for PDT dimension
      // if (mandatoryDimensions.has('PDT')) {
      //   // Prepare PDT dimension to validate
      //   const pdtDimensionToValidate = [{ dimensionType: 'PDT', dimension: line.product }];

      //   // Check if PDT dimension value exists (it should not exist as it's system generated)
      //   const existingPDT = await this.validateDimensionValuesExist(pdtDimensionToValidate, { dimension: true });
      // }
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

  /**
   * Validate company/site/group information for the dimension values.
   * @param companySiteGroup - company/site/group information from the dimension.
   * @param site - sales site code.
   * @param isLegalCompany - Flag indicating if the company is a legal entity.
   * @param legalCompany - Legal company code.
   * @param dimension - Dimension values to validate.
   * @returns - void if all dimension values are valid for the company/site/group.
   * @throws BadRequestException if any dimension value is invalid for the company/site/group.
   */
  private async validateDimensionCompanySiteGroup(
    companySiteGroup: string,
    site: string,
    isLegalCompany: boolean,
    legalCompany: string,
    dimension: string,
  ): Promise<void> {
    if (!companySiteGroup || companySiteGroup.trim() === '') return;

    // Check if the company/site/group is a site
    const isSite = await this.siteService.exists(companySiteGroup);
    if (isSite && companySiteGroup !== site) {
      throw new BadRequestException(`Dimension '${dimension}' is reserved for site '${companySiteGroup}'.`);
    }

    if (isLegalCompany) {
      // The company is a legal entity, so the dimension must be valid for the legal company
      if (companySiteGroup !== legalCompany) {
        throw new BadRequestException(`Dimension '${dimension}' is reserved for the company '${companySiteGroup}'.`);
      }
    } else {
      // The company is not a legal entity, so the dimension must be valid for the group
      const groupingExists = await this.companyService.siteGroupingExists(companySiteGroup, site);
      if (!groupingExists) {
        throw new BadRequestException(
          `Dimension '${dimension}' is reserved for a site grouping '${companySiteGroup}'.`,
        );
      }
    }
  }
}
