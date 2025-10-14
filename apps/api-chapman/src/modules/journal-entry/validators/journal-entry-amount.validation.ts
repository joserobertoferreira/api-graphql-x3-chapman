import { Decimal } from '@prisma/client/runtime/library';
import { JournalEntryLineAmount, JournalEntryRateCurrency } from '../../../common/types/journal-entry.types';
import { JournalEntryLineInput } from '../dto/create-journal-entry-line.input';

/**
 * Calculate amounts (debit/credit) in both transaction and ledger currencies.
 */
export function calculateJournalEntryLineAmounts(
  line: JournalEntryLineInput,
  ledger: string,
  rates: JournalEntryRateCurrency[],
): JournalEntryLineAmount {
  let accountingEntryValues: JournalEntryLineAmount = {
    debitOrCredit: 0,
    currency: '',
    currencyAmount: new Decimal(0),
    ledgerCurrency: '',
    ledgerAmount: new Decimal(0),
  };

  // Find the exchange rate for the current ledger
  const rate = rates.find((r) => r.ledger === ledger);

  // If the entry is a debit
  if (line.debit) {
    accountingEntryValues.debitOrCredit = 1;
    accountingEntryValues.currency = rate?.sourceCurrency || '';
    accountingEntryValues.currencyAmount = new Decimal(line.debit);
    accountingEntryValues.ledgerCurrency = rate?.destinationCurrency || '';
    accountingEntryValues.ledgerAmount = accountingEntryValues.currencyAmount
      .mul(rate?.rate || 1)
      .div(rate?.divisor || 1)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  // If the entry is a credit
  if (line.credit) {
    accountingEntryValues.debitOrCredit = -1;
    accountingEntryValues.currency = rate?.sourceCurrency || '';
    accountingEntryValues.currencyAmount = new Decimal(line.credit);
    accountingEntryValues.ledgerCurrency = rate?.destinationCurrency || '';
    accountingEntryValues.ledgerAmount = accountingEntryValues.currencyAmount
      .mul(rate?.rate || 1)
      .div(rate?.divisor || 1)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  return accountingEntryValues;
}
