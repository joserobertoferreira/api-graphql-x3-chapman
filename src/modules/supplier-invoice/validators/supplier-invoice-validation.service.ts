import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RequestContextService } from 'src/common/context/request-context.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { DimensionsInput } from '../../../common/inputs/dimension.input';
import { ExchangeRateTypeGQL } from '../../../common/registers/enum-register';
import { CommonJournalEntryService } from '../../../common/services/common-journal-entry.service';
import { CommonSupplierInvoiceService } from '../../../common/services/common-supplier-invoice.service';
import { AccountValidationPayload } from '../../../common/types/account.types';
import { GetCurrencyRates } from '../../../common/types/journal-entry.types';
import {
  SupplierInvoiceBusinessPartnerInfo,
  SupplierInvoiceCompanySiteInfo,
  SupplierInvoiceContext,
  SupplierInvoiceLineContext,
  SupplierInvoiceValidationContext,
} from '../../../common/types/supplier-invoice.types';
import { ExchangeRateTypeToExchangeRateTypeGQL } from '../../../common/utils/enums/convert-enum';
import { LocalMenus } from '../../../common/utils/enums/local-menu';
import { validateLines } from '../../../common/validators/accounting-lines.validation';
import { CommonService } from '../../common/common.service';
import { CompanyService } from '../../companies/company.service';
import { DimensionTypeConfigService } from '../../dimension-types/dimension-type-config.service';
import { DimensionService } from '../../dimensions/dimension.service';
import { DimensionStrategyFactory } from '../../dimensions/strategies/dimension-strategy.factory';
import { SupplierService } from '../../suppliers/supplier.service';
import { UserService } from '../../users/user.service';
import { CreateSupplierInvoiceInput, SupplierInvoiceLineInput } from '../dto/create-supplier-invoice.input';
import { SupplierInvoiceLineTaxService } from '../services/supplier-invoice-line-tax.service';

