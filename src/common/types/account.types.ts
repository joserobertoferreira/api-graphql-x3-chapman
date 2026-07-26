import { Decimal } from '@prisma/client/runtime/client';
import { Accounts, Ledger } from 'src/generated/prisma/client';
import { DimensionsInput } from '../inputs/dimension.input';
import { LocalMenus } from '../utils/enums/local-menu';
import { DimensionTypeConfig } from './dimension.types';
import { JournalEntryBusinessPartnerInfo, JournalEntryLineAmount } from './journal-entry.types';

// Interfaces

/**
 * An object representing a payload to validate accounts
 */
export interface AccountValidationPayload {
  account: string;
  site?: string;
}

/**
 * Shared line-validation context: the subset of fields that line-level
 * validation (account/dimension/business partner/tax) actually reads,
 * common to journal entry, supplier invoice, and similar documents.
 */
export interface BaseLineValidationContext {
  companyInfo: {
    companyCode: string;
    siteCode: string;
    companyLegislation: string;
  };
  fiscalYear: number;
  period: number | null;
  ledgerMap: {
    ledgerCode: string;
    ledger: Ledger;
    planCode: string;
    accounts: Accounts[];
  }[];
  exchangeRates: {
    ledger: string;
    sourceCurrency: string;
    destinationCurrency: string;
    rate: Decimal;
    divisor?: Decimal;
    status: number;
  }[];
  dimensionTypesMap: Map<string, DimensionTypeConfig>;
  accountingDate: Date;
  isExcel?: boolean;
}

/**
 * The fields added to a line once it has passed validation, shared by
 * journal entry, supplier invoice, and any other document that reuses
 * this line-validation pipeline. `dimensions` and `businessPartner` are
 * redeclared (not inherited from TLine) because validation replaces them
 * with resolved values of a different shape than the raw input line.
 */
export interface LineValidationExtras {
  lineNumber: number;
  ledgerType: LocalMenus.LedgerType;
  ledger: string;
  fiscalYear: number;
  period: number;
  planCode: string;
  account: string;
  collective: string;
  dimensions: DimensionsInput;
  amounts: JournalEntryLineAmount;
  businessPartner: JournalEntryBusinessPartnerInfo[] | null;
  unitOfWorkFlag?: number;
  nonFinancialUnit?: string;
}

// Types

/**
 * The rules required to validate an account within a journal entry line
 */
export type AccountValidationContextRules = {
  lineNumber: number;
  ledgerCode: string;
  legislation: string;
  accountCode: string;
  businessPartner?: string;
  businessPartners: Map<string, any>;
  taxCode?: string;
  taxCodes: Set<string>;
  isExcel?: boolean;
  currentUser?: string;
  accountingDate: Date;
  site: string;
};

/**
 * This type represents a minimum request to validate a input line.
 * Shared shape between journal entry, supplier invoice, and similar
 * document lines. `amount` is the single-sided value used by documents with
 * no debit/credit distinction (e.g. supplier invoice lines); `debit`/`credit`
 * are used by documents that must balance (e.g. journal entry lines).
 */
export type AccountValidationLineInput = {
  account: string;
  businessPartner?: string;
  taxCode?: string;
  debit?: number;
  credit?: number;
  amount?: number;
  dimensions?: DimensionsInput;
};

/**
 * The validated line context for a given input line type: the raw line
 * fields (minus the ones validation replaces) plus the resolved extras.
 */
export type LineContext<TLine extends AccountValidationLineInput> = Omit<TLine, 'dimensions' | 'businessPartner'> &
  LineValidationExtras;
