import { Prisma } from '@prisma/client';
import { AccountService } from '../../../common/services/account.service';
import { CurrencyService } from '../../../common/services/currency.service';
import { LedgerPlanCode, Ledgers } from '../../../common/types/common.types';
import { generateUUIDBuffer, getAuditTimestamps } from '../../../common/utils/audit-date.utils';
import { calculatePrice } from '../../../common/utils/sales-price.utils';
import { SalesOrderLineInput } from '../dto/create-sales-order.input';
import { mapDimensionFields } from './sales-order.mapper';

export async function buildSalesOrderLineCreationPayload(
  header: Prisma.SalesOrderCreateInput,
  lineInput: SalesOrderLineInput,
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
  currencyService: CurrencyService,
): Promise<Prisma.SalesOrderPriceUncheckedCreateWithoutOrderInput[]> {
  const timestamps = getAuditTimestamps();
  const priceUUID = generateUUIDBuffer();

  // Get the tax rate from the product or default to 0 if not available
  const taxRateResult = await currencyService.getTaxRate(product.taxLevel1, timestamps.date);

  const taxRate = taxRateResult ? taxRateResult.rate.toNumber() : 0;
  const vat = taxRateResult ? taxRateResult.tax : '';

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
  line: SalesOrderLineInput,
  ledgers: Ledgers | null,
  accountService: AccountService,
): Promise<Prisma.AnalyticalAccountingLinesUncheckedUpdateWithoutSalesOrderPriceInput[]> {
  if (!ledgers || !ledgers.ledgers || ledgers.ledgers.length === 0) {
    return [];
  }

  const dimensionMap = line.dimensions || [];

  dimensionMap.push({ typeCode: 'PDT', value: line.product });

  const headerTypes = [
    header.dimensionType1,
    header.dimensionType2,
    header.dimensionType3,
    header.dimensionType4,
    header.dimensionType5,
    header.dimensionType6,
    header.dimensionType7,
  ];

  console.log('headerTypes', headerTypes);

  const dimensions = mapDimensionFields(dimensionMap, headerTypes);

  console.log('dimensions', dimensions);

  const timestamps = getAuditTimestamps();
  const analyticalUUID = generateUUIDBuffer();

  const fixedAnalyticalData: Partial<Prisma.AnalyticalAccountingLinesCreateInput> = {
    abbreviation: 'SOP',
    sortValue: 1,
    dimensionType1: headerTypes[0],
    dimensionType2: headerTypes[1],
    dimensionType3: headerTypes[2],
    dimensionType4: headerTypes[3],
    dimensionType5: headerTypes[4],
    dimensionType6: headerTypes[5],
    dimensionType7: headerTypes[6],
    ...dimensions,
    createDatetime: timestamps.dateTime,
    updateDatetime: timestamps.dateTime,
    singleID: analyticalUUID,
  };

  const ledgerFields: { [key: string]: string } = {};
  const chartFields: { [key: string]: string } = {};

  const planCodes: LedgerPlanCode[] = await accountService.getPlanCodes(ledgers);

  const ledgerMap = new Map<string, string>(planCodes.map((row) => [row.code, row.planCode]));

  // Agora preenchemos os objetos ledgerFields e chartFields
  for (let i = 0; i < ledgers.ledgers.length; i++) {
    const ledgerCode = ledgers.ledgers[i];
    const planCode = ledgerMap.get(ledgerCode);

    ledgerFields[`ledger${i + 1}`] = ledgerCode ?? '';
    chartFields[`chartCode${i + 1}`] = planCode ?? '';
  }

  const payload: Prisma.AnalyticalAccountingLinesUncheckedUpdateWithoutSalesOrderPriceInput = {
    ...fixedAnalyticalData,
    ...ledgerFields,
    ...chartFields,
  };

  return [payload];
}
