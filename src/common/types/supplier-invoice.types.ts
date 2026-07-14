import { Decimal } from '@prisma/client/runtime/client';
import { Accounts, Ledger, Prisma } from 'src/generated/prisma/client';
import {
  CreateSupplierInvoiceInput,
  SupplierInvoiceLineInput,
} from '../../modules/supplier-invoice/dto/create-supplier-invoice.input';
import { DimensionsInput } from '../inputs/dimension.input';
import { LocalMenus } from '../utils/enums/local-menu';
import { CompanyModel } from './company.types';
import { BaseValidateDimensionContext, DimensionTypeConfig } from './dimension.types';
import { OpenItemBusinessPartnerInfo } from './opem-item.types';

// Interfaces

/**
 * Interface definition for a ledger.
 */
export interface SupplierInvoiceLedger {
  ledger: string;
  data: Ledger | null;
}

/**
 * Interface definition for a ledger with its associated plan and accounts.
 */
export interface SupplierInvoiceLedgerWithPlanAndAccounts {
  ledgerCode: string;
  ledger: Ledger;
  planCode: string;
  accounts: Accounts[];
}

/**
 * Interface definition for a supplier invoice line with account details,
 * already validated and ready to be persisted.
 */
export interface SupplierInvoiceLineContext extends Omit<SupplierInvoiceLineInput, 'dimensions' | 'businessPartner'> {
  lineNumber: number;
  ledgerType: LocalMenus.LedgerType;
  ledger: string;
  fiscalYear: number;
  period: number;
  planCode: string;
  collective: string;
  dimensions: DimensionsInput;
  amounts: SupplierInvoiceLineAmount;
  businessPartner: SupplierInvoiceBusinessPartnerInfo[] | null;
  unitOfWorkFlag?: number;
  nonFinancialUnit?: string;
}

/**
 * Specific context for validating dimensions within a Supplier Invoice line.
 * Extends the base context with entry-specific information.
 */
export interface SupplierInvoiceDimensionContext extends BaseValidateDimensionContext {
  line: SupplierInvoiceLineInput;
  lineNumber: number;
  ledgerCode: string;
}

export interface SupplierInvoiceValidationContext {
  companyInfo: SupplierInvoiceCompanySiteInfo;
  invoiceType: string;
  fiscalYear: number;
  period: number | null;
  ledgerMap: SupplierInvoiceLedgerWithPlanAndAccounts[];
  exchangeRates: SupplierInvoiceRateCurrency[];
  dimensionTypesMap: Map<string, DimensionTypeConfig>;
  accountingDate: Date;
  rateType?: string;
  rateDate?: Date;
  currency?: string;
  isExcel?: boolean;
}

/**
 * Interface definition for supplier invoice number generation.
 * The invoiceType itself is used as the counter code.
 */
export interface SupplierInvoiceSequenceNumber {
  counter: string;
  company: string;
  site: string;
  accountingDate: Date;
  journal: string;
}

/**
 * Interface definition for validation of a supplier invoice line.
 */
export interface SupplierInvoiceValidationLineFields {
  id: number;
  debit?: number;
  credit?: number;
  quantity?: number;
  site?: string;
}

// Types

/**
 * Type definition for the header context used in building supplier invoice payloads.
 */
export type SupplierInvoiceHeaderContext = {
  company?: string;
  site?: string;
  fiscalYear?: number;
  period?: number;
  accountingDate?: Date;
  invoiceType?: string;
  currency?: string;
  currentUser?: string;
  isExcel?: boolean;
};

/**
 * Type definition for the payloads used to create a supplier invoice, its lines,
 * its analytical lines and its open items in the database.
 */
export type SupplierInvoicePayloads = {
  payload: Prisma.SupplierInvoiceHeaderCreateInput;
  lines: Prisma.SupplierInvoiceLinesCreateManyInput[];
  analyticalLines: Prisma.AnalyticalSupplierLineCreateManyInput[];
  openItems: Prisma.OpenItemCreateInput[];
};

/**
 * Type definition for a fully validated supplier invoice, ready to be persisted.
 */
export type SupplierInvoiceContext = Omit<CreateSupplierInvoiceInput, 'lines'> & {
  company: string;
  legislation: string;
  fiscalYear: number;
  period: number;
  accountingDate: Date;
  dimensionTypes: string[];
  currencyRates: SupplierInvoiceRateCurrency[];
  ledgers: SupplierInvoiceLedger[];
  dimensionTypesMap: Map<string, DimensionTypeConfig>;
  lines: SupplierInvoiceLineContext[];
};

/**
 * Type definition for exchange rates associated with a supplier invoice.
 */
export type SupplierInvoiceRateCurrency = {
  ledger: string;
  sourceCurrency: string;
  destinationCurrency: string;
  rate: Decimal;
  divisor?: Decimal;
  status: number;
};

/**
 * Type definition for amount values for supplier invoice lines.
 */
export type SupplierInvoiceLineAmount = {
  debitOrCredit: number;
  currency: string;
  currencyAmount: Decimal;
  ledgerCurrency: string;
  ledgerAmount: Decimal;
};

/**
 * Type definition to complement analytical line creation with dimensions.
 */
export type SupplierInvoiceAnalyticalLineInfo = {
  account: string;
  amount: Decimal;
  quantity: Decimal;
  dimensions: DimensionsInput | undefined;
};

/**
 * Type definition for company and site information used to validate dimensions.
 */
export type SupplierInvoiceCompanySiteInfo = {
  companyCode: string;
  siteCode: string;
  isLegalCompany: boolean;
  companyLegislation: string;
  companyModel?: CompanyModel;
};

/**
 * Type definition for accounting date, fiscal year and period information.
 */
export type SupplierInvoiceDatesInfo = {
  accountingDate: Date;
  fiscalYear: number;
  period: number;
};

/**
 * Type definition for business partner information (supplier only,
 * since supplier invoices only generate payable open items).
 */
export type SupplierInvoiceBusinessPartnerInfo = {
  code: string;
  isSupplier: number;
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
export type SupplierInvoiceLinesPayloadResult = {
  linesPayload: Prisma.SupplierInvoiceLinesCreateManyInput[];
  partnerInfo: OpenItemBusinessPartnerInfo;
};
