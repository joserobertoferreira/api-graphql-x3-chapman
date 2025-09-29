import { BadRequestException } from '@nestjs/common';
import { AccountingModel, DocumentTypes, EntryTransaction, Prisma } from '@prisma/client';
import { ParametersService } from '../../../common/parameters/parameter.service';
import { ExchangeRateTypeGQL } from '../../../common/registers/enum-register';
import { AccountService } from '../../../common/services/account.service';
import { CommonService } from '../../../common/services/common.service';
import { CurrencyService } from '../../../common/services/currency.service';
import { DEFAULT_LEGACY_DATE } from '../../../common/types/common.types';
import {
  JournalEntryDatesInfo,
  JournalEntryLedger,
  JournalEntryLedgerWithPlanAndAccounts,
  JournalEntryRateCurrency,
} from '../../../common/types/journal-entry.types';
import { convertStringToDate, getYearAndMonth, isDateInRange, YearMonth } from '../../../common/utils/date.utils';
import {
  ExchangeRateTypeGQLToExchangeRateType,
  ExchangeRateTypeToExchangeRateTypeGQL,
} from '../../../common/utils/enums/convert-enum';
import { LocalMenus } from '../../../common/utils/enums/local-menu';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateJournalEntryInput } from '../dto/create-journal-entry.input';

/**
 * Retrieves the company accounting model and validates the provided document type code
 * against the company's legislation.
 *
 * @param companyCode - The unique code identifying the company.
 * @param documentTypeCode - The code of the document type to validate.
 * @param prisma - The PrismaService instance for database access.
 * @param accountService - The AccountService instance for document type validation.
 * @returns An object containing the company model and a boolean indicating if the document type is valid.
 * @throws BadRequestException If the company model is not found or the document type is invalid for the legislation.
 */
export async function getCompanyAndDocumentType(
  companyCode: string,
  documentTypeCode: string,
  prisma: PrismaService,
  accountService: AccountService,
) {
  // Get the accounting model from company
  const companyModel = await prisma.company.findUnique({
    where: { company: companyCode },
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
      isMandatoryDimension1: true,
      isMandatoryDimension2: true,
      isMandatoryDimension3: true,
      isMandatoryDimension4: true,
      isMandatoryDimension5: true,
      isMandatoryDimension6: true,
      isMandatoryDimension7: true,
      isMandatoryDimension8: true,
      isMandatoryDimension9: true,
      isMandatoryDimension10: true,
    },
  });

  if (!companyModel) {
    throw new BadRequestException(`Accounting model for company "${companyCode}" not found.`);
  }

  // Check if the document type informed is valid
  const documentTypeIsValid = await accountService.getDocumentType(documentTypeCode, companyModel.legislation);

  if (!documentTypeIsValid) {
    throw new BadRequestException(
      `Document type "${documentTypeCode}" is not valid for legislation "${companyModel.legislation}".`,
    );
  }

  return { companyModel, documentTypeIsValid };
}

/**
 * Fetches the ledgers from the accounting model and enriches them with account details.
 * @param accountingModel - The accounting model code.
 * @param accountCodes - An array of account codes to fetch details for.
 * @param accountService - The AccountService instance to use for fetching data.
 * @returns An array of JournalEntryLedgerWithPlanAndAccounts.
 */
