import { Injectable } from '@nestjs/common';
import { Dimensions, Prisma } from '@prisma/client';
import { PaginationArgs } from 'src/common/pagination/pagination.args';
import { PrismaService } from 'src/prisma/prisma.service';
import { DimensionFilterInput } from './dto/filter-dimension.input';
import { DimensionConnection } from './entities/dimension-connection.entity';
import { DimensionEntity } from './entities/dimension.entity';

@Injectable()
export class DimensionService {
  constructor(private readonly prisma: PrismaService) {}

  public mapToEntity(dimension: Dimensions): DimensionEntity {
    return {
      dimension: dimension.dimension,
      dimensionType: dimension.dimensionType,
      description: dimension.description,
    };
  }

  async findPaginated(args: PaginationArgs, filter: DimensionFilterInput): Promise<DimensionConnection> {
    const { first, after } = args;

    // Construção do `where`
    const where: Prisma.DimensionsWhereInput = {};
    const conditions: Prisma.DimensionsWhereInput[] = [];

    conditions.push({
      dimensionType: { equals: filter.dimensionTypeCode_equals },
    });

    if (filter.description_contains) {
      const searchTerm = filter.description_contains.trim();
      const searchVariations = [
        searchTerm.toUpperCase(),
        searchTerm.toLowerCase(),
        searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase(),
      ];

      // Adiciona a condição OR à cláusula 'where' principal
      conditions.push({
        OR: searchVariations.map((variation) => ({
          description: {
            contains: variation,
          },
        })),
      });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    // Lógica de paginação
    const cursor = after ? { ROWID: BigInt(Buffer.from(after, 'base64').toString('ascii')) } : undefined;
    const take = first + 1;

    const [dimensions, totalCount] = await this.prisma.$transaction([
      this.prisma.dimensions.findMany({
        where,
        take,
        skip: cursor ? 1 : undefined,
        cursor,
        orderBy: { dimension: 'asc' },
      }),
      this.prisma.dimensions.count({ where }),
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
