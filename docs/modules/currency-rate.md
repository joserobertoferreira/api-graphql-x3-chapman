# Exchange Rates (currency-rate)

**Source code:** `src/modules/currency-rate`

Queries the exchange rates registered in X3 between a source currency and one or more destination currencies, for a specific rate type and date.

## Operations

| Operation | Type | GraphQL name | Description |
|---|---|---|---|
| `findPaginated` | Query | `getExchangeRates` | Lists exchange rates, cursor-paginated, with a mandatory filter |

## `CurrencyRateEntity`

| Field | Type | Description |
|---|---|---|
| `rateType` | `ExchangeRateType` | Rate type (`dailyRate`, `monthlyRate`, `averageRate`, `customsDocFileExchange`) |
| `rateDate` | `Date` | Rate date |
| `sourceCurrency` | `String` | Source currency |
| `destinationCurrency` | `String` | Destination currency |
| `rate` | `Float` | Exchange rate |
| `inverseRate` | `Float` | Inverse exchange rate |

## Filter (`CurrencyRateFilterInput`)

| Field | Required | Description |
|---|---|---|
| `rateType` | Yes | Exchange rate type |
| `rateDate` | Yes | Rate date (`YYYY-MM-DD`) |
| `sourceCurrency` | Yes | Source currency |
| `destinationCurrency` | No | List of destination currencies |

```graphql
query {
  getExchangeRates(
    first: 10
    filter: { rateType: dailyRate, rateDate: "2026-08-13", sourceCurrency: "EUR", destinationCurrency: ["USD", "GBP"] }
  ) {
    edges {
      node { sourceCurrency destinationCurrency rate inverseRate }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```
