import { AccountingModel, Accounts, DocumentTypes, Ledger } from '@prisma/client';
import { JournalEntryLineInput } from '../../modules/journal-entry/dto/journal-entry-line.input';
import { CreateJournalEntryInput } from '../../modules/journal-entry/dto/journal-entry.input';
import { LocalMenus } from '../utils/enums/local-menu';
import { RateCurrency } from './common.types';

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
  ledgerCode: string | null;
  ledger: Ledger | null;
  planCode: string | null;
  accounts: Accounts[];
}

/**
 * Type definition for a journal entry line with account details.
 */
export interface JournalEntryLineContext extends Omit<JournalEntryLineInput, 'account'> {
  lineNumber: number;
  ledgerType: LocalMenus.LedgerType | null;
  fiscalYear: number | null;
  period: number | null;
  account: Accounts | null;
}

/**
 * Type definition for a journal entry.
 */
export type JournalEntryContext = Omit<
  CreateJournalEntryInput,
  'accountingModel' | 'accountingDate' | 'ledgers' | 'documentType' | 'lines'
> & {
  accountingModel: AccountingModel | null;
  accountingDate: Date;
  legislation: string;
  journalEntryTransaction: string;
  category: LocalMenus.AccountingJournalCategory | null;
  status: LocalMenus.AccountingJournalStatus | null;
  source: LocalMenus.EntryOrigin | null;
  documentType: DocumentTypes | null;
  typeOfOpenItem: LocalMenus.DueDateItemType | null;
  fiscalYear: number | null;
  period: number | null;
  currencyRates: RateCurrency[] | null;
  ledgers: JournalEntryLedger[] | null;
} & {
  lines: JournalEntryLineContext[];
};
