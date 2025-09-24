import { Dimensions } from '@prisma/client';
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
