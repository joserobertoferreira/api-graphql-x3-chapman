# Suppliers (suppliers)

**Source code:** `src/modules/suppliers`

Mirrors the [Customers](customers.md) module, but for suppliers. `SupplierEntity` extends the supplier-specific data with shared information from the underlying business partner (see [Business Partners](business-partners.md)) and its associated addresses.

## Operations

| Operation | Type | GraphQL Name | Description |
|---|---|---|---|
| `findPaginated` | Query | `getSuppliers` | Lists suppliers, paginated by cursor, with optional filters |
| `createSupplier` | Mutation | `createSupplier` | Creates a new supplier, including the default address |

### Calculated fields (`@ResolveField`)

| Field | Description |
|---|---|
| `europeanUnionVatNumber` | Resolved via `DataLoader` from the business partner associated with the supplier |
| `addresses` | List of addresses associated with the supplier, resolved via `DataLoader` ([Addresses](addresses.md)) |

## `SupplierEntity`

| Field | Type | Description |
|---|---|---|
| `supplierCode` | `ID` | Supplier code |
| `category` | `String` | Supplier category |
| `supplierName` | `String` | Supplier name |
| `shortName` | `String` | Short name |
| `isActive` | `Boolean` | Indicates whether the supplier is active |
| `defaultAddressCode` | `String` | Default address code |
| `country` | `String` | Country |
| `europeanUnionVatNumber` | `String` | European Union VAT number |
| `crmId` | `String` | CRM identifier |
| `addresses` | `[AddressEntity]` | Associated addresses |

## Filter (`SupplierFilter`)

Supports filtering by a list of codes, name (partial), European VAT number, company registration number, language, currency, country (code or name), city, and postcode.

## Create supplier (`CreateSupplierInput`)

| Field | Required | Description |
|---|---|---|
| `category` | Yes | Supplier category (max. 5 characters) |
| `supplierCode` | No | Code for the new supplier; if omitted, it is generated automatically by X3 |
| `name` | Yes | Supplier name (max. 75 characters) |
| `shortName` | No | Short name (max. 10 characters) |
| `europeanUnionVatNumber` | No | European VAT number (max. 20 characters) |
| `language` | No | Preferred language (max. 3 characters, normalised to uppercase) |
| `defaultAddress` | Yes | Supplier's default address ([`CreateAddressInput`](addresses.md#createaddressinput)) |

```graphql
mutation {
  createSupplier(
    input: {
      category: "NAC"
      name: "Example Supplier Ltd"
      europeanUnionVatNumber: "PT987654321"
      defaultAddress: {
        code: "HEAD"
        addressLine1: "Avenida Central, 50"
        city: "PORTO"
        country: "PT"
      }
    }
  ) {
    supplierCode
    supplierName
    addresses { code city country }
  }
}
```

```graphql
query {
  getSuppliers(first: 10, filter: { name: "Example", country: "PT" }) {
    edges {
      node {
        supplierCode
        supplierName
        europeanUnionVatNumber
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```
