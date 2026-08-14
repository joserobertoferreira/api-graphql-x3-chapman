# Utilizadores (users)

**Código-fonte:** `src/modules/users`

Consulta os utilizadores registados no Sage X3 (ex.: para preencher listas de vendedores/compradores em integrações externas).

## Operações

| Operação | Tipo | Nome GraphQL | Descrição |
|---|---|---|---|
| `findPaginated` | Query | `getUsers` | Lista utilizadores, paginada por cursor, com filtro opcional |

## `UserEntity`

| Campo | Tipo | Descrição |
|---|---|---|
| `code` | `ID` | Código do utilizador |
| `name` | `String` | Nome do utilizador |
| `email` | `String` | Email do utilizador |

## Filtro (`UserFilter`)

| Campo | Descrição |
|---|---|
| `name` | Filtra por nome completo ou parcial |
| `code` | Filtra por código de utilizador |
| `email` | Filtra por email completo ou parcial |

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
