import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationArgs } from 'src/common/pagination/pagination.args';
import { PrismaService } from 'src/prisma/prisma.service';
import { PurchaseInvoiceFilterInput } from './dto/filter-purchase-invoice.input';
import { PurchaseInvoiceConnection } from './entities/purchase-invoice-connection.entity';
import { PurchaseInvoiceEntity } from './entities/purchase-invoice.entity';
import { buildPurchaseInvoiceWhereClause } from './helpers/purchase-invoice-where-builder';
import { mapInvoiceToEntity } from './helpers/purchase-invoice.mapper';

@Injectable()
export class PurchaseInvoiceViewService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(invoiceNumber: string): Promise<PurchaseInvoiceEntity> {
    const invoiceData = await this.prisma.purchaseInvoiceView.findUnique({
      where: { invoiceNumber },
    });

    if (!invoiceData) {
      throw new NotFoundException(`Purchase Invoice with number "${invoiceNumber}" not found.`);
    }

    return mapInvoiceToEntity(invoiceData);
  }

  async findPaginated(args: PaginationArgs, filter?: PurchaseInvoiceFilterInput): Promise<PurchaseInvoiceConnection> {
    const { first, after } = args;

    const where = buildPurchaseInvoiceWhereClause(filter);

    const [invoices, totalCount] = await this.prisma.$transaction([
      // Query 1: Busca os IDs das faturas para a PÁGINA ATUAL
      this.prisma.purchaseInvoiceView.findMany({
        where,
        orderBy: { invoiceNumber: 'asc' },
        take: first + 1,
        ...(after && {
          cursor: { invoiceNumber: Buffer.from(after, 'base64').toString('ascii') },
          skip: 1,
        }),
      }),
      this.prisma.purchaseInvoiceView.count({ where }),
    ]);

    const hasNextPage = invoices.length > first;
    const nodes = hasNextPage ? invoices.slice(0, -1) : invoices;

    const edges = nodes.map((invoice) => ({
      cursor: Buffer.from(invoice.invoiceNumber).toString('base64'),
      node: mapInvoiceToEntity(invoice),
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
}
