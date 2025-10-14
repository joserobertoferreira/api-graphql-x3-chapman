import { Prisma } from '@prisma/client';
import { caseInsensitiveOrCondition } from '../../../common/helpers/case-insensitive.helper';
import { LocalMenus } from '../../../common/utils/enums/local-menu';
import { SupplierFilter } from '../dto/filter-supplier.input';

/**
 * Constrói a cláusula `where` do Prisma para a filtragem de fornecedores.
 * @param filter O objeto de filtro vindo da query GraphQL.
 * @returns Um objeto `Prisma.SupplierWhereInput` pronto para ser usado.
 */
export function buildSupplierWhereClause(filter?: SupplierFilter): Prisma.SupplierWhereInput {
  const where: Prisma.SupplierWhereInput = {
    isActive: LocalMenus.NoYes.YES,
  };

  if (!filter) {
    return where;
  }

  // Filter combinations
  const conditions: Prisma.SupplierWhereInput[] = [];

  // Filter by a list of supplier codes
  if (filter.supplierCode_in && filter.supplierCode_in.length > 0) {
    conditions.push({ supplierCode: { in: filter.supplierCode_in } });
  }

  // Filter by name (simulated case-insensitive)
  if (filter.supplierName_contains) {
    conditions.push(caseInsensitiveOrCondition('supplierName', filter.supplierName_contains.trim(), 'contains'));
  }

  // Nested filters in BusinessPartner
  const businessPartnerConditions: Prisma.BusinessPartnerWhereInput[] = [];

  // Filter by Business Partner vat number
  if (filter.vatNumber_equals) {
    businessPartnerConditions.push({ europeanUnionVatNumber: { equals: filter.vatNumber_equals.trim() } });
  }

  // Filter by Business Partner company registration number
  if (filter.companyRegistrationNumber_equals) {
    businessPartnerConditions.push({
      siteIdentificationNumber: { equals: filter.companyRegistrationNumber_equals.trim() },
    });
  }

  // Filter by Business Partner language
  if (filter.language_equals) {
    businessPartnerConditions.push({ language: { equals: filter.language_equals.trim() } });
  }

  // Filter by Business Partner currency
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

  // Nested filters in Address
  const addressWhere: Prisma.AddressWhereInput[] = [];

  // Filter by a specific country
  if (filter.country_equals) {
    addressWhere.push({ country: { equals: filter.country_equals } });
  }

  // Filter by country name
  if (filter.countryName_contains) {
    addressWhere.push(caseInsensitiveOrCondition('countryName', filter.countryName_contains.trim(), 'contains'));
  }

  // Filter by a specific city
  if (filter.city_equals) {
    addressWhere.push(caseInsensitiveOrCondition('city', filter.city_equals.trim(), 'contains'));
  }

  // Filter by postal code
  if (filter.postalCode_contains) {
    addressWhere.push({ zipCode: { contains: filter.postalCode_contains.trim() } });
  }

  if (addressWhere.length > 0) {
    conditions.push({
      // The 'some' clause means: "The customer must have AT LEAST ONE address
      addresses: { some: { AND: addressWhere } },
    });
  }

  // If there are conditions, add them to the main 'where' clause
  if (conditions.length > 0) {
    where.AND = conditions;
  }

  return where;
}
