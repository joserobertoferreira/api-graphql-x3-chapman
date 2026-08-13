# Dimensões (dimensions)

**Código-fonte:** `src/modules/dimensions`

Dimensões são a implementação das *dimensões analíticas* do X3 (tags analíticas configuráveis, associadas a um [tipo de dimensão](dimension-types.md)) — usadas para classificar lançamentos contabilísticos e linhas de documentos (encomendas, faturas) para efeitos de reporting. Consoante o tipo de dimensão, o valor criado pode conter dados adicionais especializados (`general`, `service` ou `flight`).

## Operações

| Operação | Tipo | Nome GraphQL | Descrição |
|---|---|---|---|
| `createDimension` | Mutation | `createDimension` | Cria um novo valor de dimensão associado a um tipo de dimensão |
| `findPaginated` | Query | `getDimensions` | Lista valores de dimensão, paginada por cursor, com filtro |

### Campos calculados (`@ResolveField`)

| Campo | Descrição |
|---|---|
| `general` | Monta os detalhes "gerais" da dimensão (estado ativo, empresa/site/grupo, datas de validade, cliente fixo, dimensões associadas), resolvendo o cliente associado via `DataLoader` |

## `DimensionEntity`

| Campo | Tipo | Descrição |
|---|---|---|
| `dimensionType` | `String` | Tipo de dimensão (ver [Tipos de dimensão](dimension-types.md)) |
| `dimension` | `String` | Valor/código da dimensão |
| `additionalInformation` | `String` | Informação adicional |
| `shortDescription` | `String` | Descrição curta |
| `pioneerReference` | `String` | Referência Pioneer associada |
| `general` | `GeneralDimensionEntity` | Detalhes gerais (ver abaixo) |
| `service` | `ServiceDimensionEntity` | Detalhes de serviço (datas de início/fim, vendedor) |
| `flight` | `FlightDimensionEntity` | Detalhes de voo (referência, data, origem, destino) |

`GeneralDimensionEntity` inclui: `isActive`, `companySiteGroup`, `fixtureCustomer` (código e nome do cliente associado), `validFrom`, `validUntil` e `otherDimensions` (lista de pares tipo/valor de outras dimensões relacionadas).

## Filtro (`DimensionFilterInput`)

| Campo | Obrigatório | Descrição |
|---|---|---|
| `dimensionType` | Sim | Tipo de dimensão a filtrar |
| `dimension` | Não | Código da dimensão |
| `isActive` | Não | Estado ativo/inativo |
| `additionalInformation` | Não | Texto de pesquisa na informação adicional |
| `companySiteGroup` | Não | Empresa/site/grupo |
| `pioneerReference` | Não | Referência Pioneer |
| `fixtureCustomerCode` | Não | Código do cliente fixo |
| `brokerEmail` | Não | Email do corretor |

## Criar dimensão (`CreateDimensionInput`)

| Campo | Obrigatório | Descrição |
|---|---|---|
| `dimensionType` | Sim | Tipo de dimensão |
| `dimension` | Sim | Código do novo valor de dimensão |
| `additionalInformation` | Não | Informação adicional |
| `shortTitle` | Não | Título curto |
| `pioneerReference` | Não | Referência Pioneer |
| `general` | Não | Detalhes gerais (`GeneralDimensionInput`): empresa/site/grupo, datas de validade, cliente fixo, email do corretor, outras dimensões associadas |
| `service` | Não | Detalhes de serviço (`ServiceDimensionInput`): datas de início/fim, vendedor |
| `flight` | Não | Detalhes de voo (`FlightDimensionInput`): referência, data, origem, destino |

```graphql
mutation {
  createDimension(
    input: {
      dimensionType: "PRJ"
      dimension: "PRJ001"
      shortTitle: "Projeto Exemplo"
      general: { isActive: true, validFrom: "2026-01-01" }
    }
  ) {
    dimensionType
    dimension
    general { isActive validFrom }
  }
}
```

```graphql
query {
  getDimensions(first: 10, filter: { dimensionType: "PRJ" }) {
    edges {
      node { dimensionType dimension shortDescription }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```
