# Dimension Types (dimension-types)

**Source code:** `src/modules/dimension-types`

Queries the analytical dimension types configured in X3 (e.g. cost center, project, campaign) — the category to which each [dimension](dimensions.md) value belongs.

## Operations

| Operation | Type | GraphQL name | Description |
|---|---|---|---|
| `findAll` | Query | `getDimensionTypes` | Returns the complete list of dimension types (without pagination) |

## `DimensionTypeEntity`

| Field | Type | Description |
|---|---|---|
| `code` | `ID` | Unique dimension type code |
| `description` | `String` | Dimension type description |

```graphql
query {
  getDimensionTypes {
    code
    description
  }
}
```

!!! note
    Unlike most other API listings, this query returns an array (`[DimensionTypeEntity]`) directly instead of a paginated connection — it does not accept `first`/`after`.
