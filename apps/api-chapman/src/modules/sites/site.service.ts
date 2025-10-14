import { Injectable } from '@nestjs/common';
import { Site } from 'src/generated/prisma';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { PrismaService } from '../../prisma/prisma.service';
import { SiteFilterInput } from './dto/filter-site.input';
import { SiteConnection } from './entities/site-connection.entity';
import { SiteEntity } from './entities/site.entity';
import { buildSiteWhereClause } from './helper/site-where-builder';

@Injectable()
export class SiteService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Maps a Prisma Site entity to a SiteEntity.
   * @param site - The Prisma Site entity.
   * @returns The mapped SiteEntity.
   */
  mapToEntity(site: Site): SiteEntity {
    return {
      siteCode: site.siteCode,
      siteName: site.siteName,
      shortTitle: site.shortTitle,
      siteTaxIdNumber: site.siteTaxIdNumber,
      legalCompany: site.legalCompany,
    };
  }

  /**
   * Verifica de se o site existe
   * @param siteCode - O código do site a ser verificado.
   * @returns `true` se o site existir, `false` caso contrário.
   */
  async exists(siteCode: string): Promise<boolean> {
    const count = await this.prisma.site.count({
      where: { siteCode },
    });

    return count > 0;
  }

  /**
   * Busca um site pelo código.
   * @param siteCode - O código do site a ser buscado.
   * @returns O SiteEntity correspondente ou null se não encontrado.
   */
  async findOne(siteCode: string): Promise<SiteEntity | null> {
    const site = await this.prisma.site.findUnique({
      where: { siteCode },
    });

    if (!site) {
      return null;
    }

    return this.mapToEntity(site);
  }

  async findPaginated(args: PaginationArgs, filter: SiteFilterInput): Promise<SiteConnection> {
    const { first, after } = args;
    const where = buildSiteWhereClause(filter);

    const cursor = after ? { ROWID: BigInt(Buffer.from(after, 'base64').toString('ascii')) } : undefined;
    const take = first + 1;

    const [sites, totalCount] = await this.prisma.$transaction([
      this.prisma.site.findMany({
        where,
        take,
        skip: cursor ? 1 : undefined,
        cursor,
        orderBy: [{ siteCode: 'asc' }, { ROWID: 'asc' }],
      }),
      this.prisma.site.count({ where }),
    ]);

    const hasNextPage = sites.length > first;
    const nodes = hasNextPage ? sites.slice(0, -1) : sites;

    // Lógica para montar a resposta paginada
    const edges = nodes.map((site) => ({
      cursor: Buffer.from(site.ROWID.toString()).toString('base64'),
      node: this.mapToEntity(site),
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
