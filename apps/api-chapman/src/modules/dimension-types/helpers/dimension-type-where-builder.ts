import { Prisma } from 'src/generated/prisma';
import { caseInsensitiveOrCondition } from '../../../common/helpers/case-insensitive.helper';
import { DimensionTypeFilterInput } from '../dto/filter-dimension-type.input';

/**
 * Constrói a cláusula `where` do Prisma para a filtragem de dimensões.
 * @param filter O objeto de filtro vindo da query GraphQL.
 * @returns Um objeto `Prisma.DimensionTypeWhereInput` pronto para ser usado.
 */
export function buildDimensionTypeWhereClause(filter?: DimensionTypeFilterInput): Prisma.DimensionTypeWhereInput {
  if (!filter) {
    return {};
  }

  // Construção do `where`
  const where: Prisma.DimensionTypeWhereInput = {};
  const andConditions: Prisma.DimensionTypeWhereInput[] = [];

  if (filter.dimension_equals) {
    andConditions.push({
      dimensionType: { equals: filter.dimension_equals },
    });
  }

  if (filter.description_contains) {
    andConditions.push(caseInsensitiveOrCondition('description', filter.description_contains.trim(), 'contains'));
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}
