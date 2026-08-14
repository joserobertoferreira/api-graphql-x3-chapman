# Payment Terms (payment-terms)

**Source code:** `src/modules/payment-terms`

Queries the payment terms configured in X3, used for example in [sales orders](sales-order.md#create-sales-order-createsalesorderinput) and other commercial documents.

## Operations

| Operation | Type | GraphQL name | Description |
|---|---|---|---|
| `findPaginated` | Query | `getPaymentTerms` | Lists payment terms, cursor-paginated, with a filter |

## `PaymentTermEntity`

| Field | Type | Description |
|---|---|---|
| `code` | `ID` | Unique payment term code |
| `description` | `String` | Description |
| `legislation` | `String` | Associated legislation |

## Filter (`PaymentTermFilterInput`)

Supports filtering by code, description text, and legislation.

```graphql
query {
  getPaymentTerms(first: 20, filter: { legislation: "PT" }) {
    edges {
      node { code description legislation }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```
