import { Prisma } from '@prisma/client';
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
      andConditions.push({ country: { in: filter.company.country_in } });
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
    if (
      filter.sites_some.address_country_in ||
      filter.sites_some.address_city_in ||
      filter.sites_some.address_zipCode_equals
    ) {
      siteAndConditions.push({
        addresses: {
          some: {
            entityType: 3,
            AND: [
              ...(filter.sites_some.address_country_in
                ? [{ country: { in: filter.sites_some.address_country_in } }]
                : []),
              ...(filter.sites_some.address_city_in ? [{ city: { in: filter.sites_some.address_city_in } }] : []),
              ...(filter.sites_some.address_zipCode_equals
                ? [{ zipCode: { equals: filter.sites_some.address_zipCode_equals } }]
                : []),
            ],
          },
        },
      });
    }

    if (siteAndConditions.length > 0) {
      siteConditions.AND = siteAndConditions;
    }

    andConditions.push({ sites: { some: siteConditions } });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}
