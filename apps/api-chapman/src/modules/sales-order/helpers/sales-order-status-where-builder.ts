import { Prisma } from 'src/generated/prisma';
import { OrderStatusGQL } from '../../../common/registers/enum-register';
import { LocalMenus } from '../../../common/utils/enums/local-menu';
import { SalesOrderStatusFilterInput } from '../dto/filter-sales-order.input';

const gqlEnumToLocalMenu: Record<OrderStatusGQL, LocalMenus.OrderStatus> = {
  [OrderStatusGQL.open]: LocalMenus.OrderStatus.OPEN,
  [OrderStatusGQL.closed]: LocalMenus.OrderStatus.CLOSED,
};

/**
 * Builds a Prisma where clause for filtering sales orders based on the provided filter input.
 *
 * @param filter - The filter input containing various criteria for filtering sales orders.
 * @returns A Prisma.SalesOrderStatusViewWhereInput object representing the where clause.
 */
export function buildSalesOrderStatusWhereClause(
  filter?: SalesOrderStatusFilterInput,
): Prisma.SalesOrderStatusViewWhereInput {
  if (!filter) {
    return {};
  }

  const andConditions: Prisma.SalesOrderStatusViewWhereInput[] = [];

  if (filter.orderNumber_equals) {
    andConditions.push({ orderNumber: { equals: filter.orderNumber_equals } });
  }

  if (filter.orderStatus_equals) {
    const gqlOrderStatus = filter.orderStatus_equals;
    const orderStatusNumber = gqlEnumToLocalMenu[gqlOrderStatus];
    andConditions.push({ status: { equals: orderStatusNumber } });
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
