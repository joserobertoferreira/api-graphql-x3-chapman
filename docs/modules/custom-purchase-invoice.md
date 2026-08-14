# Custom Purchase Invoices (custom-purchase-invoice)

**Source code:** `src/modules/custom-purchase-invoice`

Queries purchase invoices through an optimized read view enriched with analytical dimensions per line — designed for reports/integrations that need to cross-reference each invoice line with its dimensions (*fixture*, broker, department, location, type, product, analysis), instead of using the generic [Purchase Invoices](purchase-invoice.md) model.

## Operations

| Operation | Type | GraphQL name | Description |
|---|---|---|---|
| `findPaginated` | Query | `customPurchaseInvoices` | Lists purchase invoices, cursor-paginated, with a filter |

### Computed fields (`@ResolveField`)

| Field | Description |
|---|---|
| `billBySupplier` | Name of the billing supplier, resolved via `DataLoader` |

## `CustomPurchaseInvoiceEntity`

| Field | Type | Description |
|---|---|---|
| `invoiceNumber` | `ID` | Unique invoice number |
| `site` / `company` | `String` | Invoice site and company |
| `invoiceType` | `String` | Invoice type |
| `category` | `String` | Purchase invoice category |
| `invoiceDate` | `Date` | Invoice date |
| `billBySupplier` | `CommonBusinessPartnerNameEntity` | Billing supplier |
| `sourceDocumentNumber` / `sourceDocumentDate` | `String` / `Date` | Source document from the supplier |
| `reference` | `String` | Internal reference |
| `currency` / `companyCurrency` | `String` | Invoice and company currency |
| `totalAmountExcludingTax` / `totalAmountExcludingTaxCompanyCurrency` | `Float` | Total excluding tax (invoice / company currency) |
| `totalAmountIncludingTax` / `totalAmountIncludingTaxCompanyCurrency` | `Float` | Total including tax (invoice / company currency) |
| `totalTaxAmount` | `Float` | Total tax amount |
| `lines` | `[CustomPurchaseInvoiceLineEntity]` | Invoice lines |

Each line (`CustomPurchaseInvoiceLineEntity`) includes line number, product and description, quantity, gross price, amounts excluding/including tax and tax amount, and the associated analytical dimensions (`CommonDimensionEntity`): `fixture`, `broker`, `department`, `location`, `type`, `product`, `analysis`.

## Filter (`CustomPurchaseInvoiceFilterInput`)

| Field | Description |
|---|---|
| `company` | Filters by company |
| `site` | Filters by site |
| `invoiceNumbers` | Filters by a list of invoice numbers |
| `supplierIds` | Filters by a list of supplier codes |
| `issueDateFrom` / `issueDateTo` | Invoice issue date range |
| `dimensionFilter` | Filters by dimension values (`CommonDimensionFilterInput`) |

```graphql
query {
  customPurchaseInvoices(first: 10, filter: { supplierIds: ["F000123"] }) {
    edges {
      node {
        invoiceNumber
        invoiceDate
        totalAmountIncludingTax
        billBySupplier { code name }
        lines {
          product
          quantity
          fixture { code description }
        }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```
