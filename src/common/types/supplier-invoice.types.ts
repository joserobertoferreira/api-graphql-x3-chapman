import { Decimal } from '@prisma/client/runtime/client';
import { Accounts, DocumentTypes, Ledger, Prisma, PurchaseInvoiceType } from 'src/generated/prisma/client';
import {
  CreateSupplierInvoiceInput,
  SupplierInvoiceLineInput,
} from '../../modules/supplier-invoice/dto/create-supplier-invoice.input';
import { DimensionsInput } from '../inputs/dimension.input';
import { LocalMenus } from '../utils/enums/local-menu';
import { SupplierWithRelations } from './business-partner.types';
import { CompanyModel } from './company.types';
import { BaseValidateDimensionContext, DimensionTypeConfig } from './dimension.types';
import { SiteModel } from './site.types';

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
  deductableTax?: Decimal;
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

// Types

/**
 * Type definition for the header context used in building supplier invoice payloads.
 */
export type SupplierInvoiceHeaderContext = {
  internalNumber?: number;
  company?: string;
  supplier?: string;
  collective?: string;
  site?: string;
  fiscalYear?: number;
  period?: number;
  accountingDate?: Date;
  invoiceType?: string;
  documentType?: DocumentTypes;
  invoiceTypeIsValid?: PurchaseInvoiceType;
  currency?: string;
  currentUser?: string;
  isExcel?: boolean;
};

/**
 * Type definition for the payloads used to create a supplier invoice, its lines,
 * its analytical lines and its open items in the database. `document` is left
 * unset on lines/analyticalLines/openItems here since SupplierInvoiceLines and
 * AnalyticalSupplierLine have no Prisma relation to the header - it is filled
 * in by the caller once the invoiceNumber has been generated.
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
export type SupplierInvoiceContext = Omit<CreateSupplierInvoiceInput, 'lines' | 'paymentApproval'> & {
  supplierInfo: SupplierWithRelations;
  payToBusinessPartnerInfo: SupplierWithRelations;
  businessPartnerInfo: SupplierInvoiceBusinessPartnerInfo;
  companyInfo: SupplierInvoiceCompanySiteInfo;
  fiscalYear: number;
  period: number;
  accountingDate: Date;
  dueDateCalculationStartDate: Date;
  paymentApproval: number;
  dimensionTypes: string[];
  currencyRates: SupplierInvoiceRateCurrency[];
  ledgers: SupplierInvoiceLedger[];
  dimensionTypesMap: Map<string, DimensionTypeConfig>;
  invoiceTypeIsValid: PurchaseInvoiceType;
  documentType: DocumentTypes;
  // Not part of the create input anymore - computed as the sum of line amounts.
  exportNumber: number;
  originalInvoiceNumber?: string;
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
  taxAmount?: Decimal;
  currencyAmountIncludingTax?: Decimal;
};

export type SupplierInvoiceLineTotalAmount = {
  totalAmountExcludingTax: Decimal;
  totalAmountIncludingTax: Decimal;
  totalTaxAmount: Decimal;
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
  siteModel?: SiteModel;
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
 * A condensed supplier invoice line (one row, ledgers folded into
 * account/ledger/planCode columns) paired with the legal-ledger line context
 * it was built from, needed to derive open item fields (sign, business
 * partner) that no longer exist as separate columns on SupplierInvoiceLines.
 */
export type SupplierInvoiceLineGroup = {
  line: Prisma.SupplierInvoiceLinesCreateManyInput;
  legalContext: SupplierInvoiceLineContext;
  // ledgerLines: SupplierInvoiceLineContext[];
  ledgerLine: {
    account?: string;
    planCode?: string;
  };
};

/**
 * Type definition for the line payload return.
 */
export type SupplierInvoiceLinesPayloadResult = {
  linesPayload: Prisma.SupplierInvoiceLinesCreateManyInput[];
  lineGroups: SupplierInvoiceLineGroup[];
  // partnerInfo: OpenItemBusinessPartnerInfo;
  taxTotalsByCode: Map<string, SupplierInvoiceLineTotalAmount>;
};
