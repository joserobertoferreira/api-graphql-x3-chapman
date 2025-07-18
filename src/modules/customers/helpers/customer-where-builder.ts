import { Prisma } from '@prisma/client';
import { caseInsensitiveOrCondition } from 'src/common/helpers/case-insensitive.helper';
import { CustomerFilter } from '../dto/filter-customer.input';

/**
 * Constrói a cláusula `where` do Prisma para a filtragem de clientes.
 * @param filter O objeto de filtro vindo da query GraphQL.
 * @returns Um objeto `Prisma.CustomerWhereInput` pronto para ser usado.
 */
export function buildCustomerWhereClause(filter?: CustomerFilter): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = {
    isActive: 2,
  };

  if (!filter) {
    return where;
  }

  // Combinações de filtros
  const conditions: Prisma.CustomerWhereInput[] = [];

  // Filtro de Nome (Case-Insensitive simulado)
  if (filter.customerName_contains) {
    conditions.push(caseInsensitiveOrCondition('customerName', filter.customerName_contains.trim(), 'contains'));
  }

  // Filtros aninhados no BusinessPartner
  const businessPartnerConditions: Prisma.BusinessPartnerWhereInput[] = [];

  if (filter.vatNumber_equals) {
    businessPartnerConditions.push({ europeanUnionVatNumber: { equals: filter.vatNumber_equals.trim() } });
  }

  if (filter.companyRegistrationNumber_equals) {
    businessPartnerConditions.push({
      siteIdentificationNumber: { equals: filter.companyRegistrationNumber_equals.trim() },
    });
  }

  if (filter.language_equals) {
    businessPartnerConditions.push({ language: { equals: filter.language_equals.trim() } });
  }

  if (filter.currency_equals) {
    businessPartnerConditions.push({ currency: { equals: filter.currency_equals.trim() } });
  }

  if (businessPartnerConditions.length > 0) {
    conditions.push({
      businessPartner: {
        AND: businessPartnerConditions,
      },
    });
  }

  const addressWhere: Prisma.AddressWhereInput[] = [];

  // Filtro para um país específico
  if (filter.country_equals) {
    addressWhere.push({ country: { equals: filter.country_equals } });
  }

  // Filtro para o nome do país
  if (filter.countryName_contains) {
    addressWhere.push(caseInsensitiveOrCondition('countryName', filter.countryName_contains.trim(), 'contains'));
  }

  // Filtro para uma cidade específica
  if (filter.city_equals) {
    addressWhere.push(caseInsensitiveOrCondition('city', filter.city_equals.trim(), 'contains'));
  }

  // Filtro para o código postal
  if (filter.postalCode_contains) {
    addressWhere.push({ zipCode: { contains: filter.postalCode_contains.trim() } });
  }

  if (addressWhere.length > 0) {
    conditions.push({
      // A cláusula 'some' significa: "O cliente deve ter PELO MENOS UM endereço
      // que corresponda a TODAS as condições dentro de 'addressWhere'".
      addresses: { some: { AND: addressWhere } },
    });
  }

  // Se houver condições, adiciona ao 'where' principal
  if (conditions.length > 0) {
    where.AND = conditions;
  }

  return where;
}
