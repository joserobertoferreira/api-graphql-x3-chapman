import { Injectable, NotFoundException } from '@nestjs/common';
import { SalesOrderView } from '@prisma/client';
import { PaginationArgs } from 'src/common/pagination/pagination.args';
import { PrismaService } from 'src/prisma/prisma.service';
import { SalesOrderFilterInput } from './dto/filter-sales-order.input';
import { SalesOrderConnection } from './entities/sales-order-connection.entity';
import { SalesOrderEntity } from './entities/sales-order.entity';
import { buildSalesOrderWhereClause } from './helpers/sales-order-where-builder';
import { mapViewToEntity } from './helpers/sales-order.mapper';

@Injectable()
export class SalesOrderViewService {
  constructor(private readonly prisma: PrismaService) {}

  async findPaginated(args: PaginationArgs, filter?: SalesOrderFilterInput): Promise<SalesOrderConnection> {
    const { first, after } = args;

    const where = buildSalesOrderWhereClause(filter);

    const [distinctOrders, totalCountResult] = await this.prisma.$transaction([
      // Query 1: Fetches the IDs of the orders for the CURRENT PAGE
      this.prisma.salesOrderView.findMany({
        where,
        distinct: ['orderNumber'],
        select: { orderNumber: true },
        orderBy: { orderNumber: 'asc' },
        take: first + 1,
        ...(after && {
          cursor: { orderNumber: Buffer.from(after, 'base64').toString('ascii') },
          skip: 1,
        }),
      }),

      // Query 2: Fetches the total count of distinct orders matching the filter
      this.prisma.salesOrderView.findMany({
        where,
        distinct: ['orderNumber'],
        select: { orderNumber: true },
      }),
    ]);

    const totalCount = totalCountResult.length;
    const orderNumbers = distinctOrders.map((o) => o.orderNumber);
    const hasNextPage = distinctOrders.length > first;
    const nodesToFetch = hasNextPage ? orderNumbers.slice(0, -1) : orderNumbers;

    if (nodesToFetch.length === 0) {
      return { edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: !!after }, totalCount: 0 };
    }

    const allLinesForOrders = await this.prisma.salesOrderView.findMany({
      include: { analyticalAccountingLines: true },
      where: { orderNumber: { in: nodesToFetch } },
    });

    const ordersMap = new Map<string, SalesOrderView[]>();
    allLinesForOrders.forEach((line) => {
      if (!ordersMap.has(line.orderNumber)) {
        ordersMap.set(line.orderNumber, []);
      }
      ordersMap.get(line.orderNumber)!.push(line);
    });

    const orderEntities = await Promise.all(
      nodesToFetch.map(async (orderNumber) => {
        const lines = ordersMap.get(orderNumber) || [];
        return mapViewToEntity(lines, this.prisma);
      }),
    );

    const edges = orderEntities.map((order) => ({
      cursor: Buffer.from(order.orderNumber).toString('base64'),
      node: order,
    }));

    return {
      edges,
      totalCount,
      pageInfo: {
        endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : undefined,
        hasNextPage,
        hasPreviousPage: !!after,
        startCursor: edges.length > 0 ? edges[0].cursor : undefined,
      },
    };
  }

  /**
   * Retrieves a single sales order by its number, using the optimized view.
   * @param orderNumber - The sales order number to retrieve.
   * @returns The complete SalesOrderEntity or throws an error if not found.
   * @throws NotFoundException if no rows are found for the given order number.
   */
  async findOne(orderNumber: string): Promise<SalesOrderEntity> {
    const orderLinesFromView = await this.prisma.salesOrderView.findMany({
      include: { analyticalAccountingLines: true },
      where: {
        orderNumber: { equals: orderNumber },
      },
      orderBy: {
        lineNumber: 'asc',
      },
    });

    // Check if the sales order exists. If the array is empty, the order was not found.
    if (!orderLinesFromView || orderLinesFromView.length === 0) {
      throw new NotFoundException(`Sales Order with Number ${orderNumber} not found.`);
    }

    return mapViewToEntity(orderLinesFromView, this.prisma);
  }
}
