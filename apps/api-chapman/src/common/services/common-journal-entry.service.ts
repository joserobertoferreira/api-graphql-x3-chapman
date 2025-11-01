import { LocalMenus } from '@chapman/utils';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AccountingModel,
  Accounts,
  DocumentTypes,
  EntryTransaction,
  IntercompanyAccountMapping,
  Prisma,
} from 'src/generated/prisma';
import { BusinessPartnerService } from '../../modules/business-partners/business-partner.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ParametersService } from '../parameters/parameter.service';
import { ExchangeRateTypeGQL } from '../registers/enum-register';
import { AccountValidationPayload } from '../types/account.types';
import { DEFAULT_LEGACY_DATE } from '../types/common.types';
import { CompanyModel, companyModelSelect } from '../types/company.types';
import {
  GetCurrencyRates,
  JournalEntryBusinessPartnerInfo,
  JournalEntryDatesInfo,
  JournalEntryLedger,
  JournalEntryLedgerWithPlanAndAccounts,
  JournalEntryLineAmount,
  JournalEntryRateCurrency,
  ValidationLineFields,
} from '../types/journal-entry.types';
import { SiteCompanyGroup } from '../types/site-company-group.types';
import { convertStringToDate, getYearAndMonth, isDateInRange, YearMonth } from '../utils/date.utils';
import {
  ExchangeRateTypeGQLToExchangeRateType,
  ExchangeRateTypeToExchangeRateTypeGQL,
} from '../utils/enums/convert-enum';
import { AccountService } from './account.service';
import { CommonService } from './common.service';
import { CurrencyService } from './currency.service';
import { SiteCompanyGroupService } from './site-company-group.service';

