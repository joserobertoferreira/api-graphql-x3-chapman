import { Prisma } from '@prisma/client';
import { caseInsensitiveOrCondition } from '../../../common/helpers/case-insensitive.helper';
import { LocalMenus } from '../../../common/utils/enums/local-menu';
import { DimensionFilterInput } from '../dto/filter-dimension.input';

/**
 * Builds the Prisma `where` clause for filtering dimensions.
 * @param filter The filter object from the GraphQL query.
 * @returns A `Prisma.DimensionsWhereInput` object ready to use.
 */
export function buildDimensionsWhereClause(filter?: DimensionFilterInput): Prisma.DimensionsWhereInput {
  if (!filter) {
    return {};
  }

  // Build `where`
  const where: Prisma.DimensionsWhereInput = {};
  const andConditions: Prisma.DimensionsWhereInput[] = [
    {
      dimensionType: { equals: filter.dimensionTypeCode_equals },
    },
  ];

  if (filter.dimension_equals) {
    andConditions.push({
      dimension: { equals: filter.dimension_equals },
    });
  }

  let isActive: LocalMenus.NoYes;
  if (filter.isActive_equals !== undefined) {
    isActive = filter.isActive_equals ? LocalMenus.NoYes.YES : LocalMenus.NoYes.NO;
  } else {
    isActive = LocalMenus.NoYes.YES; // Default to active dimensions only
  }
  andConditions.push({
    isActive: { equals: isActive },
  });

  if (filter.additionalInfo_contains) {
    andConditions.push(
      caseInsensitiveOrCondition('translatableDescription', filter.additionalInfo_contains.trim(), 'contains'),
    );
  }

  if (filter.companySiteGroup_equals) {
    andConditions.push({
      site: { equals: filter.companySiteGroup_equals },
    });
  }

  if (filter.pioneerReference_equals) {
    andConditions.push({
      pioneerReference: { equals: filter.pioneerReference_equals },
    });
  }

  if (filter.fixtureCustomer_equals) {
    andConditions.push({
      fixtureCustomer: { equals: filter.fixtureCustomer_equals },
    });
  }

  if (filter.brokerEmail_equals) {
    andConditions.push({
      brokerEmail: { equals: filter.brokerEmail_equals },
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}
