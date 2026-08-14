# Customer Categories (customer-categories)

**Source code:** `src/modules/customer-categories`

Shared internal service — **does not expose its own GraphQL resolvers**. It is consumed internally to validate/query the category provided when creating a [customer](customers.md) (the `category` field of `CreateCustomerInput`).

## `CustomerCategoryService`

| Method | Description |
|---|---|
| `findCategory(code)` | Retrieves the customer category by code; throws `NotFoundException` if it does not exist |
