import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { DimensionInput } from '../../../common/inputs/dimension.input';
import { CommonService } from '../../../common/services/common.service';
import { Ledgers } from '../../../common/types/common.types';
import { mapDimensionsToPayload } from '../../../common/utils/array.utils';
import { generateUUIDBuffer, getAuditTimestamps } from '../../../common/utils/audit-date.utils';
import { formatNumberWithLeadingZeros } from '../../../common/utils/common.utils';
import { CalculatedPrice } from '../../../common/utils/sales-price.utils';
import { CreatePurchaseOrderLineInput } from '../dto/create-purchase-order.input';

export async function buildPurchaseOrderLineCreationPayload(
  header: Prisma.PurchaseOrderCreateInput,
  defaultSiteAddress: string,
  companyCurrency: string,
  lineInput: CreatePurchaseOrderLineInput,
  lineNumber: number,
  taxExcludedLineAmount: Decimal,
  calculatedPrice: CalculatedPrice,
  product: Prisma.ProductsGetPayload<{}>,
): Promise<Prisma.PurchaseOrderLineUncheckedCreateWithoutOrderInput[]> {
  const timestamps = getAuditTimestamps();
  const lineUUID = generateUUIDBuffer();
  const lineSequence: string =
    formatNumberWithLeadingZeros(lineNumber, 8) + formatNumberWithLeadingZeros(lineNumber / 1000, 8);

  const currencyRate = header.currencyRate ? new Decimal(Number(header.currencyRate)) : new Decimal(1);

  const linePurchaseCostInCompanyCurrency = taxExcludedLineAmount
    .mul(currencyRate)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  const purchaseCostInCompanyCurrency = linePurchaseCostInCompanyCurrency
    .div(new Decimal(Number(lineInput.quantity)))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  const lineStockCostInCompanyCurrency = purchaseCostInCompanyCurrency.mul(new Decimal(Number(lineInput.quantity)));

  const payload: Prisma.PurchaseOrderLineUncheckedCreateWithoutOrderInput = {
    lineNumber: lineNumber,
    sequenceNumber: lineNumber / 1000,
    lineAndSequenceIndex: lineSequence,
    company: header.company,
    purchaseSite: header.purchaseSite,
    orderType: 1,
    supplier: header.supplier,
    billBySupplier: header.billBy,
    billBySupplierAddress: header.billingAddress,
    product: lineInput.product,
    orderDate: header.orderDate,
    shippingSite: header.shippingSite,
    quantityInOrderUnitOrdered: lineInput.quantity,
    quantityInPurchaseUnitOrdered: lineInput.quantity,
    quantityInStockUnitOrdered: lineInput.quantity,
    purchaseUnit: product.purchaseUnit ?? 'EA',
    stockUnit: product.stockUnit ?? 'EA',
    orderUnit: product.stockUnit ?? 'EA',
    weightUnit: header.weightUnitForDistributionOnLines ?? 'KG',
    volumeUnit: header.volumeUnitForDistributionOnLines ?? 'LT',
    requirementDate: header.orderDate ?? timestamps.date,
    expectedReceiptDate: header.expectedReceiptDate ?? timestamps.date,
    receiptSite: header.purchaseSite,
    receiptAddress: defaultSiteAddress,
    currency: header.currency,
    purchaseCostInCompanyCurrency: purchaseCostInCompanyCurrency,
    stockCostInCompanyCurrency: purchaseCostInCompanyCurrency,
    companyCurrency: companyCurrency,
    costPriceWithoutLandedCost: purchaseCostInCompanyCurrency,
    taxExcludedLineAmount: taxExcludedLineAmount,
    lineStockCostInCompanyCurrency: lineStockCostInCompanyCurrency,
    linePurchaseCostInCompanyCurrency: linePurchaseCostInCompanyCurrency,
    lineOrderAmountIncludingTax: calculatedPrice.priceWithTax,
    lineAmountIncludingTax: calculatedPrice.priceWithTax,
    tax1BasisAmount: taxExcludedLineAmount,
    tax1amount: calculatedPrice.taxValue,
    tax1DeductibleAmount: calculatedPrice.taxValue,
    accountingValidationStatus: 1,
    createDate: timestamps.date,
    updateDate: timestamps.date,
    createDatetime: timestamps.dateTime,
    updateDatetime: timestamps.dateTime,
    singleID: lineUUID,
  };

  return [payload];
}

