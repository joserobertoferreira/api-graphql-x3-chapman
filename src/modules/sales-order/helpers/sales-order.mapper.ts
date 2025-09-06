import { InternalServerErrorException } from '@nestjs/common/exceptions';
import { Prisma, SalesOrderView } from '@prisma/client';
import { stringsToArray } from '../../../common/utils/array.utils';
import { LocalMenus } from '../../../common/utils/enums/local-menu';
import { SalesOrderLineEntity } from '../entities/sales-order-line.entity';
import { SalesOrderEntity } from '../entities/sales-order.entity';
import { localMenuLineStatusToGqlEnum, localMenuOrderStatusToGqlEnum } from '../sales-order-status.service';

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

export function mapViewToEntity(lines: SalesOrderView[]): SalesOrderEntity {
  if (lines.length === 0) return { orderNumber: '', lines: [] } as SalesOrderEntity;

  const header = lines[0]; // Pega a primeira linha para os dados do cabeçalho

  const orderStatus = localMenuOrderStatusToGqlEnum[header.orderStatus as LocalMenus.OrderStatus];

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
    lines: lines.map(mapViewLineToEntity),
  };
}

export function mapViewLineToEntity(line: SalesOrderView): SalesOrderLineEntity {
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
  };
}
