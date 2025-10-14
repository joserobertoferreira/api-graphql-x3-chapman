import { Prisma } from '@prisma/client';
import { ProductFilter } from '../dto/filter-product.input';

/**
 * Constrói a cláusula `where` do Prisma para a filtragem de clientes.
 * @param filter O objeto de filtro vindo da query GraphQL.
 * @returns Um objeto `Prisma.ProductsWhereInput` pronto para ser usado.
 */
export function buildProductWhereClause(filter?: ProductFilter): Prisma.ProductsWhereInput {
  const where: Prisma.ProductsWhereInput = {};

  if (!filter) {
    return where;
  }

  // Combinações de filtros
  const conditions: Prisma.ProductsWhereInput[] = [];

  // Filtro por categoria
  if (filter.categoryCode_equals) {
    conditions.push({ productCategory: filter.categoryCode_equals.trim() });
  }

  // Filtro por código do produto
  if (filter.code_in && filter.code_in.length > 0) {
    conditions.push({ code: { in: filter.code_in.map((code) => code.trim()) } });
  }

  // Filtro por descrição (Case-Insensitive simulado)
  if (filter.description_contains) {
    const searchTerm = filter.description_contains.trim();
    const searchVariations = [
      searchTerm.toUpperCase(),
      searchTerm.toLowerCase(),
      searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase(),
    ];

    const descriptionConditions = {
      OR: [
        ...searchVariations.map((variation) => ({ description1: { contains: variation } })),
        ...searchVariations.map((variation) => ({ description2: { contains: variation } })),
        ...searchVariations.map((variation) => ({ description3: { contains: variation } })),
      ],
    };

    conditions.push(descriptionConditions);
  }

  // Filtro por nível de taxa (Case-Insensitive simulado)
  if (filter.taxLevel_contains) {
    const searchTerm = filter.taxLevel_contains.trim();
    const searchVariations = [
      searchTerm.toUpperCase(),
      searchTerm.toLowerCase(),
      searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase(),
    ];

    const taxLevelConditions = {
      OR: [
        ...searchVariations.map((variation) => ({ taxLevel1: { contains: variation } })),
        ...searchVariations.map((variation) => ({ taxLevel2: { contains: variation } })),
        ...searchVariations.map((variation) => ({ taxLevel3: { contains: variation } })),
      ],
    };

    conditions.push(taxLevelConditions);
  }

  // Filtro por família estatística (Case-Insensitive simulado)
  if (filter.statisticalGroup_contains) {
    const searchTerm = filter.statisticalGroup_contains.trim();
    const searchVariations = [
      searchTerm.toUpperCase(),
      searchTerm.toLowerCase(),
      searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase(),
    ];

    const statisticalGroupConditions = {
      OR: [
        ...searchVariations.map((variation) => ({ productStatisticalGroup1: { contains: variation } })),
        ...searchVariations.map((variation) => ({ productStatisticalGroup2: { contains: variation } })),
        ...searchVariations.map((variation) => ({ productStatisticalGroup3: { contains: variation } })),
        ...searchVariations.map((variation) => ({ productStatisticalGroup4: { contains: variation } })),
        ...searchVariations.map((variation) => ({ productStatisticalGroup5: { contains: variation } })),
      ],
    };

    conditions.push(statisticalGroupConditions);
  }

  if (conditions.length > 0) {
    where.AND = conditions;
  }

  return where;
}
