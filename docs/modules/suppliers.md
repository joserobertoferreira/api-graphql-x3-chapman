# Fornecedores (suppliers)

**Código-fonte:** `src/modules/suppliers`

Espelha o módulo de [Clientes](customers.md), mas para fornecedores. A `SupplierEntity` estende os dados específicos de fornecedor com informação partilhada do parceiro de negócio subjacente (ver [Parceiros de negócio](business-partners.md)) e as respetivas moradas.

## Operações

| Operação | Tipo | Nome GraphQL | Descrição |
|---|---|---|---|
| `findPaginated` | Query | `getSuppliers` | Lista fornecedores, paginada por cursor, com filtros opcionais |
| `createSupplier` | Mutation | `createSupplier` | Cria um novo fornecedor, incluindo a morada por omissão |

### Campos calculados (`@ResolveField`)

| Campo | Descrição |
|---|---|
| `europeanUnionVatNumber` | Resolvido via `DataLoader` a partir do parceiro de negócio associado ao fornecedor |
| `addresses` | Lista de moradas associadas ao fornecedor, resolvida via `DataLoader` ([Moradas](addresses.md)) |

## `SupplierEntity`

| Campo | Tipo | Descrição |
|---|---|---|
| `supplierCode` | `ID` | Código do fornecedor |
| `category` | `String` | Categoria do fornecedor |
| `supplierName` | `String` | Nome do fornecedor |
| `shortName` | `String` | Nome abreviado |
| `isActive` | `Boolean` | Indica se o fornecedor está ativo |
| `defaultAddressCode` | `String` | Código da morada por omissão |
| `country` | `String` | País |
| `europeanUnionVatNumber` | `String` | Número de IVA intracomunitário |
| `crmId` | `String` | Identificador no CRM |
| `addresses` | `[AddressEntity]` | Moradas associadas |

## Filtro (`SupplierFilter`)

Suporta filtro por lista de códigos, nome (parcial), NIF/VAT europeu, número de registo comercial, idioma, moeda, país (código ou nome), cidade e código postal.

## Criar fornecedor (`CreateSupplierInput`)

| Campo | Obrigatório | Descrição |
|---|---|---|
| `category` | Sim | Categoria do fornecedor (máx. 5 carateres) |
| `supplierCode` | Não | Código do novo fornecedor; se omitido, é gerado automaticamente pelo X3 |
| `name` | Sim | Nome do fornecedor (máx. 75 carateres) |
| `shortName` | Não | Nome abreviado (máx. 10 carateres) |
| `europeanUnionVatNumber` | Não | NIF europeu (máx. 20 carateres) |
| `language` | Não | Idioma preferido (máx. 3 carateres, normalizado para maiúsculas) |
| `defaultAddress` | Sim | Morada por omissão do fornecedor ([`CreateAddressInput`](addresses.md#createaddressinput)) |

```graphql
mutation {
  createSupplier(
    input: {
      category: "NAC"
      name: "Fornecedor Exemplo, Lda"
      europeanUnionVatNumber: "PT987654321"
      defaultAddress: {
        code: "SEDE"
        addressLine1: "Avenida Central, 50"
        city: "PORTO"
        country: "PT"
      }
    }
  ) {
    supplierCode
    supplierName
    addresses { code city country }
  }
}
```

```graphql
query {
  getSuppliers(first: 10, filter: { name: "Exemplo", country: "PT" }) {
    edges {
      node {
        supplierCode
        supplierName
        europeanUnionVatNumber
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```
