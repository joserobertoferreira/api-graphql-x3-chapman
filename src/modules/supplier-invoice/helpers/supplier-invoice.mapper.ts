import { AnalyticalSupplierLine, SupplierInvoiceHeader, SupplierInvoiceLines } from 'src/generated/prisma/client';
import { CommonDimensionEntity } from '../../../common/outputs/common-dimension.entity';
import {
  SupplierInvoiceAnalyticalLineEntity,
  SupplierInvoiceLineEntity,
} from '../entities/supplier-invoice-line.entity';
import { SupplierInvoiceEntity } from '../entities/supplier-invoice.entity';

const DIMENSION_TYPE_TO_FIELD: Record<string, keyof CommonDimensionEntity> = {
  FIX: 'fixture',
  BRK: 'broker',
  DEP: 'department',
  LOC: 'location',
  TYP: 'type',
  PDT: 'product',
  ANA: 'analysis',
};

/**
 * Maps a SupplierInvoiceHeader object from Prisma to a SupplierInvoiceEntity.
 */
export function mapInvoiceToEntity(invoice: SupplierInvoiceHeader): SupplierInvoiceEntity {
  return {
    category: String(invoice.category),
    invoiceNumber: invoice.invoiceNumber,
    site: invoice.site,
    invoiceType: invoice.invoiceType,
    accountingDate: invoice.accountingDate,
    collective: invoice.collective,
    supplier: invoice.billBySupplier,
    payToBusinessPartner: invoice.payToBusinessPartner,
    taxRule: invoice.taxRule,
    sourceDocument: invoice.sourceDocument,
    sourceDocumentDate: invoice.sourceDocumentDate,
    currency: invoice.currency,
    totalAmountExcludingTax: invoice.totalAmountExcludingTax.toNumber(),
    totalAmountIncludingTax: invoice.totalAmountIncludingTax.toNumber(),

    // Passa o código para o FieldResolver do Supplier (se precisar de mais dados do fornecedor)
    supplierCode: invoice.billBySupplier,
  };
}

/**
 * Maps a SupplierInvoiceLines object from Prisma to a SupplierInvoiceLineEntity.
 */
export function mapLineToEntity(line: SupplierInvoiceLines): SupplierInvoiceLineEntity {
  return {
    lineNumber: line.line,
    site: line.site,
    company: line.company,
    account: line.account1,
    businessPartner: line.businessPartner,
    chartOfAccount: line.planCode1,
    lineAmount: line.lineAmountExcludingTax?.toNumber(),
    quantity: line.quantity?.toNumber(),
    comment: line.comment,
    // buildLinesPayload() writes the line's tax code into tax3, not tax1 - keep this in sync.
    taxCode: line.tax3,

    // Propriedade interna para o FieldResolver de analyticalLines
    document: line.document,
  };
}

/**
 * Maps an AnalyticalSupplierLine object from Prisma to a SupplierInvoiceAnalyticalLineEntity.
 *
 * AnalyticalSupplierLine has no `site` column of its own - it always belongs to
 * the SupplierInvoiceLines row it was built from, so `lineSite` (the parent
 * line's site) is passed in by the caller and copied onto the analytical line.
 */
export function mapAnalyticalLineToEntity(
  row: AnalyticalSupplierLine,
  lineSite?: string,
): SupplierInvoiceAnalyticalLineEntity {
  const dimensions: CommonDimensionEntity = {};

  for (let i = 1; i <= 20; i++) {
    const typeCode = row[`dimensionType${i}` as keyof AnalyticalSupplierLine] as string;
    const value = row[`dimension${i}` as keyof AnalyticalSupplierLine] as string;

    const entityField = DIMENSION_TYPE_TO_FIELD[typeCode];
    if (entityField && value && value.trim() !== '') {
      dimensions[entityField] = value;
    }
  }

  return {
    lineNumber: row.line,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    analyticalLineNumber: row.analyticalLine,
    site: lineSite,
    amount: row.amount?.toNumber(),
    dimensions,
  };
}
