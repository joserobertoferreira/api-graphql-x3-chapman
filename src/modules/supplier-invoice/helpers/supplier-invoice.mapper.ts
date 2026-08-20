import { AnalyticalSupplierLine, SupplierInvoiceHeader, SupplierInvoiceLines } from 'src/generated/prisma/client';
import { CommonDimensionEntity } from '../../../common/outputs/common-dimension.entity';
import { DIMENSION_TYPE_TO_FIELD } from '../../../common/types/dimension.types';
import {
  PaymentApprovalTypeToPaymentApprovalTypeGQL,
  PurchaseInvoiceTypeToPurchaseInvoiceTypeGQL,
} from '../../../common/utils/enums/convert-enum';
import { LocalMenus } from '../../../common/utils/enums/local-menu';
import {
  SupplierInvoiceAnalyticalLineEntity,
  SupplierInvoiceLineEntity,
} from '../entities/supplier-invoice-line.entity';
import { SupplierInvoiceEntity } from '../entities/supplier-invoice.entity';

/**
 * Maps a SupplierInvoiceHeader object from Prisma to a SupplierInvoiceEntity.
 */
export function mapInvoiceToEntity(invoice: SupplierInvoiceHeader): SupplierInvoiceEntity {
  const paymentApproval: LocalMenus.PaymentApprovalType = invoice.paymentApproval;
  const category: LocalMenus.PurchaseInvoiceType = invoice.category || LocalMenus.PurchaseInvoiceType.INVOICE;

  return {
    category: PurchaseInvoiceTypeToPurchaseInvoiceTypeGQL[category],
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
    dueDateBasis: invoice.dueDateCalculationStartDate,
    currency: invoice.currency,
    totalAmountExcludingTax: invoice.totalAmountExcludingTax.toNumber(),
    totalAmountIncludingTax: invoice.totalAmountIncludingTax.toNumber(),
    paymentApproval: PaymentApprovalTypeToPaymentApprovalTypeGQL[paymentApproval],

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
    collective: line.collective,
    account: line.account1,
    businessPartner: line.businessPartner,
    lineAmountExcludingTax: line.lineAmountExcludingTax?.toNumber(),
    taxCode: line.tax3,
    taxAmount: line.taxAmount?.toNumber(),
    deductableTax: line.deductableTax?.toNumber(),
    lineAmountIncludingTax: line.lineAmountIncludingTax?.toNumber(),
    comment: line.comment,

    // Propriedade interna para o FieldResolver de analyticalLines
    document: line.document,
  };
}

/**
 * Maps an AnalyticalSupplierLine object from Prisma to a SupplierInvoiceAnalyticalLineEntity.
 *
 */
export function mapAnalyticalLineToEntity(row: AnalyticalSupplierLine): SupplierInvoiceAnalyticalLineEntity {
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
    analyticalLineNumber: row.analyticalLine,
    dimensions,
  };
}
