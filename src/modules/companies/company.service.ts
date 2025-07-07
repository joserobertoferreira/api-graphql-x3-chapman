import { Injectable } from '@nestjs/common';
import { Company, Prisma } from '@prisma/client';
import { PaginationArgs } from 'src/common/pagination/pagination.args';
import { PrismaService } from 'src/prisma/prisma.service';
import { CompanyFilterInput } from './dto/filter-company.input';
import { CompanyConnection } from './entities/company-connection.entity';
import { CompanyEntity } from './entities/company.entity';
import { buildCompanyWhereClause } from './helpers/company-where-builder';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(company: Company): CompanyEntity {
    return {
      company: company.company,
      companyName: company.companyName,
      country: company.country,
      isLegalCompany: company.isLegalCompany === 2,
      standardName: company.standardName,
      legislation: company.legislation,
      defaultAddress: company.defaultAddress,
    };
  }

  async findPaginated(args: PaginationArgs, filter?: CompanyFilterInput): Promise<CompanyConnection> {
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
        orderBy: { ROWID: 'asc' },
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
   * Busca uma empresa pelo código
   * @param code Código da empresa
   * @param include Objeto para incluir relações, como sites. Ex: { sites: true }
   * @returns A empresa encontrada ou null se não existir.
   */
  async getCompanyByCode(code: string, include?: Prisma.CompanyInclude): Promise<Company | null> {
    try {
      return await this.prisma.company.findUnique({
        where: { company: code },
        include,
      });
    } catch (error) {
      console.error('Erro ao buscar empresa por código:', error);
      throw new Error('Não foi possível buscar a empresa.');
    }
  }

  /**
   * Busca um site pelo código
   * @param code Código do site
   * @param include Objeto para incluir relações, como empresa. Ex: { company: true }
   * @returns O site encontrado ou null se não existir.
   */
  async getSiteByCode<I extends Prisma.SiteInclude>(
    code: string,
    include?: I,
  ): Promise<Prisma.SiteGetPayload<{ include: I }> | null> {
    try {
      const site = await this.prisma.site.findUnique({
        where: { siteCode: code },
        include,
      });

      return site as Prisma.SiteGetPayload<{ include: I }> | null;
    } catch (error) {
      console.error('Erro ao buscar site por ID:', error);
      throw new Error('Não foi possível buscar o site.');
    }
  }
}
