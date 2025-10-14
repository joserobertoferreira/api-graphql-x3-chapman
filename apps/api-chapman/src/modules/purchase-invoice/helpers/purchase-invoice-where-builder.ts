import { Prisma } from 'src/generated/prisma';
import { PurchaseInvoiceFilterInput } from '../dto/filter-purchase-invoice.input';

export function buildPurchaseInvoiceWhereClause(
  filter?: PurchaseInvoiceFilterInput,
): Prisma.PurchaseInvoiceViewWhereInput {
  if (!filter) return {};

  const andConditions: Prisma.PurchaseInvoiceViewWhereInput[] = [];

  if (filter.invoiceNumber_in) {
    andConditions.push({ invoiceNumber: { in: filter.invoiceNumber_in } });
  }
  if (filter.supplierCode_in) {
    andConditions.push({ billBySupplier: { in: filter.supplierCode_in } });
  }

  // O filtro de linha agora é um pouco diferente
  if (filter.lines_some?.product_in) {
    andConditions.push({
      invoiceLines: {
        some: {
          product: { in: filter.lines_some.product_in },
        },
      },
    });
  }

  return { AND: andConditions };
}
