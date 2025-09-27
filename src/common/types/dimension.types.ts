import { BusinessPartner, Company, Site } from '@prisma/client';
import { CreateDimensionInput } from '../../modules/dimensions/dto/create-dimension.input';

/**
 * An object representing a pair of dimension type and dimension code.
 */
export interface DimensionEntity {
  dimensionType: string;
  dimension?: string;
}

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
 * An interface for dimension type configuration.
 */
export interface DimensionTypeConfig {
  code: string;
  description: string;
  strategyClass: string | null;
}
