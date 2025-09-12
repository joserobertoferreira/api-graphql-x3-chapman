import { PurchaseInvoiceLine, PurchaseInvoiceView } from '@prisma/client';
import { stringsToArray } from 'src/common/utils/array.utils';
import { ProductEntity } from '../../products/entities/product.entity';
import { PurchaseInvoiceControlsEntity } from '../entities/purchase-invoice-controls.entity';
import { PurchaseInvoiceLineEntity } from '../entities/purchase-invoice-line.entity';
import { PurchaseInvoiceEntity } from '../entities/purchase-invoice.entity';

// Tipo helper para o `include` do Prisma
type PurchaseInvoiceLineWithRelations = PurchaseInvoiceView & {
  invoiceLines: (PurchaseInvoiceLine & { productDetails: ProductEntity })[];
};

/**
 * Mapeia um objeto PurchaseInvoiceView do Prisma para uma PurchaseInvoiceEntity.
 */
export function mapInvoiceToEntity(invoice: PurchaseInvoiceView): PurchaseInvoiceEntity {
  const controlsInfo: PurchaseInvoiceControlsEntity = {
    sourceInfo: {
      sourceDocument: invoice.sourceDocument,
      sourceDocumentDate: invoice.sourceDocumentDate,
      payToBusinessPartner: invoice.payToBusinessPartner,
      currency: invoice.currency,
      currencyRate: undefined,
      originalInvoiceNumber: invoice.originalInvoiceNumber,
    },
    paymentInfo: {
      internalReference: invoice.internalReference,
      dueDateCalculationStartDate: invoice.dueDateCalculationStartDate,
      paymentTerm: invoice.paymentTerm,
      settlementDiscount: undefined,
      taxRule: invoice.taxRule,
      serviceStartDate: undefined,
      serviceEndDate: undefined,
      vcsNumber: invoice.versionControlSystemNumber,
    },
    commentsInfo: {
      commentText: stringsToArray(
        invoice.comment1,
        invoice.comment2,
        invoice.comment3,
        invoice.comment4,
        invoice.comment5,
      ),
    },
    amountInfo: {
      invoiceLinesExcludingTax: invoice.amountOfLinesExcludingTax?.toNumber(),
      invoiceTotalTaxAmount: invoice.totalTaxAmount?.toNumber(),
      invoiceTotalAmount: invoice.amountOfLinesExcludingTax?.toNumber() + invoice.totalTaxAmount?.toNumber(),
      status: String(invoice.status),
      matchStatus: String(invoice.matchStatus),
    },
  };

  return {
    invoiceNumber: invoice.invoiceNumber,
    invoiceSite: invoice.site,
    invoiceType: invoice.invoiceType,
    purchaseInvoiceCategory: String(invoice.purchaseInvoiceCategory),
    accountingDate: invoice.accountingDate,
    isIntercompany: invoice.isIntercompany === 2,
    supplier: invoice.billBySupplier,
    control: invoice.control,
    companyName: invoice.billBySupplierName1,
    paymentApproval: String(invoice.paymentApproval),
    suspendedInvoice: invoice.suspendedInvoice === 2,
    totalAmountExcludingTax: invoice.totalAmountExcludingTax.toNumber(),
    totalAmountIncludingTax: invoice.totalAmountIncludingTax.toNumber(),

    // Constrói o objeto aninhado `controlsInfo` com os dados desnormalizados da view
    controlsInfo: controlsInfo,

    // Passa o código para o FieldResolver do Supplier (se precisar de mais dados do fornecedor)
    supplierCode: invoice.billBySupplier,
  };
}

/**
 * Mapeia um objeto PurchaseInvoiceLine do Prisma para uma PurchaseInvoiceLineEntity.
 */
export function mapLineToEntity(line: PurchaseInvoiceLineWithRelations): PurchaseInvoiceLineEntity {
  return {
    invoiceNumber: line.invoiceNumber,
    lineNumber: undefined,
    product: undefined,
    productDescription: undefined,
    quantity: undefined,
    grossPrice: undefined,
    netPrice: undefined,
    taxCodes: stringsToArray(line.tax1, line.tax2, line.tax3),
    productCode: undefined,
  };
}