@Injectable()
export class CommonJournalEntryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parametersService: ParametersService,
    private readonly accountService: AccountService,
    private readonly currencyService: CurrencyService,
    private readonly businessPartnerService: BusinessPartnerService,
    private readonly commonService: CommonService,
    private readonly siteCompanyGroupService: SiteCompanyGroupService,
  ) {}

  /**
   * Validates a list of journal entry lines against a set of business rules:
   * 1. A line must have either a debit/credit value OR a quantity value, but not both.
   * 2. The provided value (debit, credit, or quantity) must be a positive number.
   * 3. The 'site' field is mandatory and ONLY allowed for intercompany entry lines.
   * @param lines - The journal entry lines to be validated.
   * @param intercompany - Flag indicating if the lines are for intercompany journal entries.
   * @throws BadRequestException if any line has an invalid configuration.
   */
  validateDebitCreditFields(line: ValidationLineFields, intercompany: boolean): void {
    const lineIdentifier = `Line #${line.id}`;

    // If intercompany line, 'site' field is mandatory. If not intercompany line, 'site' field is not allowed
    const hasSite = 'site' in line && line.site != null && line.site !== '';

    if (intercompany && !hasSite) {
      throw new BadRequestException(`${lineIdentifier}: The 'site' field is required for intercompany lines.`);
    }
    if (!intercompany && hasSite) {
      throw new BadRequestException(`${lineIdentifier}: The 'site' field is only allowed for intercompany lines.`);
    }

    // Validate that only exists a pair (debit/credit) or quantity
    const hasDebit = line.debit !== undefined;
    const hasCredit = line.credit !== undefined;
    const existsQuantity = 'quantity' in line;
    const hasQuantity = existsQuantity && line.quantity !== undefined;

    const providedFields = [hasCredit, hasDebit, hasQuantity].filter(Boolean).length;

    if (providedFields === 0) {
      throw new BadRequestException(
        `Line #${line.id}: Must have at least one of the following fields: debit, credit, quantity.`,
      );
    } else if (providedFields > 1) {
      throw new BadRequestException(
        `Line #${line.id}: Only one of the following fields can be provided: debit, credit, quantity.`,
      );
    }

    if (hasDebit) {
      if (typeof line.debit !== 'number' || line.debit <= 0) {
        throw new BadRequestException(
          `Line #${line.id}: Debit value must be a positive number. Received: ${line.debit}.`,
        );
      }
    } else if (hasCredit) {
      if (typeof line.credit !== 'number' || line.credit <= 0) {
        throw new BadRequestException(
          `Line #${line.id}: Credit value must be a positive number. Received: ${line.credit}.`,
        );
      }
    } else if (hasQuantity) {
      if (typeof line.quantity !== 'number' || line.quantity <= 0) {
        throw new BadRequestException(
          `Line #${line.id}: Quantity value must be a positive number. Received: ${line.quantity}.`,
        );
      }
    }
  }

  /**
   * Determines the correct parameters and fetches all the necessary exchange rates.
   * @returns An array of JournalEntryRateCurrency.
   */
  async getCurrencyRates(context: GetCurrencyRates): Promise<{
    rates: JournalEntryRateCurrency[];
    accountingModelData: AccountingModel;
  }> {
    // Get the currency rates used in the journal entry
    const globalCurrency = await this.parametersService.getParameterValue('', '', '', 'EURO');
    const accountingModelData = await this.accountService.getAccountingModel(context.accountingModel);
    if (!accountingModelData) {
      throw new BadRequestException(`Accounting model data for ${context.accountingModel} not found.`);
    }

    const defaultRateType: ExchangeRateTypeGQL = ExchangeRateTypeToExchangeRateTypeGQL[context.documentType.rateType];
    if (!defaultRateType) {
      throw new BadRequestException(`No default rate type found for document type.`);
    }

    let rateDate: Date = new Date();

    if (!context.rateDate) {
      if (!context.intercompany) {
        // If the document type requires a source document date, ensure it's provided
        if (context.documentType.rateDate === LocalMenus.RateDate.SOURCE_DOCUMENT_DATE) {
          if (context.sourceDocumentDate) {
            const sourceDocumentDate = new Date(context.sourceDocumentDate);
            if (isNaN(sourceDocumentDate.getTime())) {
              throw new BadRequestException('Invalid source document date format.');
            }
            if (sourceDocumentDate > context.accountingDate) {
              throw new BadRequestException('Source document date cannot be later than the accounting date.');
            }
          } else {
            throw new BadRequestException('Source document date is required for the selected document type.');
          }
        } else {
          // LocalMenus.RateDate.JOURNAL_ENTRY_DATE
          rateDate = context.accountingDate;
        }
      } else {
        // For intercompany journal entries, always use the accounting date
        rateDate = context.accountingDate;
      }
    } else {
      rateDate = context.rateDate;
    }

    // Determine the rate info based on the document type settings
    const rateType = context.rateType ?? defaultRateType;
    const rates = await this.ledgerCurrencyRates(
      globalCurrency?.value ?? 'GBP',
      accountingModelData,
      context.sourceCurrency,
      rateType,
      rateDate,
    );

    return { rates, accountingModelData };
  }

  /**
   * Get the currency rate for each ledger in the journal entry context.
   * @param globalCurrency - The global currency code.
   * @param accountingModel - The accounting model.
   * @param sourceCurrency - The currency to convert from.
   * @param rateType - The type of rate to use for conversion.
   * @param date - The date for which the rate is applicable.
   * @returns An array with the currency rate for each ledger or null.
   */
  async ledgerCurrencyRates(
    globalCurrency: string,
    accountingModel: AccountingModel,
    sourceCurrency: string,
    rateType: string,
    date: Date,
  ): Promise<JournalEntryRateCurrency[]> {
    const currencyRates: Promise<JournalEntryRateCurrency>[] = [];
    const localMenuRateType = ExchangeRateTypeGQLToExchangeRateType[rateType];

    for (let i = 1; i <= 10; i++) {
      let ledger = accountingModel[`ledger${i}` as keyof AccountingModel] as string | null;
      const destinationCurrency = accountingModel[`currency${i}` as keyof AccountingModel] as string | null;

      if (!ledger) {
        ledger = '';
      }

      const promise = new Promise<JournalEntryRateCurrency>(async (resolve) => {
        if (!destinationCurrency || destinationCurrency.trim() === '') {
          resolve({
            ledger: ledger,
            sourceCurrency: '',
            destinationCurrency: '',
            rate: new Prisma.Decimal(0),
            divisor: new Prisma.Decimal(1),
            status: 0,
          });
          return;
        } else if (destinationCurrency === sourceCurrency) {
          resolve({
            ledger: ledger,
            sourceCurrency: sourceCurrency,
            destinationCurrency: destinationCurrency,
            rate: new Prisma.Decimal(1),
            divisor: new Prisma.Decimal(1),
            status: 0,
          });
          return;
        }

        // Fetch the currency rate
        try {
          const currencyRate = await this.currencyService.getCurrencyRate(
            globalCurrency,
            destinationCurrency,
            sourceCurrency,
            localMenuRateType,
            date,
          );

          const divisor = currencyRate?.divisor ?? new Prisma.Decimal(1);

          resolve({
            ledger: ledger,
            sourceCurrency: sourceCurrency,
            destinationCurrency: destinationCurrency,
            rate: currencyRate?.rate ?? 0,
            divisor,
            status: currencyRate?.status ?? 0,
          });
        } catch (error) {
          console.error(`Erro ao buscar taxa para ${sourceCurrency} -> ${destinationCurrency}:`, error);
          resolve({
            ledger: ledger,
            sourceCurrency: '',
            destinationCurrency: '',
            rate: new Prisma.Decimal(0),
            divisor: new Prisma.Decimal(1),
            status: 0,
          });
        }
      });

      currencyRates.push(promise);
    }

    const results = await Promise.all(currencyRates);
    return results;
  }

  /**
   * Check if business partners in the lines exist in the system.
   * @param businessPartners - Array of business partner codes to validate.
   * @returns A map of valid business partner codes to their information.
   * @throws NotFoundException if any business partner does not exist.
   * @throws BadRequestException if any business partner is inactive.
   */
  async validateBusinessPartners(businessPartners: string[]): Promise<Map<string, JournalEntryBusinessPartnerInfo>> {
    if (businessPartners.length === 0) {
      return new Map();
    }

    // If there are codes to validate, check their existence in the system
    const existingBPs = await this.businessPartnerService.findBusinessPartners({
      where: { code: { in: businessPartners } },
      select: {
        code: true,
        isCustomer: true,
        isSupplier: true,
        customer: {
          select: {
            isActive: true,
            payByCustomer: true,
            payByCustomerAddress: true,
            paymentTerm: true,
            accountingCode: true,
          },
        },
        supplier: {
          select: {
            isActive: true,
            payToBusinessPartner: true,
            payToBusinessPartnerAddress: true,
            paymentTerm: true,
            accountingCode: true,
          },
        },
      },
      // include: { customer: true, supplier: true },
    });

    // If any of the provided codes do not exist, throw an error
    if (existingBPs.length !== businessPartners.length) {
      const foundCodes = new Set(existingBPs.map((bp) => bp.code));
      const notFound = businessPartners.find((code) => !foundCodes.has(code));
      throw new NotFoundException(`Business partner ${notFound} not found.`);
    }

    // Validate if the business partners are active (not blocked)
    const inactiveBPs: string[] = [];
    for (const bp of existingBPs) {
      // Check in client data if is inactive
      if (bp.isCustomer === LocalMenus.NoYes.YES) {
        if (!bp.customer || bp.customer.isActive !== LocalMenus.NoYes.YES) {
          inactiveBPs.push(`${bp.code} (as Customer is inactive or missing)`);
          continue;
        }
      }

      // Check in supplier data if is inactive
      if (bp.isSupplier === LocalMenus.NoYes.YES) {
        if (!bp.supplier || bp.supplier.isActive !== LocalMenus.NoYes.YES) {
          inactiveBPs.push(`${bp.code} (as Supplier is inactive or missing)`);
          continue;
        }
      }
    }

    if (inactiveBPs.length > 0) {
      throw new BadRequestException(
        `The following business partner(s) are inactive or improperly configured: ${inactiveBPs.join(', ')}.`,
      );
    }

    const paymentTerms = [
      ...new Set(
        existingBPs
          .map((bp) => (bp.isCustomer === LocalMenus.NoYes.YES ? bp.customer?.paymentTerm : bp.supplier?.paymentTerm))
          .filter((pt): pt is string => !!pt),
      ),
    ];

    const paymentMethodsMap = await this.commonService.getPaymentMethodByTerms(paymentTerms);

    // Build the returned business partner info with payment methods
    const enrichedBPs = new Map<string, JournalEntryBusinessPartnerInfo>();

    for (const bp of existingBPs) {
      const paymentTerm = bp.isCustomer === LocalMenus.NoYes.YES ? bp.customer?.paymentTerm : bp.supplier?.paymentTerm;

      const paymentInfo = paymentTerm ? paymentMethodsMap.get(paymentTerm) || null : null;

      const partnerInfo: JournalEntryBusinessPartnerInfo = {
        ...bp,
        customer: bp.customer,
        supplier: bp.supplier,
        paymentMethod: paymentInfo?.paymentMethod || null,
        paymentType: paymentInfo?.paymentType || null,
      };

      enrichedBPs.set(bp.code, partnerInfo);
    }

    // Return a set of valid business partner codes for quick lookup
    return enrichedBPs;
  }

  /**
   * Validates the existence of all unique tax codes provided in the lines.
   * Makes a single service call to optimize performance.
   *
   * @param taxes - Array of tax codes to validate.
   * @param legislation - The company's legislation, required for the query.
   * @returns A Set containing the tax codes that exist for the legislation.
   */
  async validateTaxCodes(taxes: string[], legislation: string): Promise<Set<string>> {
    if (taxes.length === 0) {
      return new Set<string>();
    }

    // If there are tax codes to validate, check their existence in the system
    const existingTaxes = await this.commonService.getTaxCodes({
      where: { legislation: { equals: legislation }, code: { in: taxes } },
      select: { code: true },
    });

    const taxCodesSet = new Set(existingTaxes.map((tax) => tax.code));

    return taxCodesSet;
  }

  /**
   * Retrieves the company accounting model and validates the provided document type code
   * against the company's legislation.
   *
   * @param companyCode - The unique code identifying the company.
   * @param documentTypeCode - (Optional) The code of the document type to validate.
   * @returns An object containing the company model and a boolean indicating if the document type is valid.
   * @throws BadRequestException If the company model is not found or the document type is invalid for the legislation.
   */
  async getCompanyAndDocumentType(companyCode: string, documentTypeCode: string) {
    // Get the accounting model from company
    const companyModel: CompanyModel | null = await this.prisma.company.findUnique({
      where: { company: companyCode },
      select: companyModelSelect,
    });

    if (!companyModel) {
      throw new BadRequestException(`Accounting model for company ${companyCode} not found.`);
    }

    // Check if the document type informed is valid
    const documentTypeIsValid = await this.accountService.getDocumentType({
      where: { documentType: documentTypeCode, legislation: companyModel.legislation },
    });

    if (!documentTypeIsValid) {
      throw new BadRequestException(
        `Document type ${documentTypeCode} is not valid for legislation ${companyModel.legislation} or not found.`,
      );
    }

    return { companyModel, documentTypeIsValid };
  }

  /**
   * Retrieves the intercompany account mapping for the specified companies and site.
   * @param sourceCompany Source company code
   * @param targetCompany Target company code
   * @param headerSite Site code from the journal entry header
   * @param lineSite Site code to be validated.
   * @param siteMap Mapping of site codes to their details.
   * @returns The intercompany account mapping if found.
   * @throws BadRequestException if no mapping is found.
   */
  async getIntercompanyAccountMapping(
    sourceCompany: string,
    targetCompany: string,
    headerSite: string,
    lineSite: string,
    sitesMap: Map<string, string[]>,
  ): Promise<IntercompanyAccountMapping> {
    const siteSourceEqualsTarget = sourceCompany === targetCompany;

    let intercompanyMapping: IntercompanyAccountMapping | null = null;

    if (siteSourceEqualsTarget) {
      intercompanyMapping = await this.prisma.intercompanyAccountMapping.findFirst({
        where: { sourceCompany: sourceCompany, sourceSite: { in: ['', lineSite] } },
        orderBy: [{ sourceCompany: 'asc' }, { targetCompany: 'asc' }, { sourceSite: 'desc' }],
      });
    } else {
      const localSite = sitesMap.get(sourceCompany)?.[0] || headerSite;

      const results = await this.prisma.intercompanyAccountMapping.findMany({
        where: {
          sourceCompany: sourceCompany,
          targetCompany: targetCompany,
          OR: [
            { sourceSite: localSite, targetSite: lineSite },
            { sourceSite: '', targetSite: lineSite },
            { sourceSite: localSite, targetSite: '' },
          ],
        },
      });

      if (results.length > 0) {
        intercompanyMapping =
          // Prioritize exact matches on both sourceSite and targetSite
          results.find((m) => m.sourceSite === localSite && m.targetSite === lineSite) ??
          // Next, check for matches with empty sourceSite and targetSite
          results.find((m) => m.sourceSite === '' && m.targetSite === lineSite) ??
          // Finally, check for matches with sourceSite and empty targetSite
          results.find((m) => m.sourceSite === localSite && m.targetSite === '') ??
          null;
      }
    }

    if (!intercompanyMapping) {
      // As a last resort, try to find a mapping with empty sites
      intercompanyMapping = await this.prisma.intercompanyAccountMapping.findFirst({
        where: { sourceCompany: sourceCompany, targetCompany: targetCompany, sourceSite: '', targetSite: '' },
      });
    }
    if (!intercompanyMapping) {
      throw new BadRequestException(
        `No intercompany mapping record exists for the target site/company assigned to this site.'.`,
      );
    }

    return intercompanyMapping;
  }

  /**
   * Fetches the ledgers from the accounting model and enriches them with account details.
   * @param accountingModel - The accounting model code.
   * @param lookups - An array of AccountValidationPayloads to look up accounts.
   * @returns An array of JournalEntryLedgerWithPlanAndAccounts.
   */
  async getLedgersAndAccountsInformation(
    accountingModel: string,
    lookups: AccountValidationPayload[],
  ): Promise<{
    ledgers: JournalEntryLedger[];
    accounts: JournalEntryLedgerWithPlanAndAccounts[];
  }> {
    const accountCodes = [...new Set(lookups.map((l) => l.account))];

    // Fetch the ledgers associated with the accounting model
    const ledgers = await this.accountService.getLedgers(accountingModel);

    if (!ledgers) {
      throw new BadRequestException(`No ledgers found for accounting model ${accountingModel}.`);
    }

    // Maps each ledger from the array to a "promise" of an enriched object.
    const ledgersPromises: Promise<JournalEntryLedgerWithPlanAndAccounts>[] = ledgers.ledgers.map(
      async (ledgerCode) => {
        // If the ledger code is blank, return an "empty" object immediately.
        if (!ledgerCode || ledgerCode.trim() === '') {
          // Return a dummy object with the correct type for ledger
          return {
            ledgerCode: '',
            ledger: {} as NonNullable<JournalEntryLedgerWithPlanAndAccounts['ledger']>,
            planCode: '',
            accounts: [], // No accounts for this ledger
          };
        }

        // Get the ledger data
        const ledger = await this.accountService.getLedger(ledgerCode);
        if (!ledger) {
          // Throw an error if the ledger does not exist.
          throw new BadRequestException(`Ledger ${ledgerCode} not found.`);
        }

        // Get the plan code associated with the ledger
        const planCode = await this.accountService.getPlanCode(ledgerCode);
        if (!planCode) {
          // Throw an error if a valid ledger does not have a plan.
          throw new BadRequestException(`Plan code for ledger ${ledgerCode} not found.`);
        }

        // Fetch the details of the accounts for this specific plan.
        const accounts = await this.accountService.getAccounts(planCode, accountCodes);

        // Return the complete enriched object for this ledger.
        return {
          ledgerCode: ledgerCode,
          ledger: ledger,
          planCode: planCode,
          accounts: accounts,
        };
      },
    );

    // Execute all ledger enrichment promises in parallel.
    const accounts = await Promise.all(ledgersPromises);

    // Validate site/company/group for each account
    const allAccounts = accounts.flatMap((ledger) => ledger.accounts);
    const accountsToValidate = [...new Map(allAccounts.map((acc) => [acc.account, acc])).values()];
    const lookupMap = new Map<string, AccountValidationPayload>(lookups.map((l) => [l.account, l]));

    for (const account of accountsToValidate) {
      const zone = account.companySite;

      const context = lookupMap.get(account.account);
      if (!context) {
        continue;
      }

      const validationContext: SiteCompanyGroup = {
        site: context.site || '',
        value: account.account,
        entityType: 'Account',
      };

      // Check if the company/site/group is a site
      await this.siteCompanyGroupService.validate(zone, validationContext);
    }

    const ledgerMap: JournalEntryLedger[] = accounts.map((item) => {
      return {
        ledger: item.ledgerCode ?? '',
        data: item.ledger,
      };
    });

    return {
      ledgers: ledgerMap,
      accounts: accounts,
    };
  }

  /**
   * Control of the exercise and period + validity dates
   * @param accountingDate - The accounting date to validate.
   * @param company - The company associated with the journal entry.
   * @param entryTransaction - The journal entry transaction type.
   * @param documentType - The document type associated with the journal entry.
   * @returns An object containing the accounting date, fiscal year, and period.
   * @throws BadRequestException if validation fails.
   */
  async validateAccountingDate(
    accountingDate: Date,
    company: string,
    entryTransaction: EntryTransaction | undefined,
    documentType: DocumentTypes,
  ): Promise<JournalEntryDatesInfo> {
    // Determine the fiscal year and period based on the accounting date
    const fiscalYear = await this.commonService.getFiscalYear(
      company,
      LocalMenus.LedgerType.LEGAL,
      accountingDate.getFullYear(),
    );

    if (!fiscalYear || fiscalYear.ledgerTypeNumber === undefined || fiscalYear.code === undefined) {
      throw new BadRequestException('Fiscal year or its properties are missing.');
    }
    if (fiscalYear.status === LocalMenus.FiscalYearReport.CLOSED) {
      throw new BadRequestException(`Fiscal year ${fiscalYear.code} is closed.`);
    }
    if (fiscalYear.status !== LocalMenus.FiscalYearReport.OPEN) {
      throw new BadRequestException(`Fiscal year ${fiscalYear.code} is not open.`);
    }

    const yearMonth: YearMonth = getYearAndMonth(accountingDate);

    const period = await this.commonService.getPeriod(company, fiscalYear.ledgerTypeNumber, fiscalYear.code, yearMonth);
    if (!period) {
      throw new BadRequestException(`Period for ${yearMonth.year}-${yearMonth.month} not found.`);
    }
    if (period.status === LocalMenus.FiscalYearPeriodStatus.CLOSED) {
      throw new BadRequestException(`Period ${period.code} is closed.`);
    }
    if (
      period.status < LocalMenus.FiscalYearPeriodStatus.OPEN ||
      period.status > LocalMenus.FiscalYearPeriodStatus.CLOSED
    ) {
      throw new BadRequestException(`Period ${period.code} is not open.`);
    }

    // Check if the accounting date is within the validity dates of the entry transaction
    if (entryTransaction) {
      const datesOk = isDateInRange(accountingDate, entryTransaction.validFrom, entryTransaction.validUntil);
      if (!datesOk) {
        throw new BadRequestException(`${entryTransaction.code} is outside of validity date limit.`);
      }
    }
    if (documentType.validFrom) {
      const dateOK = isDateInRange(accountingDate, documentType.validFrom, documentType.validUntil);
      if (!dateOK) {
        throw new BadRequestException(`Document type ${documentType.documentType} is outside of validity date limit.`);
      }
    }

    // Check if the accounting date is within module open and close dates
    const moduleInfo = await this.commonService.getObjectInformation('GAS');
    if (moduleInfo && moduleInfo.module !== 3) {
      if (moduleInfo.module === 2) {
        // Get the close operations dates
        const accountingStartDate = await this.parametersService.getParameterValue(
          documentType.legislation,
          '',
          company,
          'CPTSTRDAT',
        );
        const accountingEndDate = await this.parametersService.getParameterValue(
          documentType.legislation,
          '',
          company,
          'CPTENDDAT',
        );

        if (!accountingStartDate || !accountingEndDate) {
          throw new BadRequestException(`Accounting start or end date is not defined.`);
        }
        const startDate = convertStringToDate(accountingStartDate.value) ?? DEFAULT_LEGACY_DATE;
        const endDate = convertStringToDate(accountingEndDate.value) ?? DEFAULT_LEGACY_DATE;
        const dateOK = isDateInRange(accountingDate, startDate, endDate);
        if (!dateOK) {
          throw new BadRequestException(`Date prohibited for the module Financial.`);
        }
      }
    }

    return { accountingDate, fiscalYear: fiscalYear.code, period: period.code };
  }

  /**
   * Helper function to validate dimensions for a journal entry line.
   * @param lineNumber - line number
   * @param ledgerCode - The ledger code for context in error messages.
   * @param dimensions - An array of the dimensions { dimensionType, dimension } provided in the journal entry line.
   * @throws BadRequestException or NotFoundException if validation fails.
   */
  async validateDimensions(
    lineNumber: number,
    ledgerCode: string,
    dimensions: { dimensionType: string; dimension: string }[] | null,
  ): Promise<void> {
    if (!dimensions || dimensions.length === 0) {
      return;
    }

    const results = await this.prisma.dimensions.findMany({
      where: { OR: dimensions },
      select: {
        dimensionType: true,
        dimension: true,
        isActive: true,
        validityStartDate: true,
        validityEndDate: true,
        site: true,
        posting: true,
        fixtureCustomer: true,
      },
    });

    if (results.length < dimensions.length) {
      const foundDimensions = new Set(results.map((r) => `${r.dimensionType}|${r.dimension}`));
      const notFoundDimensions = dimensions.find((d) => !foundDimensions.has(`${d.dimensionType}|${d.dimension}`));

      if (notFoundDimensions) {
        throw new BadRequestException({
          message:
            `Line #${lineNumber}: Ledger [${ledgerCode}]: Dimension value ${notFoundDimensions.dimension} ` +
            `does not exist for type ${notFoundDimensions.dimensionType}.`,
        });
      }
    }

    for (const dbDimension of results) {
      if (dbDimension.isActive !== LocalMenus.NoYes.YES) {
        throw new BadRequestException(
          `Line #${lineNumber}, Ledger [${ledgerCode}]: Dimension ${dbDimension.dimensionType} ${dbDimension.dimension} is inactive.`,
        );
      }
    }
  }

  /**
   * Validates a single journal entry line against the business rules of its account.
   * (Checks for business partner, tax, and dimension type requirements).
   */
  validateAccountRules(
    account: Accounts,
    context: {
      lineNumber: number;
      ledgerCode: string;
      legislation: string;
      accountCode: string;
      businessPartner?: string;
      businessPartners: Map<string, any>;
      taxCode?: string;
      taxCodes: Set<string>;
    },
  ): { businessPartner: string; taxCode: string } {
    const { lineNumber, legislation, ledgerCode, accountCode, businessPartner, businessPartners, taxCode, taxCodes } =
      context;

    let partner = '';
    let tax = '';

    // Check if the business partner requirement is met
    if (account.collective === LocalMenus.NoYes.YES) {
      if (!businessPartner || businessPartner.trim() === '') {
        throw new BadRequestException(
          `Line #${lineNumber}: Ledger [${ledgerCode}] Business Partner is required for account code ${accountCode}.`,
        );
      }

      // Verify if the business partner exists
      if (!businessPartners.has(businessPartner)) {
        throw new BadRequestException(
          `Line #${lineNumber}: Ledger [${ledgerCode}] Business Partner ${businessPartner} don't exist.`,
        );
      }
      partner = businessPartner;
    } else if (businessPartner && businessPartner.trim() !== '') {
      partner = ''; // Clear business partner if not required
    }

    // Check if is mandatory to inform tax management
    if (account.taxManagement > LocalMenus.TaxManagement.NOT_SUBJECTED) {
      if (!taxCode || taxCode.trim() === '') {
        throw new BadRequestException(
          `Line #${lineNumber}: Ledger [${ledgerCode}] Tax is required for account code ${accountCode}.`,
        );
      }

      // Check if the informed tax code is valid
      if (!taxCodes.has(taxCode)) {
        throw new BadRequestException(
          `Line #${lineNumber}: Ledger [${ledgerCode}] Tax code ${taxCode} doesn't exist or isn't valid for legislation ${legislation}.`,
        );
      }
      tax = taxCode;
    } else if (taxCode && taxCode.trim() !== '') {
      tax = ''; // Clear tax code if not required
    }

    return { businessPartner: partner, taxCode: tax };
  }

  /**
   * Calculate amounts (debit/credit) in both transaction and ledger currencies.
   */
  calculateLineAmounts(
    debit: number,
    credit: number,
    ledger: string,
    rates: JournalEntryRateCurrency[],
  ): JournalEntryLineAmount {
    let accountingEntryValues: JournalEntryLineAmount = {
      debitOrCredit: 0,
      currency: '',
      currencyAmount: new Prisma.Decimal(0),
      ledgerCurrency: '',
      ledgerAmount: new Prisma.Decimal(0),
    };

    // Find the exchange rate for the current ledger
    const rate = rates.find((r) => r.ledger === ledger);

    // If the entry is a debit
    if (debit) {
      accountingEntryValues.debitOrCredit = 1;
      accountingEntryValues.currency = rate?.sourceCurrency || '';
      accountingEntryValues.currencyAmount = new Prisma.Decimal(debit);
      accountingEntryValues.ledgerCurrency = rate?.destinationCurrency || '';
      accountingEntryValues.ledgerAmount = accountingEntryValues.currencyAmount
        .mul(rate?.rate || 1)
        .div(rate?.divisor || 1)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    }

    // If the entry is a credit
    if (credit) {
      accountingEntryValues.debitOrCredit = -1;
      accountingEntryValues.currency = rate?.sourceCurrency || '';
      accountingEntryValues.currencyAmount = new Prisma.Decimal(credit);
      accountingEntryValues.ledgerCurrency = rate?.destinationCurrency || '';
      accountingEntryValues.ledgerAmount = accountingEntryValues.currencyAmount
        .mul(rate?.rate || 1)
        .div(rate?.divisor || 1)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    }

    return accountingEntryValues;
  }
}
