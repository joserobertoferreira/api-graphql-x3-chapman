import { InternalServerErrorException } from '@nestjs/common/exceptions';
import { buildOrderDimensionResponse } from 'src/common/helpers/orders-dimension.helper';
import { PurchaseOrderDimensionEntity } from 'src/common/outputs/purchase-order-dimension.entity';
import { localMenuLineStatusToGqlEnum } from 'src/common/services/common-enumerate.service';
import { PurchaseOrderDimensionDetail } from 'src/common/types/purchase-order.types';
import { stringsToArray } from 'src/common/utils/array.utils';
import { LocalMenus } from 'src/common/utils/enums/local-menu';
import { Prisma, PurchaseOrderView } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CustomerDimensionEntity } from '../../dimensions/entities/dimension.entity';
import { PurchaseOrderLineEntity } from '../entities/purchase-order-line.entity';
import { PurchaseOrderEntity } from '../entities/purchase-order.entity';

const purchaseOrderLineInclude = {
  price: true,
} satisfies Prisma.PurchaseOrderLineInclude;

type PurchaseOrderLineWithPrice = Prisma.PurchaseOrderLineGetPayload<{
  include: typeof purchaseOrderLineInclude;
}>;

const purchaseOrderInclude = {
  orderLines: {
    include: purchaseOrderLineInclude,
  },
} satisfies Prisma.PurchaseOrderInclude;

type PurchaseOrderWithRelations = Prisma.PurchaseOrderGetPayload<{
  include: typeof purchaseOrderInclude;
}>;

// Função para mapear uma linha (vinda das tabelas originais)
export function mapLineToEntity(line: PurchaseOrderLineWithPrice): PurchaseOrderLineEntity {
  if (!line.price) {
    throw new InternalServerErrorException(`Price information missing for line ${line.lineNumber}.`);
  }

  // Map tax levels
  const taxLevels = stringsToArray(line.price.tax1, line.price.tax2, line.price.tax3);

  return {
    orderNumber: line.orderNumber,
    lineNumber: line.lineNumber,
    lineStatus: localMenuLineStatusToGqlEnum[line.lineStatus as LocalMenus.LineStatus],
    product: line.product,
    productCode: line.product,
    productDescription: line.price?.productDescriptionInUserLanguage,
    orderedQuantity: line.quantityInStockUnitOrdered.toNumber() ?? 0,
    grossPrice: line.price.grossPrice.toNumber() ?? 0,
    // netPriceExcludingTax: line.price.netPrice.toNumber() ?? 0,
    // netPriceIncludingTax: line.price.netPriceIncludingTax.toNumber() ?? 0,
    taxLevel: taxLevels.length > 0 ? taxLevels[0] : undefined,
  };
}

export async function mapViewToEntity(lines: PurchaseOrderView[], prisma: PrismaService): Promise<PurchaseOrderEntity> {
  if (lines.length === 0) return { orderNumber: '', lines: [] } as PurchaseOrderEntity;

  const header = lines[0]; // Fetches the first line for header data

  const dimensionsData = await buildOrderDimensionResponse(lines, prisma);

  return {
    orderNumber: header.orderNumber,
    orderDate: header.orderDate,
    currency: header.currency,
    currencyRate: header.currencyRate?.toNumber() ?? 0,
    company: header.company,
    purchaseSite: header.purchasingSite,
    buyer: header.buyer,
    totalAmountExcludingTax: header.totalAmountExcludingTax?.toNumber() ?? 0,
    totalAmountIncludingTax: header.totalAmountIncludingTax?.toNumber() ?? 0,
    supplierInfo: {
      supplier: header.supplier,
      supplierNames: stringsToArray(header.companyName1, header.companyName2),
      supplierVatNumber: header.vatNumber,
      supplierAddress: header.address,
      supplierAddressLines: stringsToArray(header.addressLine1, header.addressLine2, header.addressLine3),
      supplierCity: header.city,
      supplierPostalCode: header.postalCode,
      supplierCountry: header.country,
      supplierCountryName: header.countryName,
    },
    lines: lines.map((line) => mapViewLineToEntity(line, dimensionsData)),
  };
}

export function mapViewLineToEntity(
  line: PurchaseOrderView,
  dimensionsData: Map<string, PurchaseOrderDimensionDetail>,
): PurchaseOrderLineEntity {
  const dimensions: PurchaseOrderDimensionEntity[] = [];

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
    productDescription: line.productDescription,
    taxLevel: line.tax,
    orderedQuantity: line.quantityInPurchaseUnitOrdered.toNumber() ?? 0,
    grossPrice: line.grossPrice.toNumber() ?? 0,
    dimensions: dimensions.length > 0 ? dimensions : undefined,
  };
}
