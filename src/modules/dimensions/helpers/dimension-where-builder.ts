import { Prisma } from '@prisma/client';
import { caseInsensitiveOrCondition } from '../../../common/helpers/case-insensitive.helper';
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
  const andConditions: Prisma.DimensionsWhereInput[] = [];

  andConditions.push({
    dimensionType: { equals: filter.dimensionTypeCode_equals },
  });

  if (filter.dimension_equals) {
    andConditions.push({
      dimension: { equals: filter.dimension_equals },
    });
  }

  if (filter.site_equals) {
    andConditions.push({
      site: { equals: filter.site_equals },
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
