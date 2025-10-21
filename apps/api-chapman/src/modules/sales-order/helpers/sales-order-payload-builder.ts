import { LocalMenus } from '@chapman/utils';
import { ParameterValue, Prisma } from 'src/generated/prisma';
import { ParametersService } from '../../../common/parameters/parameter.service';
import { CommonService } from '../../../common/services/common.service';
import { CurrencyService } from '../../../common/services/currency.service';
import { RateCurrency } from '../../../common/types/common.types';
import { generateUUIDBuffer, getAuditTimestamps } from '../../../common/utils/audit-date.utils';
import { BusinessPartnerService } from '../../business-partners/business-partner.service';
import { mapDimensionTypeFields } from '../../dimensions/helpers/dimension-mapper';
import { CreateSalesOrderInput } from '../dto/create-sales-order.input';
/**
 * Builds the payload for creating the sales order header.
 * @param input - The DTO coming from the GraphQL mutation.
 * @param customer - The customer whose data will be used in the header.
 * @param site - The site where the order will be created.
 * @param partnerService - Service to fetch business partner information.
 * @param commonService - Common service to obtain additional information such as exchange rates and order types.
 * @param currencyService - Service to obtain information about exchange rates.
 * @param parametersService - Service to obtain global parameters such as currency and exchange rates.
 * @returns An object containing the payloads for the sales order.
 */
