import { Prisma } from 'src/generated/prisma';
import { SalesOrderFilterInput } from '../dto/filter-sales-order.input';

/**
 * Builds a Prisma where clause for filtering sales orders based on the provided filter input.
 *
 * @param filter - The filter input containing various criteria for filtering sales orders.
 * @returns A Prisma.SalesOrderWhereInput object representing the where clause.
 */
export function buildSalesOrderWhereClause(filter?: SalesOrderFilterInput): Prisma.SalesOrderViewWhereInput {
  if (!filter) {
    return {};
  }

  const andConditions: Prisma.SalesOrderViewWhereInput[] = [];

  if (filter.orderNumber_in?.length) {
    andConditions.push({ orderNumber: { in: filter.orderNumber_in } });
  }

  if (filter.customerCode_equals) {
    andConditions.push({ soldToCustomer: { equals: filter.customerCode_equals } });
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
