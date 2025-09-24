import { BadRequestException, Injectable } from '@nestjs/common';
import { AccountingModel, Prisma } from '@prisma/client';
import { ParametersService } from '../../common/parameters/parameter.service';
import { ExchangeRateTypeGQL } from '../../common/registers/enum-register';
import { AccountService } from '../../common/services/account.service';
import { CommonService } from '../../common/services/common.service';
import { CurrencyService } from '../../common/services/currency.service';
import {
  JournalEntryCompanySiteInfo,
  JournalEntryContext,
  JournalEntryLedger,
  JournalEntryLedgerWithPlanAndAccounts,
  JournalEntryRateCurrency,
} from '../../common/types/journal-entry.types';
import { getYearAndMonth, YearMonth } from '../../common/utils/date.utils';
import {
  ExchangeRateTypeGQLToExchangeRateType,
  ExchangeRateTypeToExchangeRateTypeGQL,
} from '../../common/utils/enums/convert-enum';
import { LocalMenus } from '../../common/utils/enums/local-menu';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessPartnerService } from '../business-partners/business-partner.service';
import { JournalEntryLineInput } from './dto/journal-entry-line.input';
import { CreateJournalEntryInput } from './dto/journal-entry.input';
import { validateLines } from './validators/journal-entry-lines.validation';

