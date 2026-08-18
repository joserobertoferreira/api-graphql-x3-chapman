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
| `category` | `String` | Invoice category |
| `site` | `String` | Associated site |
| `invoiceType` | `String` | Invoice type |
| `invoiceDate` | `Date` | Invoice date |
| `collective` | `String` | Assigned accounting collective |
| `supplierCode` | `String` | Associated supplier ([Suppliers](suppliers.md)) |
| `payToCode` | `String` | "Pay to" code |
| `taxRuleCode` | `String` | Tax rule |
| `sourceDocumentNumber` / `sourceDocumentDate` | `String` / `Date` | Source document from the supplier |
| `currency` | `String` | Invoice currency |
| `totalAmountExcludingTax` / `totalAmountIncludingTax` | `Float` | Totals excluding/including tax |
| `lines` | `[SupplierInvoiceLineEntity]` | Accounting lines of the invoice |

Each line (`SupplierInvoiceLineEntity`) includes line number, site, company, accounting date, account, business partner, chart of accounts account, control account, debit/credit indicator (`SignByDefault`), amount excluding tax, quantity, comment, tax code, and `analyticalLines`.

Each analytical line (`SupplierInvoiceAnalyticalLineEntity`) includes line number, ledger type (`LedgerType`), analytical line number, site (inherited from the parent line), [dimension](dimensions.md) (`CommonDimensionEntity`), and amount.

!!! warning "Fields not populated at line level"
    A few fields declared on `SupplierInvoiceLineEntity` and `SupplierInvoiceAnalyticalLineEntity` always come back `null`/empty, because the underlying X3 tables don't carry that data per line:

    - `accountingDate`, `controlAccount` and `debitOrCredit` on **`SupplierInvoiceLineEntity`** — these only exist at header level in the `SupplierInvoiceLines` table. Use the invoice's own `accountingDate` and `collective` as the equivalent header-level values instead.
    - `ledgerTypeNumber` on **`SupplierInvoiceAnalyticalLineEntity`** — `AnalyticalSupplierLine` stores one row per invoice line (not one row per ledger), so there is no ledger-type value to expose yet.
    - `businessPartner` on **`SupplierInvoiceLineEntity`** — assigning a business partner per line is not implemented yet; `createSupplierInvoice` never writes this column.

    `site` on `SupplierInvoiceAnalyticalLineEntity` is the one exception: it has no column of its own either, but the resolver fills it in from the parent line's `site`.

## Filter (`SupplierInvoiceFilterInput`)

Supports filtering by a list of invoice numbers, a list of suppliers, and a line filter (`SupplierInvoiceLineFilter`).

## Create supplier invoice (`CreateSupplierInvoiceInput`)

| Field | Required | Description |
|---|---|---|
| `site` | Yes | Site associated with the invoice |
| `invoiceType` | Yes | Invoice type |
| `invoiceDate` | No | Invoice date |
| `collective` | No | Accounting collective |
| `supplierCode` | Yes | Associated supplier |
| `payToCode` | No | "Pay to" code |
| `taxRuleCode` | Yes | Tax rule |
| `sourceDocumentNumber` / `sourceDocumentDate` | No | Source document from the supplier |
| `currency` | No | Invoice currency |
| `originalInvoiceNumber` | No | Original invoice number (e.g. for credit notes) |
| `lines` | Yes | List of lines (`SupplierInvoiceLineInput`) |

Each line (`SupplierInvoiceLineInput`) supports: `account` (accounting account), `businessPartnerCode`, `amount`, `comment`, `taxCode`, and `dimensions` (dimensions associated with the line).

```graphql
mutation {
  createSupplierInvoice(
    input: {
      site: "STL01"
      invoiceType: "FAC"
      supplierCode: "F000123"
      taxRuleCode: "PT01"
      currency: "EUR"
      lines: [{ account: "622100", amount: 250.0, taxCode: "IVA23" }]
    }
  ) {
    invoiceNumber
    totalAmountIncludingTax
    lines { account amount }
  }
}
```

```graphql
query {
  getSupplierInvoice(invoiceNumber: "SI000123") {
    invoiceNumber
    invoiceDate
    supplierCode
    lines {
      account
      amount
      analyticalLines { dimension { code description } amount }
    }
  }
}
```
