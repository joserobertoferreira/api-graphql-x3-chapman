import { InternalServerErrorException } from '@nestjs/common/exceptions';
import { buildOrderDimensionResponse } from 'src/common/helpers/orders-dimension.helper';
import { SalesOrderDimensionEntity } from 'src/common/outputs/sales-order-dimension.entity';
import {
  localMenuExchangeRateTypeToGqlEnum,
  localMenuInvoiceAccountingStatusToGqlEnum,
  localMenuLineStatusToGqlEnum,
  localMenuOrderAccountingStatusToGqlEnum,
  localMenuOrderStatusToGqlEnum,
} from 'src/common/services/common-enumerate.service';
import {
  SalesOrderDimensionDetail,
  SalesOrderLineWithAnalytics,
  SalesOrderLineWithPrice,
  SalesOrderViewWithRelations,
} from 'src/common/types/sales-order.types';
import { stringsToArray } from 'src/common/utils/array.utils';
import { LocalMenus } from 'src/common/utils/enums/local-menu';
import { SalesOrder } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CustomerDimensionEntity } from '../../dimensions/entities/dimension.entity';
import { ClosedSalesOrderLineEntity, SalesOrderLineEntity } from '../entities/sales-order-line.entity';
import { ClosedSalesOrderEntity, SalesOrderEntity } from '../entities/sales-order.entity';

export function mapLineToEntity(line: SalesOrderLineWithPrice): SalesOrderLineEntity {
  if (!line.price) {
    throw new InternalServerErrorException(`Price information missing for line ${line.lineNumber}.`);
  }

  // Map tax levels
  const taxLevels = stringsToArray(line.price.taxLevel1, line.price.taxLevel2, line.price.taxLevel3);

  return {
    orderNumber: line.orderNumber,
    lineNumber: line.lineNumber,
    lineStatus: localMenuLineStatusToGqlEnum[line.lineStatus as LocalMenus.LineStatus],
    accountingStatus:
      localMenuOrderAccountingStatusToGqlEnum[line.accountingLineStatus as LocalMenus.OrderAccountingStatus],
    product: line.product,
    productCode: line.product,
    productDescription: line.price?.productDescriptionInUserLanguage,
    orderedQuantity: line.quantityInSalesUnitOrdered.toNumber() ?? 0,
    netPriceExcludingTax: line.price.netPrice.toNumber() ?? 0,
    netPriceIncludingTax: line.price.netPriceIncludingTax.toNumber() ?? 0,
    taxLevel: taxLevels.length > 0 ? taxLevels[0] : undefined,
  };
}

export async function mapViewToEntity(
  lines: SalesOrderViewWithRelations[],
  prisma: PrismaService,
): Promise<SalesOrderEntity> {
  if (lines.length === 0) return { orderNumber: '', lines: [] } as SalesOrderEntity;

  const header = lines[0]; // Fetches the first line for header data

  const orderStatus = localMenuOrderStatusToGqlEnum[header.orderStatus as LocalMenus.OrderStatus];
  const orderAccountingStatus =
    localMenuOrderAccountingStatusToGqlEnum[header.accountingOrderStatus as LocalMenus.OrderAccountingStatus];
  const invoicedStatus =
    localMenuInvoiceAccountingStatusToGqlEnum[header.invoicingStatus as LocalMenus.InvoiceAccountingStatus];
  const rateType = localMenuExchangeRateTypeToGqlEnum[header.currencyRateType as LocalMenus.ExchangeRateType];

  const dimensionsData = await buildOrderDimensionResponse(lines, prisma);

  return {
    orderNumber: header.orderNumber,
    orderDate: header.orderDate,
    status: orderStatus,
    accountingStatus: orderAccountingStatus,
    invoicedStatus: invoicedStatus,
    currency: header.currency,
    currencyRateType: rateType,
    currencyRate: header.currencyRate?.toNumber() ?? 0,
    salesSite: header.salesSite,
    company: header.company,
    customerOrderReference: header.customerOrderReference,
    shippingSite: header.shippingSite,
    taxRule: header.taxRule,
    paymentTerm: header.paymentTerm,
    totalAmountExcludingTax: header.totalAmountExcludingTax?.toNumber() ?? 0,
    totalAmountIncludingTax: header.totalAmountIncludingTax?.toNumber() ?? 0,
    soldTo: {
      soldToCustomer: header.soldToCustomer,
      soldToCustomerNames: stringsToArray(header.soldToCustomerName1, header.soldToCustomerName2),
      soldToCustomerVatNumber: header.soldToCustomerVatNumber.trim() || undefined,
      soldToCustomerAddress: header.soldToCustomerAddress.trim() || undefined,
      soldAddressLines: stringsToArray(
        header.soldAddressLine1 || undefined,
        header.soldAddressLine2 || undefined,
        header.soldAddressLine3 || undefined,
      ),
      soldToCustomerCity: header.soldToCustomerCity.trim() || undefined,
      soldToCustomerPostalCode: header.soldToCustomerPostalCode.trim() || undefined,
      soldToCustomerCountry: header.soldToCustomerCountry.trim() || undefined,
      soldToCustomerCountryName: header.soldToCustomerCountryName.trim() || undefined,
    },
    lines: lines.map((line) => mapViewLineToEntity(line, dimensionsData)),
  };
}

