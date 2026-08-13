# Taxas de câmbio (currency-rate)

**Código-fonte:** `src/modules/currency-rate`

Consulta as taxas de câmbio registadas no X3 entre uma moeda de origem e uma ou mais moedas de destino, para um determinado tipo de taxa e data.

## Operações

| Operação | Tipo | Nome GraphQL | Descrição |
|---|---|---|---|
| `findPaginated` | Query | `getExchangeRates` | Lista taxas de câmbio, paginada por cursor, com filtro obrigatório |

## `CurrencyRateEntity`

| Campo | Tipo | Descrição |
|---|---|---|
| `rateType` | `ExchangeRateType` | Tipo de taxa (`dailyRate`, `monthlyRate`, `averageRate`, `customsDocFileExchange`) |
| `rateDate` | `Date` | Data da taxa |
| `sourceCurrency` | `String` | Moeda de origem |
| `destinationCurrency` | `String` | Moeda de destino |
| `rate` | `Float` | Taxa de câmbio |
| `inverseRate` | `Float` | Taxa de câmbio inversa |

## Filtro (`CurrencyRateFilterInput`)

| Campo | Obrigatório | Descrição |
|---|---|---|
| `rateType` | Sim | Tipo de taxa de câmbio |
| `rateDate` | Sim | Data da taxa (`YYYY-MM-DD`) |
| `sourceCurrency` | Sim | Moeda de origem |
| `destinationCurrency` | Não | Lista de moedas de destino |

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
