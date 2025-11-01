import { BusinessPartner, Company, Dimensions, Prisma, Site } from 'src/generated/prisma';
import { CreateDimensionInput } from '../../modules/dimensions/dto/create-dimension.input';
import { IntercompanyJournalEntryLineInput } from '../../modules/intercompany-journal-entry/dto/create-intercompany-journal-entry-line.input';
import { JournalEntryLineInput } from '../../modules/journal-entry/dto/create-journal-entry-line.input';
import { PurchaseOrderLineInput } from '../../modules/purchase-order/dto/create-purchase-order.input';
import { SalesOrderLineInput } from '../../modules/sales-order/dto/create-sales-order.input';
import { JournalEntryCompanySiteInfo } from './journal-entry.types';

// Types

/**
 * An object representing a dimension type, dimension code, and its associated value.
 */
export type ValidateDimensionContext = CreateDimensionInput & {
  carryForward?: number | null;
  companyData?: Company | null;
  siteData?: Site | null;
  businessPartnerData?: BusinessPartner | null;
};

/**
 * A type to represent dimension fields with dynamic keys.
 */
export type DimensionPayloadFields = {
  [key: string]: string;
};

/**
 * Type definition for orders dimensions.
 */
export type OrdersDimensionDetail = {
  dimensionType: string;
  dimension: string;
  additionalInfo?: string;
  shortTitle?: string;
  pioneerReference?: string;
  fixtureCustomer?: {
    code: string;
    name: string;
  };
  brokerEmail?: string;
};

type JournalLine = JournalEntryLineInput | IntercompanyJournalEntryLineInput;

export type DimensionContexts =
  | PurchaseOrderDimensionContext
  | SalesOrderDimensionContext
  | LineValidateDimensionContext;

// Interfaces

/**
 * An object representing a pair of dimension type and dimension code.
 */
export interface DimensionsEntity {
  dimensionType: string;
  dimension?: string;
}

/**
 * An interface for dimension type configuration.
 */
export interface DimensionTypeConfig {
  code: string;
  description: string;
  strategyClass: string | null;
  isMandatory: boolean;
  fieldNumber: number;
}

/**
 * An interface representing a dimension entity and a table position field for it.
 */
export interface DimensionWithTableColumn extends DimensionsEntity {
  tableColumn: number;
}

/**
 * An interface representing a order analytical payload.
 */
export interface OrderAnalyticalPayload {
  fixedAnalyticalData: Partial<Prisma.AnalyticalAccountingLinesCreateInput>;
  ledgerFields: DimensionPayloadFields;
  chartFields: DimensionPayloadFields;
  accountFields: DimensionPayloadFields;
}

export interface BaseValidateDimensionContext {
  /**
   * Data of the dimension to be validated, already read from the database.
   */
  dimensionData: Dimensions;
  isIntercompany: boolean;
  referenceDate?: Date;
  referenceCompany?: string;
  referenceSite?: string;
  isLegalCompany?: boolean;
}

/**
 * Specific context for validating dimensions within a Journal Entry.
 * It EXTENDS the base context with order-specific information.
 */
export interface LineValidateDimensionContext extends BaseValidateDimensionContext {
  lineNumber: number;
  ledgerCode: string;
  siteCompanyMap?: Map<string, JournalEntryCompanySiteInfo>;
  journalLine?: JournalLine;
}

/**
 * Specific context for validating dimensions within a Purchase Order.
 * It EXTENDS the base context with order-specific information.
 */
export interface PurchaseOrderDimensionContext extends BaseValidateDimensionContext {
  line: PurchaseOrderLineInput;
  lineNumber: number;
  process: 'purchase-order';
}

/**
 * Specific context for validating dimensions within a Sales Order.
 * It EXTENDS the base context with order-specific information.
 */
export interface SalesOrderDimensionContext extends BaseValidateDimensionContext {
  line: SalesOrderLineInput;
  lineNumber: number;
  process: 'sales-order';
}
