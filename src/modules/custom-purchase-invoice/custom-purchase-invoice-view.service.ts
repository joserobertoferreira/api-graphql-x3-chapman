import { BadRequestException, Injectable } from '@nestjs/common';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { PrismaService } from '../../prisma/prisma.service';
import { DimensionValuesFilterInput } from '../dimensions/dto/filter-dimension.input';
import { CustomPurchaseInvoiceFilterInput } from './dto/filter-custom-purchase-invoice.input';
import { CustomPurchaseInvoiceConnection } from './entities/custom-purchase-invoice-connection.entity';
import {
  applyDimensionFilter,
  buildCustomPurchaseInvoiceWhereClause,
} from './helpers/custom-purchase-invoice-where-builder';
import { mapInvoiceToEntity } from './helpers/custom-purchase-invoice.mapper';

@Injectable()
export class CustomPurchaseInvoiceViewService {
  constructor(private readonly prisma: PrismaService) {}

  async findPaginated(
    args: PaginationArgs,
    filter?: CustomPurchaseInvoiceFilterInput,
  ): Promise<CustomPurchaseInvoiceConnection> {
    const { first, after } = args;

    // Build the where clause based on the filter
    const where = buildCustomPurchaseInvoiceWhereClause(filter);

    // Fetch data with first filter
    const results = await this.prisma.customPurchaseInvoiceView.findMany({
      where,
      orderBy: [{ ROWID: 'asc' }],
    });

    // Apply additional filtering based on dimension values if provided
    let filteredResults = results;
    if (filter?.dimensions) {
      filteredResults = applyDimensionFilter(results, filter.dimensions);
    }

    // Group filtered results by invoiceNumber
    const groupedInvoices = mapInvoiceToEntity(filteredResults);

    // Pagination logic
    const totalCount = groupedInvoices.length;

    let startIndex = 0;
    if (after) {
      const cursorDecoded = Buffer.from(after, 'base64').toString('ascii');
      const cursorIndex = groupedInvoices.findIndex((invoice) => invoice.invoiceNumber === cursorDecoded);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
      }
    }

    const endIndex = startIndex + first;
    const nodes = groupedInvoices.slice(startIndex, endIndex);
    const hasNextPage = endIndex < totalCount;

    const edges = nodes.map((node) => ({
      cursor: Buffer.from(node.invoiceNumber).toString('base64'),
      node: node,
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
   * Validate the filter object for dimensions query.
   * @param filter - The filter object to validate.
   * @throws BadRequestException if validation fails.
   */
  private validateFilter(filter: DimensionValuesFilterInput): void {
    if (!filter.dimensionTypeCode_equals || filter.dimensionTypeCode_equals.trim() === '') {
      throw new BadRequestException('dimensionTypeCode_equals must not be empty.');
    }

    if (!filter.dimensions || !Array.isArray(filter.dimensions) || filter.dimensions.length === 0) {
      throw new BadRequestException('dimensions must be a non-empty array.');
    }

    if (filter.dimensions.some((d) => d === null || d === undefined || d.trim() === '')) {
      throw new BadRequestException('Dimension values in the array cannot be null or empty.');
    }
  }
}
