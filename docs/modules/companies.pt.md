# Empresas (companies)

**Código-fonte:** `src/modules/companies`

Consulta as empresas legais (holdings jurídicas) configuradas no X3.

## Operações

| Operação        | Tipo  | Nome GraphQL   | Descrição                                                  |
| --------------- | ----- | -------------- | ---------------------------------------------------------- |
| `findPaginated` | Query | `getCompanies` | Lista empresas, paginada por cursor, com filtros opcionais |

### Campos calculados (`@ResolveField`)

| Campo       | Descrição                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------- |
| `addresses` | Lista de moradas associadas à empresa, resolvida via `DataLoader` ([Moradas](addresses.pt.md)) |

## `CompanyEntity`

| Campo                    | Tipo              | Descrição                                             |
| ------------------------ | ----------------- | ----------------------------------------------------- |
| `company`                | `String`          | Código único da empresa                               |
| `name`                   | `String`          | Nome/designação alargada da empresa                   |
| `shortTitle`             | `String`          | Título abreviado                                      |
| `legislation`            | `String`          | Legislação da empresa                                 |
| `siren`                  | `String`          | SIREN (identificador legal francês, quando aplicável) |
| `identificationNumber`   | `String`          | Número de identificação único                         |
| `europeanUnionVatNumber` | `String`          | Número de IVA intracomunitário                        |
| `addresses`              | `[AddressEntity]` | Moradas associadas                                    |

## Filtro (`CompanyFilterInput`)

Suporta filtro por código, nome (parcial), título abreviado (parcial), lista de legislações, lista de países, SIREN, número de identificação e NIF europeu.

```graphql
query {
  getCompanies(first: 5, filter: { name: "Chapman" }) {
    edges {
      node {
        company
        name
        europeanUnionVatNumber
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

!!! note "Relação com estabelecimentos"
O campo `sites` na entidade de empresa e o respetivo `ResolveField` estão implementados no código-fonte mas atualmente comentados/desativados — a relação entre empresa e [estabelecimentos](sites.pt.md) não está exposta no schema público neste momento.
