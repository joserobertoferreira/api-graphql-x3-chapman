import { Injectable } from '@nestjs/common';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { PaymentTerm } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentTermFilterInput } from './dto/filter-payment-term.input';
import { PaymentTermConnection } from './entities/payment-term-connection.entity';
import { PaymentTermEntity } from './entities/payment-term.entity';
import { buildPaymentTermWhereClause } from './helpers/payment-term-where-builder';

@Injectable()
export class PaymentTermService {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(paymentTerm: PaymentTerm, translation?: string): PaymentTermEntity {
    return {
      code: paymentTerm.code,
      legislation: paymentTerm.legislation.trim() || '',
      description: translation || '',
    };
  }

  /**
   * Retrieves a paginated list of payment terms based on the provided filter and pagination arguments.
   * @param args - Pagination arguments including `first` and `after`.
   * @param filter - Filter criteria for querying payment terms.
   * @returns A promise that resolves to a `PaymentTermConnection` object containing the paginated payment terms.
   */
  async findPaginated(args: PaginationArgs, filter: PaymentTermFilterInput): Promise<PaymentTermConnection> {
    const { first, after } = args;
    const where = buildPaymentTermWhereClause(filter);

    const cursor = after ? { ROWID: BigInt(Buffer.from(after, 'base64').toString('ascii')) } : undefined;
    const take = first + 1;

    const [paymentTerms, totalCount] = await this.prisma.$transaction([
      this.prisma.paymentTerm.findMany({
        where,
        take,
        skip: cursor ? 1 : undefined,
        cursor,
        orderBy: [{ code: 'asc' }, { ROWID: 'asc' }],
      }),
      this.prisma.paymentTerm.count({ where }),
    ]);

    const hasNextPage = paymentTerms.length > first;
    const nodes = hasNextPage ? paymentTerms.slice(0, -1) : paymentTerms;

    const translations = await this.prisma.textToTranslate.findMany({
      where: {
        table: 'TABPAYTERM',
        field: 'DESAXX',
        language: 'BRI',
        OR: nodes.map((node) => ({
          identifier1: node.code,
          identifier2: node.legislation,
        })),
      },
    });

    const translationMap = new Map<string, string>();

    translations.forEach((t) => {
      const key = `${t.identifier1}|${t.identifier2}`;
      translationMap.set(key, t.text);
    });

    // Lógica para montar a resposta paginada
    const edges = nodes.map((paymentTerm) => {
      const key = `${paymentTerm.code}|${paymentTerm.legislation}`;
      const translation = translationMap.get(key);

      return {
        cursor: Buffer.from(paymentTerm.ROWID.toString()).toString('base64'),
        node: this.mapToEntity(paymentTerm, translation),
      };
    });

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
