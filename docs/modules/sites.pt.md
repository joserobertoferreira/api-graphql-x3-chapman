# Estabelecimentos (sites)

**Código-fonte:** `src/modules/sites`

Consulta os estabelecimentos/sites operacionais do X3 (unidades onde ocorrem vendas, compras, armazenamento, etc.), usados como referência por praticamente todos os documentos transacionais (encomendas, faturas, lançamentos contabilísticos).

## Operações

| Operação        | Tipo  | Nome GraphQL | Descrição                                               |
| --------------- | ----- | ------------ | ------------------------------------------------------- |
| `findPaginated` | Query | `getSites`   | Lista estabelecimentos, paginada por cursor, com filtro |

### Campos calculados (`@ResolveField`)

| Campo       | Descrição                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| `addresses` | Lista de moradas associadas ao estabelecimento, resolvida via `DataLoader` ([Moradas](addresses.pt.md)) |

## `SiteEntity`

| Campo          | Tipo              | Descrição                                                                              |
| -------------- | ----------------- | -------------------------------------------------------------------------------------- |
| `siteCode`     | `String`          | Código único do estabelecimento                                                        |
| `name`         | `String`          | Nome/designação alargada do estabelecimento                                            |
| `shortTitle`   | `String`          | Título abreviado                                                                       |
| `legalCompany` | `String`          | Código da empresa legal a que o estabelecimento pertence ([Empresas](companies.pt.md)) |
| `taxIdNumber`  | `String`          | Número de identificação fiscal do estabelecimento                                      |
| `addresses`    | `[AddressEntity]` | Moradas associadas                                                                     |

## Filtro (`SiteFilterInput`)

Suporta filtro por código, nome (parcial), título abreviado (parcial), empresa legal, lista de países e número de identificação fiscal.

```graphql
query {
  getSites(first: 10, filter: { legalCompany: "CHP" }) {
    edges {
      node {
        siteCode
        name
        legalCompany
        addresses {
          code
          city
          country
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

!!! tip "Usado noutros módulos"
O `siteCode` é referenciado como argumento de origem (`site`) na criação de [encomendas de venda](sales-order.pt.md), [encomendas de compra](purchase-order.pt.md), [faturas de fornecedor](supplier-invoice.pt.md) e [lançamentos contabilísticos](financials.pt.md), e é também a base da validação de transações _intersite_/_intercompany_ descrita em [Parceiros de negócio](business-partners.pt.md).
