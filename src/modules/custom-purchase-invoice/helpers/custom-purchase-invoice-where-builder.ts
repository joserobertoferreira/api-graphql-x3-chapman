import { CustomPurchaseInvoiceView, Prisma } from '@prisma/client';
import { DimensionValuesInput } from '../../../common/inputs/dimension.input';
import { CustomPurchaseInvoiceFilterInput } from '../dto/filter-custom-purchase-invoice.input';

const DIMENSION_COLUMN_MAP = {
  fixtureCode_in: 'dimension1',
  brokerCode_in: 'dimension2',
  departmentCode_in: 'dimension3',
  locationCode_in: 'dimension4',
  typeCode_in: 'dimension5',
  productCode_in: 'dimension6',
  analysisCode_in: 'dimension7',
};

export function buildCustomPurchaseInvoiceWhereClause(
  filter?: CustomPurchaseInvoiceFilterInput,
): Prisma.CustomPurchaseInvoiceViewWhereInput {
  if (!filter) return {};

  const andConditions: Prisma.CustomPurchaseInvoiceViewWhereInput[] = [];

  if (filter.invoiceNumber_in) {
    andConditions.push({ invoiceNumber: { in: filter.invoiceNumber_in } });
  }

  if (filter.billBySupplier_in) {
    andConditions.push({ billBySupplier: { in: filter.billBySupplier_in } });
  }

  if (filter.site) {
    andConditions.push({ site: { equals: filter.site } });
  }

  if (filter.company) {
    andConditions.push({ company: { equals: filter.company } });
  }

  if (filter.accountingDate_gte) {
    andConditions.push({ accountingDate: { gte: filter.accountingDate_gte } });
  }

  if (filter.accountingDate_lte) {
    andConditions.push({ accountingDate: { lte: filter.accountingDate_lte } });
  }

  if (andConditions.length > 0) {
    return { AND: andConditions };
  }

  return {};
}

/**
 * Apply the complex dimension filter to a set of view rows.
 * @param rows - Lines to be filtered.
 * @param dimensionFilter - The dimension filter to be applied.
 * @returns A new array with the rows that match the filter.
 */
export function applyDimensionFilter(
  rows: CustomPurchaseInvoiceView[],
  dimensionFilter: DimensionValuesInput,
): CustomPurchaseInvoiceView[] {
  const matchingInvoiceNumbers = new Set<string>();

  for (const row of rows) {
    for (const filterKey in DIMENSION_COLUMN_MAP) {
      if (dimensionFilter[filterKey]) {
        const columnName = DIMENSION_COLUMN_MAP[filterKey];
        const filteredValues = new Set(dimensionFilter[filterKey]);

        if (filteredValues.has(row[columnName])) {
          matchingInvoiceNumbers.add(row.invoiceNumber);
          break; // If one dimension matches, no need to check others for this row
        }
      }
    }
  }

  // Return all rows whose invoiceNumber is in the matching set
  return rows.filter((row) => matchingInvoiceNumbers.has(row.invoiceNumber));
}
