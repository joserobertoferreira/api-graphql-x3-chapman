import { ParameterValue, Prisma } from '@prisma/client';
import { ParametersService } from '../../../common/parameters/parameter.service';
import { CommonService } from '../../../common/services/common.service';
import { CurrencyService } from '../../../common/services/currency.service';
import { RateCurrency } from '../../../common/types/common.types';
import { generateUUIDBuffer, getAuditTimestamps } from '../../../common/utils/audit-date.utils';
import { BusinessPartnerService } from '../../business-partners/business-partner.service';
import { CreateSalesOrderInput } from '../dto/create-sales-order.input';
import { mapDimensionTypeFields } from './sales-order.mapper';

/**
 * Constrói o payload para a criação do cabeçalho da encomenda.
 * @param input - O DTO vindo da mutation do GraphQL.
 * @param customer - O cliente cujos dados serão usados no cabeçalho.
 * @param site - O site onde a encomenda será criada.
 * @param partnerService - Serviço para buscar informações do parceiro de negócios.
 * @param commonService - Serviço comum para obter informações adicionais como taxas de câmbio e tipos de encomenda.
 * @param currencyService - Serviço para obter informações sobre taxas de câmbio.
 * @param parametersService - Serviço para obter parâmetros globais como moeda e taxas de câmbio.
 * @returns Um objeto contendo os payloads para Products (ITMMASTER) e ProductSales (ITMSALES).
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
  // if (!automaticJournal) {
  //   automaticJournal = await parametersService.getParameterValue('', '', '', 'ZENTCOUS');
  // }

  // If currency was provided in the input,use it. Otherwise, use the customer's currency.
  if (input.currency && input.currency !== customer.customerCurrency) {
    // Override the customer's currency with the provided currency
    customer.customerCurrency = input.currency;
  }

  let currencyRate: RateCurrency;
  if (site.company?.accountingCurrency !== customer.customerCurrency) {
    currencyRate = await currencyService.getCurrencyRate(
      globalCurrency?.value ?? 'EUR',
      site.company?.accountingCurrency ?? 'EUR',
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
    orderStatus: 1,
    accountingValidationStatus: 1,
    automaticJournal: automaticJournal?.value ?? '',
    deliveryType: orderType?.deliveryType ?? '',
    weightUnitForDistributionOnLines: 'KG',
    volumeUnitForDistributionOnLines: 'L',
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
