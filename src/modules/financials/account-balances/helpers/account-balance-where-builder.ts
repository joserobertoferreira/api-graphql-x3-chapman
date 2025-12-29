import { Prisma } from 'src/generated/prisma/client';
import { AccountBalanceFilter } from '../dto/filter-account-balance.input';

export function buildProductWhereClause(filter?: AccountBalanceFilter): Prisma.AnalyticalBalanceWhereInput {
  const where: Prisma.AnalyticalBalanceWhereInput = {};

  if (!filter) {
    return where;
  }

  // Combinações de filtros
  const conditions: Prisma.AnalyticalBalanceWhereInput[] = [];

  // Filtro por site
  if (filter.site_equals) {
    conditions.push({ site: filter.site_equals.trim() });
  }

  // Filtro por ledger
  if (filter.ledger_equals) {
    conditions.push({ ledger: filter.ledger_equals.trim() });
  }

  // Filtro por fiscal year
  if (filter.fiscalYear_equals) {
    conditions.push({ fiscalYear: filter.fiscalYear_equals });
  }

  // Filtro por account
  if (filter.account_equals) {
    conditions.push({ account: filter.account_equals.trim() });
  }

  // Filtro por fixture
  if (filter.fixture_equals) {
    conditions.push({ dimension1: filter.fixture_equals.trim() });
  }

  if (conditions.length > 0) {
    where.AND = conditions;
  }

  return where;
}
