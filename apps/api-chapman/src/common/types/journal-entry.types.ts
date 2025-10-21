import { Decimal } from '@prisma/client/runtime/library';
import { AccountingModel, Accounts, DocumentTypes, Ledger, Prisma } from 'src/generated/prisma';
import { BaseValidateDimensionContext } from '../../modules/dimensions/strategies/dimension-strategy.interface';
import { JournalEntryLineInput } from '../../modules/journal-entry/dto/create-journal-entry-line.input';
import { CreateJournalEntryInput } from '../../modules/journal-entry/dto/create-journal-entry.input';
import { JournalEntryDimensionInput } from '../inputs/journal-entry-dimension.input';
import { LocalMenus } from '../utils/enums/local-menu';
import { DimensionTypeConfig } from './dimension.types';
import { OpenItemBusinessPartnerInfo } from './opem-item.types';

// Interfaces

/**
 * Interface definition for a ledger
 */
export interface JournalEntryLedger {
  ledger: string;
  data: Ledger | null;
}

/**
 * Interface definition for a ledger with its associated plan and accounts.
 */
export interface JournalEntryLedgerWithPlanAndAccounts {
  ledgerCode: string;
  ledger: Ledger;
  planCode: string;
  accounts: Accounts[];
}

/**
 * Interface definition for a journal entry line with account details.
 */
export interface JournalEntryLineContext extends Omit<JournalEntryLineInput, 'dimensions' | 'businessPartner'> {
  lineNumber: number;
  ledgerType: LocalMenus.LedgerType;
  ledger: string;
  fiscalYear: number;
  period: number;
  planCode: string;
  collective: string;
  dimensions: JournalEntryDimensionInput;
  amounts: JournalEntryLineAmount;
  businessPartner: JournalEntryBusinessPartnerInfo[] | null;
}

/**
 * Specific context for validating dimensions within a Journal Entry.
 * It EXTENDS the base context with entry-specific information.
 */
export interface JournalEntryDimensionContext extends BaseValidateDimensionContext {
  line: JournalEntryLineInput;
  lineNumber: number;
  ledgerCode: string;
}

// Types

/**
 * Type definition for the payloads used to create a journal entry and its lines in the database
 */
export type JournalEntryPayloads = {
  payload: Prisma.JournalEntryCreateInput;
  openItems: Prisma.OpenItemCreateInput[];
};

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
  dimensionTypesMap: Map<string, DimensionTypeConfig>;
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

/**
 * Type definition for accounting date, fiscal year and period information.
 */
export type JournalEntryDatesInfo = {
  accountingDate: Date;
  fiscalYear: number;
  period: number;
};

/**
 * Type definition for a business partner information.
 */
export type JournalEntryBusinessPartnerInfo = {
  code: string;
  isCustomer: number;
  isSupplier: number;
  customer: {
    isActive: number;
    payByCustomer: string;
    payByCustomerAddress: string;
    paymentTerm: string;
    accountingCode: string;
  } | null;
  supplier: {
    isActive: number;
    payToBusinessPartner: string;
    payToBusinessPartnerAddress: string;
    paymentTerm: string;
    accountingCode: string;
  } | null;
  paymentMethod: string | null;
  paymentType: number | null;
};

/**
 * Type definition for the line payload return.
 */
export type LinesPayloadResult = {
  linesPayload: Prisma.JournalEntryLineCreateInput[];
  partnerInfo: OpenItemBusinessPartnerInfo;
};

/**
 * Type definition for automatic journal with lines
 */
export type AutomaticJournalWithLines = Prisma.AutomaticJournalGetPayload<
  ReturnType<typeof automaticJournalWithLinesArgs>
>;

/**
 * Type definition for automatic journal line
 */
export type AutomaticJournalLine = AutomaticJournalWithLines['automaticJournalLines'][number];

// Constants

/**
 * Define the base select for automatic journal with lines.
 */
const automaticJournalLineSelect = {
  lineNumber: true,
  numberType: true,
  accountCondition1: true,
  accountCondition2: true,
  accountCondition3: true,
  accountCondition4: true,
  accountCondition5: true,
  accountCondition6: true,
  accountCondition7: true,
  accountCondition8: true,
  accountCondition9: true,
  accountCondition10: true,
  accountingCode1: true,
  accountingCode2: true,
  accountingCode3: true,
  accountingCode4: true,
  accountingCode5: true,
  accountingCode6: true,
  accountingCode7: true,
  accountingCode8: true,
  accountingCode9: true,
  accountingCode10: true,
  accountingNumber1: true,
  accountingNumber2: true,
  accountingNumber3: true,
  accountingNumber4: true,
  accountingNumber5: true,
  accountingNumber6: true,
  accountingNumber7: true,
  accountingNumber8: true,
  accountingNumber9: true,
  accountingNumber10: true,
};

/**
 * Defines the arguments for the Prisma query.
 */
export const automaticJournalWithLinesArgs = (options?: { lineFilter?: Prisma.AutomaticJournalLinesWhereInput }) => {
  return Prisma.validator<Prisma.AutomaticJournalFindManyArgs>()({
    select: {
      code: true,
      automaticJournalLines: {
        select: automaticJournalLineSelect,
        where: options?.lineFilter,
      },
    },
  });
};
