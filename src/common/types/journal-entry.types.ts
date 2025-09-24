import { AccountingModel, Accounts, DocumentTypes, Ledger } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { JournalEntryLineInput } from '../../modules/journal-entry/dto/journal-entry-line.input';
import { CreateJournalEntryInput } from '../../modules/journal-entry/dto/journal-entry.input';
import { DimensionInput } from '../inputs/dimension.input';
import { LocalMenus } from '../utils/enums/local-menu';

/**
 * Type definition for a ledger
 */
export interface JournalEntryLedger {
  ledger: string;
  data: Ledger | null;
}

/**
 * Type definition for a ledger with its associated plan and accounts.
 */
export interface JournalEntryLedgerWithPlanAndAccounts {
  ledgerCode: string;
  ledger: Ledger;
  planCode: string;
  accounts: Accounts[];
}

/**
 * Type definition for a journal entry line with account details.
 */
export interface JournalEntryLineContext extends Omit<JournalEntryLineInput, 'dimensions'> {
  lineNumber: number;
  ledgerType: LocalMenus.LedgerType;
  ledger: string;
  fiscalYear: number;
  period: number;
  planCode: string;
  collective: string;
  dimensions: DimensionInput[];
  amounts: JournalEntryLineAmount;
}

/**
 * Type definition for a journal entry.
 */
export type JournalEntryContext = Omit<
  CreateJournalEntryInput,
  'accountingModel' | 'accountingDate' | 'ledgers' | 'documentType' | 'lines'
> & {
  accountingModel: AccountingModel;
  accountingDate: Date;
  legislation: string;
  journalEntryTransaction: string;
  category: LocalMenus.AccountingJournalCategory;
  status: LocalMenus.AccountingJournalStatus;
  source: LocalMenus.EntryOrigin;
  documentType: DocumentTypes;
  typeOfOpenItem: LocalMenus.DueDateItemType;
  fiscalYear: number;
  period: number;
  dimensionTypes: string[];
  currencyRates: JournalEntryRateCurrency[];
  ledgers: JournalEntryLedger[];
} & {
  lines: JournalEntryLineContext[];
};

/**
 * Type definition for exchange rates associated with journal entries.
 */
export type JournalEntryRateCurrency = {
  ledger: string;
  sourceCurrency: string;
  destinationCurrency: string;
  rate: Decimal;
  divisor?: Decimal;
  status: number;
};

/**
 * Type definition for amount values for journal entry lines.
 */
export type JournalEntryLineAmount = {
  debitOrCredit: number;
  currency: string;
  currencyAmount: Decimal;
  ledgerCurrency: string;
  ledgerAmount: Decimal;
};

/**
 * Type definition for company and site information to validate dimensions.
 */
export type JournalEntryCompanySiteInfo = {
  companyCode: string;
  siteCode: string;
  isLegalCompany: boolean;
  companyLegislation: string;
};
