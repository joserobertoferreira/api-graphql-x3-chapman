# Financeiro (financials)

**Código-fonte:** `src/modules/financials/*`

Agrupa três submódulos independentes ligados à contabilidade do X3: lançamentos contabilísticos, lançamentos intercompany e consulta de saldos de conta.

## Lançamentos contabilísticos (journal-entry)

**Código-fonte:** `src/modules/financials/journal-entry`

| Operação | Tipo | Nome GraphQL | Descrição |
|---|---|---|---|
| `createJournalEntry` | Mutation | `createJournalEntry` | Cria um novo lançamento contabilístico com as respetivas linhas |
| `getJournalEntryStatus` | Query | `getJournalEntryStatus` | Consulta o estado de um lançamento pelo respetivo número |

### `JournalEntryEntity`

| Campo | Tipo | Descrição |
|---|---|---|
| `journalEntryType` | `ID` | Tipo de lançamento |
| `journalEntryNumber` | `ID` | Número do lançamento |
| `company` / `site` | `String` | Empresa e estabelecimento |
| `journalCode` | `String` | Código do diário |
| `accountingDate` | `Date` | Data contabilística |
| `status` | `AccountingJournalStatus` | Estado do lançamento |
| `transaction` | `String` | Transação do lançamento |
| `currency` | `String` | Moeda da transação |
| `lines` | `[JournalEntryLineEntity]` | Linhas do lançamento |

`JournalEntryStatusEntity` (resposta de `getJournalEntryStatus`) devolve `journalEntryType`, `journalEntryNumber` e `status`.

### Criar lançamento (`CreateJournalEntryInput`)

| Campo | Obrigatório | Descrição |
|---|---|---|
| `site` | Sim | Estabelecimento |
| `documentType` | Sim | Tipo de documento |
| `accountingDate` / `entryDate` / `dueDate` / `valueDate` | Não | Datas do lançamento |
| `sourceDocument` / `sourceDocumentDate` | Não | Documento de origem |
| `vatDate` | Não | Data de IVA |
| `reference` | Não | Referência |
| `description` | Sim | Descrição por omissão do lançamento |
| `rateType` / `rateDate` | Não | Tipo e data da taxa de câmbio ([Taxas de câmbio](currency-rate.md)) |
| `sourceCurrency` | Sim | Moeda de origem |
| `isReversal` / `reversingDate` | Não | Indicação e data de estorno |
| `sourceFile` | Não | Ficheiro de origem |
| `lines` | Sim | Linhas de detalhe (`JournalEntryLineInput`) |

```graphql
mutation {
  createJournalEntry(
    input: {
      site: "STL01"
      documentType: "OD"
      description: "Regularização mensal"
      sourceCurrency: "EUR"
      lines: [
        { account: "622100", debitAmount: 100.0 }
        { account: "531000", creditAmount: 100.0 }
      ]
    }
  ) {
    journalEntryNumber
    status
  }
}
```

```graphql
query {
  getJournalEntryStatus(input: { journalEntryNumber: "JE000123" }) {
    journalEntryNumber
    status
  }
}
```

## Lançamentos intercompany (intercompany-journal-entry)

**Código-fonte:** `src/modules/financials/intercompany-journal-entry`

| Operação | Tipo | Nome GraphQL | Descrição |
|---|---|---|---|
| `createIntercompanyJournalEntry` | Mutation | `createIntercompanyJournalEntry` | Cria um lançamento contabilístico que abrange múltiplas empresas do grupo |

### `IntercompanyJournalEntryEntity`

| Campo | Tipo | Descrição |
|---|---|---|
| `site` / `company` | `String` | Estabelecimento e empresa |
| `journalEntryType` / `journalEntryNumber` | `ID` | Identificação do lançamento |
| `description` | `String` | Descrição |
| `status` | `AccountingJournalStatus` | Estado do lançamento |
| `accountingDate` | `Date` | Data contabilística |
| `journalCode` | `String` | Código do diário |
| `rateType` / `rateDate` | `ExchangeRateType` / `Date` | Tipo e data da taxa de câmbio |
| `currency` | `String` | Moeda da transação |
| `lines` | `[IntercompanyJournalEntryLineEntity]` | Linhas do lançamento |

