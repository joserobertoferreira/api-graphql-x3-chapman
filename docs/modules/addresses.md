# Addresses (addresses)

**Source code:** `src/modules/addresses`

Shared internal service — **does not expose its own GraphQL resolvers**. In X3, addresses are stored in a generic table that serves any type of entity (business partner, company, site, user, etc.), identified by the composite key `(entityType, entityNumber, code)`. This module centralizes access to that table and is used by the `DataLoader` (`addressLoader` / `addressByBpLoader`) to resolve the `addresses` field exposed by [Customers](customers.md), [Suppliers](suppliers.md), [Companies](companies.md), and [Sites](sites.md).

## `AddressService`

| Method | Description |
|---|---|
| `findAddress(entityType, entityNumber, code)` | Retrieves a specific address by its composite key |
| `mapAddressToEntity(address)` | Converts the Prisma record into a GraphQL `AddressEntity`, filtering empty phone numbers/emails and translating the entity type to the GraphQL `EntityType` enum |

## Entity type (`EntityType`)

The `entityType` field indicates which type of record the address belongs to:

| GraphQL value | Meaning |
|---|---|
| `businessPartner` | Business partner (customer or supplier) |
| `company` | Company |
| `site` | Site |
| `user` | User |
| `accounts` | Accounts |
| `leads` | Leads/prospects |
| `building` | Building |
| `place` | Place |

## `AddressEntity`

| Field | Type | Description |
|---|---|---|
| `entityType` | `EntityType` | Type of entity the address belongs to |
| `entityNumber` | `String` | Entity code (e.g. customer, company, or site code) |
| `code` | `String` | Address code |
| `description` | `String` | Address description |
| `addressLine1` / `addressLine2` / `addressLine3` | `String` | Address lines |
| `zipCode` | `String` | Postal code |
| `city` | `String` | City |
| `state` | `String` | State/region |
| `country` | `String` | Country code |
| `countryName` | `String` | Country name |
| `phones` | `[String]` | Up to 5 associated phone numbers |
| `emails` | `[String]` | Up to 5 associated emails |
| `isDefault` | `Boolean` | Indicates whether this is the entity's default address |

## `CreateAddressInput`

Used as a sub-input in mutations for creating other entities (e.g. `defaultAddress` in `createCustomer`/`createSupplier`).

| Field | Required | Description |
|---|---|---|
| `code` | Yes | Address code |
| `description` | No | Description (max. 30 characters) |
| `addressLine1` | Yes | First address line (max. 75 characters) |
| `addressLine2` / `addressLine3` | No | Additional lines (max. 75 characters each) |
| `zipCode` | No | Postal code (max. 10 characters) |
| `city` | No | City (max. 40 characters, normalized to uppercase) |
| `state` | No | State/region (max. 35 characters, normalized to uppercase) |
| `country` | Yes | Country code (max. 3 characters, normalized to uppercase) |
| `phones` | No | Up to 5 phone numbers |
| `emails` | No | Up to 5 emails |
