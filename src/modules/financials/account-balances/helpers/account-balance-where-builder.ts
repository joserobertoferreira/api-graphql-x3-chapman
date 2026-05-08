import { Prisma } from 'src/generated/prisma/client';
import { AccountBalanceFilter } from '../dto/filter-account-balance.input';

export function buildProductWhereClause(filter?: AccountBalanceFilter): Prisma.AnalyticalBalanceWhereInput {
  const where: Prisma.AnalyticalBalanceWhereInput = {};

  if (!filter) {
    return where;
  }

  // Filter combinations
  const conditions: Prisma.AnalyticalBalanceWhereInput[] = [];

  // Filter by site
  if (filter.site_equals) {
    conditions.push({ site: filter.site_equals.trim() });
  }

  // Filter by ledger
  if (filter.ledger_equals) {
    conditions.push({ ledger: filter.ledger_equals.trim() });
  }

  // Filter by fiscal year
  if (filter.fiscalYear_equals) {
    conditions.push({ fiscalYear: filter.fiscalYear_equals });
  }

  // Filter by account
  if (filter.account_equals) {
    conditions.push({ account: filter.account_equals.trim() });
  }

  // Filter by fixture
  if (filter.fixture_equals) {
    conditions.push({ dimension1: filter.fixture_equals.trim() });
  }

  // Filter by broker
  if (filter.broker_equals) {
    conditions.push({ dimension2: filter.broker_equals.trim() });
  }

  // Filter by department
  if (filter.department_equals) {
    conditions.push({ dimension3: filter.department_equals.trim() });
  }

  // Filter by location
  if (filter.location_equals) {
    conditions.push({ dimension4: filter.location_equals.trim() });
  }

  // Filter by type
  if (filter.type_equals) {
    conditions.push({ dimension5: filter.type_equals.trim() });
  }

  // Filter by product
  if (filter.product_equals) {
    conditions.push({ dimension6: filter.product_equals.trim() });
  }

  // Filter by analysis
  if (filter.analysis_equals) {
    conditions.push({ dimension7: filter.analysis_equals.trim() });
  }

  if (conditions.length > 0) {
    where.AND = conditions;
  }

  return where;
}
