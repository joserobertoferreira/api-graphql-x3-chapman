import { Prisma } from 'src/generated/prisma';
import { PurchaseOrderFilterInput } from '../dto/filter-purchase-order.input';

/**
 * Builds a Prisma where clause for filtering purchase orders based on the provided filter input.
 *
 * @param filter - The filter input containing various criteria for filtering purchase orders.
 * @returns A Prisma.PurchaseOrderWhereInput object representing the where clause.
 */
export function buildPurchaseOrderWhereClause(filter?: PurchaseOrderFilterInput): Prisma.PurchaseOrderViewWhereInput {
  if (!filter) {
    return {};
  }

  const andConditions: Prisma.PurchaseOrderViewWhereInput[] = [];

  if (filter.orderNumber_in?.length) {
    andConditions.push({ orderNumber: { in: filter.orderNumber_in } });
  }

  if (filter.supplier_equals) {
    andConditions.push({ supplier: { equals: filter.supplier_equals } });
  }

  if (filter.company_equals) {
    andConditions.push({ company: { equals: filter.company_equals } });
  }

  if (filter.fixtureDimension_in?.length) {
    andConditions.push({ fixtureDimension: { in: filter.fixtureDimension_in } });
  }

  if (filter.orderDate_gte || filter.orderDate_lte) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (filter.orderDate_gte) {
      dateFilter.gte = filter.orderDate_gte;
    }
    if (filter.orderDate_lte) {
      dateFilter.lte = filter.orderDate_lte;
    }
    andConditions.push({ orderDate: dateFilter });
  }

  if (andConditions.length > 0) {
    return { AND: andConditions };
  }

  return {};
}
