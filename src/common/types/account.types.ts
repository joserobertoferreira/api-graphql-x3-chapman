// Interfaces

/**
 * An object representing a payload to validate accounts
 */
export interface AccountValidationPayload {
  account: string;
  site?: string;
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
