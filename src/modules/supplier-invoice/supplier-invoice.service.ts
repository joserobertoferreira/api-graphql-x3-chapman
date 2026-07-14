import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationArgs } from 'src/common/pagination/pagination.args';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { RequestContextService } from '../../common/context/request-context.service';
import { CounterService } from '../../common/counter/counter.service';
import { CommonService } from '../common/common.service';
import { CreateSupplierInvoiceInput } from './dto/create-supplier-invoice.input';
import { SupplierInvoiceFilterInput } from './dto/filter-supplier-invoice.input';
import { SupplierInvoiceConnection } from './entities/supplier-invoice-connection.entity';
import { SupplierInvoiceEntity } from './entities/supplier-invoice.entity';
import {
  buildSupplierInvoiceWhereClause,
  resolveLinesSomeFilterDocuments,
} from './helpers/supplier-invoice-where-builder';
import { mapInvoiceToEntity } from './helpers/supplier-invoice.mapper';

@Injectable()
export class SupplierInvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonService: CommonService,
    private readonly sequenceNumberService: CounterService,
    private readonly requestContextService: RequestContextService,
  ) {}

  async findOne(invoiceNumber: string): Promise<SupplierInvoiceEntity> {
    const invoiceData = await this.prisma.supplierInvoiceHeader.findUnique({
      where: { invoiceNumber },
    });

    if (!invoiceData) {
      throw new NotFoundException(`Supplier Invoice with number "${invoiceNumber}" not found.`);
    }

    return mapInvoiceToEntity(invoiceData);
  }

  async findPaginated(args: PaginationArgs, filter?: SupplierInvoiceFilterInput): Promise<SupplierInvoiceConnection> {
    const { first, after } = args;

    const where = buildSupplierInvoiceWhereClause(filter);

    const matchingDocuments = await resolveLinesSomeFilterDocuments(this.prisma, filter);
    if (matchingDocuments) {
      (where.AND as Prisma.SupplierInvoiceHeaderWhereInput[]).push({ invoiceNumber: { in: matchingDocuments } });
    }

    const [invoices, totalCount] = await this.prisma.$transaction([
      this.prisma.supplierInvoiceHeader.findMany({
        where,
        orderBy: { invoiceNumber: 'asc' },
        take: first + 1,
        ...(after && {
          cursor: { invoiceNumber: Buffer.from(after, 'base64').toString('ascii') },
          skip: 1,
        }),
      }),
      this.prisma.supplierInvoiceHeader.count({ where }),
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

  /**
   * Create a new supplier invoice.
   * @param input - The data to create the supplier invoice.
   * @returns The created supplier invoice.
   */
  async create(input: CreateSupplierInvoiceInput): Promise<SupplierInvoiceEntity> {
    let isExcel = this.requestContextService.getIsExcel();

    if (!isExcel) isExcel = false;

    // Validate the input data
    const context = await this.journalEntryValidator.validate(input, isExcel);
  }
}