export async function getLedgersAndAccountsInformation(
  accountingModel: string,
  accountCodes: string[],
  accountService: AccountService,
): Promise<{
  ledgers: JournalEntryLedger[];
  accounts: JournalEntryLedgerWithPlanAndAccounts[];
}> {
  // Fetch the ledgers associated with the accounting model
  const ledgers = await accountService.getLedgers(accountingModel);

  if (!ledgers) {
    throw new BadRequestException(`No ledgers found for accounting model "${accountingModel}".`);
  }

  // Maps each ledger from the array to a "promise" of an enriched object.
  const ledgersPromises: Promise<JournalEntryLedgerWithPlanAndAccounts>[] = ledgers.ledgers.map(async (ledgerCode) => {
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
    const ledger = await accountService.getLedger(ledgerCode);
    if (!ledger) {
      // Throw an error if the ledger does not exist.
      throw new BadRequestException(`Ledger "${ledgerCode}" not found.`);
    }

    // Get the plan code associated with the ledger
    const planCode = await accountService.getPlanCode(ledgerCode);
    if (!planCode) {
      // Throw an error if a valid ledger does not have a plan.
      throw new BadRequestException(`Plan code for ledger "${ledgerCode}" not found.`);
    }

    // Fetch the details of the accounts for THIS specific plan.
    const accounts = await accountService.getAccounts(planCode, accountCodes);

    // Return the complete enriched object for this ledger.
    return {
      ledgerCode: ledgerCode,
      ledger: ledger,
      planCode: planCode,
      accounts: accounts,
    };
  });

  // Execute all ledger enrichment promises in parallel.
  const accounts = await Promise.all(ledgersPromises);

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
 * Determina os parâmetros corretos e busca todas as taxas de câmbio necessárias.
 * @returns Um array de JournalEntryRateCurrency.
 */
export async function getCurrencyRates(
  input: CreateJournalEntryInput,
  documentType: DocumentTypes, // Tipo real do seu documento
  accountingModel: string,
  accountingDate: Date,
  parametersService: ParametersService,
  accountService: AccountService,
  currencyService: CurrencyService,
): Promise<{
  rates: JournalEntryRateCurrency[];
  accountingModelData: AccountingModel;
}> {
  // Get the currency rates used in the journal entry
  const globalCurrency = await parametersService.getParameterValue('', '', '', 'EURO');
  const accountingModelData = await accountService.getAccountingModel(accountingModel);
  if (!accountingModelData) {
    throw new BadRequestException(`Accounting model data for "${accountingModel}" not found.`);
  }

  const defaultRateType: ExchangeRateTypeGQL = ExchangeRateTypeToExchangeRateTypeGQL[documentType.rateType];
  if (!defaultRateType) {
    throw new BadRequestException(`No default rate type found for document type.`);
  }

  // If the document type requires a source document date, ensure it's provided
  if (documentType.rateDate === LocalMenus.RateDate.SOURCE_DOCUMENT_DATE && !input.sourceDocumentDate) {
    throw new BadRequestException('Source document date is required for the selected document type.');
  }

  // Determine the rate info based on the document type settings
  const rateType = input.rateType ?? defaultRateType;
  const rateDate =
    documentType.rateDate === LocalMenus.RateDate.JOURNAL_ENTRY_DATE
      ? accountingDate
      : (input.sourceDocumentDate ?? new Date());

  const rates = await ledgerCurrencyRates(
    globalCurrency?.value ?? 'EUR',
    accountingModelData,
    input.sourceCurrency,
    rateType,
    rateDate,
    currencyService,
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
 * @param currencyService - The CurrencyService instance to fetch currency rates.
 * @returns An array with the currency rate for each ledger or null.
 */
export async function ledgerCurrencyRates(
  globalCurrency: string,
  accountingModel: AccountingModel,
  sourceCurrency: string,
  rateType: string,
  date: Date,
  currencyService: CurrencyService,
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
        const currencyRate = await currencyService.getCurrencyRate(
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
 * Helper function to validate dimensions for a journal entry line.
 * @param lineNumber - line number
 * @param ledgerCode - The ledger code for context in error messages.
 * @param dimensions - An array of the dimensions { dimensionType, dimension } provided in the journal entry line.
 * @param prismaService - The Prisma service instance.
 * @throws BadRequestException or NotFoundException if validation fails.
 */
export async function validateDimensions(
  lineNumber: number,
  ledgerCode: string,
  dimensions: { dimensionType: string; dimension: string }[] | null,
  prismaService: PrismaService,
): Promise<void> {
  if (!dimensions || dimensions.length === 0) {
    return;
  }

  const results = await prismaService.dimensions.findMany({
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
          `Line #${lineNumber}: Ledger [${ledgerCode}]: Dimension value "${notFoundDimensions.dimension}" ` +
          `does not exist for type "${notFoundDimensions.dimensionType}".`,
      });
    }
  }

  for (const dbDimension of results) {
    if (dbDimension.isActive !== LocalMenus.NoYes.YES) {
      throw new BadRequestException(
        `Line #${lineNumber}, Ledger [${ledgerCode}]: Dimension ${dbDimension.dimensionType} "${dbDimension.dimension}" is inactive.`,
      );
    }
  }
}

/**
 * Control of the exercise and period + validity dates
 * @param accountingDate - The accounting date to validate.
 * @param company - The company associated with the journal entry.
 * @param entryTransaction - The journal entry transaction type.
 * @param documentType - The document type associated with the journal entry.
 * @param commonService - The CommonService instance to use for fetching fiscal year and period data.
 * @returns An object containing the accounting date, fiscal year, and period.
 * @throws BadRequestException if validation fails.
 */
export async function validateAccountingDate(
  accountingDate: Date,
  company: string,
  entryTransaction: EntryTransaction,
  documentType: DocumentTypes,
  commonService: CommonService,
  parametersService: ParametersService,
): Promise<JournalEntryDatesInfo> {
  // Determine the fiscal year and period based on the accounting date
  const fiscalYear = await commonService.getFiscalYear(
    company,
    LocalMenus.LedgerType.LEGAL,
    accountingDate.getFullYear(),
  );

  if (!fiscalYear || fiscalYear.ledgerTypeNumber === undefined || fiscalYear.code === undefined) {
    throw new BadRequestException('Fiscal year or its properties are missing.');
  }
  if (fiscalYear.status === LocalMenus.FiscalYearReport.CLOSED) {
    throw new BadRequestException(`Fiscal year "${fiscalYear.code}" is closed.`);
  }
  if (fiscalYear.status !== LocalMenus.FiscalYearReport.OPEN) {
    throw new BadRequestException(`Fiscal year "${fiscalYear.code}" is not open.`);
  }

  const yearMonth: YearMonth = getYearAndMonth(accountingDate);

  const period = await commonService.getPeriod(company, fiscalYear.ledgerTypeNumber, fiscalYear.code, yearMonth);
  if (!period) {
    throw new BadRequestException(`Period for "${yearMonth.year}-${yearMonth.month}" not found.`);
  }
  if (period.status === LocalMenus.FiscalYearPeriodStatus.CLOSED) {
    throw new BadRequestException(`Period "${period.code}" is closed.`);
  }
  if (
    period.status < LocalMenus.FiscalYearPeriodStatus.OPEN ||
    period.status > LocalMenus.FiscalYearPeriodStatus.CLOSED
  ) {
    throw new BadRequestException(`Period "${period.code}" is not open.`);
  }

  // Check if the accounting date is within the validity dates of the entry transaction
  const datesOk = isDateInRange(accountingDate, entryTransaction.validFrom, entryTransaction.validUntil);
  if (!datesOk) {
    throw new BadRequestException(`"${entryTransaction.code}" is outside of validity date limit.`);
  }
  if (documentType.validFrom) {
    const dateOK = isDateInRange(accountingDate, documentType.validFrom, documentType.validUntil);
    if (!dateOK) {
      throw new BadRequestException(`Document type "${documentType.documentType}" is outside of validity date limit.`);
    }
  }

  // Check if the accounting date is within module open and close dates
  const moduleInfo = await commonService.getObjectInformation('GAS');
  if (moduleInfo && moduleInfo.module !== 3) {
    if (moduleInfo.module === 2) {
      // Get the close operations dates
      const accountingStartDate = await parametersService.getParameterValue(
        documentType.legislation,
        '',
        company,
        'CPTSTRDAT',
      );
      const accountingEndDate = await parametersService.getParameterValue(
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
