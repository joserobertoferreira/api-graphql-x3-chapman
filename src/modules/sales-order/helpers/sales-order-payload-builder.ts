import { Prisma } from '@prisma/client';
import { ParametersService } from '../../../common/parameters/parameter.service';
import { CommonService } from '../../../common/services/common.service';
import { RateCurrency } from '../../../common/types/common.types';
import { generateUUIDBuffer, getAuditTimestamps } from '../../../common/utils/audit-date.utils';
import { BusinessPartnerService } from '../../business-partners/business-partner.service';
import { CreateSalesOrderInput } from '../dto/create-sales-order.input';

/**
 * Constrói o payload para a criação do cabeçalho da encomenda.
 * @param input - O DTO vindo da mutation do GraphQL.
 * @param customer - O cliente cujos dados serão usados no cabeçalho.
 * @param site - O site onde a encomenda será criada.
 * @param partnerService - Serviço para buscar informações do parceiro de negócios.
 * @param commonService - Serviço comum para obter informações adicionais como taxas de câmbio e tipos de encomenda.
 * @param parametersService - Serviço para obter parâmetros globais como moeda e taxas de câmbio.
 * @returns Um objeto contendo os payloads para Products (ITMMASTER) e ProductSales (ITMSALES).
 */
export async function buildSalesOrderCreationPayload(
  input: CreateSalesOrderInput,
  customer: Prisma.CustomerGetPayload<{ include: { addresses: true; businessPartner: true } }>,
  site: Prisma.SiteGetPayload<{ include: { company: true } }>,
  partnerService: BusinessPartnerService,
  commonService: CommonService,
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

  const orderType = await commonService.getSalesOrderType(input.salesOrderType ?? 'SON', '');
  const globalCurrency = await parametersService.getParameterValue('', '', 'EURO');

  let currencyRate: RateCurrency;
  if (site.company?.accountingCurrency !== customer.customerCurrency) {
    currencyRate = await commonService.getCurrencyRate(
      globalCurrency?.value ?? 'EUR',
      input.currency ?? customer.customerCurrency,
      site.company?.accountingCurrency ?? 'EUR',
      customer.rateType,
      input.orderDate ?? timestamps.date,
    );
  } else {
    currencyRate = {
      rate: new Prisma.Decimal(1),
      status: 0,
    };
  }

  const payload: Prisma.SalesOrderCreateInput = {
    company: site?.legalCompany ?? '',
    salesSite: input.salesSite,
    salesOrderType: orderType?.orderType ?? 'SON',
    category: orderType?.orderCategory ?? 1,
    orderDate: input.orderDate ?? timestamps.date,
    customerOrderReference: input.customerOrderReference ?? '',
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
    shipToCustomerAddress: input.shipToCustomerAddress ?? customer.defaultShipToAddress,
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
    currency: input.currency ?? customer.customerCurrency,
    currencyRateType: customer.rateType,
    currencyRate: currencyRate.rate,
    priceIncludingOrExcludingTax: input.priceIncludingOrExcludingTax ?? customer.priceType,
    shippingSite: input.shipmentSite ?? input.salesSite,
    shipmentDate: input.shipmentDate ?? timestamps.date,
    requestedDeliveryDate: input.requestedDeliveryDate ?? timestamps.date,
    paymentTerm: input.paymentTerm ?? customer.paymentTerm,
    salesRep1: customer.salesRep1 ?? '',
    salesRep2: customer.salesRep2 ?? '',
    customerStatisticalGroup1: customer.statisticalGroup1 ?? '',
    customerStatisticalGroup2: customer.statisticalGroup2 ?? '',
    customerStatisticalGroup3: customer.statisticalGroup3 ?? '',
    customerStatisticalGroup4: customer.statisticalGroup4 ?? '',
    customerStatisticalGroup5: customer.statisticalGroup5 ?? '',
    orderStatus: 1,
    deliveryType: orderType?.deliveryType ?? '',
    weightUnitForDistributionOnLines: 'KG',
    volumeUnitForDistributionOnLines: 'L',
    discountOrChargeCalculationRules1: 2,
    discountOrChargeCalculationRules2: 2,
    discountOrChargeCalculationRules3: 1,
    scheduledInvoiceStartDueDate: input.orderDate ?? timestamps.date,
    createDate: timestamps.date,
    updateDate: timestamps.date,
    createDatetime: timestamps.dateTime,
    updateDatetime: timestamps.dateTime,
    singleID: headerUUID,
  };

  const dimensionTypeMap = new Map<string, number>();
  for (let i = 1; i <= 20; i++) {
    // Acessa dinamicamente os campos DIE_0...DIE_19 do Site
    // O Prisma mapeia DIE_0 para dimensionType1, DIE_1 para dimensionType2, etc.
    const typeCode = site.company[`dimensionType${i}`];
    if (typeCode) {
      dimensionTypeMap.set(typeCode as string, i);
    }
  }

  if (input.dimensions) {
    for (const dimPair of input.dimensions) {
      const index = dimensionTypeMap.get(dimPair.typeCode);

      if (index) {
        // Atribui dinamicamente ao payload CCE_X e DIE_X
        (payload as any)[`dimensionType${index}`] = dimPair.typeCode;
        (payload as any)[`dimension${index}`] = dimPair.value;
      } else {
        // Opcional: Tratar o caso de uma dimensão inválida para este site
        console.warn(`Dimension type "${dimPair.typeCode}" is not configured for site "${site.siteCode}".`);
      }
    }
  }

  return payload;
}
