# Purchase Orders (purchase-order)

**Source code:** `src/modules/purchase-order`

Creation and retrieval of purchase orders in X3, with each line's product resolved via `DataLoader`.

## Operations

| Resolver                    | Operation             | Type            | GraphQL Name             | Description                                                        |
| --------------------------- | --------------------- | --------------- | ------------------------ | ------------------------------------------------------------------ |
| `PurchaseOrderResolver`     | `createPurchaseOrder` | Mutation        | `createPurchaseOrder`    | Creates a new purchase order with its respective lines             |
| `PurchaseOrderResolver`     | `findPaginated`       | Query           | `getPurchaseOrders`      | Lists purchase orders, paginated by cursor, with filtering         |
| `PurchaseOrderLineResolver` | `getProduct`          | `@ResolveField` | `product` (on each line) | Resolves the [product](products.md) for each line via `DataLoader` |

!!! note "Line closure"
The code already provides for a `closePurchaseOrderLines` mutation (equivalent to `closeSalesOrderLines` from [sales orders](sales-order.md#close-order-lines-closesalesorderlineinput)), but it is currently commented out in `purchase-order.resolver.ts` and is not part of the published schema.

## `PurchaseOrderEntity`

| Field                                                 | Type                        | Description                                                |
| ----------------------------------------------------- | --------------------------- | ---------------------------------------------------------- |
| `purchaseOrderNumber`                                 | `ID`                        | Unique order number                                        |
| `orderDate`                                           | `Date`                      | Order date                                                 |
| `buyer`                                               | `String`                    | Responsible buyer                                          |
| `accountingStatus`                                    | `OrderAccountingStatus`     | Accounting status                                          |
| `currency`                                            | `String`                    | Currency                                                   |
| `currencyRate`                                        | `Float`                     | Applied exchange rate                                      |
| `company`                                             | `String`                    | Company                                                    |
| `purchaseSite`                                        | `String`                    | Purchase site ([Sites](sites.md))                          |
| `totalAmountExcludingTax` / `totalAmountIncludingTax` | `Float`                     | Totals excluding/including tax                             |
| `supplier`                                            | `PurchaseOrderSupplierInfo` | Supplier information                                       |
| `lines`                                               | `[PurchaseOrderLineEntity]` | Order lines (each with `product` resolved by `DataLoader`) |

## Filter (`PurchaseOrderFilterInput`)

Supports filtering by a list of order numbers, supplier code, company, date range (`from`/`to`), and _fixture_ dimension.

## Create purchase order (`CreatePurchaseOrderInput`)

| Field          | Required | Description                              |
| -------------- | -------- | ---------------------------------------- |
| `purchaseSite` | Yes      | Purchase site                            |
| `orderDate`    | No       | Order date (`YYYY-MM-DD`)                |
| `supplierCode` | Yes      | Supplier code                            |
| `buyerCode`    | No       | Buyer code                               |
| `taxRule`      | No       | Tax rule                                 |
| `currency`     | No       | Currency                                 |
| `lines`        | Yes      | List of lines (`PurchaseOrderLineInput`) |

Each line (`PurchaseOrderLineInput`) supports: `product` (SKU), `quantity`, `unitPrice`, `taxLevel`, and `dimensions` ([Dimensions](dimensions.md) specific to the line).

```graphql
mutation {
  createPurchaseOrder(
    input: {
      purchaseSite: "STL01"
      supplierCode: "F000123"
      currency: "EUR"
      lines: [{ product: "ART001", quantity: 100, unitPrice: 5.5 }]
    }
  ) {
    purchaseOrderNumber
    totalAmountIncludingTax
    lines {
      product {
        code
        descriptions
      }
      quantity
      unitPrice
    }
  }
}
```

```graphql
query {
  getPurchaseOrders(first: 10, filter: { supplierCode: "F000123" }) {
    edges {
      node {
        purchaseOrderNumber
        orderDate
        totalAmountIncludingTax
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

!!! note "Intersite/intercompany transactions"
As with sales orders, creating purchase orders may involve validation of transactions between different sites/companies — see [Business Partners](business-partners.md#business-rule-intersiteintercompany-transactions).
