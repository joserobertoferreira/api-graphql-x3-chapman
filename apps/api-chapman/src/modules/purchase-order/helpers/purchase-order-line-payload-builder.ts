import { LocalMenus } from '@chapman/utils';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from 'src/generated/prisma';
import { AccountService } from '../../../common/services/account.service';
import { Ledgers } from '../../../common/types/common.types';
import { DimensionTypeConfig } from '../../../common/types/dimension.types';
import { AutomaticJournalLine, AutomaticJournalWithLines } from '../../../common/types/journal-entry.types';
import { generateUUIDBuffer, getAuditTimestamps } from '../../../common/utils/audit-date.utils';
import { formatNumberWithLeadingZeros } from '../../../common/utils/common.utils';
import { CalculatedPrice } from '../../../common/utils/sales-price.utils';
import { buildAnalyticalDimensionsPayload } from '../../dimensions/helpers/dimension.helper';
import { PurchaseOrderLineInput } from '../dto/create-purchase-order.input';

export async function buildPurchaseOrderLineCreationPayload(
  header: Prisma.PurchaseOrderCreateInput,
  defaultSiteAddress: string,
  companyCurrency: string,
  lineInput: PurchaseOrderLineInput,
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

  const isIntersite = (lineInput.salesOrder ?? '').trim() !== '' ? true : false;

  const payload: Prisma.PurchaseOrderLineUncheckedCreateWithoutOrderInput = {
    lineNumber: lineNumber,
    sequenceNumber: lineNumber / 1000,
    lineAndSequenceIndex: lineSequence,
    company: header.company,
    purchaseSite: header.purchaseSite,
    orderType: LocalMenus.OrderType.ORDER,
    supplier: header.supplier,
    billBySupplier: header.billBy,
    billBySupplierAddress: header.billingAddress,
    product: lineInput.product,
    orderDate: header.orderDate,
    shippingSite: lineInput.shippingSite ?? header.shippingSite,
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
    salesOrder: lineInput.salesOrder ?? '',
    salesOrderLine: lineInput.salesOrderLine ?? 0,
    salesOrderSequenceNumber: lineInput.salesOrderSequence ?? 0,
    acknowledgementNumber: lineInput.salesOrder ?? '',
    acknowledgementDate: isIntersite ? header.orderDate : new Date('1753-01-01'),
    interCompanySalesOrderLineNumber: lineInput.salesOrderLine ?? 0,
    interCompanySalesOrderSequenceNumber: lineInput.salesOrderSequence ?? 0,
    accountingValidationStatus: LocalMenus.AccountingStatus.NON_ACCOUNTED,
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
  line: PurchaseOrderLineInput,
  product: Prisma.ProductsGetPayload<{}>,
  ledgers: Ledgers | null,
  dimensionTypesMap: Map<string, DimensionTypeConfig>,
  automaticJournals: AutomaticJournalWithLines,
  accountService: AccountService,
): Promise<Prisma.AnalyticalAccountingLinesUncheckedUpdateWithoutPurchaseOrderPriceInput[]> {
  if (!ledgers || !ledgers.ledgers || ledgers.ledgers.length === 0) {
    return [];
  }

  const automaticJournalLine: AutomaticJournalLine = automaticJournals.automaticJournalLines[0] || undefined;

  const { fixedAnalyticalData, ledgerFields, chartFields, accountFields } = await buildAnalyticalDimensionsPayload(
    'POP',
    line.dimensions ?? {},
    product.code ?? '',
    product.accountingCode ?? '',
    automaticJournalLine,
    ledgers,
    dimensionTypesMap,
    accountService,
  );

  const payload: Prisma.AnalyticalAccountingLinesUncheckedUpdateWithoutPurchaseOrderPriceInput = {
    ...fixedAnalyticalData,
    ...ledgerFields,
    ...chartFields,
    ...accountFields,
  };

  return [payload];
}
