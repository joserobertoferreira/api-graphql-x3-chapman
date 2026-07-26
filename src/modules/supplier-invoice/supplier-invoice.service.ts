import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationArgs } from 'src/common/pagination/pagination.args';
import { PrismaTransactionClient } from 'src/common/types/common.types';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { RequestContextService } from '../../common/context/request-context.service';
import { CounterService } from '../../common/counter/counter.service';
import { SupplierInvoiceSequenceNumber } from '../../common/types/supplier-invoice.types';
import { CommonService } from '../common/common.service';
import { buildOpenItemArchivePayload } from '../financials/journal-entry/helpers/journal-entry-payload-builder';
import { CreateSupplierInvoiceInput } from './dto/create-supplier-invoice.input';
import { SupplierInvoiceFilterInput } from './dto/filter-supplier-invoice.input';
import { SupplierInvoiceConnection } from './entities/supplier-invoice-connection.entity';
import { SupplierInvoiceEntity } from './entities/supplier-invoice.entity';
import { buildSupplierInvoicePayloads } from './helpers/supplier-invoice-payload-builder';
import {
  buildSupplierInvoiceWhereClause,
  resolveLinesSomeFilterDocuments,
} from './helpers/supplier-invoice-where-builder';
import { mapInvoiceToEntity } from './helpers/supplier-invoice.mapper';
import { SupplierInvoiceValidationService } from './validators/supplier-invoice-validation.service';

@Injectable()
export class SupplierInvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonService: CommonService,
    private readonly sequenceNumberService: CounterService,
    private readonly requestContextService: RequestContextService,
    private readonly supplierInvoiceValidator: SupplierInvoiceValidationService,
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

  async exists(invoiceNumber: string): Promise<boolean> {
    const count = await this.prisma.supplierInvoiceHeader.count({
      where: { invoiceNumber },
    });

    return count > 0;
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
    const context = await this.supplierInvoiceValidator.validate(input, isExcel);

    const currentUser = this.requestContextService.getCurrentUser();

    // Persist the supplier invoice and its lines in the database
    const createdInvoice = await this.prisma.$transaction(
      async (tx) => {
        // Internal numeric identifier for the header (SupplierInvoiceHeader.internalNumber)
        const internalNumber = await this.commonService.getNextSequenceValue({
          sequenceName: 'SEQ_GACCENTRYD',
          transaction: tx,
        });

        // Build the supplier invoice payloads
        const { payload, lines, analyticalLines, openItems } = buildSupplierInvoicePayloads(
          context,
          currentUser,
          internalNumber,
          isExcel,
        );

        // Get the next invoice number for the invoice type
        const newInvoiceNumber = await this.getNextInvoiceNumber(tx, {
          counter: context.documentType.sequenceNumber ?? 'PIN',
          company: context.companyInfo.companyCode ?? '',
          site: context.site ?? '',
          accountingDate: context.accountingDate,
          journal: context.invoiceTypeIsValid.journal ?? '',
        });

        const newInvoice = await tx.supplierInvoiceHeader.create({
          data: { invoiceNumber: newInvoiceNumber, ...payload },
        });

        if (!newInvoice) {
          throw new Error('Fatal error: The supplier invoice could not be created.');
        }

        // SupplierInvoiceLines/AnalyticalSupplierLine have no relation to the header - link them manually
        lines.forEach((line) => {
          line.document = newInvoiceNumber;
        });
        await tx.supplierInvoiceLines.createMany({ data: lines });

        analyticalLines.forEach((line) => {
          line.document = newInvoiceNumber;
        });
        if (analyticalLines.length > 0) {
          await tx.analyticalSupplierLine.createMany({ data: analyticalLines });
        }

        // Create open items and their archives, if any
        if (openItems.length > 0) {
          openItems.forEach((item) => {
            item.documentNumber = newInvoiceNumber;
          });
          await tx.openItem.createMany({ data: openItems });

          const idPromises = openItems.map(() => {
            return this.commonService.getNextSequenceValue({ sequenceName: 'SEQ_HISTODUD', transaction: tx });
          });

          const identifiers = await Promise.all(idPromises);

          const archives = buildOpenItemArchivePayload(openItems[0], identifiers, currentUser);

          if (archives.length > 0) {
            archives.forEach((archive) => {
              archive.document = newInvoiceNumber;
            });
            await tx.openItemArchive.createMany({ data: archives });
          }
        }

        return newInvoice;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return mapInvoiceToEntity(createdInvoice);
  }

  /**
   * Get the next invoice number for a given invoice type.
   */
  async getNextInvoiceNumber(tx: PrismaTransactionClient, args: SupplierInvoiceSequenceNumber): Promise<string> {
    const { counter, company, site, accountingDate, journal } = args;

    return this.sequenceNumberService.getNextCounterTransaction(tx, counter, company, site, accountingDate, journal);
  }
}
