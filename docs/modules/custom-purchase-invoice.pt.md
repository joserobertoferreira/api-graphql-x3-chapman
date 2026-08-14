# Faturas de compra personalizadas (custom-purchase-invoice)

**Código-fonte:** `src/modules/custom-purchase-invoice`

Consulta as faturas de compra através de uma vista de leitura otimizada e enriquecida com dimensões analíticas por linha — pensada para relatórios/integrações que precisam de cruzar cada linha de fatura com as suas dimensões (_fixture_, corretor, departamento, localização, tipo, produto, análise), em vez do modelo genérico de [Faturas de compra](purchase-invoice.pt.md).

## Operações

| Operação        | Tipo  | Nome GraphQL             | Descrição                                                |
| --------------- | ----- | ------------------------ | -------------------------------------------------------- |
| `findPaginated` | Query | `customPurchaseInvoices` | Lista faturas de compra, paginada por cursor, com filtro |

### Campos calculados (`@ResolveField`)

| Campo            | Descrição                                                   |
| ---------------- | ----------------------------------------------------------- |
| `billBySupplier` | Nome do fornecedor de faturação, resolvido via `DataLoader` |

## `CustomPurchaseInvoiceEntity`

| Campo                                                                | Tipo                                | Descrição                                        |
| -------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------ |
| `invoiceNumber`                                                      | `ID`                                | Número único da fatura                           |
| `site` / `company`                                                   | `String`                            | Estabelecimento e empresa da fatura              |
| `invoiceType`                                                        | `String`                            | Tipo de fatura                                   |
| `category`                                                           | `String`                            | Categoria da fatura de compra                    |
| `invoiceDate`                                                        | `Date`                              | Data da fatura                                   |
| `billBySupplier`                                                     | `CommonBusinessPartnerNameEntity`   | Fornecedor de faturação                          |
| `sourceDocumentNumber` / `sourceDocumentDate`                        | `String` / `Date`                   | Documento de origem no fornecedor                |
| `reference`                                                          | `String`                            | Referência interna                               |
| `currency` / `companyCurrency`                                       | `String`                            | Moeda da fatura e da empresa                     |
| `totalAmountExcludingTax` / `totalAmountExcludingTaxCompanyCurrency` | `Float`                             | Total sem imposto (moeda da fatura / da empresa) |
| `totalAmountIncludingTax` / `totalAmountIncludingTaxCompanyCurrency` | `Float`                             | Total com imposto (moeda da fatura / da empresa) |
| `totalTaxAmount`                                                     | `Float`                             | Total de imposto                                 |
| `lines`                                                              | `[CustomPurchaseInvoiceLineEntity]` | Linhas da fatura                                 |

Cada linha (`CustomPurchaseInvoiceLineEntity`) inclui número de linha, produto e descrição, quantidade, preço bruto, montantes sem/com imposto e de imposto, e as dimensões analíticas associadas (`CommonDimensionEntity`): `fixture`, `broker`, `department`, `location`, `type`, `product`, `analysis`.

## Filtro (`CustomPurchaseInvoiceFilterInput`)

| Campo                           | Descrição                                                     |
| ------------------------------- | ------------------------------------------------------------- |
| `company`                       | Filtra por empresa                                            |
| `site`                          | Filtra por estabelecimento                                    |
| `invoiceNumbers`                | Filtra por lista de números de fatura                         |
| `supplierIds`                   | Filtra por lista de códigos de fornecedor                     |
| `issueDateFrom` / `issueDateTo` | Intervalo de data de emissão                                  |
| `dimensionFilter`               | Filtra por valores de dimensão (`CommonDimensionFilterInput`) |

```graphql
query {
  customPurchaseInvoices(first: 10, filter: { supplierIds: ["F000123"] }) {
    edges {
      node {
        invoiceNumber
        invoiceDate
        totalAmountIncludingTax
        billBySupplier {
          code
          name
        }
        lines {
          product
          quantity
          fixture {
            code
            description
          }
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
