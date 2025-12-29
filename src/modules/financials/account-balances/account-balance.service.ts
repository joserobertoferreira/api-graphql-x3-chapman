import { Injectable } from '@nestjs/common';
import { PaginationArgs } from 'src/common/pagination/pagination.args';
import { AnalyticalBalance } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AccountBalanceFilter } from './dto/filter-account-balance.input';
import { AccountBalanceConnection } from './entities/account-balance-connection.entity';
import { AccountBalanceEntity } from './entities/account-balance.entity';
import { buildProductWhereClause } from './helpers/account-balance-where-builder';
import { mapToEntity } from './helpers/account-balance.mapper';

@Injectable()
export class AccountBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findPaginated(
    args: PaginationArgs,
    filter?: AccountBalanceFilter,
    fetchTotalCount?: boolean,
  ): Promise<AccountBalanceConnection> {
    const { first, after } = args;

    const cursor = after ? { ROWID: BigInt(Buffer.from(after, 'base64').toString('ascii')) } : undefined;

    const take = first + 1;

    const where = buildProductWhereClause(filter);

    let balances: AnalyticalBalance[];
    let totalCount: number | undefined = undefined;

    if (fetchTotalCount) {
      const [balana, count] = await this.prisma.$transaction([
        this.prisma.analyticalBalance.findMany({
          take,
          skip: cursor ? 1 : undefined,
          cursor: cursor,
          where: where,
          orderBy: [
            { company: 'asc' },
            { site: 'asc' },
            { fiscalYear: 'asc' },
            { ledger: 'asc' },
            { account: 'asc' },
            { businessPartner: 'asc' },
            { dimension1: 'asc' },
            { ROWID: 'asc' },
          ],
        }),
        this.prisma.analyticalBalance.count({ where: where }),
      ]);

      balances = balana;
      totalCount = count;
    } else {
      balances = await this.prisma.analyticalBalance.findMany({
        take,
        skip: cursor ? 1 : undefined,
        cursor: cursor,
        where: where,
        orderBy: [
          { company: 'asc' },
          { site: 'asc' },
          { fiscalYear: 'asc' },
          { ledger: 'asc' },
          { account: 'asc' },
          { businessPartner: 'asc' },
          { dimension1: 'asc' },
          { ROWID: 'asc' },
        ],
      });
    }

    const hasNextPage = balances.length > first;
    const nodes = hasNextPage ? balances.slice(0, -1) : balances;

    // Group and map the flat balances to nested AccountBalanceEntity
    const groupedNodes: AccountBalanceEntity[] = mapToEntity(nodes);

    // Map the results and build the connection response
    const edges = groupedNodes.map((balance) => {
      const firstRecord = nodes.find(
        (n) =>
          n.site === balance.site &&
          n.fiscalYear === balance.fiscalYear &&
          n.ledger === balance.ledger &&
          n.account === balance.account &&
          n.businessPartner === balance.businessPartner &&
          n.dimension1 === balance.fixture,
      );

      return {
        cursor: Buffer.from(firstRecord!.ROWID.toString()).toString('base64'),
        node: balance,
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
