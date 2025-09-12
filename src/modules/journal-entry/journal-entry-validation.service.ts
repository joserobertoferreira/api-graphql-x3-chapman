import { BadRequestException, Injectable } from '@nestjs/common';
import { AccountingModel, Prisma } from '@prisma/client';
import { ParametersService } from '../../common/parameters/parameter.service';
import { AccountService } from '../../common/services/account.service';
import { CommonService } from '../../common/services/common.service';
import { CurrencyService } from '../../common/services/currency.service';
import { RateCurrency } from '../../common/types/common.types';
import { JournalEntryContext, JournalEntryLedgerWithPlanAndAccounts } from '../../common/types/journal-entry.types';
import { getYearAndMonth, YearMonth } from '../../common/utils/date.utils';
import { ExchangeRateTypeGQLToExchangeRateType } from '../../common/utils/enums/convert-enum';
import { LocalMenus } from '../../common/utils/enums/local-menu';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessPartnerService } from '../business-partners/business-partner.service';
import { JournalEntryLineInput } from './dto/journal-entry-line.input';
import { CreateJournalEntryInput } from './dto/journal-entry.input';
import { validateLines } from './journal-entry-lines.validation';

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

    const accountingDate = input.accountingDate ?? new Date();

    // Get the accounting model from company
    const accountingModel = await this.prisma.company.findUnique({
      where: { company: company },
      select: { accountingModel: true, legislation: true },
    });

    if (!accountingModel) {
      throw new BadRequestException(`Accounting model for company "${company}" not found.`);
    }

    // Check if the document type informed is valid
    const documentTypeIsValid = await this.accountService.getDocumentType(documentType, accountingModel.legislation);

    if (!documentTypeIsValid) {
      throw new BadRequestException(
        `Document type "${documentType}" is not valid for legislation "${accountingModel.legislation}".`,
      );
    }

    // Fetch the ledgers associated with the accounting model
    const ledgers = await this.accountService.getLedgers(accountingModel.accountingModel);

    if (!ledgers) {
      throw new BadRequestException(`No ledgers found for accounting model "${accountingModel.accountingModel}".`);
    }

    // Collect all account codes from the journal entry lines
    const accountCodes = lines.map((line) => line.account);

    // Maps each ledger from the array to a "promise" of an enriched object.
    const ledgersPromises: Promise<JournalEntryLedgerWithPlanAndAccounts>[] = ledgers.ledgers.map(
      async (ledgerCode) => {
        // If the ledger code is blank, return an "empty" object immediately.
        if (!ledgerCode || ledgerCode.trim() === '') {
          return {
            ledgerCode: null,
            ledger: null,
            planCode: null,
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

    // const accountMap = new Map<string, Map<string, Accounts>>(); TALVEZ NAO PRECISE MAIS

    // for (const item of accounts) {
    //   if (item.ledgerCode && item.accounts.length > 0) {
    //     // For each ledger, create an internal map of its accounts
    //     const accountsForThisLedger = new Map<string, Accounts>(item.accounts.map((acc) => [acc.account, acc]));

    //     // Keep the map of accounts in the main map, using ledgerCode as key
    //     accountMap.set(item.ledgerCode, accountsForThisLedger);
    //   }
    // }

    // Get the currency rates used in the journal entry
    const globalCurrency = await this.parametersService.getParameterValue('', '', 'EURO');
    const accountingModelData = await this.accountService.getAccountingModel(accountingModel.accountingModel);
    if (!accountingModelData) {
      throw new BadRequestException(`Accounting model data for "${accountingModel.accountingModel}" not found.`);
    }

    const rates = await this.ledgerCurrencyRates(
      globalCurrency?.value ?? 'EUR',
      accountingModelData,
      input.sourceCurrency,
      input.rateType ?? 'monthlyRate',
      accountingDate,
    );

    const fiscalYear = await this.commonService.getFiscalYear(
      company,
      LocalMenus.LedgerType.LEGAL,
      accountingDate.getFullYear(),
    );

    const yearMonth: YearMonth = getYearAndMonth(accountingDate);

    if (!fiscalYear || fiscalYear.ledgerTypeNumber === undefined || fiscalYear.code === undefined) {
      throw new BadRequestException('Fiscal year or its properties are missing.');
    }

    console.log(yearMonth);

    const period = await this.commonService.getPeriod(company, fiscalYear.ledgerTypeNumber, fiscalYear.code, yearMonth);

    const lineContext = await validateLines(
      lines,
      company,
      fiscalYear.code,
      period,
      accounts,
      this.commonService,
      this.businessPartnerService,
    );

    console.log('lineContext', lineContext);

    // Check if the journal entry is balanced
    await this.checkIfJournalEntryIsBalanced(lines);

    // Create the context header
    const context: JournalEntryContext = {
      ...input,
      ledgers: null as any, // entryLedgers as any,
      accountingDate: accountingDate,
      accountingModel: accountingModelData,
      legislation: accountingModel.legislation,
      journalEntryTransaction: 'STDCO',
      category: LocalMenus.AccountingJournalCategory.ACTUAL,
      status: LocalMenus.AccountingJournalStatus.TEMPORARY,
      source: LocalMenus.EntryOrigin.DIRECT_ENTRY,
      documentType: documentTypeIsValid,
      typeOfOpenItem: LocalMenus.DueDateItemType.OTHERS,
      fiscalYear: fiscalYear.code,
      period: period ?? null,
      currencyRates: rates,
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
  ): Promise<RateCurrency[]> {
    const currencyRates: Promise<RateCurrency>[] = [];
    const localMenuRateType = ExchangeRateTypeGQLToExchangeRateType[rateType];

    for (let i = 1; i <= 10; i++) {
      const destinationCurrency = accountingModel[`currency${i}` as keyof AccountingModel] as string | null;

      const promise = new Promise<RateCurrency>(async (resolve) => {
        if (!destinationCurrency || destinationCurrency.trim() === '') {
          resolve({ rate: new Prisma.Decimal(0), divisor: new Prisma.Decimal(1), status: 0 });
          return;
        } else if (destinationCurrency === sourceCurrency) {
          resolve({ rate: new Prisma.Decimal(1), divisor: new Prisma.Decimal(1), status: 0 });
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

          resolve({ rate: currencyRate?.rate ?? 0, divisor, status: currencyRate?.status ?? 0 });
        } catch (error) {
          console.error(`Erro ao buscar taxa para ${sourceCurrency} -> ${destinationCurrency}:`, error);
          resolve({ rate: new Prisma.Decimal(0), divisor: new Prisma.Decimal(1), status: 0 });
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
  async checkIfJournalEntryIsBalanced(lines: JournalEntryLineInput[]): Promise<void> {
    const totalDebit = lines.reduce((sum, line) => sum.add(line.debit), new Prisma.Decimal(0));
    const totalCredit = lines.reduce((sum, line) => sum.add(line.credit), new Prisma.Decimal(0));

    if (!totalDebit.equals(totalCredit)) {
      throw new BadRequestException('Journal entry is not balanced.');
    }
  }
}
