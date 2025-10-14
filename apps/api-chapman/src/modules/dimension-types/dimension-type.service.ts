import { Injectable } from '@nestjs/common';
import { DimensionType } from 'src/generated/prisma'; // Use o nome do seu modelo Prisma
import { PrismaService } from 'src/prisma/prisma.service';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { DimensionTypeFilterInput } from './dto/filter-dimension-type.input';
import { DimensionTypeConnection } from './entities/dimension-type-connection.entity';
import { DimensionTypeEntity } from './entities/dimension-type.entity';
import { buildDimensionTypeWhereClause } from './helpers/dimension-type-where-builder';

@Injectable()
export class DimensionTypeService {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(dimType: DimensionType): DimensionTypeEntity {
    return {
      dimension: dimType.dimensionType,
      description: dimType.description,
    };
  }

  /**
   * Verifica de se o tipo de dimensão existe
   * @param code - O código do tipo de dimensão a ser verificado.
   * @returns `true` se o tipo de dimensão existir, `false` caso contrário.
   */
  async exists(code: string): Promise<boolean> {
    const count = await this.prisma.dimensionType.count({
      where: { dimensionType: code },
    });

    return count > 0;
  }

  async findAll(): Promise<DimensionTypeEntity[]> {
    const dimTypes = await this.prisma.dimensionType.findMany({
      // Adicione um `where` se precisar filtrar (ex: apenas tipos ativos)
      orderBy: { description: 'asc' },
    });
    return dimTypes.map((dt) => this.mapToEntity(dt));
  }

  async findOne(code: string): Promise<DimensionTypeEntity | null> {
    const dimType = await this.prisma.dimensionType.findUnique({
      where: { dimensionType: code },
    });
    return dimType ? this.mapToEntity(dimType) : null;
  }

  async findPaginated(args: PaginationArgs, filter: DimensionTypeFilterInput): Promise<DimensionTypeConnection> {
    const { first, after } = args;

    const where = buildDimensionTypeWhereClause(filter);

    // Lógica de paginação
    const cursor = after ? { ROWID: BigInt(Buffer.from(after, 'base64').toString('ascii')) } : undefined;
    const take = first + 1;

    const [dimensions, totalCount] = await this.prisma.$transaction([
      this.prisma.dimensionType.findMany({
        where,
        take,
        skip: cursor ? 1 : undefined,
        cursor,
        orderBy: [{ dimensionType: 'asc' }, { ROWID: 'asc' }],
      }),
      this.prisma.dimensionType.count({ where }),
    ]);

    const hasNextPage = dimensions.length > first;
    const nodes = hasNextPage ? dimensions.slice(0, -1) : dimensions;

    const edges = nodes.map((dim) => ({
      cursor: Buffer.from(dim.ROWID.toString()).toString('base64'),
      node: this.mapToEntity(dim),
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
