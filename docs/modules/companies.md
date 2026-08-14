# Companies (companies)

**Source code:** `src/modules/companies`

Queries the legal companies (legal entities/holdings) configured in X3.

## Operations

| Operation | Type | GraphQL name | Description |
|---|---|---|---|
| `findPaginated` | Query | `getCompanies` | Lists companies, cursor-paginated, with optional filters |

### Computed fields (`@ResolveField`)

| Field | Description |
|---|---|
| `addresses` | List of addresses associated with the company, resolved via `DataLoader` ([Addresses](addresses.md)) |

## `CompanyEntity`

| Field | Type | Description |
|---|---|---|
| `company` | `String` | Unique company code |
| `name` | `String` | Full company name/designation |
| `shortTitle` | `String` | Short title |
| `legislation` | `String` | Company legislation |
| `siren` | `String` | SIREN (French legal identifier, when applicable) |
| `identificationNumber` | `String` | Unique identification number |
| `europeanUnionVatNumber` | `String` | Intra-community VAT number |
| `addresses` | `[AddressEntity]` | Associated addresses |

## Filter (`CompanyFilterInput`)

Supports filtering by code, name (partial), short title (partial), list of legislations, list of countries, SIREN, identification number, and EU VAT number.

```graphql
query {
  getCompanies(first: 5, filter: { name: "Chapman" }) {
    edges {
      node {
        company
        name
        europeanUnionVatNumber
        addresses { code city country }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

!!! note "Relationship with sites"
    The `sites` field on the company entity and its corresponding `ResolveField` are implemented in the source code but are currently commented out/disabled — the relationship between the company and [sites](sites.md) is not exposed in the public schema at this time.
