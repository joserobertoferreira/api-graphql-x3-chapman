import { AccountingModel, Prisma } from 'src/generated/prisma';
import { CurrencyService } from '../../../common/services/currency.service';
import { JournalEntryRateCurrency } from '../../../common/types/journal-entry.types';
import { ExchangeRateTypeGQLToExchangeRateType } from '../../../common/utils/enums/convert-enum';
import { CreateJournalEntryInput } from '../dto/create-journal-entry.input';

// /**
//  * Determina os parâmetros corretos e busca todas as taxas de câmbio necessárias.
//  * @returns Um array de JournalEntryRateCurrency.
//  */
// export async function getCurrencyRates(
//   input: CreateJournalEntryInput | CreateIntercompanyJournalEntryInput,
//   intercompany: boolean,
//   documentType: DocumentTypes, // Tipo real do seu documento
//   accountingModel: string,
//   accountingDate: Date,
//   parametersService: ParametersService,
//   accountService: AccountService,
//   currencyService: CurrencyService,
// ): Promise<{
//   rates: JournalEntryRateCurrency[];
//   accountingModelData: AccountingModel;
// }> {
//   // Get the currency rates used in the journal entry
//   const globalCurrency = await parametersService.getParameterValue('', '', '', 'EURO');
//   const accountingModelData = await accountService.getAccountingModel(accountingModel);
//   if (!accountingModelData) {
//     throw new BadRequestException(`Accounting model data for ${accountingModel} not found.`);
//   }

//   const defaultRateType: ExchangeRateTypeGQL = ExchangeRateTypeToExchangeRateTypeGQL[documentType.rateType];
//   if (!defaultRateType) {
//     throw new BadRequestException(`No default rate type found for document type.`);
//   }

//   let rateDate: Date = new Date();

//   if (!input.rateDate) {
//     if (!intercompany) {
//       // If the document type requires a source document date, ensure it's provided
//       if (documentType.rateDate === LocalMenus.RateDate.SOURCE_DOCUMENT_DATE) {
//         if (!this.isSourceDocumentDateValid(input)) {
//           throw new BadRequestException('Source document date is required for the selected document type.');
//         }
//       } else {
//         // LocalMenus.RateDate.JOURNAL_ENTRY_DATE
//         rateDate = accountingDate;
//       }
//     } else {
//       // For intercompany journal entries, always use the accounting date
//       rateDate = accountingDate;
//     }
//   } else {
//     rateDate = input.rateDate;
//   }

//   // Determine the rate info based on the document type settings
//   const rateType = input.rateType ?? defaultRateType;
//   const rates = await ledgerCurrencyRates(
//     globalCurrency?.value ?? 'GBP',
//     accountingModelData,
//     input.sourceCurrency,
//     rateType,
//     rateDate,
//     currencyService,
//   );

//   return { rates, accountingModelData };
// }

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
