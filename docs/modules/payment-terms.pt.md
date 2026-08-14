# Condições de pagamento (payment-terms)

**Código-fonte:** `src/modules/payment-terms`

Consulta as condições de pagamento configuradas no X3, usadas por exemplo nas [encomendas de venda](sales-order.pt.md#criar-encomenda-de-venda-createsalesorderinput) e noutros documentos comerciais.

## Operações

| Operação        | Tipo  | Nome GraphQL      | Descrição                                                     |
| --------------- | ----- | ----------------- | ------------------------------------------------------------- |
| `findPaginated` | Query | `getPaymentTerms` | Lista condições de pagamento, paginada por cursor, com filtro |

## `PaymentTermEntity`

| Campo         | Tipo     | Descrição                             |
| ------------- | -------- | ------------------------------------- |
| `code`        | `ID`     | Código único da condição de pagamento |
| `description` | `String` | Descrição                             |
| `legislation` | `String` | Legislação associada                  |

## Filtro (`PaymentTermFilterInput`)

Suporta filtro por código, texto de descrição e legislação.

```graphql
query {
  getPaymentTerms(first: 20, filter: { legislation: "PT" }) {
    edges {
      node {
        code
        description
        legislation
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```