export async function buildPurchaseOrderPriceCreationPayload(
  header: Prisma.PurchaseOrderCreateInput,
  defaultSiteAddress: string,
  lineInput: Prisma.PurchaseOrderLineUncheckedCreateWithoutOrderInput,
  lineNumber: number,
  linePrice: Prisma.Decimal,
  lineTaxLevel: string,
  product: Prisma.ProductsGetPayload<{}>,
): Promise<Prisma.PurchaseOrderPriceUncheckedCreateWithoutOrderInput[]> {
  const timestamps = getAuditTimestamps();
  const priceUUID = generateUUIDBuffer();

  // Get the tax rate from the product or default to 0 if not available
  const tax = lineTaxLevel ?? product.taxLevel1;

  const payload: Prisma.PurchaseOrderPriceUncheckedCreateWithoutOrderInput = {
    lineNumber: lineNumber,
    sequenceNumber: lineNumber / 1000,
    orderType: 1,
    company: header.company,
    product: lineInput.product,
    productDescriptionInUserLanguage: product.description1 ?? '',
    productDescriptionInCustomerLanguage: product.description1 ?? '',
    tax1: tax ?? '',
    tax2: product.taxLevel2 ?? '',
    tax3: product.taxLevel3 ?? '',
    grossPrice: linePrice,
    priceReason: 1,
    netPrice: linePrice,
    receiptSite: header.purchaseSite,
    receiptAddress: defaultSiteAddress,
    countryOfOrigin: header.country,
    productStatisticalGroup1: product.productStatisticalGroup1 ?? '',
    productStatisticalGroup2: product.productStatisticalGroup2 ?? '',
    productStatisticalGroup3: product.productStatisticalGroup3 ?? '',
    productStatisticalGroup4: product.productStatisticalGroup4 ?? '',
    productStatisticalGroup5: product.productStatisticalGroup5 ?? '',
    accountingValidationStatus: 1,
    createDate: timestamps.date,
    updateDate: timestamps.date,
    createDatetime: timestamps.dateTime,
    updateDatetime: timestamps.dateTime,
    singleID: priceUUID,
  };

  return [payload];
}

export async function buildAnalyticalAccountingLinesPayload(
  dimensions: DimensionInput[],
  ledgers: Ledgers[],
  commonService: CommonService,
): Promise<Prisma.AnalyticalAccountingLinesUncheckedUpdateWithoutPurchaseOrderPriceInput[]> {
  const timestamps = getAuditTimestamps();
  const analyticalUUID = generateUUIDBuffer();

  const fixedAnalyticalData: Partial<Prisma.AnalyticalAccountingLinesCreateInput> = {
    abbreviation: 'POP',
    sortValue: 1,
    // dimensionType1: dimensions.dimensionType1,
    // dimensionType2: dimensions.dimensionType2,
    // dimensionType3: dimensions.dimensionType3,
    // dimensionType4: dimensions.dimensionType4,
    // dimensionType5: dimensions.dimensionType5,
    // dimensionType6: dimensions.dimensionType6,
    // dimensionType7: dimensions.dimensionType7,
    // dimension1: dimensions.dimension1,
    // dimension2: dimensions.dimension2,
    // dimension3: dimensions.dimension3,
    // dimension4: dimensions.dimension4,
    // dimension5: dimensions.dimension5,
    // dimension6: dimensions.dimension6,
    // dimension7: dimensions.dimension7,
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

  const payload: Prisma.AnalyticalAccountingLinesUncheckedUpdateWithoutPurchaseOrderPriceInput = {
    ...fixedAnalyticalData,
    ...mapDimensionsToPayload(dimensions),
    ...ledgerFields,
    ...chartFields,
  };

  return [payload];
}
