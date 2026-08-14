# Product Categories (product-categories)

**Source code:** `src/modules/product-categories`

Internal auxiliary service — **does not expose its own GraphQL resolvers**. It is consumed internally when creating a [product](products.md) (the `productCategoryCode` field of `CreateProductInput`), from which default properties (units, tax levels, statistical groups) are inherited when they are not explicitly provided.

## `ProductCategoryService`

| Method | Description |
|---|---|
| `findCategory(stockSite, code)` | Retrieves the product category by the composite key of stock site + code; throws `NotFoundException` if it does not exist |

!!! note "Category by site"
    Unlike customer/supplier categories, the product category in X3 is defined by stock site (`stockSite`), reflecting the fact that product properties may vary between sites.
