import { LocalMenus } from '@chapman/utils';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { createSelectScalars } from '../../common/helpers/scalar-select-fields.helper';
import { AccountService } from '../../common/services/account.service';
import { CommonService } from '../../common/services/common.service';
import { CurrencyService } from '../../common/services/currency.service';
import { ProductValidation } from '../../common/types/products.types';
import { ReturnSalesOrderBuildContext, ValidatedSalesOrderContext } from '../../common/types/sales-order.types';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessPartnerService } from '../business-partners/business-partner.service';
import { CompanyService } from '../companies/company.service';
import { CustomerService } from '../customers/customer.service';
import { DimensionTypeConfigService } from '../dimension-types/dimension-type-config.service';
import { DimensionStrategyFactory } from '../dimensions/strategies/dimension-strategy.factory';
import { validateProducts } from '../products/helpers/product-validation';
import { CreateSalesOrderInput, SalesOrderLineInput } from './dto/create-sales-order.input';
import { validateLines } from './sales-order-line-context.service';

@Injectable()
export class SalesOrderContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerService: CustomerService,
    private readonly businessPartnerService: BusinessPartnerService,
    private readonly companyService: CompanyService,
    private readonly commonService: CommonService,
    private readonly accountService: AccountService,
    private readonly currencyService: CurrencyService,
    private readonly dimensionTypeService: DimensionTypeConfigService,
    private readonly dimensionStrategyFactory: DimensionStrategyFactory,
  ) {}

  /**
   * Fetches and validates header data for creating a sales order.
   * @param input - The API DTO.
   * @returns A context object with validated data.
   */
  async buildHeaderContext(input: CreateSalesOrderInput): Promise<ReturnSalesOrderBuildContext> {
    // Transform specific fields to uppercase
    const updatedContext = input;

    const headerFields = ['salesOrderType', 'salesSite', 'soldToCustomer', 'currency', 'taxRule'];
    const lineFields = ['product', 'taxLevelCode'];
    const dimensionsFields = ['fixture', 'broker', 'department', 'location', 'type', 'product', 'analysis'];

    for (const field of headerFields) {
      if (updatedContext[field]) {
        updatedContext[field] = updatedContext[field].toUpperCase();
      }
    }

    if (updatedContext.lines && Array.isArray(updatedContext.lines)) {
      for (const line of updatedContext.lines) {
        for (const field of lineFields) {
          if (line[field]) {
            line[field] = line[field].toUpperCase();
          }
        }

        if (line.dimensions) {
          for (const dimField of dimensionsFields) {
            if (line.dimensions[dimField]) {
              line.dimensions[dimField] = line.dimensions[dimField].toUpperCase();
            }
          }
        }
      }
    }

    // Check if sales order type provided is valid
    if (updatedContext.salesOrderType !== undefined) {
      if (updatedContext.salesOrderType === null || updatedContext.salesOrderType.trim() === '') {
        throw new BadRequestException('Sales order type cannot be null or an empty string.');
      }
    } else {
      updatedContext.salesOrderType = 'SOI'; // Default sales order type
    }

    const salesOrderType = await this.commonService.getSalesOrderType(updatedContext.salesOrderType);
    if (!salesOrderType) {
      throw new NotFoundException(`Sales order type ${updatedContext.salesOrderType} not found.`);
    }
    if (salesOrderType.orderCategory !== LocalMenus.OrderCategory.DIRECT_INVOICING) {
      throw new BadRequestException(
        `Sales order type ${updatedContext.salesOrderType} is not allowed to use. Use "Direct Invoicing" instead.`,
      );
    }

    // Check if sold-to-customer is valid
    const customerReturn = await this.customerService.findOne(updatedContext.soldToCustomer);

    const customer = customerReturn.raw as Prisma.CustomerGetPayload<{
      include: { addresses: true; businessPartner: true };
    }>;

    const site = await this.companyService.getSiteByCode(updatedContext.salesSite, { company: true });
    if (!site || !site.company) {
      throw new NotFoundException(`Sales site ${updatedContext.salesSite} or its associated company not found.`);
    }

    // Check if is a intersite transaction
    if (!customer.businessPartner) {
      throw new NotFoundException(
        `Customer ${updatedContext.soldToCustomer} does not have an associated business partner.`,
      );
    }
    const intersiteContext = await this.businessPartnerService.isIntersiteTransaction(
      site,
      LocalMenus.BusinessPartnerType.CUSTOMER,
      customer.businessPartner,
    );

    if (intersiteContext) {
      updatedContext.isIntercompany = intersiteContext.isInterCompany;
      updatedContext.isIntersite = intersiteContext.isIntersite;
      updatedContext.partialDelivery = intersiteContext.partialDelivery;
      updatedContext.shippingSite = intersiteContext.shippingSite;
      updatedContext.sourceSite = intersiteContext.sendingSite;
    }

    const ledgers = await this.accountService.getLedgers(site.company.accountingModel);
    if (!ledgers) {
      throw new NotFoundException(`No ledgers found for company associated with site ${updatedContext.salesSite}.`);
    }

    // Check if currency is provided and valid
    if (updatedContext.currency !== undefined) {
      if (updatedContext.currency === null || updatedContext.currency.trim() === '') {
        throw new BadRequestException('Currency cannot be null or an empty string.');
      }
    } else {
      updatedContext.currency = customer.customerCurrency; // Default currency from customer
    }

    const currencyExists = await this.currencyService.currencyExists(updatedContext.currency);
    if (!currencyExists) {
      throw new NotFoundException(`Currency ${updatedContext.currency} not found.`);
    }

    // Check if tax rules is valid.
    if (updatedContext.taxRule !== undefined) {
      if (updatedContext.taxRule === null || updatedContext.taxRule.trim() === '') {
        throw new BadRequestException('Tax rule cannot be null or an empty string.');
      }
    } else {
      updatedContext.taxRule = customerReturn.raw.taxRule; // Default tax rule from customer
    }

    // Verify if tax rule exists for the legislation of the site
    const taxRule = await this.commonService.businessPartnerTaxRuleExists(
      updatedContext.taxRule,
      site.legislation,
      true,
    );
    if (!taxRule) {
      // Check if exists without legislation
      const taxRuleExists = await this.commonService.businessPartnerTaxRuleExists(updatedContext.taxRule, '', true);
      if (!taxRuleExists) {
        throw new NotFoundException(
          `Tax rule ${updatedContext.taxRule} not found for legislation ${site.legislation}.`,
        );
      }
    }

    // Validates the products provided in the order lines
    await this.validateOrderProducts(updatedContext.lines, site.legislation, updatedContext.taxRule);

    // Prepare dimension types map with mandatory flags based on company settings
    const dimensionTypesMap = this.dimensionTypeService.getDtoFieldToTypeMap();
    const companyMandatoryMap = new Map<string, boolean>();

    for (let i = 1; i <= 10; i++) {
      const typeCode = site?.company[`dimensionType${i}`] as string;
      if (typeCode) {
        const isMandatory = site?.company[`isMandatoryDimension${i}`] === 2;
        companyMandatoryMap.set(typeCode, isMandatory);
      }
    }

    // Iterate over the main map and update the 'isMandatory' flag.
    for (const config of dimensionTypesMap.values()) {
      config.isMandatory = companyMandatoryMap.get(config.code) || false;
    }

    const company = site.company;

    // Validate each sales order line
    const lineContext = await validateLines(
      updatedContext.orderDate || new Date(),
      updatedContext.lines,
      'APP',
      updatedContext.salesSite,
      company,
      dimensionTypesMap,
      this.dimensionStrategyFactory,
      this.commonService,
      this.prisma,
    );

    const context: ValidatedSalesOrderContext = {
      customer,
      site,
      ledgers,
      salesOrderType,
      dimensionTypesMap,
      currency: updatedContext.currency,
      taxRule: updatedContext.taxRule,
      lines: lineContext || [],
    };

    return { context, updatedInput: updatedContext, intersiteContext: intersiteContext };
  }

  /**
   * Check if the products informed in the order lines exist in the database.
   * @param lines - order lines to validate.
   * @param legislation - Legislation to check the tax level.
   * @param taxRule - Tax rule to validate tax determination.
   * @returns void if all products exist.
   * @throws NotFoundException if one or more products do not exist.
   */
  private async validateOrderProducts(
    lines: SalesOrderLineInput[],
    legislation: string,
    taxRule: string,
  ): Promise<void> {
    if (!lines || lines.length === 0) return;

    const context: ProductValidation[] = lines.map((line) => ({
      code: line.product,
      taxLevelCode: line.taxLevelCode,
      grossPrice: line.grossPrice,
      legislation: legislation,
      taxRule: taxRule,
    }));

    const validatedContext = await validateProducts(context, this.prisma, this.commonService);

    // Update the tax level code in the original lines based on validation results
    for (const line of lines) {
      const validatedLine = validatedContext.find((v) => v.code === line.product);
      if (validatedLine) {
        line.taxLevelCode = validatedLine.taxLevelCode;
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
