import { CustomPurchaseInvoiceView } from '@prisma/client';
import { PurchaseInvoiceTypeToPurchaseInvoiceTypeGQL } from '../../../common/utils/enums/convert-enum';
import {
  CustomPurchaseInvoiceEntity,
  CustomPurchaseInvoiceLineEntity,
} from '../entities/custom-purchase-invoice.entity';

const DIMENSION_MAP = [
  { type: 'FIX', columnPrefix: 'dimension1', entityField: 'fixture' },
  { type: 'BRK', columnPrefix: 'dimension2', entityField: 'broker' },
  { type: 'DEP', columnPrefix: 'dimension3', entityField: 'department' },
  { type: 'LOC', columnPrefix: 'dimension4', entityField: 'location' },
  { type: 'TYP', columnPrefix: 'dimension5', entityField: 'type' },
  { type: 'PDT', columnPrefix: 'dimension6', entityField: 'product' },
  { type: 'ANA', columnPrefix: 'dimension7', entityField: 'analysis' },
];

/**
 * Maps a CustomPurchaseInvoiceView object from Prisma to a CustomPurchaseInvoiceEntity.
 * @param invoiceRows - An array of rows from CustomPurchaseInvoiceView.
 * @returns An array of CustomPurchaseInvoiceEntity, with lines properly nested.
 */
export function mapInvoiceToEntity(invoiceRows: CustomPurchaseInvoiceView[]): CustomPurchaseInvoiceEntity[] {
  // Use a Map to efficiently group invoices by their number.
  // The key will be the 'invoiceNumber', the value will be the invoice entity we are building.
  const invoicesMap = new Map<string, CustomPurchaseInvoiceEntity>();

  // Iterate over each row returned by the view.
  for (const row of invoiceRows) {
    const invoiceNumber = row.invoiceNumber;

    // Check if we have already started building this invoice.
    let invoiceEntity = invoicesMap.get(invoiceNumber);

    // If this is the first time we see this invoice, create the "header" object.
    if (!invoiceEntity) {
      invoiceEntity = {
        // Map all header fields from the current row (they are repeated).
        invoiceNumber: row.invoiceNumber,
        site: row.site,
        company: row.company,
        invoiceType: row.invoiceType,
        category: PurchaseInvoiceTypeToPurchaseInvoiceTypeGQL[row.category],
        accountingDate: row.accountingDate,
        // isIntercompany: row.isIntercompany,
        supplier: row.billBySupplier,
        sourceDocument: row.sourceDocument,
        sourceDocumentDate: row.sourceDocumentDate,
        internalReference: row.internalReference,
        currency: row.currency,
        totalAmountExcludingTax: row.totalAmountExcludingTax?.toNumber(),
        totalAmountIncludingTax: row.totalAmountIncludingTax?.toNumber(),
        taxAmount: row.taxAmount?.toNumber(),
        companyCurrency: row.ledgerCurrency,
        totalAmountExcludingTaxInCompanyCurrency: row.totalAmountExcludingTaxInCompanyCurrency?.toNumber(),
        totalAmountIncludingTaxInCompanyCurrency: row.totalAmountIncludingTaxInCompanyCurrency?.toNumber(),
        lines: [], // start with an empty array of lines.
      };
      // Add the new invoice to our map so we can find it next time.
      invoicesMap.set(invoiceNumber, invoiceEntity);
    }

    // Create the LINE entity from the current row of the view.
    const lineEntity: CustomPurchaseInvoiceLineEntity = {
      lineNumber: row.lineNumber,
      productCode: row.product,
      description: row.productDescription,
      quantity: row.quantity?.toNumber(),
      grossPrice: row.grossPrice?.toNumber(),
      lineAmountExcludingTax: row.lineAmountExcludingTax?.toNumber(),
      lineAmountIncludingTax: row.lineAmountIncludingTax?.toNumber(),
      lineTaxAmount: row.lineTaxAmount?.toNumber(),
    };

    for (const config of DIMENSION_MAP) {
      const typeKey = `dimensionType${config.columnPrefix.slice(-1)}` as keyof CustomPurchaseInvoiceView;
      const valueKey = config.columnPrefix as keyof CustomPurchaseInvoiceView;

      // Verify if the type in the corresponding column is what we expect.
      if (row[typeKey] === config.type) {
        const dimensionValue = row[valueKey] as string;

        // Only add if the value exists
        if (dimensionValue && dimensionValue.trim() !== '') {
          // Assign the CommonDimensionEntity object to the correct field in lineEntity.
          lineEntity[config.entityField] = {
            code: dimensionValue,
          };
        }
      }
    }

    // Add the new line to the 'lines' array of the corresponding invoice.
    invoiceEntity.lines?.push(lineEntity);
  }

  return Array.from(invoicesMap.values());
}
