# Supplier Invoices (supplier-invoice)

**Source code:** `src/modules/supplier-invoice`

Creation and retrieval of supplier invoices in X3 (manual posting, including accounting lines and their corresponding analytical lines by dimension).

## Operations

| Resolver | Operation | Type | GraphQL Name | Description |
|---|---|---|---|---|
| `SupplierInvoiceResolver` | `createSupplierInvoice` | Mutation | `createSupplierInvoice` | Creates a new supplier invoice with its respective lines |
| `SupplierInvoiceResolver` | `findPaginated` | Query | `getSupplierInvoices` | Lists supplier invoices, paginated by cursor, with filtering |
| `SupplierInvoiceResolver` | `findOne` | Query | `getSupplierInvoice` | Retrieves a specific supplier invoice by number |
| `SupplierInvoiceResolver` | `getLines` | `@ResolveField` | `lines` | Invoice lines, resolved via `DataLoader` (`supplierInvoiceLinesByDocumentLoader`) |
| `SupplierInvoiceLineResolver` | `getAnalyticalLines` | `@ResolveField` | `analyticalLines` (on each line) | Analytical lines (by *ledger*/dimension) for each invoice line |

## `SupplierInvoiceEntity`

| Field | Type | Description |
|---|---|---|
| `invoiceNumber` | `ID` | Unique invoice number |
| `category` | `PurchaseInvoiceType` | Invoice category |
| `site` | `String` | Associated site |
| `invoiceType` | `String` | Invoice type |
| `accountingDate` | `Date` | Accounting date |
| `collective` | `String` | Assigned accounting collective |
| `supplier` | `String` | Associated supplier code ([Suppliers](suppliers.md)) |
| `payToBusinessPartner` | `String` | "Pay to" business partner code |
| `taxRule` | `String` | Tax rule |
| `sourceDocument` / `sourceDocumentDate` | `String` / `Date` | Source document from the supplier |
| `dueDateBasis` | `Date` | Due date calculation basis |
| `paymentApproval` | `PaymentApprovalType` | Payment approval type |
| `currency` | `String` | Invoice currency |
| `totalAmountExcludingTax` / `totalAmountIncludingTax` | `Float` | Totals excluding/including tax |
| `lines` | `[SupplierInvoiceLineEntity]` | Accounting lines of the invoice |

Each line (`SupplierInvoiceLineEntity`) includes line number, site, collective, account, business partner, line amount excluding tax, tax code, tax amount, deductible tax, line amount including tax, comment, and `analyticalLines`.

Each analytical line (`SupplierInvoiceAnalyticalLineEntity`) includes line number, analytical line number, and [dimensions](dimensions.md) (`CommonDimensionEntity`).

## Filter (`SupplierInvoiceFilterInput`)

Supports filtering by a list of invoice numbers, a list of suppliers, and a line filter (`SupplierInvoiceLineFilter`).

## Create supplier invoice (`CreateSupplierInvoiceInput`)

| Field | Required | Description |
|---|---|---|
| `site` | Yes | Site associated with the invoice |
| `invoiceType` | Yes | Invoice type |
| `accountingDate` | No | Date of the invoice |
| `collective` | No | Accounting collective |
| `supplier` | Yes | Associated supplier code |
| `payToBusinessPartner` | No | "Pay to" business partner code |
| `taxRule` | Yes | Tax rule |
| `sourceDocument` / `sourceDocumentDate` | No | Source document from the supplier |
| `currency` | No | Invoice currency |
| `originalInvoiceNumber` | No | Original invoice number (e.g. for credit notes) |
| `dueDateCalculationStartDate` | No | Due date calculation basis |
| `paymentApproval` | No | Payment approval type |
| `lines` | Yes | List of lines (`SupplierInvoiceLineInput`) |

Each line (`SupplierInvoiceLineInput`) supports: `account` (accounting account), `businessPartner`, `amount`, `comment`, `taxCode`, and `dimensions` (dimensions associated with the line).

```graphql
mutation {
  createSupplierInvoice(
    input: {
      site: "STL01"
      invoiceType: "FAC"
      supplier: "F000123"
      taxRule: "PT01"
      currency: "EUR"
      lines: [{ account: "622100", amount: 250.0, taxCode: "IVA23" }]
    }
  ) {
    invoiceNumber
    totalAmountIncludingTax
    lines { account lineAmountExcludingTax }
  }
}
```

```graphql
query {
  getSupplierInvoice(invoiceNumber: "SI000123") {
    invoiceNumber
    accountingDate
    supplier
    lines {
      account
      lineAmountExcludingTax
      analyticalLines { dimensions { fixture department location } }
    }
  }
}
```