@Injectable()
export class JournalEntryValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parametersService: ParametersService,
    private readonly commonService: CommonService,
    private readonly accountService: AccountService,
    private readonly currencyService: CurrencyService,
    private readonly businessPartnerService: BusinessPartnerService,
  ) {}

  /**
   * Validate if the entire CreateJournalEntryInput object is valid.
   * @param input - The CreateJournalEntryInput to be validated.
   * @returns A valid context object
   * @throws HttpException if validation fails.
   */
  async validate(input: CreateJournalEntryInput): Promise<JournalEntryContext> {
    const { company, documentType, lines } = input;

    if (!lines || lines.length < 2) {
      throw new BadRequestException('At least two journal entry lines are required.');
    }

    // Check if the lines has only one debit or credit
    this.validateDebitCreditFields(lines);

    // Check if the journal entry is balanced
    await this.checkIfJournalEntryIsBalanced(lines);

    const accountingDate = input.accountingDate ?? new Date();

    // Get the accounting model from company
    const companyModel = await this.prisma.company.findUnique({
      where: { company: company },
      select: {
        accountingModel: true,
        legislation: true,
        isLegalCompany: true,
        dimensionType1: true,
        dimensionType2: true,
        dimensionType3: true,
        dimensionType4: true,
        dimensionType5: true,
        dimensionType6: true,
        dimensionType7: true,
        dimensionType8: true,
        dimensionType9: true,
        dimensionType10: true,
      },
    });

    if (!companyModel) {
      throw new BadRequestException(`Accounting model for company "${company}" not found.`);
    }

    // Check if the document type informed is valid
    const documentTypeIsValid = await this.accountService.getDocumentType(documentType, companyModel.legislation);

    if (!documentTypeIsValid) {
      throw new BadRequestException(
        `Document type "${documentType}" is not valid for legislation "${companyModel.legislation}".`,
      );
    }

    // Fetch the ledgers associated with the accounting model
    const ledgers = await this.accountService.getLedgers(companyModel.accountingModel);

    if (!ledgers) {
      throw new BadRequestException(`No ledgers found for accounting model "${companyModel.accountingModel}".`);
    }

    // Get the currency rates used in the journal entry
    const globalCurrency = await this.parametersService.getParameterValue('', '', 'EURO');
    const accountingModelData = await this.accountService.getAccountingModel(companyModel.accountingModel);
    if (!accountingModelData) {
      throw new BadRequestException(`Accounting model data for "${companyModel.accountingModel}" not found.`);
    }

    const defaultRateType: ExchangeRateTypeGQL = ExchangeRateTypeToExchangeRateTypeGQL[documentTypeIsValid.rateType];
    if (!defaultRateType) {
      throw new BadRequestException(`No default rate type found for document type.`);
    }

    // If the document type requires a source document date, ensure it's provided
    if (documentTypeIsValid.rateDate === LocalMenus.RateDate.SOURCE_DOCUMENT_DATE && !input.sourceDocumentDate) {
      throw new BadRequestException('Source document date is required for the selected document type.');
    }

    // Determine the rate info based on the document type settings
    const rateType = input.rateType ?? defaultRateType;
    const rateDate =
      documentTypeIsValid.rateDate === LocalMenus.RateDate.JOURNAL_ENTRY_DATE
        ? accountingDate
        : (input.sourceDocumentDate ?? new Date());

    const rates = await this.ledgerCurrencyRates(
      globalCurrency?.value ?? 'EUR',
      accountingModelData,
      input.sourceCurrency,
      rateType,
      rateDate,
    );

    // Collect all account codes from the journal entry lines
    const accountCodes = lines.map((line) => line.account);

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
          throw new BadRequestException(`Ledger "${ledgerCode}" not found.`);
        }

        // Get the plan code associated with the ledger
        const planCode = await this.accountService.getPlanCode(ledgerCode);
        if (!planCode) {
          // Throw an error if a valid ledger does not have a plan.
          throw new BadRequestException(`Plan code for ledger "${ledgerCode}" not found.`);
        }

        // Fetch the details of the accounts for THIS specific plan.
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

    const ledgerMap: JournalEntryLedger[] = accounts.map((item) => {
      return {
        ledger: item.ledgerCode ?? '',
        data: item.ledger,
      };
    });

    const fiscalYear = await this.commonService.getFiscalYear(
      company,
      LocalMenus.LedgerType.LEGAL,
      accountingDate.getFullYear(),
    );

    const yearMonth: YearMonth = getYearAndMonth(accountingDate);

    if (!fiscalYear || fiscalYear.ledgerTypeNumber === undefined || fiscalYear.code === undefined) {
      throw new BadRequestException('Fiscal year or its properties are missing.');
    }

    const period = await this.commonService.getPeriod(company, fiscalYear.ledgerTypeNumber, fiscalYear.code, yearMonth);

    const companyInfo: JournalEntryCompanySiteInfo = {
      companyCode: company,
      siteCode: input.site,
      isLegalCompany: companyModel.isLegalCompany === LocalMenus.NoYes.YES,
      companyLegislation: companyModel.legislation,
    };

    const lineContext = await validateLines(
      lines,
      companyInfo,
      fiscalYear.code,
      period,
      accounts,
      rates,
      this.commonService,
      this.businessPartnerService,
      this.prisma,
    );

    // Create the context header
    const dimensionTypes: string[] | null = [];
    for (let i = 1; i <= 10; i++) {
      let dimension = companyModel[`dimensionType${i}`] as string | null;
      if (dimension) {
        dimensionTypes.push(dimension);
      }
    }

    const context: JournalEntryContext = {
      ...input,
      ledgers: ledgerMap,
      accountingDate: accountingDate,
      accountingModel: accountingModelData,
      legislation: companyModel.legislation,
      journalEntryTransaction: 'STDCO',
      category: LocalMenus.AccountingJournalCategory.ACTUAL,
      status: LocalMenus.AccountingJournalStatus.TEMPORARY,
      source: LocalMenus.EntryOrigin.DIRECT_ENTRY,
      documentType: documentTypeIsValid,
      typeOfOpenItem: documentTypeIsValid.openItemType,
      fiscalYear: fiscalYear.code,
      period: period ?? 0,
      currencyRates: rates,
      dimensionTypes: dimensionTypes,
      lines: lineContext || [],
    };

    return context;
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
   * Check if the journal entry is balanced.
   * @param lines - The journal entry lines to be checked.
   * @throws BadRequestException if the journal entry is not balanced.
   */
  private async checkIfJournalEntryIsBalanced(lines: JournalEntryLineInput[]): Promise<void> {
    const totalDebit = lines.reduce((sum, line) => sum.add(line.debit ?? 0), new Prisma.Decimal(0));
    const totalCredit = lines.reduce((sum, line) => sum.add(line.credit ?? 0), new Prisma.Decimal(0));

    if (!totalDebit.equals(totalCredit)) {
      throw new BadRequestException('Journal entry is not balanced.');
    }
  }

  /**
   * Validate that each journal entry line has either a debit or a credit field, but not both.
   * @param lines - The journal entry lines to be validated.
   * @throws BadRequestException if any line has both or neither fields.
   */
  private validateDebitCreditFields(lines: JournalEntryLineInput[]): void {
    for (const [index, line] of lines.entries()) {
      const hasDebit = line.debit !== undefined;
      const hasCredit = line.credit !== undefined;

      if (hasDebit && hasCredit) {
        throw new BadRequestException(`Line #${index + 1}: Cannot have both a debit and a credit field.`);
      }
      if (!hasDebit && !hasCredit) {
        throw new BadRequestException(`Line #${index + 1}: Must have either a debit or a credit field.`);
      }
    }
  }
}
