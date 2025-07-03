import { Injectable } from '@nestjs/common';
import { Company } from '@prisma/client';
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
      isLegalCompany: company.isLegalCompany,
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
}
