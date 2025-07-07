import { Prisma } from '@prisma/client';
import { CommonService } from '../../../common/services/common.service';
import { Ledgers } from '../../../common/types/common.types';
import { generateUUIDBuffer, getAuditTimestamps } from '../../../common/utils/audit-date.utils';
import { calculatePrice } from '../../../common/utils/sales-price.utils';
import { CreateSalesOrderLineInput } from '../dto/create-sales-order.input';

export async function buildSalesOrderLineCreationPayload(
  header: Prisma.SalesOrderCreateInput,
  lineInput: CreateSalesOrderLineInput,
  lineNumber: number,
): Promise<Prisma.SalesOrderLineUncheckedCreateWithoutOrderInput[]> {
  const timestamps = getAuditTimestamps();
  const lineUUID = generateUUIDBuffer();

  const payload: Prisma.SalesOrderLineUncheckedCreateWithoutOrderInput = {
    lineNumber: lineNumber,
    sequenceNumber: lineNumber,
    company: header.company,
    salesSite: header.salesSite,
    category: header.category,
    soldToCustomer: header.soldToCustomer,
    shipToCustomerAddress: header.shipToCustomerAddress,
    product: lineInput.product,
    orderDate: header.orderDate,
    shippingSite: header.shippingSite,
    requestedDeliveryDate: header.requestedDeliveryDate,
    shipmentDate: header.shipmentDate,
    expectedDeliveryDate: header.requestedDeliveryDate,
    distribution: 2,
    quantityInSalesUnitInitiallyOrdered: lineInput.quantity,
    quantityInSalesUnitOrdered: lineInput.quantity,
    quantityInStockUnitOrdered: lineInput.quantity,
    quantityInSalesUnitToDeliverForProductsNotManagedInStock: lineInput.quantity,
    quantityInStockUnitToDeliverForProductsNotManagedInStock: lineInput.quantity,
    createDate: timestamps.date,
    updateDate: timestamps.date,
    createDatetime: timestamps.dateTime,
    updateDatetime: timestamps.dateTime,
    singleID: lineUUID,
  };

  return [payload];
}

export async function buildSalesOrderPriceCreationPayload(
  header: Prisma.SalesOrderCreateInput,
  lineInput: Prisma.SalesOrderLineUncheckedCreateWithoutOrderInput,
  lineNumber: number,
  linePrice: Prisma.Decimal,
  product: Prisma.ProductsGetPayload<{}>,
  commonService: CommonService,
): Promise<Prisma.SalesOrderPriceUncheckedCreateWithoutOrderInput[]> {
  const timestamps = getAuditTimestamps();
  const priceUUID = generateUUIDBuffer();

  // Get the tax rate from the product or default to 0 if not available
  const taxRateResult = await commonService.getTaxRate(product.taxLevel1, timestamps.date);

  const taxRate = taxRateResult ? taxRateResult.VATRAT_0.toNumber() : 0;
  const vat = taxRateResult ? taxRateResult.VAT_0 : '';

  // Calculate the price with tax and without tax
  const calculatedPrice = calculatePrice(linePrice, header.priceIncludingOrExcludingTax ?? 1, taxRate);

  const payload: Prisma.SalesOrderPriceUncheckedCreateWithoutOrderInput = {
    lineNumber: lineNumber,
    sequenceNumber: lineNumber,
    company: header.company,
    category: header.category,
    soldToCustomer: header.soldToCustomer,
    shipToCustomerAddress: header.shipToCustomerAddress,
    billToCustomer: header.billToCustomer,
    shippingSite: lineInput.shippingSite ?? header.shippingSite,
    salesSite: lineInput.salesSite ?? header.salesSite,
    product: lineInput.product,
    productDescriptionInUserLanguage: product.description1 ?? '',
    productDescriptionInCustomerLanguage: product.description1 ?? '',
    taxLevel1: product.taxLevel1 ?? '',
    taxLevel2: product.taxLevel2 ?? '',
    taxLevel3: product.taxLevel3 ?? '',
    salesRepCommissionFactor: 1,
    grossPrice: linePrice,
    priceReason: 1,
    tax1: vat,
    netPrice: calculatedPrice.priceWithoutTax,
    netPriceExcludingTax: calculatedPrice.priceWithoutTax,
    netPriceIncludingTax: calculatedPrice.priceWithTax,
    margin: calculatedPrice.priceWithoutTax,
    salesUnit: product.salesUnit ?? 'EA',
    stockUnit: product.stockUnit ?? 'EA',
    salesUnitToStockUnitConversionFactor: product.salesUnitToStockUnitConversionFactor ?? 1,
    productStatisticalGroup1: product.productStatisticalGroup1 ?? '',
    productStatisticalGroup2: product.productStatisticalGroup2 ?? '',
    productStatisticalGroup3: product.productStatisticalGroup3 ?? '',
    productStatisticalGroup4: product.productStatisticalGroup4 ?? '',
    productStatisticalGroup5: product.productStatisticalGroup5 ?? '',
    createDate: timestamps.date,
    updateDate: timestamps.date,
    createDatetime: timestamps.dateTime,
    updateDatetime: timestamps.dateTime,
    singleID: priceUUID,
    ENDDAT_0: timestamps.date,
  };

  return [payload];
}

