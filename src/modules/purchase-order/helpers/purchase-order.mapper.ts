import { InternalServerErrorException } from '@nestjs/common/exceptions';
import { Prisma, PurchaseOrderView } from '@prisma/client';
import { stringsToArray } from '../../../common/utils/array.utils';
import { PurchaseOrderLineEntity } from '../entities/purchase-order-line.entity';
import { PurchaseOrderEntity } from '../entities/purchase-order.entity';

const purchaseOrderLineInclude = Prisma.validator<Prisma.PurchaseOrderLineInclude>()({
  price: true,
});

type PurchaseOrderLineWithPrice = Prisma.PurchaseOrderLineGetPayload<{
  include: typeof purchaseOrderLineInclude;
}>;

const purchaseOrderInclude = Prisma.validator<Prisma.PurchaseOrderInclude>()({
  orderLines: {
    include: purchaseOrderLineInclude,
  },
});

type PurchaseOrderWithRelations = Prisma.PurchaseOrderGetPayload<{
  include: typeof purchaseOrderInclude;
}>;

// Função para mapear uma linha (vinda das tabelas originais)
export function mapLineToEntity(line: PurchaseOrderLineWithPrice): PurchaseOrderLineEntity {
  if (!line.price) {
    throw new InternalServerErrorException(`Price information missing for line ${line.lineNumber}.`);
  }

  const taxLevels = stringsToArray(line.price.tax1, line.price.tax2, line.price.tax3);

  return {
    orderNumber: line.orderNumber,
    lineNumber: line.lineNumber,
    lineStatus: line.lineStatus,
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

export function mapViewToEntity(lines: PurchaseOrderView[]): PurchaseOrderEntity {
  if (lines.length === 0) return { orderNumber: '', lines: [] } as PurchaseOrderEntity;

  const header = lines[0]; // Pega a primeira linha para os dados do cabeçalho

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
    lines: lines.map(mapViewLineToEntity),
  };
}

export function mapViewLineToEntity(line: PurchaseOrderView): PurchaseOrderLineEntity {
  return {
    orderNumber: line.orderNumber,
    lineNumber: line.lineNumber,
    lineStatus: line.lineStatus,
    product: line.product,
    productCode: line.product,
    productDescription: line.productDescription,
    taxLevel: line.tax,
    orderedQuantity: line.quantityInPurchaseUnitOrdered.toNumber() ?? 0,
    grossPrice: line.grossPrice.toNumber() ?? 0,
  };
}
