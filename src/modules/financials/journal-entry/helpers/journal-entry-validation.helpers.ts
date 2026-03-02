import { AccountingModel, Prisma } from 'src/generated/prisma/client';
import { ExchangeRateTypeGQL } from '../../../../common/registers/enum-register';
import { CurrencyService } from '../../../../common/services/currency.service';
import { JournalEntryRateCurrency } from '../../../../common/types/journal-entry.types';
import { ExchangeRateTypeGQLToExchangeRateType } from '../../../../common/utils/enums/convert-enum';
import { CreateJournalEntryInput } from '../dto/create-journal-entry.input';

/**
 * Check if the source document date is valid.
 * @param input - The normalized journal entry input.
 * @returns True if the source document date is valid.
 * @throws BadRequestException if the source document date is invalid.
 */
export function isSourceDocumentDateValid(input: CreateJournalEntryInput): boolean {
  return !!input.sourceDocumentDate;
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
  const localMenuRateType = ExchangeRateTypeGQLToExchangeRateType[rateType as ExchangeRateTypeGQL];

  for (let i = 1; i <= 10; i++) {
    let ledger = accountingModel[`ledger${i}` as keyof AccountingModel] as string | null;
    const destinationCurrency = accountingModel[`currency${i}` as keyof AccountingModel] as string | null;

    if (!ledger) {
      ledger = '';
    }

    const promise = (async (): Promise<JournalEntryRateCurrency> => {
      if (!destinationCurrency || destinationCurrency.trim() === '') {
        return {
          ledger: ledger,
          sourceCurrency: '',
          destinationCurrency: '',
          rate: new Prisma.Decimal(0),
          divisor: new Prisma.Decimal(1),
          status: 0,
        };
      } else if (destinationCurrency === sourceCurrency) {
        return {
          ledger: ledger,
          sourceCurrency: sourceCurrency,
          destinationCurrency: destinationCurrency,
          rate: new Prisma.Decimal(1),
          divisor: new Prisma.Decimal(1),
          status: 0,
        };
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

        return {
          ledger: ledger,
          sourceCurrency: sourceCurrency,
          destinationCurrency: destinationCurrency,
          rate: currencyRate?.rate ?? 0,
          divisor,
          status: currencyRate?.status ?? 0,
        };
      } catch (error) {
        console.error(`Erro ao buscar taxa para ${sourceCurrency} -> ${destinationCurrency}:`, error);
        return {
          ledger: ledger,
          sourceCurrency: '',
          destinationCurrency: '',
          rate: new Prisma.Decimal(0),
          divisor: new Prisma.Decimal(1),
          status: 0,
        };
      }
    })();

    currencyRates.push(promise);
  }

  const results = await Promise.all(currencyRates);
  return results;
}
