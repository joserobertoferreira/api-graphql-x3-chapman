# Moradas (addresses)

**Código-fonte:** `src/modules/addresses`

Serviço interno partilhado — **não expõe resolvers GraphQL próprios**. No X3 as moradas são armazenadas numa tabela genérica que serve qualquer tipo de entidade (parceiro de negócio, empresa, estabelecimento, utilizador, etc.), identificada pela chave composta `(entityType, entityNumber, code)`. Este módulo concentra o acesso a essa tabela e é usado pelo `DataLoader` (`addressLoader` / `addressByBpLoader`) para resolver o campo `addresses` exposto por [Clientes](customers.md), [Fornecedores](suppliers.md), [Empresas](companies.md) e [Estabelecimentos](sites.md).

## `AddressService`

| Método | Descrição |
|---|---|
| `findAddress(entityType, entityNumber, code)` | Obtém uma morada específica pela sua chave composta |
| `mapAddressToEntity(address)` | Converte o registo Prisma numa `AddressEntity` GraphQL, filtrando telefones/emails vazios e traduzindo o tipo de entidade para o enum GraphQL `EntityType` |

## Tipo de entidade (`EntityType`)

O campo `entityType` indica a que tipo de registo a morada pertence:

| Valor GraphQL | Significado |
|---|---|
| `businessPartner` | Parceiro de negócio (cliente ou fornecedor) |
| `company` | Empresa |
| `site` | Estabelecimento |
| `user` | Utilizador |
| `accounts` | Contas |
| `leads` | Leads/prospetos |
| `building` | Edifício |
| `place` | Local |

## `AddressEntity`

| Campo | Tipo | Descrição |
|---|---|---|
| `entityType` | `EntityType` | Tipo de entidade a que a morada pertence |
| `entityNumber` | `String` | Código da entidade (ex.: código do cliente, da empresa, do estabelecimento) |
| `code` | `String` | Código da morada |
| `description` | `String` | Descrição da morada |
| `addressLine1` / `addressLine2` / `addressLine3` | `String` | Linhas da morada |
| `zipCode` | `String` | Código postal |
| `city` | `String` | Cidade |
| `state` | `String` | Estado/região |
| `country` | `String` | Código do país |
| `countryName` | `String` | Nome do país |
| `phones` | `[String]` | Até 5 números de telefone associados |
| `emails` | `[String]` | Até 5 emails associados |
| `isDefault` | `Boolean` | Indica se é a morada por omissão da entidade |

## `CreateAddressInput`

Usado como sub-input em mutations de criação de outras entidades (ex.: `defaultAddress` em `createCustomer`/`createSupplier`).

| Campo | Obrigatório | Descrição |
|---|---|---|
| `code` | Sim | Código da morada |
| `description` | Não | Descrição (máx. 30 carateres) |
| `addressLine1` | Sim | Primeira linha da morada (máx. 75 carateres) |
| `addressLine2` / `addressLine3` | Não | Linhas adicionais (máx. 75 carateres cada) |
| `zipCode` | Não | Código postal (máx. 10 carateres) |
| `city` | Não | Cidade (máx. 40 carateres, normalizada para maiúsculas) |
| `state` | Não | Estado/região (máx. 35 carateres, normalizado para maiúsculas) |
| `country` | Sim | Código do país (máx. 3 carateres, normalizado para maiúsculas) |
| `phones` | Não | Até 5 números de telefone |
| `emails` | Não | Até 5 emails |