Cada linha (`IntercompanyJournalEntryLineEntity`) inclui: `site`, `company`, `currency`, `account`, `businessPartnerCode`, indicador débito/crédito (`SignByDefault`), unidade não financeira, `quantity`, `description`, `taxCode` e [dimensão](dimensions.md) associada.

### Criar lançamento intercompany (`CreateIntercompanyJournalEntryInput`)

| Campo | Obrigatório | Descrição |
|---|---|---|
| `site` | Sim | Estabelecimento de origem |
| `documentType` | Sim | Tipo de documento |
| `accountingDate` | Não | Data contabilística |
| `description` | Sim | Descrição por omissão |
| `rateType` / `rateDate` | Não | Tipo e data da taxa de câmbio |
| `sourceCurrency` | Sim | Moeda de origem |
| `lines` | Sim | Linhas de detalhe (`IntercompanyJournalEntryLineInput`, com `site`, conta, parceiro de negócio, montantes de débito/crédito, quantidade, descrição, imposto e dimensões) |

```graphql
mutation {
  createIntercompanyJournalEntry(
    input: {
      site: "STL01"
      documentType: "IC"
      description: "Refação de custos intercompany"
      sourceCurrency: "EUR"
      lines: [
        { site: "STL01", account: "622100", debitAmount: 500.0 }
        { site: "STL02", account: "471000", creditAmount: 500.0 }
      ]
    }
  ) {
    journalEntryNumber
    status
  }
}
```

## Saldos de conta (account-balances)

**Código-fonte:** `src/modules/financials/account-balances`

| Operação | Tipo | Nome GraphQL | Descrição |
|---|---|---|---|
| `findPaginated` | Query | `getAccountBalances` | Lista saldos de conta, paginada por cursor, com filtro. Valida o ano fiscal do filtro antes de consultar (`AccountBalanceValidationService`) |

### `AccountBalanceEntity`

| Campo | Tipo | Descrição |
|---|---|---|
| `site` | `String` | Estabelecimento |
| `fiscalYear` | `Int` | Ano fiscal |
| `ledgerType` | `LedgerType` | Tipo de *ledger* |
| `ledger` | `String` | Código do *ledger* |
| `ledgerCurrency` | `String` | Moeda do *ledger* |
| `account` | `String` | Conta |
| `businessPartner` | `String` | Parceiro de negócio associado |
| `dimensions` | `[AccountBalanceDimensionsEntity]` | Dimensões associadas (`fixture`, `broker`, `department`, `location`, `type`, `product`, `analysis`) |
| `amounts` | `[AccountBalanceAmountsEntity]` | Montantes por período: débito/crédito em moeda do *ledger* e em moeda alternativa |

### Filtro (`AccountBalanceFilter`)

Suporta filtro por estabelecimento, *ledger*, ano fiscal, conta e pelas dimensões `fixture`, `broker`, `department`, `location`, `type`, `product` e `analysis`.

```graphql
query {
  getAccountBalances(
    first: 20
    filter: { site: "STL01", fiscalYear: 2026, account: "622100" }
  ) {
    edges {
      node {
        account
        ledger
        amounts { debitLedgerCurrency creditLedgerCurrency currency }
      }
    }
    pageInfo { hasNextPage endCursor }
    totalCount
  }
}
```

!!! note "Dimensões analíticas partilhadas"
    Os módulos financeiros partilham o mesmo conjunto de dimensões analíticas (`fixture`, `broker`, `department`, `location`, `type`, `product`, `analysis`) usado em [Faturas de compra personalizadas](custom-purchase-invoice.md) e nas linhas analíticas de [Faturas de fornecedor](supplier-invoice.md), permitindo cruzar dados entre estes módulos.
