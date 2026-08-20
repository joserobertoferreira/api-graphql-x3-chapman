# Faturas de fornecedor (supplier-invoice)

**Código-fonte:** `src/modules/supplier-invoice`

Criação e consulta de faturas de fornecedor no X3 (lançamento manual, incluindo linhas contabilísticas e respetivas linhas analíticas por dimensão).

## Operações

| Resolver                      | Operação                | Tipo            | Nome GraphQL                      | Descrição                                                                              |
| ----------------------------- | ----------------------- | --------------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| `SupplierInvoiceResolver`     | `createSupplierInvoice` | Mutation        | `createSupplierInvoice`           | Cria uma nova fatura de fornecedor com as respetivas linhas                            |
| `SupplierInvoiceResolver`     | `findPaginated`         | Query           | `getSupplierInvoices`             | Lista faturas de fornecedor, paginada por cursor, com filtro                           |
| `SupplierInvoiceResolver`     | `findOne`               | Query           | `getSupplierInvoice`              | Obtém uma fatura de fornecedor específica pelo número                                  |
| `SupplierInvoiceResolver`     | `getLines`              | `@ResolveField` | `lines`                           | Linhas da fatura, resolvidas via `DataLoader` (`supplierInvoiceLinesByDocumentLoader`) |
| `SupplierInvoiceLineResolver` | `getAnalyticalLines`    | `@ResolveField` | `analyticalLines` (em cada linha) | Linhas analíticas (por _ledger_/dimensão) de cada linha da fatura                      |

## `SupplierInvoiceEntity`

| Campo                                                  | Tipo                           | Descrição                                                         |
| ------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------- |
| `invoiceNumber`                                        | `ID`                           | Número único da fatura                                            |
| `category`                                             | `PurchaseInvoiceType`          | Categoria da fatura                                               |
| `site`                                                 | `String`                       | Estabelecimento associado                                         |
| `invoiceType`                                          | `String`                       | Tipo de fatura                                                    |
| `accountingDate`                                       | `Date`                         | Data contabilística                                                |
| `collective`                                           | `String`                       | Coletivo contabilístico atribuído                                 |
| `supplier`                                             | `String`                       | Código do fornecedor associado ([Fornecedores](suppliers.pt.md))  |
| `payToBusinessPartner`                                 | `String`                       | Código de "pay to"                                                |
| `taxRule`                                              | `String`                       | Regra de imposto                                                   |
| `sourceDocument` / `sourceDocumentDate`                | `String` / `Date`              | Documento de origem no fornecedor                                  |
| `dueDateBasis`                                         | `Date`                         | Base de cálculo da data de vencimento                              |
| `paymentApproval`                                      | `PaymentApprovalType`          | Tipo de aprovação de pagamento                                     |
| `currency`                                             | `String`                       | Moeda da fatura                                                    |
| `totalAmountExcludingTax` / `totalAmountIncludingTax`  | `Float`                        | Totais sem/com imposto                                             |
| `lines`                                                | `[SupplierInvoiceLineEntity]`  | Linhas contabilísticas da fatura                                   |

Cada linha (`SupplierInvoiceLineEntity`) inclui número de linha, estabelecimento, coletivo, conta, parceiro de negócio, montante sem imposto, código de imposto, montante de imposto, imposto dedutível, montante com imposto, comentário e `analyticalLines`.

Cada linha analítica (`SupplierInvoiceAnalyticalLineEntity`) inclui número de linha, número da linha analítica e [dimensões](dimensions.pt.md) (`CommonDimensionEntity`).

## Filtro (`SupplierInvoiceFilterInput`)

Suporta filtro por lista de números de fatura, lista de fornecedores e filtro por linhas (`SupplierInvoiceLineFilter`).

## Criar fatura de fornecedor (`CreateSupplierInvoiceInput`)

| Campo                          | Obrigatório | Descrição                                              |
| ------------------------------- | ----------- | ------------------------------------------------------ |
| `site`                         | Sim         | Estabelecimento associado à fatura                     |
| `invoiceType`                  | Sim         | Tipo de fatura                                         |
| `accountingDate`               | Não         | Data da fatura                                         |
| `collective`                   | Não         | Coletivo contabilístico                                |
| `supplier`                     | Sim         | Código do fornecedor associado                         |
| `payToBusinessPartner`         | Não         | Código de "pay to"                                     |
| `taxRule`                      | Sim         | Regra de imposto                                       |
| `sourceDocument` / `sourceDocumentDate` | Não | Documento de origem no fornecedor                      |
| `currency`                     | Não         | Moeda da fatura                                        |
| `originalInvoiceNumber`        | Não         | Número da fatura original (ex.: para notas de crédito) |
| `dueDateCalculationStartDate`  | Não         | Base de cálculo da data de vencimento                  |
| `paymentApproval`              | Não         | Tipo de aprovação de pagamento                          |
| `lines`                        | Sim         | Lista de linhas (`SupplierInvoiceLineInput`)           |

Cada linha (`SupplierInvoiceLineInput`) suporta: `account` (conta contabilística), `businessPartner`, `amount`, `comment`, `taxCode` e `dimensions` (dimensões associadas à linha).

```graphql
mutation {
  createSupplierInvoice(
    input: {
      site: "STL01"
      invoiceType: "FAC"
      supplier: "F000123"
      taxRule: "PT01"
      currency: "EUR"
      lines: [{ account: "622100", amount: 250.0, taxCode: "IVA23" }]
    }
  ) {
    invoiceNumber
    totalAmountIncludingTax
    lines {
      account
      lineAmountExcludingTax
    }
  }
}
```

```graphql
query {
  getSupplierInvoice(invoiceNumber: "SI000123") {
    invoiceNumber
    accountingDate
    supplier
    lines {
      account
      lineAmountExcludingTax
      analyticalLines {
        dimensions {
          fixture
          department
          location
        }
      }
    }
  }
}
```
