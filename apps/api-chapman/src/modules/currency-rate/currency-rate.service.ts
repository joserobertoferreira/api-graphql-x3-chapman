import { Injectable } from '@nestjs/common';
import { CurrencyRateTable } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { ExchangeRateTypeGQL } from '../../common/registers/enum-register';
import { ExchangeRateTypeToExchangeRateTypeGQL } from '../../common/utils/enums/convert-enum';
import { LocalMenus } from '../../common/utils/enums/local-menu';
import { CurrencyRateFilterInput } from './dto/filter-currency-rate.input';
import { CurrencyRateConnection } from './entities/currency-rate-connection.entity';
import { CurrencyRateEntity } from './entities/currency-rate.entity';
import { buildCurrencyRateWhereClause } from './helpers/currency-rate-where-builder';

@Injectable()
export class CurrencyRateService {
  constructor(private readonly prisma: PrismaService) {}

  public mapToEntity(currencyRate: CurrencyRateTable): CurrencyRateEntity {
    let rateTypeGql = ExchangeRateTypeToExchangeRateTypeGQL[currencyRate.rateType as LocalMenus.ExchangeRateType];
    if (!rateTypeGql) {
      rateTypeGql = ExchangeRateTypeGQL.dailyRate; // Valor padrão ou tratamento de erro
    }

    return {
      rateType: rateTypeGql,
      rateDate: currencyRate.rateDate,
      sourceCurrency: currencyRate.sourceCurrency,
      destinationCurrency: currencyRate.destinationCurrency,
      rate: currencyRate.rate.toNumber() ?? 0,
      inverseRate: currencyRate.inverseRate.toNumber() ?? 0,
    };
  }

  async findPaginated(args: PaginationArgs, filter: CurrencyRateFilterInput): Promise<CurrencyRateConnection> {
    const { first, after } = args;

    const where = buildCurrencyRateWhereClause(filter);

    // Lógica de paginação
    const cursor = after ? { ROWID: BigInt(Buffer.from(after, 'base64').toString('ascii')) } : undefined;
    const take = first + 1;

    const [rates, totalCount] = await this.prisma.$transaction([
      this.prisma.currencyRateTable.findMany({
        where,
        take,
        skip: cursor ? 1 : undefined,
        cursor,
        orderBy: [
          { rateType: 'asc' },
          { sourceCurrency: 'asc' },
          { destinationCurrency: 'asc' },
          { rateDate: 'asc' },
          { ROWID: 'asc' },
        ],
      }),
      this.prisma.currencyRateTable.count({ where }),
    ]);

    const hasNextPage = rates.length > first;
    const nodes = hasNextPage ? rates.slice(0, -1) : rates;

    const edges = nodes.map((rate) => ({
      cursor: Buffer.from(rate.ROWID.toString()).toString('base64'),
      node: this.mapToEntity(rate),
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
