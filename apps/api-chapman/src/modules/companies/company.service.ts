import { LocalMenus } from '@chapman/utils';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationArgs } from 'src/common/pagination/pagination.args';
import { Company, Prisma } from 'src/generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { CompanyArgs } from '../../common/types/company.types';
import { SiteTypes } from '../../common/types/site.types';
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
      companyName: (company.companyName ?? '').trim(),
      shortTitle: company.shortTitle.trim() || undefined,
      legislation: company.legislation.trim() || undefined,
      sirenNumber: company.sirenNumber.trim() || undefined,
      uniqueIdentificationNumber: company.uniqueIdentificationNumber.trim() || undefined,
      intraCommunityVatNumber: company.intraCommunityVatNumber.trim() || undefined,
    };
  }

  /**
   * Checks whether the company exists
   * @param code - The code of the company to be checked.
   * @returns `true` if the company exists, `false` otherwise.
   */
  async exists(code: string): Promise<boolean> {
    const count = await this.prisma.company.count({
      where: { company: code },
    });

    return count > 0;
  }

  /**
   * Retrieves a paginated list of companies based on the provided filter and pagination arguments.
   * @param args - Pagination arguments including `first` and `after`.
   * @param filter - Filter criteria for querying companies.
   * @returns A promise that resolves to a `CompanyConnection` object containing the paginated companies.
   */
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
   * Get a site by its code.
   * @param code Site code.
   * @param include Object to include relations, such as company. Ex: { company: true }
   * @returns The found site or null if it does not exist.
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

  /**
   * CTLBPRCPY: Control authorization of a third party on the company of the site
   * @param businessPartner Third party value to check
   * @param site Site code to validate against
   * @returns Validation result with status and message
   */
  async companySiteThirdPartyAuthorization(
    businessPartner: string,
    site: string,
  ): Promise<{ isValid: boolean; message?: string }> {
    // Check only if in multi-site mode
    const activityCodeInfo = await this.prisma.activityCode.findUnique({
      where: { code: 'MUL' },
    });

    if (!activityCodeInfo || activityCodeInfo.activeFlag !== LocalMenus.NoYes.YES) {
      return {
        isValid: true,
      };
    }

    // Get all sites and their corresponding companies
    const result = await this.prisma.site.findUnique({
      where: { siteCode: site },
      select: { siteCode: true, legalCompany: true },
    });
    if (!result) {
      return {
        isValid: true,
      };
    }

    // Extract site code and corresponding company
    const company = result.legalCompany;

    if (company) {
      // Get exception information about company
      const exception = await this.prisma.businessPartnerCompanyException.findUnique({
        where: { businessPartner_company: { businessPartner, company } },
        select: { isAuthorizedEntry: true },
      });

      if (exception) {
        if (exception.isAuthorizedEntry === LocalMenus.NoYes.NO) {
          // Third party not authorized for this company
          const errorMessage = `${businessPartner} - Business partner not authorized for this company`;
          return {
            isValid: false,
            message: errorMessage,
          };
        }
      }
    }

    // Authorization successful or not applicable
    return {
      isValid: true,
    };
  }
}
