# Customers (customers)

**Source code:** `src/modules/customers`

Queries and creates X3 customers. The `CustomerEntity` extends customer-specific data with shared information from the underlying business partner (see [Business Partners](business-partners.md)) and its associated addresses.

## Operations

| Operation | Type | GraphQL name | Description |
|---|---|---|---|
| `findPaginated` | Query | `getCustomers` | Lists customers, cursor-paginated, with optional filters |
| `createCustomer` | Mutation | `createCustomer` | Creates a new customer, including the default address |

### Computed fields (`@ResolveField`)

| Field | Description |
|---|---|
| `europeanUnionVatNumber` | Resolved via `DataLoader` from the business partner associated with the customer |
| `addresses` | List of addresses associated with the customer, resolved via `DataLoader` ([Addresses](addresses.md)) |

## `CustomerEntity`

| Field | Type | Description |
|---|---|---|
| `customerCode` | `ID` | Customer code |
| `category` | `String` | Customer category |
| `customerName` | `String` | Customer name |
| `shortName` | `String` | Short name |
| `isActive` | `Boolean` | Indicates whether the customer is active |
| `customerCurrency` | `String` | Customer currency |
| `defaultAddressCode` | `String` | Default address code |
| `country` | `String` | Country |
| `europeanUnionVatNumber` | `String` | Intra-community VAT number |
| `crmId` | `String` | CRM identifier |
| `addresses` | `[AddressEntity]` | Associated addresses |

## Filter (`CustomerFilter`)

Supports filtering by a list of codes, name (partial), European VAT number, commercial registration number, language, currency, country (code or name), city, and postal code.

## Create customer (`CreateCustomerInput`)

| Field | Required | Description |
|---|---|---|
| `category` | Yes | Customer category (max. 5 characters) |
| `customerCode` | No | New customer code; if omitted, it is generated automatically by X3 |
| `name` | Yes | Customer name (max. 75 characters) |
| `shortName` | No | Short name (max. 10 characters) |
| `europeanUnionVatNumber` | No | European VAT number (max. 20 characters) |
| `language` | No | Preferred language (max. 3 characters, normalized to uppercase) |
| `defaultAddress` | Yes | Customer default address ([`CreateAddressInput`](addresses.md#createaddressinput)) |

```graphql
mutation {
  createCustomer(
    input: {
      category: "NAC"
      name: "Cliente Exemplo, Lda"
      europeanUnionVatNumber: "PT123456789"
      defaultAddress: {
        code: "SEDE"
        addressLine1: "Rua Principal, 100"
        city: "LISBOA"
        country: "PT"
      }
    }
  ) {
    customerCode
    customerName
    addresses { code city country }
  }
}
```

```graphql
query {
  getCustomers(first: 10, filter: { name: "Exemplo", country: "PT" }) {
    edges {
      node {
        customerCode
        customerName
        europeanUnionVatNumber
        addresses { code addressLine1 city }
      }
    }
    pageInfo { hasNextPage endCursor }
    totalCount
  }
}
```
