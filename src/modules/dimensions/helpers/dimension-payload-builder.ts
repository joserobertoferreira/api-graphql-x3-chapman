import { Prisma } from '@prisma/client';
import { DEFAULT_LEGACY_DATE, DEFAULT_PYRAMID_GROUP_CODE_VALUES } from '../../../common/types/common.types';
import { ValidateDimensionContext } from '../../../common/types/dimension.types';
import { generateUUIDBuffer, getAuditTimestamps, getSeconds } from '../../../common/utils/audit-date.utils';
import { LocalMenus } from '../../../common/utils/enums/local-menu';

/**
 * Builds payloads for creating a new dimension and its related entities.
 * @param context - The context containing all necessary information for dimension creation.
 * @returns An object containing the payloads for Dimension.
 */
export async function buildPayloadCreateDimension(
  context: ValidateDimensionContext,
): Promise<Prisma.DimensionsUncheckedCreateInput> {
  const createTimestamps = getAuditTimestamps().dateTime;
  const updateTimestamps = getAuditTimestamps().dateTime;

  const description = context.additionalInfo ?? '';
  const shortTitle = context.shortTitle ?? '';

  const { carryForward, general, service, flight } = context;

  const payload: Prisma.DimensionsUncheckedCreateInput = {
    dimensionType: context.dimensionType,
    dimension: context.dimension,
    description: description.substring(0, 30),
    translatableDescription: description,
    shortDescription: shortTitle,
    isActive: LocalMenus.NoYes.NO,
    pioneerReference: context.pioneerReference || '',
    // General section
    site: general?.companySiteGroup || '',
    validityStartDate: general?.validFrom || DEFAULT_LEGACY_DATE,
    validityEndDate: general?.validUntil || DEFAULT_LEGACY_DATE,
    fixtureCustomer: general?.fixtureCustomer || '',
    brokerEmail: general?.brokerEmail || '',
    // Controls section
    carryforward: carryForward || LocalMenus.NoYes.YES,
    budgetTracking: LocalMenus.NoYes.YES,
    posting: LocalMenus.NoYes.YES,
    // Service dates section
    serviceStartDate: service?.serviceDateStart || DEFAULT_LEGACY_DATE,
    serviceEndDate: service?.serviceDateEnd || DEFAULT_LEGACY_DATE,
    salesPerson: service?.salesPerson || '',
    // Flight section
    flightReference: flight?.flightReference || '',
    flightDate: flight?.flightDate || DEFAULT_LEGACY_DATE,
    flightOrigin: flight?.flightOrigin || '',
    flightDestination: flight?.flightDestination || '',
    // ...mapOtherDimensions(input.otherDimensions),
    // numberOfAnalyticalDimensions: input.otherDimensions?.length ?? 0,
    createDate: getAuditTimestamps().date,
    createTime: getSeconds(createTimestamps),
    updateDate: getAuditTimestamps().date,
    updateTime: getSeconds(updateTimestamps),
    createDatetime: createTimestamps,
    updateDatetime: updateTimestamps,
    singleID: generateUUIDBuffer(),
  };

  return payload;
}

/**
 * Builds the payloads for creating the translation texts (long and short descriptions).
 *
 * @param identifier1 - the identifier 1 (usually dimension type)
 * @param identifier2 - the identifier 2 (usually dimension)
 * @param longDescription - The long description text to be translated.
 * @param shortDescription - The short description text to be translated.
 * @returns An array containing the two payloads for the TextToTranslate table.
 */
export function buildPayloadCreateTranslationText(
  identifier1: string,
  identifier2: string,
  longDescription: string,
  shortDescription: string,
): Prisma.TextToTranslateUncheckedCreateInput[] {
  if ((!longDescription || longDescription.trim() === '') && (!shortDescription || shortDescription.trim() === '')) {
    // If both descriptions are empty, return an empty array
    return [];
  }

  const payloads: Prisma.TextToTranslateUncheckedCreateInput[] = [];

  // Base payload for both long and short descriptions
  const basePayload = {
    table: 'CACCE',
    language: 'BRI',
    identifier1: identifier1,
    identifier2: identifier2,
  };

  // Payload for long description
  if (longDescription && longDescription.trim() !== '') {
    payloads.push({
      ...basePayload,
      field: 'DESTRA',
      text: longDescription,
      createDate: getAuditTimestamps().date,
      updateDate: getAuditTimestamps().date,
      createDatetime: getAuditTimestamps().dateTime,
      updateDatetime: getAuditTimestamps().dateTime,
      singleID: generateUUIDBuffer(),
    });
  }

  // Payload for short description
  if (shortDescription && shortDescription.trim() !== '') {
    payloads.push({
      ...basePayload,
      field: 'SHOTRA',
      text: shortDescription,
      createDate: getAuditTimestamps().date,
      updateDate: getAuditTimestamps().date,
      createDatetime: getAuditTimestamps().dateTime,
      updateDatetime: getAuditTimestamps().dateTime,
      singleID: generateUUIDBuffer(),
    });
  }
  return payloads;
}

/**
 * Builds the payload for creating the print pyramid entry.
 *
 * @param dimensionType - the dimension type
 * @param dimension - the dimension
 * @returns the payload for the PrintPyramids table.
 */
export function buildPayloadCreatePrintPyramid(
  dimensionType: string,
  dimension: string,
): Prisma.PrintPyramidsUncheckedCreateInput {
  return {
    dimensionType: dimensionType,
    dimension: dimension,
    ...DEFAULT_PYRAMID_GROUP_CODE_VALUES,
    createDatetime: getAuditTimestamps().dateTime,
    updateDatetime: getAuditTimestamps().dateTime,
    singleID: generateUUIDBuffer(),
  };
}

/**
 * Helper para mapear o array de `otherDimensions` para os campos `otherDimensionX` e `defaultDimensionX`.
 */
function mapOtherDimensions(
  otherDimensions?: { dimensionType: string; dimension: string }[],
): Partial<Prisma.DimensionsUncheckedCreateInput> {
  const mapped: Partial<Prisma.DimensionsUncheckedCreateInput> = {};

  if (!otherDimensions) {
    return mapped;
  }

  otherDimensions.forEach((dim, index) => {
    // Limita a 20 dimensões, para não exceder os campos do modelo
    if (index < 20) {
      const i = index + 1;
      (mapped as string)[`otherDimension${i}`] = dim.dimensionType;
      (mapped as string)[`defaultDimension${i}`] = dim.dimension;
    }
  });

  return mapped;
}