export async function buildSalesOrderCreationPayload(
  input: CreateSalesOrderInput,
  customer: Prisma.CustomerGetPayload<{ include: { addresses: true; businessPartner: true } }>,
  site: Prisma.SiteGetPayload<{ include: { company: true } }>,
  partnerService: BusinessPartnerService,
  commonService: CommonService,
  currencyService: CurrencyService,
  parametersService: ParametersService,
): Promise<Prisma.SalesOrderCreateInput> {
  const timestamps = getAuditTimestamps();
  const headerUUID = generateUUIDBuffer();

  let soldIdx = customer.addresses?.findIndex((address) => address.code === customer.defaultShipToAddress);
  if (soldIdx === undefined || soldIdx < 0) {
    soldIdx = 0;
  }
  const billCustomer = await partnerService.findBusinessPartnerByCode(customer.billToCustomer, { addresses: true });
  if (!billCustomer) {
    throw new Error(`Billing customer with code ${customer.billToCustomer} not found.`);
  }
  let billIdx = billCustomer.addresses?.findIndex((address) => address.code === billCustomer.defaultAddress);
  if (billIdx === undefined || billIdx < 0) {
    billIdx = 0;
  }

  const company = site?.legalCompany ?? '';
  const orderType = await commonService.getSalesOrderType(input.salesOrderType ?? 'APP', '');
  const globalCurrency = await parametersService.getParameterValue('', '', '', 'EURO');

  let automaticJournal: ParameterValue | null = null;
  automaticJournal = await parametersService.getParameterValue(
    site?.legislation,
    site?.siteCode,
    site?.legalCompany,
    'ZENTCOUS',
  );

  // If currency was provided in the input,use it. Otherwise, use the customer's currency.
  if (input.currency && input.currency !== customer.customerCurrency) {
    // Override the customer's currency with the provided currency
    customer.customerCurrency = input.currency;
  }

  let currencyRate: RateCurrency;
  if (site.company?.accountingCurrency !== customer.customerCurrency) {
    currencyRate = await currencyService.getCurrencyRate(
      globalCurrency?.value ?? 'GBP',
      site.company?.accountingCurrency ?? 'GBP',
      customer.customerCurrency,
      customer.rateType,
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

  const payload: Prisma.SalesOrderCreateInput = {
    company: company,
    salesSite: input.salesSite,
    salesOrderType: orderType?.orderType ?? 'SOI',
    category: orderType?.orderCategory ?? 1,
    orderDate: input.orderDate ?? timestamps.date,
    soldToCustomer: input.soldToCustomer,
    soldToCustomerName1: customer.businessPartner?.partnerName1,
    soldToCustomerName2: customer.businessPartner?.partnerName2,
    soldToCustomerAddress: customer.defaultShipToAddress,
    soldAddressLine1: customer.addresses?.[soldIdx]?.addressLine1 ?? '',
    soldAddressLine2: customer.addresses?.[soldIdx]?.addressLine2 ?? '',
    soldAddressLine3: customer.addresses?.[soldIdx]?.addressLine3 ?? '',
    soldToCustomerPostalCode: customer.addresses?.[soldIdx]?.zipCode ?? '',
    soldToCustomerCity: customer.addresses?.[soldIdx]?.city ?? '',
    soldToCustomerState: customer.addresses?.[soldIdx]?.state ?? '',
    soldToCustomerCountry: customer.addresses?.[soldIdx]?.country ?? '',
    soldToCustomerCountryName: customer.addresses?.[soldIdx]?.countryName ?? '',
    soldToCustomerLanguage: customer.businessPartner?.language ?? '',
    shipToCustomerAddress: customer.defaultShipToAddress,
    shipToCustomerName1: customer.businessPartner?.partnerName1,
    shipToCustomerName2: customer.businessPartner?.partnerName2,
    shipAddressLine1: customer.addresses?.[soldIdx]?.addressLine1 ?? '',
    shipAddressLine2: customer.addresses?.[soldIdx]?.addressLine2 ?? '',
    shipAddressLine3: customer.addresses?.[soldIdx]?.addressLine3 ?? '',
    shipToCustomerPostalCode: customer.addresses?.[soldIdx]?.zipCode ?? '',
    shipToCustomerCity: customer.addresses?.[soldIdx]?.city ?? '',
    shipToCustomerState: customer.addresses?.[soldIdx]?.state ?? '',
    shipToCustomerCountry: customer.addresses?.[soldIdx]?.country ?? '',
    shipToCustomerCountryName: customer.addresses?.[soldIdx]?.countryName ?? '',
    billToCustomer: customer.billToCustomer,
    billToCustomerName1: billCustomer.partnerName1,
    billToCustomerName2: billCustomer.partnerName2,
    billToCustomerAddress: billCustomer.defaultAddress,
    billAddressLine1: billCustomer.addresses?.[billIdx]?.addressLine1 ?? '',
    billAddressLine2: billCustomer.addresses?.[billIdx]?.addressLine2 ?? '',
    billAddressLine3: billCustomer.addresses?.[billIdx]?.addressLine3 ?? '',
    billToCustomerPostalCode: billCustomer.addresses?.[billIdx]?.zipCode ?? '',
    billToCustomerCity: billCustomer.addresses?.[billIdx]?.city ?? '',
    billToCustomerState: billCustomer.addresses?.[billIdx]?.state ?? '',
    billToCustomerCountry: billCustomer.addresses?.[billIdx]?.country ?? '',
    billToCustomerCountryName: billCustomer.addresses?.[billIdx]?.countryName ?? '',
    billToCustomerEuropeanUnionVatNumber: billCustomer.europeanUnionVatNumber ?? '',
    payByBusinessPartner: customer.payByCustomer,
    payByBusinessPartnerAddress: customer.payByCustomerAddress,
    groupCustomer: customer.groupCustomer,
    taxRule: input.taxRule ?? customer.taxRule,
    currency: customer.customerCurrency,
    currencyRateType: customer.rateType,
    currencyRate: currencyRate.rate,
    priceIncludingOrExcludingTax: customer.priceType,
    shippingSite: input.salesSite,
    shipmentDate: input.orderDate ?? timestamps.date,
    requestedDeliveryDate: input.orderDate ?? timestamps.date,
    paymentTerm: customer.paymentTerm,
    salesRep1: customer.salesRep1 ?? '',
    salesRep2: customer.salesRep2 ?? '',
    customerStatisticalGroup1: customer.statisticalGroup1 ?? '',
    customerStatisticalGroup2: customer.statisticalGroup2 ?? '',
    customerStatisticalGroup3: customer.statisticalGroup3 ?? '',
    customerStatisticalGroup4: customer.statisticalGroup4 ?? '',
    customerStatisticalGroup5: customer.statisticalGroup5 ?? '',
    ...siteDimensions,
    orderStatus: LocalMenus.OrderStatus.OPEN,
    isIntersite: input.isIntersite ?? LocalMenus.NoYes.NO,
    isIntercompany: input.isIntercompany ?? LocalMenus.NoYes.NO,
    customerOrderReference: input.customerOrderReference ?? '',
    sourceSite: input.sourceSite ?? '',
    accountingValidationStatus: LocalMenus.AccountingStatus.NON_ACCOUNTED,
    automaticJournal: automaticJournal?.value ?? '',
    deliveryType: orderType?.deliveryType ?? '',
    weightUnitForDistributionOnLines: weightUnit,
    volumeUnitForDistributionOnLines: volumeUnit,
    discountOrChargeCalculationRules1: 2,
    discountOrChargeCalculationRules2: 2,
    discountOrChargeCalculationRules3: 1,
    // scheduledInvoiceStartDueDate: input.orderDate ?? timestamps.date,
    createDate: timestamps.date,
    updateDate: timestamps.date,
    createDatetime: timestamps.dateTime,
    updateDatetime: timestamps.dateTime,
    singleID: headerUUID,
  };

  return payload;
}
