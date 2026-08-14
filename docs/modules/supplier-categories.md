# Supplier Categories (supplier-categories)

**Source code:** `src/modules/supplier-categories`

Internal auxiliary service — **does not expose its own GraphQL resolvers**. It is consumed internally to validate/retrieve the category specified when creating a [supplier](suppliers.md) (the `category` field of `CreateSupplierInput`).

## `SupplierCategoryService`

| Method | Description |
|---|---|
| `findCategory(code)` | Retrieves the supplier category by code; throws `NotFoundException` if it does not exist |
