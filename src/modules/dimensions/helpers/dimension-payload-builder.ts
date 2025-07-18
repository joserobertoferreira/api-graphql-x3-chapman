import { Prisma } from '@prisma/client';
import { generateUUIDBuffer, getAuditTimestamps, getSeconds } from '../../../common/utils/audit-date.utils';
import { formatDateToDDMMYY } from '../../../common/utils/date-utils';
import { CompanyService } from '../../companies/company.service';
import { CreateDimensionInput } from '../dto/create-dimension.input';

/**
 * Constrói os payloads para a criação de uma nova dimensão e suas entidades relacionadas.
 * @param input - O DTO vindo da mutation do GraphQL.
 * @param category - O objeto completo da categoria de dimensão.
 * @param commonService - Serviço comum para operações auxiliares.
 * @returns Um objeto contendo os payloads para Dimension.
 */
export async function buildPayloadCreateDimension(
  input: CreateDimensionInput,
  groupInfo: string,
  companyService: CompanyService,
): Promise<Prisma.DimensionsUncheckedCreateInput> {
  const siteCode = input.site?.toUpperCase() ?? '';
  let accessCode = '';

  if (groupInfo.length > 0) {
    switch (groupInfo) {
      case 'site':
        const site = await companyService.getSiteByCode(siteCode);
        if (site) {
          accessCode = site.legalCompany ?? '';
        }
        break;
      case 'company':
        accessCode = siteCode;
        break;
      case 'group':
        accessCode = siteCode;
        break;
    }
  }

  let descriptionDimension = input.description ?? '';
  let customerCode = input.customerCode?.toUpperCase() ?? '';
  let brokerEmail = input.brokerEmail ?? '';

  if (input.dimensionType === 'FIX') {
    const flightDate = input.flightDate ? formatDateToDDMMYY(input.flightDate) : '';
    descriptionDimension = `${flightDate} - ${input.originDestination ?? ''} - ${input.flightReferenceId ?? ''}`;
    brokerEmail = '';
  } else if (input.dimensionType === 'BRK') {
    customerCode = '';
  } else {
    customerCode = '';
    brokerEmail = '';
  }

  const createTimestamps = getAuditTimestamps().dateTime;
  const updateTimestamps = getAuditTimestamps().dateTime;

  const payload: Prisma.DimensionsUncheckedCreateInput = {
    dimensionType: input.dimensionType,
    dimension: input.dimension,
    description: descriptionDimension.substring(0, 30),
    translatableDescription: descriptionDimension,
    isActive: 2,
    site: siteCode,
    accessCode: accessCode,
    fixtureCustomer: customerCode,
    brokerEmail: brokerEmail,
    ...mapOtherDimensions(input.otherDimensions),
    numberOfAnalyticalDimensions: input.otherDimensions?.length ?? 0,
    createDate: getAuditTimestamps().date,
    createTime: getSeconds(createTimestamps),
    updateDate: getAuditTimestamps().date,
    updateTime: getSeconds(updateTimestamps),
    createDatetime: createTimestamps,
    updateDatetime: updateTimestamps,
    singleID: generateUUIDBuffer(),
  };

  console.log('Payload for Dimension creation:', payload);

  return payload;
}

export async function buildPayloadCreateTranslationText(
  description: string,
  identifier1: string,
  identifier2: string,
): Promise<Prisma.TextToTranslateUncheckedCreateInput> {
  return {
    table: 'CACCE',
    field: 'DESTRA',
    language: 'BRI',
    identifier1: identifier1,
    identifier2: identifier2,
    text: description,
    createDate: getAuditTimestamps().date,
    updateDate: getAuditTimestamps().date,
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
