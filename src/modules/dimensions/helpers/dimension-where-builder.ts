import { Prisma } from '@prisma/client';
import { DimensionFilterInput } from '../dto/filter-dimension.input';

/**
 * Constrói a cláusula `where` do Prisma para a filtragem de dimensões.
 * @param filter O objeto de filtro vindo da query GraphQL.
 * @returns Um objeto `Prisma.DimensionsWhereInput` pronto para ser usado.
 */
export function buildDimensionsWhereClause(filter?: DimensionFilterInput): Prisma.DimensionsWhereInput {
  if (!filter) {
    return {};
  }

  // Construção do `where`
  const where: Prisma.DimensionsWhereInput = {};
  const conditions: Prisma.DimensionsWhereInput[] = [];

  conditions.push({
    dimensionType: { equals: filter.dimensionTypeCode_equals },
  });

  if (filter.dimension_equals) {
    conditions.push({
      dimension: { equals: filter.dimension_equals },
    });
  }

  if (filter.site_equals) {
    conditions.push({
      site: { equals: filter.site_equals },
    });
  }

  if (filter.description_contains) {
    const searchTerm = filter.description_contains.trim();
    const searchVariations = [
      searchTerm.toUpperCase(),
      searchTerm.toLowerCase(),
      searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1).toLowerCase(),
    ];

    // Adiciona a condição OR à cláusula 'where' principal
    conditions.push({
      OR: searchVariations.map((variation) => ({
        description: {
          contains: variation,
        },
      })),
    });
  }

  if (conditions.length > 0) {
    where.AND = conditions;
  }

  return where;
}
