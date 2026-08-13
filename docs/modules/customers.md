# Clientes (customers)

**Código-fonte:** `src/modules/customers`

Consulta e criação de clientes do X3. A entidade `CustomerEntity` estende os dados específicos de cliente com informação partilhada do parceiro de negócio subjacente (ver [Parceiros de negócio](business-partners.md)) e as respetivas moradas.

## Operações

| Operação | Tipo | Nome GraphQL | Descrição |
|---|---|---|---|
| `findPaginated` | Query | `getCustomers` | Lista clientes, paginada por cursor, com filtros opcionais |
| `createCustomer` | Mutation | `createCustomer` | Cria um novo cliente, incluindo a morada por omissão |

### Campos calculados (`@ResolveField`)

| Campo | Descrição |
|---|---|
| `europeanUnionVatNumber` | Resolvido via `DataLoader` a partir do parceiro de negócio associado ao cliente |
| `addresses` | Lista de moradas associadas ao cliente, resolvida via `DataLoader` ([Moradas](addresses.md)) |

## `CustomerEntity`

| Campo | Tipo | Descrição |
|---|---|---|
| `customerCode` | `ID` | Código do cliente |
| `category` | `String` | Categoria do cliente |
| `customerName` | `String` | Nome do cliente |
| `shortName` | `String` | Nome abreviado |
| `isActive` | `Boolean` | Indica se o cliente está ativo |
| `customerCurrency` | `String` | Moeda do cliente |
| `defaultAddressCode` | `String` | Código da morada por omissão |
| `country` | `String` | País |
| `europeanUnionVatNumber` | `String` | Número de IVA intracomunitário |
| `crmId` | `String` | Identificador no CRM |
| `addresses` | `[AddressEntity]` | Moradas associadas |

## Filtro (`CustomerFilter`)

Suporta filtro por lista de códigos, nome (parcial), NIF/VAT europeu, número de registo comercial, idioma, moeda, país (código ou nome), cidade e código postal.

## Criar cliente (`CreateCustomerInput`)

| Campo | Obrigatório | Descrição |
|---|---|---|
| `category` | Sim | Categoria do cliente (máx. 5 carateres) |
| `customerCode` | Não | Código do novo cliente; se omitido, é gerado automaticamente pelo X3 |
| `name` | Sim | Nome do cliente (máx. 75 carateres) |
| `shortName` | Não | Nome abreviado (máx. 10 carateres) |
| `europeanUnionVatNumber` | Não | NIF europeu (máx. 20 carateres) |
| `language` | Não | Idioma preferido (máx. 3 carateres, normalizado para maiúsculas) |
| `defaultAddress` | Sim | Morada por omissão do cliente ([`CreateAddressInput`](addresses.md#createaddressinput)) |

```graphql
mutation {
  createCustomer(
    input: {
      category: "NAC"
      name: "Cliente Exemplo, Lda"
      europeanUnionVatNumber: "PT123456789"
      defaultAddress: {
        code: "SEDE"
        addressLine1: "Rua Principal, 100"
        city: "LISBOA"
        country: "PT"
      }
    }
  ) {
    customerCode
    customerName
    addresses { code city country }
  }
}
```

```graphql
query {
  getCustomers(first: 10, filter: { name: "Exemplo", country: "PT" }) {
    edges {
      node {
        customerCode
        customerName
        europeanUnionVatNumber
        addresses { code addressLine1 city }
      }
    }
    pageInfo { hasNextPage endCursor }
    totalCount
  }
}
```
