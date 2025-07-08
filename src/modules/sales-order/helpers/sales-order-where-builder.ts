import { Prisma } from '@prisma/client';
import { SalesOrderFilterInput } from '../dto/filter-sales-order.input';

/**
 * Builds a Prisma where clause for filtering sales orders based on the provided filter input.
 *
 * @param filter - The filter input containing various criteria for filtering sales orders.
 * @returns A Prisma.SalesOrderWhereInput object representing the where clause.
 */
export function buildSalesOrderWhereClause(filter?: SalesOrderFilterInput): Prisma.SalesOrderWhereInput {
  if (!filter) {
    return {};
  }

  const andConditions: Prisma.SalesOrderWhereInput[] = [];

  if (filter.orderId_in?.length) {
    andConditions.push({ id: { in: filter.orderId_in } });
  }

  if (filter.customerCode_in?.length) {
    andConditions.push({ soldToCustomer: { in: filter.customerCode_in } });
  }

  if (filter.salesSite_in?.length) {
    andConditions.push({ salesSite: { in: filter.salesSite_in } });
  }

  // Lógica para o intervalo de datas
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
