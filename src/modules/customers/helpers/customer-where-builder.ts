import { Prisma } from '@prisma/client';
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

  // Filtro de Categoria
  if (filter.category) {
    conditions.push({
      category: filter.category,
    });
  }

  // Filtro de Nome (Case-Insensitive simulado)
  if (filter.customerName) {
    // Assumindo que o campo no DTO se chama 'name'
    const searchTerm = filter.customerName.trim();
    const searchVariations = [
      searchTerm.toUpperCase(),
      searchTerm.toLowerCase(),
      searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase(),
    ];

    // Adiciona a condição OR à cláusula 'where' principal
    conditions.push({
      OR: searchVariations.map((variation) => ({
        customerName: {
          contains: variation,
        },
      })),
    });
  }

  // Filtro de Número de VAT da União Europeia
  if (filter.europeanUnionVatNumber) {
    conditions.push({
      businessPartner: {
        europeanUnionVatNumber: {
          contains: filter.europeanUnionVatNumber.trim(),
        },
      },
    });
  }

  const addressWhere: Prisma.AddressWhereInput = {};

  // Filtro para um país específico
  if (filter.country) {
    const searchTerm = filter.country.trim();
    const searchVariations = [
      searchTerm.toUpperCase(),
      searchTerm.toLowerCase(),
      searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase(),
    ];

    // Adiciona a condição OR para o país
    addressWhere.OR = searchVariations.map((variation) => ({
      country: {
        equals: variation,
      },
    }));
  }

  // Filtro para uma lista de países
  if (filter.countries && filter.countries.length > 0) {
    const searchVariations = filter.countries.flatMap((country) => [
      { country: { equals: country.trim().toUpperCase() } },
      { country: { equals: country.trim().toLowerCase() } },
      { country: { equals: country.trim().charAt(0).toUpperCase() + country.trim().slice(1).toLowerCase() } },
    ]);

    addressWhere.OR = [...(addressWhere.OR || []), ...searchVariations];
  }

  // Filtro para uma cidade específica
  if (filter.city) {
    const searchTerm = filter.city.trim();
    const searchVariations = [
      searchTerm.toUpperCase(),
      searchTerm.toLowerCase(),
      searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase(),
    ];

    addressWhere.OR = searchVariations.map((variation) => ({
      city: {
        equals: variation,
      },
    }));
  }

  // Filtro para uma lista de cidades
  if (filter.cities && filter.cities.length > 0) {
    const searchVariations = filter.cities.flatMap((city) => [
      { city: { equals: city.trim().toUpperCase() } },
      { city: { equals: city.trim().toLowerCase() } },
      { city: { equals: city.trim().charAt(0).toUpperCase() + city.trim().slice(1).toLowerCase() } },
    ]);

    addressWhere.OR = [...(addressWhere.OR || []), ...searchVariations];
  }

  if (Object.keys(addressWhere).length > 0) {
    conditions.push({
      // A cláusula 'some' significa: "O cliente deve ter PELO MENOS UM endereço
      // que corresponda a TODAS as condições dentro de 'addressWhere'".
      addresses: {
        some: addressWhere,
      },
    });
  }

  // Se houver condições, adiciona ao 'where' principal
  if (conditions.length > 0) {
    where.AND = conditions;
  }

  return where;
}
