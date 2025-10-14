import { InternalServerErrorException } from '@nestjs/common/exceptions';
import { Prisma, SalesOrderView } from 'src/generated/prisma';
import { buildOrderDimensionResponse } from '../../../common/helpers/orders-dimension.helper';
import { SalesOrderDimensionEntity } from '../../../common/outputs/sales-order-dimension.entity';
import {
  localMenuLineStatusToGqlEnum,
  localMenuOrderStatusToGqlEnum,
} from '../../../common/services/common-enumerate.service';
import { SalesOrderDimensionDetail } from '../../../common/types/sales-order.types';
import { stringsToArray } from '../../../common/utils/array.utils';
import { LocalMenus } from '../../../common/utils/enums/local-menu';
import { PrismaService } from '../../../prisma/prisma.service';
import { CustomerDimensionEntity } from '../../dimensions/entities/dimension.entity';
import { SalesOrderLineEntity } from '../entities/sales-order-line.entity';
import { SalesOrderEntity } from '../entities/sales-order.entity';

const salesOrderLineInclude = Prisma.validator<Prisma.SalesOrderLineInclude>()({
  price: true,
});

type SalesOrderLineWithPrice = Prisma.SalesOrderLineGetPayload<{
  include: typeof salesOrderLineInclude;
}>;

const salesOrderInclude = Prisma.validator<Prisma.SalesOrderInclude>()({
  orderLines: {
    include: salesOrderLineInclude,
  },
});

type SalesOrderWithRelations = Prisma.SalesOrderGetPayload<{
  include: typeof salesOrderInclude;
}>;

// Função para mapear uma linha (vinda das tabelas originais)
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
    product: line.product,
    productCode: line.product,
    productDescription: line.price?.productDescriptionInUserLanguage,
    orderedQuantity: line.quantityInSalesUnitOrdered.toNumber() ?? 0,
    netPriceExcludingTax: line.price.netPrice.toNumber() ?? 0,
    netPriceIncludingTax: line.price.netPriceIncludingTax.toNumber() ?? 0,
    taxLevel: taxLevels.length > 0 ? taxLevels[0] : undefined,
  };
}

export async function mapViewToEntity(lines: SalesOrderView[], prisma: PrismaService): Promise<SalesOrderEntity> {
  if (lines.length === 0) return { orderNumber: '', lines: [] } as SalesOrderEntity;

  const header = lines[0]; // Fetches the first line for header data

  const orderStatus = localMenuOrderStatusToGqlEnum[header.orderStatus as LocalMenus.OrderStatus];

  const dimensionsData = await buildOrderDimensionResponse(lines, prisma);

  return {
    orderNumber: header.orderNumber,
    orderDate: header.orderDate,
    status: orderStatus,
    currency: header.currency,
    currencyRate: header.currencyRate?.toNumber() ?? 0,
    company: header.company,
    shippingSite: header.shippingSite,
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
  line: SalesOrderView,
  dimensionsData: Map<string, SalesOrderDimensionDetail>,
): SalesOrderLineEntity {
  const dimensions: SalesOrderDimensionEntity[] = [];

  const analytics = (line as any).analyticalAccountingLines?.[0];

  if (analytics) {
    for (let i = 1; i <= 20; i++) {
      const typeKey = `dimensionType${i}` as keyof typeof analytics;
      const valueKey = `dimension${i}` as keyof typeof analytics;

      const typeCode = analytics[typeKey] as string;
      const value = analytics[valueKey] as string;

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

  return {
    orderNumber: line.orderNumber,
    lineNumber: line.lineNumber,
    lineStatus: localMenuLineStatusToGqlEnum[line.lineStatus as LocalMenus.LineStatus],
    product: line.product,
    productCode: line.product,
    productDescription: line.productDescription.trim() || undefined,
    taxLevel: line.taxLevel.trim() || undefined,
    orderedQuantity: line.quantityInSalesUnitOrdered.toNumber(),
    netPriceExcludingTax: line.netPriceExcludingTax.toNumber(),
    netPriceIncludingTax: line.netPriceIncludingTax.toNumber(),
    dimensions: dimensions.length > 0 ? dimensions : undefined,
  };
}
