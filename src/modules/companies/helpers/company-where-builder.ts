import { Prisma } from '@prisma/client';
import { caseInsensitiveOrCondition } from '../../../common/helpers/case-insensitive.helper';
import { CompanyFilterInput } from '../dto/filter-company.input';

/**
 * Constrói a cláusula `where` do Prisma para a filtragem de clientes.
 * @param filter O objeto de filtro vindo da query GraphQL.
 * @returns Um objeto `Prisma.CompanyWhereInput` pronto para ser usado.
 */
export function buildCompanyWhereClause(filter?: CompanyFilterInput): Prisma.CompanyWhereInput {
  if (!filter) {
    return {};
  }

  const where: Prisma.CompanyWhereInput = {};
  const andConditions: Prisma.CompanyWhereInput[] = [];

  // Filtros diretos na Company
  if (filter.company) {
    if (filter.company.companyCode_in) {
      andConditions.push({ company: { in: filter.company.companyCode_in } });
    }
    if (filter.company.country_in) {
      andConditions.push(caseInsensitiveOrCondition('country', filter.company.country_in));
    }
  }

  // Filtros nos Sites relacionados
  if (filter.sites_some) {
    const siteConditions: Prisma.SiteWhereInput = {};
    const siteAndConditions: Prisma.SiteWhereInput[] = [];

    if (filter.sites_some.siteCode_in) {
      siteAndConditions.push({ siteCode: { in: filter.sites_some.siteCode_in } });
    }

    // Filtro aninhado no endereço do Site
    const siteAddressAndConditions: Prisma.AddressWhereInput[] = [];

    if (filter.sites_some.address_country_in) {
      siteAddressAndConditions.push(caseInsensitiveOrCondition('country', filter.sites_some.address_country_in));
    }
    if (filter.sites_some.address_city_in) {
      siteAddressAndConditions.push(caseInsensitiveOrCondition('city', filter.sites_some.address_city_in));
    }

    if (filter.sites_some.address_zipCode_equals) {
      siteAddressAndConditions.push({ zipCode: { equals: filter.sites_some.address_zipCode_equals } });
    }

    if (siteAddressAndConditions.length > 0) {
      siteAndConditions.push({
        addresses: {
          some: {
            entityType: 3,
            AND: siteAddressAndConditions,
          },
        },
      });
    }

    if (siteAndConditions.length > 0) {
      andConditions.push({
        sites: {
          some: { AND: siteAndConditions },
        },
      });
    }
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}