@Injectable()
export class SupplierInvoiceValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyService: CompanyService,
    private readonly dimensionService: DimensionService,
    private readonly dimensionTypeService: DimensionTypeConfigService,
    private readonly dimensionStrategyFactory: DimensionStrategyFactory,
    private readonly userService: UserService,
    private readonly requestContextService: RequestContextService,
    private readonly commonJournalEntryService: CommonJournalEntryService,
    private readonly commonSupplierInvoiceService: CommonSupplierInvoiceService,
    private readonly supplierInvoiceTaxService: SupplierInvoiceLineTaxService,
    private readonly supplierService: SupplierService,
    private readonly commonService: CommonService,
  ) {}

  /**
   * Validate if the entire CreateSupplierInvoiceInput object is valid.
   * @param input - The CreateSupplierInvoiceInput to be validated.
   * @param isExcel - Flag indicating if the input is coming from an Excel upload, which may have different validation rules.
   * @returns A valid context object
   * @throws HttpException if validation fails.
   */
  async validate(input: CreateSupplierInvoiceInput, isExcel: boolean): Promise<SupplierInvoiceContext> {
    // Normalize lines input
    const normalizedInput = this._normalizeSupplierInvoice(input);

    const { supplier, invoiceType, lines } = normalizedInput;

    if (!lines || lines.length < 1) {
      throw new BadRequestException('At least one supplier invoice line is required.');
    }

    // Get company from site
    const site = await this.companyService.getSiteByCode(normalizedInput.site, { company: true });
    if (!site || !site.company) {
      throw new NotFoundException(`Site ${normalizedInput.site} or its associated company not found.`);
    }

    const company = site.company.company;

    // Get the accounting model from company and validate invoice type (incl. its site group, if any)
    const { companyModel, siteModel, invoiceTypeIsValid } =
      await this.commonSupplierInvoiceService.getCompanyAndInvoiceType(company, invoiceType, normalizedInput.site);

    // If the invoice type is a credit note, the original invoice number must be provided and valid
    const originalInvoiceNumber = normalizedInput.originalInvoiceNumber || '';

    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    if (invoiceTypeIsValid.invoiceCategory !== LocalMenus.InvoiceType.INVOICE) {
      if (!originalInvoiceNumber) {
        throw new BadRequestException('The original invoice number is required for this invoice type.');
      }

      const count = await this.prisma.supplierInvoiceHeader.count({
        where: { invoiceNumber: originalInvoiceNumber },
      });

      if (count === 0) {
        throw new BadRequestException('The original invoice number not found.');
      }
    }

    // Get the document type model from company and legislation
    const documentType = await this.commonSupplierInvoiceService.getDocumentType(
      invoiceTypeIsValid.documentType,
      invoiceTypeIsValid.legislation,
    );

    // Validate supplier (existence + active) and retrieve its full record, including addresses
    const { raw: supplierRaw } = await this.supplierService.findOne(supplier, {
      validateActive: true,
    });

    // Retrieve the pay-to business partner's address, if any
    const payToBusinessPartner = supplierRaw.payToBusinessPartner?.trim() || supplier;

    const { raw: payToBusinessPartnerRaw } = await this.supplierService.findOne(payToBusinessPartner, {
      validateActive: true,
    });
    // const payToAddressCode = supplierRaw.payToBusinessPartnerAddress?.trim();

    // const payToBusinessPartnerAddress = payToAddressCode
    //   ? payToBusinessPartner === supplier
    //     ? (supplierEntity.addresses?.find((addr) => addr.code === payToAddressCode) ?? null)
    //     : await this.addressService.findAddress(
    //         LocalMenus.EntityType.BUSINESS_PARTNER,
    //         payToBusinessPartner,
    //         payToAddressCode,
    //       )
    //   : null;

    const businessPartners = await this.commonJournalEntryService.validateBusinessPartners([payToBusinessPartner]);

    const businessPartnerRaw = businessPartners.get(payToBusinessPartner);
    if (!businessPartnerRaw) {
      throw new NotFoundException(`Business partner ${payToBusinessPartner} not found.`);
    }

    const businessPartnerInfo: SupplierInvoiceBusinessPartnerInfo = {
      code: businessPartnerRaw.code,
      isSupplier: businessPartnerRaw.isSupplier,
      supplier: businessPartnerRaw.supplier,
      paymentMethod: businessPartnerRaw.paymentMethod,
      paymentType: businessPartnerRaw.paymentType,
    };

    // Fetch the ledgers associated with the accounting model and collect account details
    const accountLookups: AccountValidationPayload[] = lines.map((line) => ({ account: line.account }));

    const { ledgers, accounts } = await this.commonJournalEntryService.getLedgersAndAccountsInformation(
      companyModel.accountingModel,
      accountLookups,
    );

    // Various date validity checks (Transaction, document type, account, distribution and sections)
    const { accountingDate, fiscalYear, period } = await this.commonSupplierInvoiceService.validateAccountingDate(
      normalizedInput.accountingDate ?? new Date(),
      company,
      invoiceTypeIsValid,
    );

    const companyInfo: SupplierInvoiceCompanySiteInfo = {
      companyCode: company,
      siteCode: normalizedInput.site,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      isLegalCompany: companyModel.isLegalCompany === LocalMenus.NoYes.YES,
      companyLegislation: companyModel.legislation,
      companyModel: companyModel,
      siteModel: siteModel,
    };

    const rateType = ExchangeRateTypeToExchangeRateTypeGQL[documentType.rateType] as ExchangeRateTypeGQL;

    const rateInfo: GetCurrencyRates = {
      intercompany: false,
      documentType: documentType,
      accountingModel: companyModel.accountingModel,
      accountingDate: accountingDate,
      sourceCurrency: normalizedInput.currency || 'GBP',
      rateType: rateType || undefined,
      rateDate: accountingDate || undefined,
      sourceDocumentDate: normalizedInput.sourceDocumentDate || undefined,
    };

    // Get the currency rates used in the journal entry and determine the rate info based on the document type settings
    const { rates } = await this.commonJournalEntryService.getCurrencyRates(rateInfo);

    // Prepare dimension types map with mandatory flags based on company settings
    const dimensionTypesMap = this.dimensionTypeService.getDtoFieldToTypeMap();
    const companyMandatoryMap = new Map<string, boolean>();

    for (let i = 1; i <= 10; i++) {
      const typeCode = companyModel[`dimensionType${i}`] as string;
      if (typeCode) {
        const isMandatory = companyModel[`isMandatoryDimension${i}`] === 2;
        companyMandatoryMap.set(typeCode, isMandatory);
      }
    }

    // Iterate over the main map and update the 'isMandatory' flag.
    for (const config of dimensionTypesMap.values()) {
      config.isMandatory = companyMandatoryMap.get(config.code) || false;
    }

    // Validate each journal entry line
    const validateContext: SupplierInvoiceValidationContext = {
      companyInfo,
      invoiceType,
      fiscalYear,
      period,
      ledgerMap: accounts,
      exchangeRates: rates,
      dimensionTypesMap,
      accountingDate,
      isExcel,
    };

    const lineContext: SupplierInvoiceLineContext[] | null = await validateLines(
      lines,
      validateContext,
      this.dimensionService,
      this.dimensionStrategyFactory,
      this.commonJournalEntryService,
      this.userService,
      this.requestContextService,
    );

    const lineUpdated = await this.supplierInvoiceTaxService.calculateLineTaxes(
      lineContext!,
      companyInfo.companyLegislation,
    );

    // the header totals are simply fed by the lines.
    // const totalAmount = lineUpdated
    //   .reduce((sum, line) => sum.add(line.amount ?? 0), new Prisma.Decimal(0))
    //   .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
    //   .toNumber();

    // Create the context header
    const dimensionTypes: string[] | null = [];
    for (let i = 1; i <= 10; i++) {
      const dimension = companyModel[`dimensionType${i}`] as string | null;
      if (dimension) {
        dimensionTypes.push(dimension);
      }
    }

    const exportNumber = await this.commonService.getExportNumber(0);

    const context: SupplierInvoiceContext = {
      ...normalizedInput,
      supplierInfo: supplierRaw,
      payToBusinessPartnerInfo: payToBusinessPartnerRaw,
      businessPartnerInfo: businessPartnerInfo,
      companyInfo: companyInfo,
      ledgers: ledgers,
      accountingDate: accountingDate,
      invoiceType: invoiceType,
      fiscalYear: fiscalYear,
      period: period ?? 0,
      currencyRates: rates,
      dimensionTypes: dimensionTypes,
      dimensionTypesMap: dimensionTypesMap,
      invoiceTypeIsValid: invoiceTypeIsValid,
      documentType: documentType,
      exportNumber: parseInt(exportNumber),
      lines: lineUpdated || [],
      ...(invoiceTypeIsValid.invoiceCategory !== 1 && { originalInvoiceNumber: originalInvoiceNumber }),
    };

    return context;
  }

  /**
   * Normalize supplier invoice lines by ensuring header/line string fields are uppercased.
   * @param lines - The supplier invoice lines to be normalized.
   * @returns The normalized supplier invoice lines.
   */
  private _normalizeSupplierInvoice(input: CreateSupplierInvoiceInput): CreateSupplierInvoiceInput {
    // Normalize header fields to uppercase
    const headerFields = {
      site: input.site?.toUpperCase(),
      invoiceType: input.invoiceType?.toUpperCase(),
      currency: input.currency?.toUpperCase(),
      ...('sourceDocument' in input && { sourceDocument: input.sourceDocument?.toUpperCase() }),
    };

    // Normalize lines
    const lineFields = input.lines.map((line) => {
      // Define a type for the common fields
      interface CommonFields extends Partial<SupplierInvoiceLineInput> {
        dimensions?: DimensionsInput;
      }

      // Common fields
      const commonFields: CommonFields = {
        businessPartner: line.businessPartner?.toUpperCase(),
        taxCode: line.taxCode?.toUpperCase(),
      };

      if (line.dimensions) {
        commonFields.dimensions = Object.entries(line.dimensions).reduce((acc, [key, value]) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          acc[key] = typeof value === 'string' ? value.toUpperCase() : value;
          return acc;
        }, {} as DimensionsInput);
      }

      return { ...line, ...commonFields };
    });

    return { ...input, ...headerFields, lines: lineFields };
  }
}
