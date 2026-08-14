# Tipos de dimensão (dimension-types)

**Código-fonte:** `src/modules/dimension-types`

Consulta os tipos de dimensão analítica configurados no X3 (ex.: centro de custo, projeto, campanha) — a categoria a que pertence cada valor de [dimensão](dimensions.pt.md).

## Operações

| Operação  | Tipo  | Nome GraphQL        | Descrição                                                     |
| --------- | ----- | ------------------- | ------------------------------------------------------------- |
| `findAll` | Query | `getDimensionTypes` | Devolve a lista completa de tipos de dimensão (sem paginação) |

## `DimensionTypeEntity`

| Campo         | Tipo     | Descrição                        |
| ------------- | -------- | -------------------------------- |
| `code`        | `ID`     | Código único do tipo de dimensão |
| `description` | `String` | Descrição do tipo de dimensão    |

```graphql
query {
  getDimensionTypes {
    code
    description
  }
}
```

!!! note
Ao contrário da maioria das outras listagens da API, esta query devolve diretamente um array (`[DimensionTypeEntity]`) em vez de uma ligação paginada — não aceita `first`/`after`.
