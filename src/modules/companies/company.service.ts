import { Injectable, NotFoundException } from '@nestjs/common';
import { Company, Prisma } from '@prisma/client';
import { PaginationArgs } from 'src/common/pagination/pagination.args';
import { PrismaService } from 'src/prisma/prisma.service';
import { SiteTypes } from '../../common/types/site.types';
import { CompanyFilterInput } from './dto/filter-company.input';
import { CompanyConnection } from './entities/company-connection.entity';
import { CompanyEntity } from './entities/company.entity';
import { buildCompanyWhereClause } from './helpers/company-where-builder';

type CompanyArgs = {
  include?: Prisma.CompanyInclude;
  select?: Prisma.CompanySelect;
};

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(company: Company): CompanyEntity {
    return {
      company: company.company,
      companyName: (company.companyName ?? '').trim(),
      shortTitle: company.shortTitle.trim() || undefined,
      legislation: company.legislation.trim() || undefined,
      sirenNumber: company.sirenNumber.trim() || undefined,
      uniqueIdentificationNumber: company.uniqueIdentificationNumber.trim() || undefined,
      intraCommunityVatNumber: company.intraCommunityVatNumber.trim() || undefined,
    };
  }

  /**
   * Verifica de se a sociedade existe
   * @param code - O código da sociedade a ser verificado.
   * @returns `true` se a sociedade existir, `false` caso contrário.
   */
  async exists(code: string): Promise<boolean> {
    const count = await this.prisma.company.count({
      where: { company: code },
    });

    return count > 0;
  }

  async findPaginated(args: PaginationArgs, filter: CompanyFilterInput): Promise<CompanyConnection> {
    const { first, after } = args;
    const where = buildCompanyWhereClause(filter);

    const cursor = after ? { ROWID: BigInt(Buffer.from(after, 'base64').toString('ascii')) } : undefined;
    const take = first + 1;

    const [companies, totalCount] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where,
        take,
        skip: cursor ? 1 : undefined,
        cursor,
        orderBy: [{ company: 'asc' }, { ROWID: 'asc' }],
      }),
      this.prisma.company.count({ where }),
    ]);

    const hasNextPage = companies.length > first;
    const nodes = hasNextPage ? companies.slice(0, -1) : companies;

    // Lógica para montar a resposta paginada
    const edges = nodes.map((company) => ({
      cursor: Buffer.from(company.ROWID.toString()).toString('base64'),
      node: this.mapToEntity(company),
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
   * Get the company by its code.
   * @param code Code to search for the company.
   * @param args Additional arguments for the query select or include.
   * @returns NotFoundException if the company does not exist.
   */
  async getCompanyByCode<T extends CompanyArgs>(code: string, args?: T): Promise<Prisma.CompanyGetPayload<T>> {
    if (args?.select && args?.include) {
      throw new Error('Cannot use `select` and `include` in the same query.');
    }

    try {
      const company = await this.prisma.company.findUniqueOrThrow({
        where: { company: code },
        ...args,
      });

      return company as any;
    } catch (error) {
      console.error(`Erro ao buscar empresa ${code}:`, error);
      if (error.code === 'P2025') {
        // Código do Prisma para "Record to update not found."
        throw new NotFoundException(`Company with code ${code} not found.`);
      }
      throw new Error('Could not fetch the company.');
    }
  }

  /**
   * Busca um site pelo código
   * @param code Código do site
   * @param include Objeto para incluir relações, como empresa. Ex: { company: true }
   * @returns O site encontrado ou null se não existir.
   */
  async getSiteByCode<I extends Prisma.SiteInclude>(code: string, include?: I): Promise<SiteTypes.Payload<I>> {
    try {
      const site = await this.prisma.site.findUnique({
        where: { siteCode: code },
        include,
      });

      return site as SiteTypes.Payload<I>;
    } catch (error) {
      console.error('Erro ao buscar site por ID:', error);
      throw new Error('Could not fetch the site.');
    }
  }

  /**
   * Check if site grouping exists.
   * @param company Company/group code.
   * @param site Site code.
   * @returns `true` if the grouping exists, `false` otherwise.
   */
  async siteGroupingExists(company: string, site: string): Promise<boolean> {
    const count = await this.prisma.siteGrouping.count({
      where: { company, site },
    });

    return count > 0;
  }
}
