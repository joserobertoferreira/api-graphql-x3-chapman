# Sites

**Source code:** `src/modules/sites`

Retrieves X3 operational sites (units where sales, purchases, storage, etc. take place), used as a reference by virtually all transactional documents (orders, invoices, accounting entries).

## Operations

| Operation | Type | GraphQL Name | Description |
|---|---|---|---|
| `findPaginated` | Query | `getSites` | Lists sites, paginated by cursor, with filtering |

### Calculated fields (`@ResolveField`)

| Field | Description |
|---|---|
| `addresses` | List of addresses associated with the site, resolved via `DataLoader` ([Addresses](addresses.md)) |

## `SiteEntity`

| Field | Type | Description |
|---|---|---|
| `siteCode` | `String` | Unique site code |
| `name` | `String` | Full site name/designation |
| `shortTitle` | `String` | Short title |
| `legalCompany` | `String` | Code of the legal company to which the site belongs ([Companies](companies.md)) |
| `taxIdNumber` | `String` | Site tax identification number |
| `addresses` | `[AddressEntity]` | Associated addresses |

## Filter (`SiteFilterInput`)

Supports filtering by code, name (partial), short title (partial), legal company, list of countries, and tax identification number.

```graphql
query {
  getSites(first: 10, filter: { legalCompany: "CHP" }) {
    edges {
      node {
        siteCode
        name
        legalCompany
        addresses { code city country }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

!!! tip "Used by other modules"
    The `siteCode` is referenced as the source argument (`site`) when creating [sales orders](sales-order.md), [purchase orders](purchase-order.md), [supplier invoices](supplier-invoice.md), and [accounting entries](financials.md), and is also the basis for validating *intersite*/*intercompany* transactions described in [Business Partners](business-partners.md).
