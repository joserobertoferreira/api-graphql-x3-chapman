import { Prisma } from '@prisma/client';
import { caseInsensitiveOrCondition } from '../../../common/helpers/case-insensitive.helper';
import { SiteFilterInput } from '../dto/filter-site.input';

/**
 * Constrói a cláusula `where` do Prisma para a filtragem de sites.
 * @param filter O objeto de filtro vindo da query GraphQL.
 * @returns Um objeto `Prisma.SiteWhereInput` pronto para ser usado.
 */
export function buildSiteWhereClause(filter?: SiteFilterInput): Prisma.SiteWhereInput {
  if (!filter) {
    return {};
  }

  const where: Prisma.SiteWhereInput = {};
  const andConditions: Prisma.SiteWhereInput[] = [];

  if (filter.siteCode_equals) {
    if (filter.siteCode_equals) {
      andConditions.push({ siteCode: { equals: filter.siteCode_equals } });
    }
  }

  if (filter.siteName_contains) {
    andConditions.push(caseInsensitiveOrCondition('siteName', filter.siteName_contains, 'contains'));
  }

  if (filter.shortTitle_contains) {
    andConditions.push(caseInsensitiveOrCondition('shortTitle', filter.shortTitle_contains, 'contains'));
  }

  if (filter.legalCompany_equals) {
    andConditions.push(caseInsensitiveOrCondition('legalCompany', filter.legalCompany_equals, 'equals'));
  }

  if (filter.country_in) {
    andConditions.push({ country: { in: filter.country_in.map((item) => item.toUpperCase()) } });
  }

  if (filter.siteTaxIdNumber_equals) {
    andConditions.push({ siteTaxIdNumber: { equals: filter.siteTaxIdNumber_equals } });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}
