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
      // Query 1: Busca os IDs das encomendas para a PÁGINA ATUAL
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

      // Query 2: CONTA o total de encomendas distintas que correspondem ao filtro
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
      where: { orderNumber: { in: nodesToFetch } },
    });

    const ordersMap = new Map<string, SalesOrderView[]>();
    allLinesForOrders.forEach((line) => {
      if (!ordersMap.has(line.orderNumber)) {
        ordersMap.set(line.orderNumber, []);
      }
      ordersMap.get(line.orderNumber)!.push(line);
    });

    const orderEntities = nodesToFetch.map((orderNumber) => {
      const lines = ordersMap.get(orderNumber) || [];
      return mapViewToEntity(lines);
    });

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
        hasPreviousPage: after ? true : false,
        startCursor: edges.length > 0 ? edges[0].cursor : undefined,
      },
    };
  }

  /**
   * Busca uma única encomenda de vendas pelo seu número, usando a view otimizada.
   * @param orderNumber - O número da encomenda a ser buscada.
   * @returns A entidade SalesOrderEntity completa ou lança um erro se não for encontrada.
   * @throws NotFoundException se nenhuma linha for encontrada para o número da encomenda.
   */
  async findOne(orderNumber: string): Promise<SalesOrderEntity> {
    const orderLinesFromView = await this.prisma.salesOrderView.findMany({
      where: {
        orderNumber: { equals: orderNumber },
      },
      orderBy: {
        lineNumber: 'asc',
      },
    });

    // 2. Verifica se a encomenda existe. Se o array estiver vazio, a encomenda não foi encontrada.
    if (!orderLinesFromView || orderLinesFromView.length === 0) {
      throw new NotFoundException(`Sales Order with Number "${orderNumber}" not found.`);
    }

    return mapViewToEntity(orderLinesFromView);
  }
}
