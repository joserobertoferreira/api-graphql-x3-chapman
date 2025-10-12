import { BusinessPartner, Company, Prisma, Site } from '@prisma/client';
import { CreateDimensionInput } from '../../modules/dimensions/dto/create-dimension.input';

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

// Interfaces

/**
 * An object representing a pair of dimension type and dimension code.
 */
export interface DimensionEntity {
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
export interface DimensionWithTableColumn extends DimensionEntity {
  tableColumn: number;
}

/**
 * An interface representing a order analytical payload.
 */
export interface OrderAnalyticalPayload {
  fixedAnalyticalData: Partial<Prisma.AnalyticalAccountingLinesCreateInput>;
  ledgerFields: DimensionPayloadFields;
  chartFields: DimensionPayloadFields;
}
