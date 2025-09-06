import { Injectable } from '@nestjs/common';
import { SalesOrderStatusView } from '@prisma/client';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import {
  InvoiceAccountingStatusGQL,
  InvoiceStatusGQL,
  InvoiceTypeGQL,
  LineStatusGQL,
  OrderStatusGQL,
} from '../../common/registers/enum-register';
import { LocalMenus } from '../../common/utils/enums/local-menu';
import { PrismaService } from '../../prisma/prisma.service';
import { SalesOrderStatusFilterInput } from './dto/filter-sales-order.input';
import { SalesOrderLastInvoiceInfo } from './entities/sales-order-invoice.info.entity';
import { SalesOrderStatusConnection } from './entities/sales-order-status-connection.entity';
import { SalesOrderStatusEntity } from './entities/sales-order-status.entity';
import { buildSalesOrderStatusWhereClause } from './helpers/sales-order-status-where-builder';

export const localMenuOrderStatusToGqlEnum: Record<LocalMenus.OrderStatus, OrderStatusGQL> = {
  [LocalMenus.OrderStatus.OPEN]: OrderStatusGQL.open,
  [LocalMenus.OrderStatus.CLOSED]: OrderStatusGQL.closed,
};

export const localMenuLineStatusToGqlEnum: Record<LocalMenus.LineStatus, LineStatusGQL> = {
  [LocalMenus.LineStatus.PENDING]: LineStatusGQL.pending,
  [LocalMenus.LineStatus.LATE]: LineStatusGQL.late,
  [LocalMenus.LineStatus.CLOSED]: LineStatusGQL.closed,
};

const localMenuInvoiceStatusToGqlEnum: Record<LocalMenus.InvoiceStatus, InvoiceStatusGQL> = {
  [LocalMenus.InvoiceStatus.INVOICED]: InvoiceStatusGQL.invoiced,
  [LocalMenus.InvoiceStatus.NOT_INVOICED]: InvoiceStatusGQL.notInvoiced,
  [LocalMenus.InvoiceStatus.PARTLY_INVOICED]: InvoiceStatusGQL.partiallyInvoiced,
};

const localMenuInvoiceTypeToGqlEnum: Record<LocalMenus.InvoiceType, InvoiceTypeGQL> = {
  [LocalMenus.InvoiceType.INVOICE]: InvoiceTypeGQL.invoice,
  [LocalMenus.InvoiceType.CREDIT_NOTE]: InvoiceTypeGQL.creditNote,
  [LocalMenus.InvoiceType.DEBIT_NOTE]: InvoiceTypeGQL.debitNote,
  [LocalMenus.InvoiceType.CREDIT_MEMO]: InvoiceTypeGQL.creditMemo,
  [LocalMenus.InvoiceType.PROFORMA]: InvoiceTypeGQL.proforma,
};

const localMenuInvoiceAccountingStatusToGqlEnum: Record<
  LocalMenus.InvoiceAccountingStatus,
  InvoiceAccountingStatusGQL
> = {
  [LocalMenus.InvoiceAccountingStatus.NOT_POSTED]: InvoiceAccountingStatusGQL.notPosted,
  [LocalMenus.InvoiceAccountingStatus.NOT_USED]: InvoiceAccountingStatusGQL.notUsed,
  [LocalMenus.InvoiceAccountingStatus.POSTED]: InvoiceAccountingStatusGQL.posted,
};

@Injectable()
export class SalesOrderStatusService {
  constructor(private readonly prisma: PrismaService) {}

  public mapToEntity(entity: SalesOrderStatusView): SalesOrderStatusEntity {
    const orderStatus = localMenuOrderStatusToGqlEnum[entity.orderStatus as LocalMenus.OrderStatus];
    const invoicedStatus =
      localMenuInvoiceStatusToGqlEnum[entity.invoicedStatus as LocalMenus.InvoiceStatus] ||
      InvoiceStatusGQL.notInvoiced;
    const category = localMenuInvoiceTypeToGqlEnum[entity.category as LocalMenus.InvoiceType];
    const invoiceStatus =
      localMenuInvoiceAccountingStatusToGqlEnum[entity.status as LocalMenus.InvoiceAccountingStatus] ||
      InvoiceAccountingStatusGQL.notPosted;

    let paymentData: { code: string; description?: string } | undefined = undefined;
    let invoiceData: SalesOrderLastInvoiceInfo | undefined = undefined;

    if (entity.lastSalesInvoice && entity.lastSalesInvoice.trim() !== '') {
      if (entity.paymentTerm && entity.paymentTerm.trim() !== '') {
        paymentData = {
          code: entity.paymentTerm,
          description: entity.paymentDescription?.trim() || undefined,
        };
      }

      invoiceData = {
        invoiceNumber: entity.lastSalesInvoice,
        category: category,
        accountingDate: entity.accountingDate,
        paymentTerm: paymentData || undefined,
        status: invoiceStatus,
        debitOrCredit: entity.debitOrCredit,
        totalAmountIncludingTax: entity.totalAmountIncludingTax?.toNumber() ?? 0,
        totalAmountExcludingTax: entity.totalAmountExcludingTax?.toNumber() ?? 0,
        isPrinted: entity.isPrinted === LocalMenus.NoYes.YES,
      };
    }

    const payload: SalesOrderStatusEntity = {
      orderNumber: entity.orderNumber,
      orderDate: entity.orderDate,
      lastSalesInvoice: invoiceData || undefined,
      orderStatus: orderStatus,
      invoicedStatus: invoicedStatus,
      lastSalesInvoiceDate: entity.lastSalesInvoiceDate,
    };

    return payload;
  }

  async findPaginated(args: PaginationArgs, filter?: SalesOrderStatusFilterInput): Promise<SalesOrderStatusConnection> {
    const { first, after } = args;

    const where = buildSalesOrderStatusWhereClause(filter);

    const [orders, totalCount] = await this.prisma.$transaction([
      // Query 1: Busca os IDs das encomendas para a PÁGINA ATUAL
      this.prisma.salesOrderStatusView.findMany({
        where,
        orderBy: { orderNumber: 'asc' },
        take: first + 1,
        ...(after && {
          cursor: { orderNumber: Buffer.from(after, 'base64').toString('ascii') },
          skip: 1,
        }),
      }),

      // Query 2: CONTA o total de encomendas distintas que correspondem ao filtro
      this.prisma.salesOrderStatusView.count({ where }),
    ]);

    const hasNextPage = orders.length > first;
    const nodesToFetch = hasNextPage ? orders.slice(0, -1) : orders;

    if (nodesToFetch.length === 0) {
      return { edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: !!after }, totalCount: 0 };
    }

    const edges = nodesToFetch.map((order) => ({
      cursor: Buffer.from(order.orderNumber).toString('base64'),
      node: this.mapToEntity(order),
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
