import { ParameterValue, Prisma } from 'src/generated/prisma';
import { ParametersService } from '../../../common/parameters/parameter.service';
import { CurrencyService } from '../../../common/services/currency.service';
import { RateCurrency } from '../../../common/types/common.types';
import { generateUUIDBuffer, getAuditTimestamps } from '../../../common/utils/audit-date.utils';
import { BusinessPartnerService } from '../../business-partners/business-partner.service';
import { mapDimensionTypeFields } from '../../dimensions/helpers/dimension-mapper';
import { CreatePurchaseOrderInput } from '../dto/create-purchase-order.input';

/**
 * Builds the payload for creating the purchase order header.
 * @param input - The DTO coming from the GraphQL mutation.
 * @param supplier - The supplier whose data will be used in the header.
 * @param site - The site where the purchase order will be created.
 * @param partnerService - Service to fetch business partner information.
 * @param currencyService - Service to obtain information about currencies and exchange rates.
 * @param parametersService - Service to obtain global parameters such as currency and exchange rates.
 * @returns An object containing the payloads for the purchase order.
 */
export async function buildPurchaseOrderCreationPayload(
  input: CreatePurchaseOrderInput,
  supplier: Prisma.SupplierGetPayload<{ include: { addresses: true; businessPartner: true } }>,
  site: Prisma.SiteGetPayload<{ include: { company: true } }>,
  partnerService: BusinessPartnerService,
  currencyService: CurrencyService,
  parametersService: ParametersService,
): Promise<Prisma.PurchaseOrderCreateInput> {
  const timestamps = getAuditTimestamps();
  const headerUUID = generateUUIDBuffer();

  let supplierIdx = supplier.addresses?.findIndex((address) => address.code === supplier.addressByDefault);
  if (supplierIdx === undefined || supplierIdx < 0) {
    supplierIdx = 0;
  }
  const billBySupplier = await partnerService.findBusinessPartnerByCode(supplier.billBySupplier, { addresses: true });
  if (!billBySupplier) {
    throw new Error(`Billing supplier with code ${supplier.billBySupplier} not found.`);
  }
  let billIdx = billBySupplier.addresses?.findIndex((address) => address.code === billBySupplier.defaultAddress);
  if (billIdx === undefined || billIdx < 0) {
    billIdx = 0;
  }

  const company = site?.legalCompany ?? '';
  const globalCurrency = await parametersService.getParameterValue('', '', '', 'EURO');

  let automaticJournal: ParameterValue | null = null;
  automaticJournal = await parametersService.getParameterValue(
    site?.legislation,
    site?.siteCode,
    site?.legalCompany,
    'ZENTCOUP',
  );

  // If currency was provided in the input,use it. Otherwise, use the customer's currency.
  if (input.currency && input.currency !== supplier.currency) {
    // Override the supplier's currency with the provided currency
    supplier.currency = input.currency;
  }

  let currencyRate: RateCurrency;
  if (site.company?.accountingCurrency !== supplier.currency) {
    currencyRate = await currencyService.getCurrencyRate(
      globalCurrency?.value ?? 'GBP',
      site.company?.accountingCurrency ?? 'GBP',
      supplier.currency,
      supplier.rateType,
      input.orderDate ?? timestamps.date,
    );
  } else {
    currencyRate = {
      rate: new Prisma.Decimal(1),
      status: 0,
    };
  }

  const companyWeightUnit = await parametersService.getParameterValue(
    site?.legislation,
    site?.siteCode,
    site?.legalCompany,
    'SALDSPWEU',
  );
  const globalWeightUnit = await parametersService.getParameterValue(
    site?.legislation,
    site?.siteCode,
    site?.legalCompany,
    'SALDSPWEU',
  );

  let weightUnit: string = 'KG';
  if (companyWeightUnit?.value !== '') {
    weightUnit = companyWeightUnit?.value ?? 'KG';
  } else if (globalWeightUnit?.value !== '') {
    weightUnit = globalWeightUnit?.value ?? 'KG';
  }

  const companyVolumeUnit = await parametersService.getParameterValue(
    site?.legislation,
    site?.siteCode,
    site?.legalCompany,
    'SALDSPVOU',
  );
  const globalVolumeUnit = await parametersService.getParameterValue(
    site?.legislation,
    site?.siteCode,
    site?.legalCompany,
    'SALDSPVOU',
  );

  let volumeUnit: string = 'L';
  if (companyVolumeUnit?.value !== '') {
    volumeUnit = companyVolumeUnit?.value ?? 'L';
  } else if (globalVolumeUnit?.value !== '') {
    volumeUnit = globalVolumeUnit?.value ?? 'L';
  }

  const siteDimensions = mapDimensionTypeFields(site);

  const payload: Prisma.PurchaseOrderCreateInput = {
    company: company,
    purchaseSite: input.purchaseSite,
    orderType: 1,
    purchaseType: 1,
    orderDate: input.orderDate ?? timestamps.date,
    supplier: input.supplier,
    vatNumber: supplier.businessPartner?.europeanUnionVatNumber ?? '',
    companyName1: supplier.businessPartner?.partnerName1,
    companyName2: supplier.businessPartner?.partnerName2,
    address: supplier.addressByDefault,
    addressLine1: supplier.addresses?.[supplierIdx]?.addressLine1 ?? '',
    addressLine2: supplier.addresses?.[supplierIdx]?.addressLine2 ?? '',
    addressLine3: supplier.addresses?.[supplierIdx]?.addressLine3 ?? '',
    postalCode: supplier.addresses?.[supplierIdx]?.zipCode ?? '',
    city: supplier.addresses?.[supplierIdx]?.city ?? '',
    state: supplier.addresses?.[supplierIdx]?.state ?? '',
    country: supplier.addresses?.[supplierIdx]?.country ?? '',
    countryName: supplier.addresses?.[supplierIdx]?.countryName ?? '',
    language: supplier.businessPartner?.language ?? '',
    shipFromAddress: supplier.addressByDefault,
    shipFromName1: supplier.businessPartner?.partnerName1,
    shipFromName2: supplier.businessPartner?.partnerName2,
    shipFromAddressLine1: supplier.addresses?.[supplierIdx]?.addressLine1 ?? '',
    shipFromAddressLine2: supplier.addresses?.[supplierIdx]?.addressLine2 ?? '',
    shipFromAddressLine3: supplier.addresses?.[supplierIdx]?.addressLine3 ?? '',
    shipFromPostalCode: supplier.addresses?.[supplierIdx]?.zipCode ?? '',
    shipFromCity: supplier.addresses?.[supplierIdx]?.city ?? '',
    shipFromState: supplier.addresses?.[supplierIdx]?.state ?? '',
    shipFromCountry: supplier.addresses?.[supplierIdx]?.country ?? '',
    shipFromCountryName: supplier.addresses?.[supplierIdx]?.countryName ?? '',
    payTo: supplier.payToBusinessPartner,
    payToAddress: supplier.payToBusinessPartnerAddress,
    billBy: supplier.billBySupplier,
    billingAddress: supplier.billBySupplierAddress,
    // grouping: supplier.groupSupplier,
    taxRule: input.taxRule ?? supplier.taxRule,
    currency: supplier.currency,
    currencyRateType: supplier.rateType,
    currencyRate: currencyRate.rate,
    invoicingSite: input.purchaseSite,
    expectedReceiptDate: input.orderDate ?? timestamps.date,
    paymentTerm: supplier.paymentTerm,
    buyer: input.buyer,
    statisticalGroup1: supplier.statisticalGroup1 ?? '',
    statisticalGroup2: supplier.statisticalGroup2 ?? '',
    statisticalGroup3: supplier.statisticalGroup3 ?? '',
    statisticalGroup4: supplier.statisticalGroup4 ?? '',
    statisticalGroup5: supplier.statisticalGroup5 ?? '',
    ...siteDimensions,
    accountingValidationStatus: 1,
    automaticJournal: automaticJournal?.value ?? '',
    weightUnitForDistributionOnLines: weightUnit,
    volumeUnitForDistributionOnLines: volumeUnit,
    discountOrChargeCalculationRules1: 2,
    discountOrChargeCalculationRules2: 2,
    discountOrChargeCalculationRules3: 1,
    createDate: timestamps.date,
    updateDate: timestamps.date,
    createDatetime: timestamps.dateTime,
    updateDatetime: timestamps.dateTime,
    singleID: headerUUID,
  };

  return payload;
}
