# Financials (financials)

**Source code:** `src/modules/financials/*`

Groups three independent submodules related to X3 accounting: journal entries, intercompany journal entries, and account balance queries.

## Journal entries (journal-entry)

**Source code:** `src/modules/financials/journal-entry`

| Operation | Type | GraphQL name | Description |
|---|---|---|---|
| `createJournalEntry` | Mutation | `createJournalEntry` | Creates a new journal entry with its corresponding lines |
| `getJournalEntryStatus` | Query | `getJournalEntryStatus` | Retrieves the status of a journal entry by its number |

### `JournalEntryEntity`

| Field | Type | Description |
|---|---|---|
| `journalEntryType` | `ID` | Journal entry type |
| `journalEntryNumber` | `ID` | Journal entry number |
| `company` / `site` | `String` | Company and site |
| `journalCode` | `String` | Journal code |
| `accountingDate` | `Date` | Accounting date |
| `status` | `AccountingJournalStatus` | Journal entry status |
| `transaction` | `String` | Journal entry transaction |
| `currency` | `String` | Transaction currency |
| `lines` | `[JournalEntryLineEntity]` | Journal entry lines |

`JournalEntryStatusEntity` (response from `getJournalEntryStatus`) returns `journalEntryType`, `journalEntryNumber`, and `status`.

### Create journal entry (`CreateJournalEntryInput`)

| Field | Required | Description |
|---|---|---|
| `site` | Yes | Site |
| `documentType` | Yes | Document type |
| `accountingDate` / `entryDate` / `dueDate` / `valueDate` | No | Journal entry dates |
| `sourceDocument` / `sourceDocumentDate` | No | Source document |
| `vatDate` | No | VAT date |
| `reference` | No | Reference |
| `description` | Yes | Default journal entry description |
| `rateType` / `rateDate` | No | Exchange rate type and date ([Exchange Rates](currency-rate.md)) |
| `sourceCurrency` | Yes | Source currency |
| `isReversal` / `reversingDate` | No | Reversal indicator and date |
| `sourceFile` | No | Source file |
| `lines` | Yes | Detail lines (`JournalEntryLineInput`) |

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

## Intercompany journal entries (intercompany-journal-entry)

**Source code:** `src/modules/financials/intercompany-journal-entry`

| Operation | Type | GraphQL name | Description |
|---|---|---|---|
| `createIntercompanyJournalEntry` | Mutation | `createIntercompanyJournalEntry` | Creates a journal entry spanning multiple companies within the group |

### `IntercompanyJournalEntryEntity`

| Field | Type | Description |
|---|---|---|
| `site` / `company` | `String` | Site and company |
| `journalEntryType` / `journalEntryNumber` | `ID` | Journal entry identification |
| `description` | `String` | Description |
| `status` | `AccountingJournalStatus` | Journal entry status |
| `accountingDate` | `Date` | Accounting date |
| `journalCode` | `String` | Journal code |
| `rateType` / `rateDate` | `ExchangeRateType` / `Date` | Exchange rate type and date |
| `currency` | `String` | Transaction currency |
| `lines` | `[IntercompanyJournalEntryLineEntity]` | Journal entry lines |

Each line (`IntercompanyJournalEntryLineEntity`) includes: `site`, `company`, `currency`, `account`, `businessPartnerCode`, debit/credit indicator (`SignByDefault`), non-financial unit, `quantity`, `description`, `taxCode`, and the associated [dimension](dimensions.md).

### Create intercompany journal entry (`CreateIntercompanyJournalEntryInput`)

| Field | Required | Description |
|---|---|---|
| `site` | Yes | Originating site |
| `documentType` | Yes | Document type |
| `accountingDate` | No | Accounting date |
| `description` | Yes | Default description |
| `rateType` / `rateDate` | No | Exchange rate type and date |
| `sourceCurrency` | Yes | Source currency |
| `lines` | Yes | Detail lines (`IntercompanyJournalEntryLineInput`, with site, account, business partner, debit/credit amounts, quantity, description, tax, and dimensions) |

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

## Account balances (account-balances)

**Source code:** `src/modules/financials/account-balances`

| Operation | Type | GraphQL name | Description |
|---|---|---|---|
| `findPaginated` | Query | `getAccountBalances` | Lists account balances, cursor-paginated, with a filter. Validates the fiscal year in the filter before querying (`AccountBalanceValidationService`) |

### `AccountBalanceEntity`

| Field | Type | Description |
|---|---|---|
| `site` | `String` | Site |
| `fiscalYear` | `Int` | Fiscal year |
| `ledgerType` | `LedgerType` | Ledger type |
| `ledger` | `String` | Ledger code |
| `ledgerCurrency` | `String` | Ledger currency |
| `account` | `String` | Account |
| `businessPartner` | `String` | Associated business partner |
| `dimensions` | `[AccountBalanceDimensionsEntity]` | Associated dimensions (`fixture`, `broker`, `department`, `location`, `type`, `product`, `analysis`) |
| `amounts` | `[AccountBalanceAmountsEntity]` | Amounts by period: debit/credit in ledger currency and alternative currency |

### Filter (`AccountBalanceFilter`)

Supports filtering by site, ledger, fiscal year, account, and the dimensions `fixture`, `broker`, `department`, `location`, `type`, `product`, and `analysis`.

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

!!! note "Shared analytical dimensions"
    The financial modules share the same set of analytical dimensions (`fixture`, `broker`, `department`, `location`, `type`, `product`, `analysis`) used in [Custom Purchase Invoices](custom-purchase-invoice.md) and in the analytical lines of [Supplier Invoices](supplier-invoice.md), allowing data to be cross-referenced between these modules.
