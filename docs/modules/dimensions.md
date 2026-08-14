# Dimensions (dimensions)

**Source code:** `src/modules/dimensions`

Dimensions are the implementation of X3 *analytical dimensions* (configurable analytical tags, associated with a [dimension type](dimension-types.md)) — used to classify accounting entries and document lines (orders, invoices) for reporting purposes. Depending on the dimension type, the created value may contain additional specialized data (`general`, `service`, or `flight`).

## Operations

| Operation | Type | GraphQL name | Description |
|---|---|---|---|
| `createDimension` | Mutation | `createDimension` | Creates a new dimension value associated with a dimension type |
| `findPaginated` | Query | `getDimensions` | Lists dimension values, cursor-paginated, with a filter |

### Computed fields (`@ResolveField`)

| Field | Description |
|---|---|
| `general` | Builds the "general" dimension details (active status, company/site/group, validity dates, fixed customer, associated dimensions), resolving the associated customer via `DataLoader` |

## `DimensionEntity`

| Field | Type | Description |
|---|---|---|
| `dimensionType` | `String` | Dimension type (see [Dimension Types](dimension-types.md)) |
| `dimension` | `String` | Dimension value/code |
| `additionalInformation` | `String` | Additional information |
| `shortDescription` | `String` | Short description |
| `pioneerReference` | `String` | Associated Pioneer reference |
| `general` | `GeneralDimensionEntity` | General details (see below) |
| `service` | `ServiceDimensionEntity` | Service details (start/end dates, salesperson) |
| `flight` | `FlightDimensionEntity` | Flight details (reference, date, origin, destination) |

`GeneralDimensionEntity` includes: `isActive`, `companySiteGroup`, `fixtureCustomer` (associated customer code and name), `validFrom`, `validUntil`, and `otherDimensions` (list of type/value pairs from other related dimensions).

## Filter (`DimensionFilterInput`)

| Field | Required | Description |
|---|---|---|
| `dimensionType` | Yes | Dimension type to filter |
| `dimension` | No | Dimension code |
| `isActive` | No | Active/inactive status |
| `additionalInformation` | No | Search text in additional information |
| `companySiteGroup` | No | Company/site/group |
| `pioneerReference` | No | Pioneer reference |
| `fixtureCustomerCode` | No | Fixed customer code |
| `brokerEmail` | No | Broker email |

## Create dimension (`CreateDimensionInput`)

| Field | Required | Description |
|---|---|---|
| `dimensionType` | Yes | Dimension type |
| `dimension` | Yes | Code of the new dimension value |
| `additionalInformation` | No | Additional information |
| `shortTitle` | No | Short title |
| `pioneerReference` | No | Pioneer reference |
| `general` | No | General details (`GeneralDimensionInput`): company/site/group, validity dates, fixed customer, broker email, associated dimensions |
| `service` | No | Service details (`ServiceDimensionInput`): start/end dates, salesperson |
| `flight` | No | Flight details (`FlightDimensionInput`): reference, date, origin, destination |

```graphql
mutation {
  createDimension(
    input: {
      dimensionType: "PRJ"
      dimension: "PRJ001"
      shortTitle: "Projeto Exemplo"
      general: { isActive: true, validFrom: "2026-01-01" }
    }
  ) {
    dimensionType
    dimension
    general { isActive validFrom }
  }
}
```

```graphql
query {
  getDimensions(first: 10, filter: { dimensionType: "PRJ" }) {
    edges {
      node { dimensionType dimension shortDescription }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```