export async function buildAnalyticalAccountingLinesPayload(
  header: Prisma.SalesOrderCreateInput,
  ledgers: Ledgers[],
  commonService: CommonService,
): Promise<Prisma.AnalyticalAccountingLinesUncheckedUpdateWithoutSalesOrderPriceInput[]> {
  const timestamps = getAuditTimestamps();
  const analyticalUUID = generateUUIDBuffer();

  const fixedAnalyticalData: Partial<Prisma.AnalyticalAccountingLinesCreateInput> = {
    abbreviation: 'SOP',
    sortValue: 1,
    dimensionType1: header.dimensionType1,
    dimensionType2: header.dimensionType2,
    dimensionType3: header.dimensionType3,
    dimensionType4: header.dimensionType4,
    dimensionType5: header.dimensionType5,
    dimensionType6: header.dimensionType6,
    dimensionType7: header.dimensionType7,
    dimension1: header.dimension1,
    dimension2: header.dimension2,
    dimension3: header.dimension3,
    dimension4: header.dimension4,
    dimension5: header.dimension5,
    dimension6: header.dimension6,
    dimension7: header.dimension7,
    createDatetime: timestamps.dateTime,
    updateDatetime: timestamps.dateTime,
    singleID: analyticalUUID,
  };

  const ledgerData = ledgers[0];

  if (!ledgerData) {
    return [];
  }

  const ledgerFields: { [key: string]: string } = {};
  const chartFields: { [key: string]: string } = {};

  const ledgerKeys = Object.values(ledgerData).filter(Boolean); // Pega todos os valores de ledger que não são vazios

  // Cria um array de promises, onde cada promise busca um código de chart
  const chartCodePromises = ledgerKeys.map((ledgerValue) => commonService.getChartCode(ledgerValue));

  // Executa todas as buscas de código de chart em paralelo
  const resolvedChartCodes = await Promise.all(chartCodePromises);

  // Agora preenchemos os objetos ledgerFields e chartFields
  for (let i = 0; i < ledgerKeys.length; i++) {
    // Limita a 6, se essa for a regra
    if (i >= 6) break;

    const ledgerValue = ledgerKeys[i];
    const chartCode = resolvedChartCodes[i];

    ledgerFields[`ledger${i + 1}`] = ledgerValue ?? '';
    chartFields[`chartCode${i + 1}`] = chartCode ?? '';
  }

  const payload: Prisma.AnalyticalAccountingLinesUncheckedUpdateWithoutSalesOrderPriceInput = {
    ...fixedAnalyticalData,
    ...ledgerFields,
    ...chartFields,
  };

  return [payload];
}
