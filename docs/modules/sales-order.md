# Sales Orders (sales-order)

**Source code:** `src/modules/sales-order`

Creation and retrieval of sales orders in X3. The module groups four resolvers: the orders themselves, the product associated with each line, the order status/invoicing information, and free text (header, footer, and lines).

## Operations

| Resolver                   | Operation              | Type            | GraphQL Name             | Description                                                                |
| -------------------------- | ---------------------- | --------------- | ------------------------ | -------------------------------------------------------------------------- |
| `SalesOrderResolver`       | `createSalesOrder`     | Mutation        | `createSalesOrder`       | Creates a new sales order with its respective lines                        |
| `SalesOrderResolver`       | `closeSalesOrderLine`  | Mutation        | `closeSalesOrderLines`   | Closes one or more lines of an existing sales order                        |
| `SalesOrderResolver`       | `findPaginated`        | Query           | `getSalesOrders`         | Lists sales orders, paginated by cursor, with filtering                    |
| `SalesOrderStatusResolver` | `findPaginated`        | Query           | `getSalesOrdersStatus`   | Lists the invoicing/accounting status of sales orders, paginated by cursor |
| `SalesOrderTextResolver`   | `createSalesOrderText` | Mutation        | `createSalesOrderText`   | Sets the header, footer and/or line text of an order                       |
| `SalesOrderLineResolver`   | `getProduct`           | `@ResolveField` | `product` (on each line) | Resolves the [product](products.md) for each line via `DataLoader`         |

## `SalesOrderEntity`

| Field                                                 | Type                           | Description                                                |
| ----------------------------------------------------- | ------------------------------ | ---------------------------------------------------------- |
| `salesOrderNumber`                                    | `ID`                           | Unique order number                                        |
| `orderDate`                                           | `Date`                         | Order date                                                 |
| `orderStatus`                                         | `OrderStatus`                  | Status (`open`, `closed`)                                  |
| `invoiceStatus`                                       | `InvoiceAccountingStatus`      | Invoicing status                                           |
| `accountingStatus`                                    | `OrderAccountingStatus`        | Accounting status                                          |
| `currency`                                            | `String`                       | Currency                                                   |
| `currencyRateType`                                    | `ExchangeRateType`             | Exchange rate type                                         |
| `currencyRate`                                        | `Float`                        | Applied exchange rate                                      |
| `salesSite`                                           | `String`                       | Sales site ([Sites](sites.md))                             |
| `company`                                             | `String`                       | Company                                                    |
| `reference`                                           | `String`                       | External reference                                         |
| `shippingSite`                                        | `String`                       | Shipping site                                              |
| `taxRule`                                             | `String`                       | Tax rule                                                   |
| `paymentTerms`                                        | `String`                       | Payment terms ([Payment terms](payment-terms.md))          |
| `totalAmountExcludingTax` / `totalAmountIncludingTax` | `Float`                        | Totals excluding/including tax                             |
| `soldToCustomer`                                      | `SalesOrderSoldToCustomerInfo` | Sold-to customer information                               |
| `lines`                                               | `[SalesOrderLineEntity]`       | Order lines (each with `product` resolved by `DataLoader`) |

## Filter (`SalesOrderFilterInput`)

Supports filtering by a list of order numbers, customer code, company, date range (`from`/`to`), and _fixture_ dimension.

## Create sales order (`CreateSalesOrderInput`)

| Field                | Required | Description                           |
| -------------------- | -------- | ------------------------------------- |
| `salesSite`          | Yes      | Sales site                            |
| `orderType`          | No       | Order type                            |
| `orderDate`          | No       | Order date (`YYYY-MM-DD`)             |
| `soldToCustomerCode` | Yes      | Sold-to customer code                 |
| `reference`          | No       | External reference                    |
| `taxRule`            | No       | Tax rule                              |
| `currency`           | No       | Currency                              |
| `paymentTerms`       | No       | Payment terms                         |
| `lines`              | Yes      | List of lines (`SalesOrderLineInput`) |

Each line (`SalesOrderLineInput`) supports: `product` (SKU), `description`, `quantity`, `unitPrice`, `taxLevel`, `dimensions` ([Dimensions](dimensions.md) specific to the line), `text` and, for service lines, `serviceStartDate`/`serviceEndDate`.

```graphql
mutation {
  createSalesOrder(
    input: {
      salesSite: "STL01"
      soldToCustomerCode: "C000123"
      currency: "EUR"
      lines: [{ product: "ART001", quantity: 10, unitPrice: 19.9 }]
    }
  ) {
    salesOrderNumber
    orderStatus
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

## Close order lines (`CloseSalesOrderLineInput`)

Receives the order number and the list of line numbers to close, returning `ClosedSalesOrderEntity` with the updated status of the order and the closed lines.

```graphql
mutation {
  closeSalesOrderLines(input: { salesOrderNumber: "SO000123", lines: [1, 2] }) {
    salesOrderNumber
    orderStatus
    lines {
      lineNumber
    }
  }
}
```

## Order status (`getSalesOrdersStatus`)

Returns, for each order, the line status, invoicing status (`InvoiceStatus`), accounting status, and information about the latest issued invoice (`SalesOrderLastInvoiceInfo`, including its date).

## Order texts (`createSalesOrderText`)

Allows setting the header text (`headerText`), footer text (`footerText`) and/or text for individual lines (`lines`, specifying `lineNumber` and `text`) of an existing order (`CreateSalesOrderTextInput`).

```graphql
mutation {
  createSalesOrderText(
    input: {
      salesOrderNumber: "SO000123"
      headerText: "Urgent delivery"
      lines: [{ lineNumber: 1, text: "Handle with care" }]
    }
  ) {
    salesOrderNumber
    headerText
    lines {
      lineNumber
      text
    }
  }
}
```

!!! note "Intersite/intercompany transactions"
Creating orders may involve validation of transactions between different sites/companies — see [Business Partners](business-partners.md#business-rule-intersiteintercompany-transactions)