export function mapViewLineToEntity(
  line: SalesOrderViewWithRelations,
  dimensionsData: Map<string, SalesOrderDimensionDetail>,
): SalesOrderLineEntity {
  const dimensions: SalesOrderDimensionEntity[] = [];

  const analytics = line.analyticalAccountingLines?.[0];

  if (analytics) {
    for (let i = 1; i <= 20; i++) {
      const typeKey = `dimensionType${i}` as keyof typeof analytics;
      const valueKey = `dimension${i}` as keyof typeof analytics;

      const rawType = analytics[typeKey];
      const rawValue = analytics[valueKey];
      const typeCode = typeof rawType === 'string' ? rawType : '';
      const value = typeof rawValue === 'string' ? rawValue : '';

      if (!typeCode || typeCode.trim() === '' || !value || value.trim() === '') {
        break;
      }

      const detail = dimensionsData.get(`${typeCode}|${value}`);
      const fixtureCustomerObj: CustomerDimensionEntity = detail?.fixtureCustomer
        ? detail.fixtureCustomer
        : { code: '', name: '' };

      dimensions.push({
        dimensionType: typeCode,
        dimension: value || '',
        additionalInfo: detail?.additionalInfo || '',
        shortTitle: detail?.shortTitle || '',
        pioneerReference: detail?.pioneerReference || '',
        fixtureCustomer: fixtureCustomerObj,
        brokerEmail: detail?.brokerEmail || '',
      });
    }
  }

  const productDescription =
    line.productDescriptionInCustomerLanguage?.trim() || line.productDescriptionInUserLanguage?.trim() || '';

  return {
    orderNumber: line.orderNumber,
    lineNumber: line.lineNumber,
    lineStatus: localMenuLineStatusToGqlEnum[line.lineStatus as LocalMenus.LineStatus],
    accountingStatus:
      localMenuOrderAccountingStatusToGqlEnum[line.accountingLineStatus as LocalMenus.OrderAccountingStatus],
    product: line.product,
    productCode: line.product,
    productDescription: productDescription,
    taxLevel: line.taxLevel.trim() || undefined,
    orderedQuantity: line.quantityInSalesUnitOrdered.toNumber(),
    netPriceExcludingTax: line.netPriceExcludingTax.toNumber(),
    netPriceIncludingTax: line.netPriceIncludingTax.toNumber(),
    dimensions: dimensions.length > 0 ? dimensions : undefined,
    orderLineText: line.text.trim() || undefined,
    startDate: line.startDate || undefined,
    endDate: line.endDate || undefined,
  };
}

/**
 * Maps a SalesOrderLine from Prisma to a ClosedSalesOrderLineEntity for GraphQL.
 * @param line - The sales order line object from the database, including relations.
 * @returns A ClosedSalesOrderLineEntity object.
 */
export function mapLineToClosedEntity(line: SalesOrderLineWithAnalytics): ClosedSalesOrderLineEntity {
  const dimensions = {
    fixture: line.analyticalLines[0]?.dimension1 || '',
    broker: line.analyticalLines[0]?.dimension2 || '',
    department: line.analyticalLines[0]?.dimension3 || '',
    location: line.analyticalLines[0]?.dimension4 || '',
    type: line.analyticalLines[0]?.dimension5 || '',
    product: line.analyticalLines[0]?.dimension6 || '',
    analysis: line.analyticalLines[0]?.dimension7 || '',
  };

  return {
    orderNumber: line.orderNumber,
    lineNumber: line.lineNumber,
    lineStatus: localMenuLineStatusToGqlEnum[line.lineStatus as LocalMenus.LineStatus],
    accountingStatus:
      localMenuOrderAccountingStatusToGqlEnum[line.accountingLineStatus as LocalMenus.OrderAccountingStatus],
    dimensions,
  };
}

/**
 * Maps a SalesOrder from Prisma to a ClosedSalesOrderEntity.
 * @param order - The sales order object from the database.
 * @param lines - The specific lines that were updated and should be included.
 * @returns A ClosedSalesOrderEntity object.
 */
export function mapOrderToClosedEntity(
  order: SalesOrder,
  lines: SalesOrderLineWithAnalytics[],
): ClosedSalesOrderEntity {
  return {
    orderNumber: order.orderNumber,
    orderDate: order.orderDate,
    status: localMenuOrderStatusToGqlEnum[order.orderStatus as LocalMenus.OrderStatus],
    accountingStatus:
      localMenuOrderAccountingStatusToGqlEnum[order.accountingOrderStatus as LocalMenus.OrderAccountingStatus],
    invoicedStatus:
      localMenuInvoiceAccountingStatusToGqlEnum[order.invoicedStatus as LocalMenus.InvoiceAccountingStatus],

    lines: lines.map(mapLineToClosedEntity),
  };
}
