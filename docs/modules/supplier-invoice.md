# Faturas de fornecedor (supplier-invoice)

**Código-fonte:** `src/modules/supplier-invoice`

Criação e consulta de faturas de fornecedor no X3 (lançamento manual, incluindo linhas contabilísticas e respetivas linhas analíticas por dimensão).

## Operações

| Resolver | Operação | Tipo | Nome GraphQL | Descrição |
|---|---|---|---|---|
| `SupplierInvoiceResolver` | `createSupplierInvoice` | Mutation | `createSupplierInvoice` | Cria uma nova fatura de fornecedor com as respetivas linhas |
| `SupplierInvoiceResolver` | `findPaginated` | Query | `getSupplierInvoices` | Lista faturas de fornecedor, paginada por cursor, com filtro |
| `SupplierInvoiceResolver` | `findOne` | Query | `getSupplierInvoice` | Obtém uma fatura de fornecedor específica pelo número |
| `SupplierInvoiceResolver` | `getLines` | `@ResolveField` | `lines` | Linhas da fatura, resolvidas via `DataLoader` (`supplierInvoiceLinesByDocumentLoader`) |
| `SupplierInvoiceLineResolver` | `getAnalyticalLines` | `@ResolveField` | `analyticalLines` (em cada linha) | Linhas analíticas (por *ledger*/dimensão) de cada linha da fatura |

## `SupplierInvoiceEntity`

| Campo | Tipo | Descrição |
|---|---|---|
| `invoiceNumber` | `ID` | Número único da fatura |
| `category` | `String` | Categoria da fatura |
| `site` | `String` | Estabelecimento associado |
| `invoiceType` | `String` | Tipo de fatura |
| `invoiceDate` | `Date` | Data da fatura |
| `collective` | `String` | Coletivo contabilístico atribuído |
| `supplierCode` | `String` | Fornecedor associado ([Fornecedores](suppliers.md)) |
| `payToCode` | `String` | Código de "pay to" |
| `taxRuleCode` | `String` | Regra de imposto |
| `sourceDocumentNumber` / `sourceDocumentDate` | `String` / `Date` | Documento de origem no fornecedor |
| `currency` | `String` | Moeda da fatura |
| `totalAmountExcludingTax` / `totalAmountIncludingTax` | `Float` | Totais sem/com imposto |
| `lines` | `[SupplierInvoiceLineEntity]` | Linhas contabilísticas da fatura |

Cada linha (`SupplierInvoiceLineEntity`) inclui número de linha, estabelecimento, empresa, data contabilística, conta, parceiro de negócio, conta do plano, conta de controlo, indicador débito/crédito (`SignByDefault`), montante sem imposto, quantidade, comentário, código de imposto e `analyticalLines`.

Cada linha analítica (`SupplierInvoiceAnalyticalLineEntity`) inclui número de linha, tipo de *ledger* (`LedgerType`), número da linha analítica, estabelecimento, [dimensão](dimensions.md) (`CommonDimensionEntity`) e montante.

## Filtro (`SupplierInvoiceFilterInput`)

Suporta filtro por lista de números de fatura, lista de fornecedores e filtro por linhas (`SupplierInvoiceLineFilter`).

## Criar fatura de fornecedor (`CreateSupplierInvoiceInput`)

| Campo | Obrigatório | Descrição |
|---|---|---|
| `site` | Sim | Estabelecimento associado à fatura |
| `invoiceType` | Sim | Tipo de fatura |
| `invoiceDate` | Não | Data da fatura |
| `collective` | Não | Coletivo contabilístico |
| `supplierCode` | Sim | Fornecedor associado |
| `payToCode` | Não | Código de "pay to" |
| `taxRuleCode` | Sim | Regra de imposto |
| `sourceDocumentNumber` / `sourceDocumentDate` | Não | Documento de origem no fornecedor |
| `currency` | Não | Moeda da fatura |
| `originalInvoiceNumber` | Não | Número da fatura original (ex.: para notas de crédito) |
| `lines` | Sim | Lista de linhas (`SupplierInvoiceLineInput`) |

Cada linha (`SupplierInvoiceLineInput`) suporta: `account` (conta contabilística), `businessPartnerCode`, `amount`, `comment`, `taxCode` e `dimensions` (dimensões associadas à linha).

```graphql
mutation {
  createSupplierInvoice(
    input: {
      site: "STL01"
      invoiceType: "FAC"
      supplierCode: "F000123"
      taxRuleCode: "PT01"
      currency: "EUR"
      lines: [{ account: "622100", amount: 250.0, taxCode: "IVA23" }]
    }
  ) {
    invoiceNumber
    totalAmountIncludingTax
    lines { account amount }
  }
}
```

```graphql
query {
  getSupplierInvoice(invoiceNumber: "SI000123") {
    invoiceNumber
    invoiceDate
    supplierCode
    lines {
      account
      amount
      analyticalLines { dimension { code description } amount }
    }
  }
}
```
