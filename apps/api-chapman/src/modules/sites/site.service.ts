import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Site } from 'src/generated/prisma';
import { PaginationArgs } from '../../common/pagination/pagination.args';
import { SiteArgs } from '../../common/types/site.types';
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

  /**
   * Get the site by its code.
   * @param code Code to search for the site.
   * @param args Additional arguments for the query select or include.
   * @returns NotFoundException if the site does not exist.
   */
  async getSiteByCode<T extends SiteArgs>(code: string, args?: T): Promise<Prisma.SiteGetPayload<T>> {
    if (args?.select && args?.include) {
      throw new Error('Cannot use `select` and `include` in the same query.');
    }

    try {
      const site = await this.prisma.site.findUniqueOrThrow({
        where: { siteCode: code },
        ...args,
      });

      return site as any;
    } catch (error) {
      console.error(`Erro ao buscar site ${code}:`, error);
      if (error.code === 'P2025') {
        // Código do Prisma para "Record to update not found."
        throw new NotFoundException(`Site with code ${code} not found.`);
      }
      throw new Error('Could not fetch the site.');
    }
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
