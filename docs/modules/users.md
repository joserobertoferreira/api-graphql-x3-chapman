# Users (users)

**Source code:** `src/modules/users`

Retrieves users registered in Sage X3 (e.g. to populate salesperson/buyer lists in external integrations).

## Operations

| Operation | Type | GraphQL Name | Description |
|---|---|---|---|
| `findPaginated` | Query | `getUsers` | Lists users, paginated by cursor, with an optional filter |

## `UserEntity`

| Field | Type | Description |
|---|---|---|
| `code` | `ID` | User code |
| `name` | `String` | User name |
| `email` | `String` | User email address |

## Filter (`UserFilter`)

| Field | Description |
|---|---|
| `name` | Filters by full or partial name |
| `code` | Filters by user code |
| `email` | Filters by full or partial email address |

```graphql
query {
  getUsers(first: 20, filter: { name: "Silva" }) {
    edges {
      node { code name email }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```
