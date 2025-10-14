import { CommonService } from 'src/common/services/common.service';
import { Prisma, SupplierCategory } from 'src/generated/prisma';
import { SupplierCreationPayloads } from '../../../common/types/business-partner.types';
import { generateUUIDBuffer, getAuditTimestamps } from '../../../common/utils/audit-date.utils';
import { LocalMenus } from '../../../common/utils/enums/local-menu';
import { filterByPrismaModel } from '../../../common/utils/prisma.utils';
import { CreateSupplierInput } from '../dto/create-supplier.input';

/**
 * Builds the payloads for creating a new supplier and its related entities.
 * @param input - The DTO coming from the GraphQL mutation.
 * @param category - The complete supplier category object.
 * @param commonService - Common service for auxiliary operations.
 * @returns An object containing the payloads for BusinessPartner, Supplier, and Address.
 */
export async function buildPayloadCreateSupplier(
  input: CreateSupplierInput,
  category: SupplierCategory,
  commonService: CommonService,
): Promise<SupplierCreationPayloads> {
  // Check category creation method
  let activated = LocalMenus.NoYes.YES;

  if (category.creationMethod === LocalMenus.ProductCreationMode.WITH_VALIDATION) {
    activated = LocalMenus.NoYes.NO;
  }

  // Build BusinessPartner payload
  const businessPartnerPayload: Prisma.BusinessPartnerUncheckedCreateInput = {
    code: input.supplierCode,
    isActive: activated,
    category: input.category,
    partnerName1: input.name,
    shortCompanyName: input.shortName,
    europeanUnionVatNumber: input.europeanUnionVatNumber,
    country: input.defaultAddress.country,
    currency: category.supplierCurrency,
    language: input.language ?? category.language,
    defaultAddress: input.defaultAddress.code,
    isSupplier: LocalMenus.NoYes.YES,
    accountingCode: category.accountingCode,
    createUser: 'INTER',
    createDate: getAuditTimestamps().date,
    updateUser: 'INTER',
    updateDate: getAuditTimestamps().date,
    createDatetime: getAuditTimestamps().dateTime,
    updateDatetime: getAuditTimestamps().dateTime,
    singleID: generateUUIDBuffer(),
  };

  const supplierModelInfo = Prisma.dmmf.datamodel.models.find((model) => model.name === 'Supplier');
  const supplierKeys = supplierModelInfo ? supplierModelInfo.fields.map((field) => field.name) : [];
  const categoryFields = filterByPrismaModel<Prisma.SupplierUncheckedCreateInput>(
    category,
    supplierKeys as (keyof Prisma.SupplierUncheckedCreateInput)[],
  );

  // Build Customer payload
  const supplierPayload: Prisma.SupplierUncheckedCreateInput = {
    ...categoryFields, // Spread all category fields to ensure defaults are applied
    supplierCode: input.supplierCode,
    supplierName: input.name,
    shortName: input.shortName,
    addressByDefault: input.defaultAddress.code,
    isActive: activated,
    billBySupplier: input.supplierCode,
    billBySupplierAddress: input.defaultAddress.code,
    payToBusinessPartner: input.supplierCode,
    payToBusinessPartnerAddress: input.defaultAddress.code,
    groupSupplier: input.supplierCode,
    riskSupplier: input.supplierCode,
    createUser: 'INTER',
    createDate: getAuditTimestamps().date,
    updateUser: 'INTER',
    updateDate: getAuditTimestamps().date,
    createDatetime: getAuditTimestamps().dateTime,
    updateDatetime: getAuditTimestamps().dateTime,
    singleID: generateUUIDBuffer(),
  };

  const countryName = await commonService.getCountryNameByCode(input.defaultAddress.country ?? 'GB');
  const { phones = [], emails = [] } = input.defaultAddress;

  const addressPayload: Prisma.AddressUncheckedCreateInput = {
    entityType: LocalMenus.EntityType.BUSINESS_PARTNER,
    entityNumber: input.supplierCode,
    code: input.defaultAddress.code,
    description: input.defaultAddress.description,
    addressLine1: input.defaultAddress.addressLine1,
    addressLine2: input.defaultAddress.addressLine2 ?? '',
    addressLine3: input.defaultAddress.addressLine3 ?? '',
    zipCode: input.defaultAddress.zipCode ?? '',
    city: input.defaultAddress.city ?? '',
    state: input.defaultAddress.state ?? '',
    country: input.defaultAddress.country,
    countryName: countryName ?? '',
    addressPhoneNumber1: phones[0] ?? '',
    addressPhoneNumber2: phones[1] ?? '',
    addressPhoneNumber3: phones[2] ?? '',
    addressPhoneNumber4: phones[3] ?? '',
    addressPhoneNumber5: phones[4] ?? '',
    addressEmail1: emails[0] ?? '',
    addressEmail2: emails[1] ?? '',
    addressEmail3: emails[2] ?? '',
    addressEmail4: emails[3] ?? '',
    addressEmail5: emails[4] ?? '',
    isDefault: LocalMenus.NoYes.YES,
    createUser: 'INTER',
    createDate: getAuditTimestamps().date,
    updateUser: 'INTER',
    updateDate: getAuditTimestamps().date,
    createDatetime: getAuditTimestamps().dateTime,
    updateDatetime: getAuditTimestamps().dateTime,
    singleID: generateUUIDBuffer(),
  };

  return {
    businessPartner: businessPartnerPayload,
    supplier: supplierPayload,
    address: addressPayload,
  };
}
