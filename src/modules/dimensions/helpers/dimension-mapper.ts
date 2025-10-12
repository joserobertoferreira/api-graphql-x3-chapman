import { Dimensions } from '@prisma/client';
import { DimensionsInput } from '../../../common/inputs/dimension.input';
import { DimensionPayloadFields, DimensionTypeConfig } from '../../../common/types/dimension.types';
import {
  DimensionEntity,
  FlightDimensionEntity,
  GeneralDimensionEntity,
  OtherDimensionEntity,
  ServiceDimensionEntity,
} from '../entities/dimension.entity';

/**
 * Maps Dimensions data to DimensionEntity format.
 * @param dimension - The Dimensions data from the database.
 * @returns The mapped DimensionEntity.
 */
export function mapDimensionToEntity(dimension: Dimensions): DimensionEntity {
  const otherDimensions: OtherDimensionEntity[] = [];

  for (let i = 0; i < 20; i++) {
    const typeCode = dimension[`otherDimension${i + 1}` as keyof Dimensions] as string;
    const value = dimension[`defaultDimension${i + 1}` as keyof Dimensions] as string;

    if (typeCode && typeCode.trim() !== '') {
      otherDimensions.push({ dimensionType: typeCode, dimension: value || '' });
    }
  }

  const general: GeneralDimensionEntity = {
    isActive: dimension.isActive === 2,
    companySiteGroup: dimension.site?.trim() || undefined,
    brokerEmail: dimension.brokerEmail?.trim() || undefined,
    validFrom: dimension.validityStartDate || undefined,
    validUntil: dimension.validityEndDate || undefined,
    fixtureCustomer: dimension.fixtureCustomer?.trim()
      ? { code: dimension.fixtureCustomer.trim(), name: '' }
      : undefined,
    otherDimensions: [],
  };

  const service: ServiceDimensionEntity = {
    serviceDateStart: dimension.serviceStartDate,
    serviceDateEnd: dimension.serviceEndDate,
    salesPerson: dimension.salesPerson.trim() || '',
  };

  const flight: FlightDimensionEntity = {
    flightReference: dimension.flightReference.trim() || '',
    flightDate: dimension.flightDate || undefined,
    flightOrigin: dimension.flightOrigin.trim() || '',
    flightDestination: dimension.flightDestination.trim() || '',
  };

  return {
    dimensionType: dimension.dimensionType,
    dimension: dimension.dimension,
    additionalInfo: dimension.translatableDescription.trim() || '',
    shortTitle: dimension.shortDescription.trim() || '',
    pioneerReference: dimension.pioneerReference.trim() || '',
    general: general,
    service: service,
    flight: flight,
    fixtureCustomerCode: dimension.fixtureCustomer.trim() || '',
    isActiveFlag: dimension.isActive === 2,
    companySiteGroupCode: dimension.site.trim() || '',
    validateFrom: dimension.validityStartDate || undefined,
    validateUntil: dimension.validityEndDate || undefined,
    brokerEmailCode: dimension.brokerEmail.trim() || '',
    _rawOtherDimensions: otherDimensions,
  };
}

/**
 * Extract the dimension type fields from a source object.
 * @param source The source object containing dimension type fields.
 * @returns An object with the extracted dimension type fields.
 */
export function mapDimensionTypeFields(source: { [key: string]: any }): { [key: string]: any } {
  // create an empty object to hold the dimension fields
  const mappedFields: { [key: string]: string } = {};

  // loop through the keys of the source object
  for (let i = 1; i <= 20; i++) {
    const key = `dimensionType${i}`;
    mappedFields[key] = source[key];
  }

  return mappedFields;
}

/**
 * Extract the dimension fields from a dimension type object.
 * @param source The source object containing dimension fields.
 * @param dimensionsMap A map of dimension field names to their configurations.
 * @returns An generic object with the extracted dimension fields.
 */
export function mapDimensionFields(
  source: DimensionsInput | undefined,
  dimensionsMap: Map<string, DimensionTypeConfig>,
): DimensionPayloadFields {
  const result: DimensionPayloadFields = {};

  if (!source) {
    return result;
  }

  for (const [field, config] of dimensionsMap.entries()) {
    const value = source[field] || '';

    if (config.fieldNumber) {
      const typeKey = `dimensionType${config.fieldNumber}`;
      const valueKey = `dimension${config.fieldNumber}`;

      result[typeKey] = config.code;
      result[valueKey] = value;
    }
  }

  return result;
}
