import { CustomerCategory, Prisma } from '@prisma/client';
import { CommonService } from 'src/common/services/common.service';
import { CustomerCreationPayloads } from '../../../common/types/business-partner.types';
import { generateUUIDBuffer, getAuditTimestamps } from '../../../common/utils/audit-date.utils';
import { LocalMenus } from '../../../common/utils/enums/local-menu';
import { filterByPrismaModel } from '../../../common/utils/prisma.utils';
import { CreateCustomerInput } from '../dto/create-customer.input';

/**
 * Builds the payloads for creating a new customer and its related entities.
 * @param input - The DTO coming from the GraphQL mutation.
 * @param category - The complete customer category object.
 * @param commonService - Common service for auxiliary operations.
 * @returns An object containing the payloads for BusinessPartner, Customer, and Address.
 */
export async function buildPayloadCreateCustomer(
  input: CreateCustomerInput,
  category: CustomerCategory,
  commonService: CommonService,
): Promise<CustomerCreationPayloads> {
  // Check category creation method
  let activated = LocalMenus.NoYes.YES;

  if (category.creationMethod === LocalMenus.ProductCreationMode.WITH_VALIDATION) {
    activated = LocalMenus.NoYes.NO;
  }

  // Build BusinessPartner payload
  const businessPartnerPayload: Prisma.BusinessPartnerUncheckedCreateInput = {
    code: input.customerCode,
    isActive: activated,
    category: input.category,
    partnerName1: input.name,
    shortCompanyName: input.shortName,
    europeanUnionVatNumber: input.europeanUnionVatNumber,
    country: input.defaultAddress.country,
    currency: category.customerCurrency,
    language: input.language ?? category.language,
    defaultAddress: input.defaultAddress.code,
    isCustomer: LocalMenus.NoYes.YES,
    accountingCode: category.accountingCode,
    createUser: 'INTER',
    createDate: getAuditTimestamps().date,
    updateUser: 'INTER',
    updateDate: getAuditTimestamps().date,
    createDatetime: getAuditTimestamps().dateTime,
    updateDatetime: getAuditTimestamps().dateTime,
    singleID: generateUUIDBuffer(),
  };

  const customerModelInfo = Prisma.dmmf.datamodel.models.find((model) => model.name === 'Customer');
  const customerKeys = customerModelInfo ? customerModelInfo.fields.map((field) => field.name) : [];
  const categoryFields = filterByPrismaModel<Prisma.CustomerUncheckedCreateInput>(
    category,
    customerKeys as (keyof Prisma.CustomerUncheckedCreateInput)[],
  );

  // Build Customer payload
  const customerPayload: Prisma.CustomerUncheckedCreateInput = {
    ...categoryFields, // Spread all category fields to ensure defaults are applied
    billToCustomer: input.customerCode,
    billToCustomerAddress: input.defaultAddress.code,
    payByCustomer: input.customerCode,
    payByCustomerAddress: input.defaultAddress.code,
    groupCustomer: input.customerCode,
    riskCustomer: input.customerCode,
    customerCode: input.customerCode,
    customerName: input.name,
    shortName: input.shortName,
    defaultAddress: input.defaultAddress.code,
    defaultShipToAddress: input.defaultAddress.code,
    isActive: activated,
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
    entityNumber: input.customerCode,
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

  const shipToAddressPayload: Prisma.ShipToCustomerUncheckedCreateInput = {
    customer: input.customerCode,
    shipToAddress: input.defaultAddress.code,
    companyName1: input.name,
    language: input.language ?? category.language,
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
    customer: customerPayload,
    address: addressPayload,
    shipToAddress: shipToAddressPayload,
  };
}
