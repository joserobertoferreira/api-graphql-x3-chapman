import { LocalMenus } from '@chapman/utils';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma';
import { AccountService } from '../../common/services/account.service';
import { CommonService } from '../../common/services/common.service';
import { CurrencyService } from '../../common/services/currency.service';
import { ProductValidation } from '../../common/types/products.types';
import {
  ReturnPurchaseOrderBuildContext,
  ValidatedPurchaseOrderContext,
} from '../../common/types/purchase-order.types';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessPartnerService } from '../business-partners/business-partner.service';
import { CompanyService } from '../companies/company.service';
import { DimensionTypeConfigService } from '../dimension-types/dimension-type-config.service';
import { DimensionStrategyFactory } from '../dimensions/strategies/dimension-strategy.factory';
import { validateProducts } from '../products/helpers/product-validation';
import { SupplierService } from '../suppliers/supplier.service';
import { CreatePurchaseOrderInput, PurchaseOrderLineInput } from './dto/create-purchase-order.input';
import { validateLines } from './purchase-order-line-context.service';

@Injectable()
export class PurchaseOrderContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supplierService: SupplierService,
    private readonly businessPartnerService: BusinessPartnerService,
    private readonly companyService: CompanyService,
    private readonly commonService: CommonService,
    private readonly accountService: AccountService,
    private readonly currencyService: CurrencyService,
    private readonly dimensionTypeService: DimensionTypeConfigService,
    private readonly dimensionStrategyFactory: DimensionStrategyFactory,
  ) {}

  /**
   * Busca e valida os dados de cabeçalho para a criação de uma encomenda.
   * @param input - O DTO da API.
   * @returns Um objeto de contexto com os dados validados.
   */
  async buildHeaderContext(input: CreatePurchaseOrderInput): Promise<ReturnPurchaseOrderBuildContext> {
    // Transform specific fields to uppercase
    const updatedContext = input;

    const headerFields = ['purchaseSite', 'supplier', 'buyer', 'currency', 'taxRule'];
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

    // Check if supplier is valid
    const supplierReturn = await this.supplierService.findOne(updatedContext.supplier);

    const supplier = supplierReturn.raw as Prisma.SupplierGetPayload<{
      include: { addresses: true; businessPartner: true };
    }>;

    const site = await this.companyService.getSiteByCode(updatedContext.purchaseSite, { company: true });
    if (!site || !site.company) {
      throw new NotFoundException(`Purchase site ${updatedContext.purchaseSite} or its associated company not found.`);
    }

    // Check if is a intersite transaction
    if (!supplier.businessPartner) {
      throw new NotFoundException(`Supplier ${updatedContext.supplier} does not have an associated business partner.`);
    }
    const intersiteContext = await this.businessPartnerService.isIntersiteTransaction(
      site,
      LocalMenus.BusinessPartnerType.SUPPLIER,
      supplier.businessPartner,
    );

    if (intersiteContext) {
      updatedContext.isIntercompany = intersiteContext.isInterCompany;
      updatedContext.isIntersite = intersiteContext.isIntersite;
      updatedContext.partialDelivery = intersiteContext.partialDelivery;
      updatedContext.shippingSite = intersiteContext.shippingSite;
      updatedContext.sourceSite = intersiteContext.sendingSite;
      updatedContext.soldToCustomer = intersiteContext.sender;
    }

    // Get ledgers for the company's accounting model
    const ledgers = await this.accountService.getLedgers(site.company.accountingModel);
    if (!ledgers || ledgers.ledgers.length === 0) {
      throw new NotFoundException(`No ledgers found for company associated with site ${updatedContext.purchaseSite}.`);
    }

    // Check if currency is provided and valid
    if (updatedContext.currency !== undefined) {
      if (updatedContext.currency === null || updatedContext.currency.trim() === '') {
        throw new BadRequestException('Currency cannot be null or an empty string.');
      }
    } else {
      updatedContext.currency = supplier.currency; // Default currency from supplier
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
      updatedContext.taxRule = supplierReturn.raw.taxRule; // Default tax rule from supplier
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
      updatedContext.purchaseSite,
      company,
      dimensionTypesMap,
      this.dimensionStrategyFactory,
      this.commonService,
      this.prisma,
    );

    // Return context object
    const context: ValidatedPurchaseOrderContext = {
      supplier,
      site,
      ledgers,
      dimensionTypesMap,
      currency: updatedContext.currency,
      taxRule: updatedContext.taxRule,
      lines: lineContext || [],
    };

    return { context, updatedInput: updatedContext, intersiteContext: intersiteContext };
  }

  /**
   * Check if the products informed in the order lines exist in the database and are valid.
   * @param lines - order lines to validate.
   * @param legislation - Legislation to check the tax level.
   * @param taxRule - Tax rule to validate tax determination.
   * @returns void if all products exist.
   * @throws NotFoundException if one or more products do not exist.
   */
  private async validateOrderProducts(
    lines: PurchaseOrderLineInput[],
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
}
