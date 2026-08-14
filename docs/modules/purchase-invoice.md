# Purchase Invoices (purchase-invoice)

**Source code:** `src/modules/purchase-invoice`

!!! warning "Module currently disabled"
    The `PurchaseInvoiceModule` is implemented in the source code, but is **commented out** in `src/app.module.ts` (`// PurchaseInvoiceModule`). This means that, in the running application, the operations below **are not available in the GraphQL schema** until the module is re-enabled. For the currently active equivalent functionality, see [Custom Purchase Invoices](custom-purchase-invoice.md) and [Supplier Invoices](supplier-invoice.md).

## Operations (when active)

| Operation | Type | GraphQL Name | Description |
|---|---|---|---|
| `findPaginated` | Query | `getPurchaseInvoices` | Lists purchase invoices, paginated by cursor, with filtering |

### Calculated fields (`@ResolveField`)

| Field | Description |
|---|---|
| `lines` | Invoice lines, resolved via `DataLoader` (`invoiceLinesByInvoiceNumberLoader`) |

## `PurchaseInvoiceEntity`

Includes, among others, the `PurchaseInvoiceControlsEntity` blocks:

- **Source** (`PurchaseInvoiceSourceInfoEntity`): supplier's original document date and number, "pay to" code, currency, exchange rate, and original invoice number.
- **Payment** (`PurchaseInvoicePaymentInfoEntity`): internal reference, base due date, payment terms, discount code, tax rule, service dates, and VCS number.
- **Comments** (`PurchaseInvoiceCommentsInfoEntity`): list of invoice comment texts.
- **Amounts** (`PurchaseInvoiceAmountInfoEntity`): total excluding tax, tax, total, invoice status, and reconciliation (*matching*) status.

`PurchaseInvoiceLineEntity` includes line number, description, quantity, gross/net price, consolidated tax codes, and the associated [product](products.md).
