# Products (products)

**Source code:** `src/modules/products`

Queries and creates X3 items/products. When creating a product, you can specify only the code of an existing [product category](product-categories.md) to automatically inherit units, tax levels, and statistical groups.

## Operations

| Operation | Type | GraphQL name | Description |
|---|---|---|---|
| `createProduct` | Mutation | `createProduct` | Creates a new product |
| `findPaginated` | Query | `getProducts` | Lists products, cursor-paginated, with optional filters |

!!! note "Mutations prepared but not yet active"
    The source code already contains the structure for `updateProduct` and `removeProduct`, but these mutations are commented out in `product.resolver.ts` and **are not currently part of the published schema**.

## `ProductEntity`

| Field | Type | Description |
|---|---|---|
| `code` | `ID` | Unique product code |
| `productCategoryCode` | `String` | Product category |
| `descriptions` | `[String]` | List of descriptions (up to 3) |
| `salesUnit` | `String` | Sales unit |
| `purchaseUnit` | `String` | Purchase unit |
| `taxesLevel` | `[String]` | Tax levels |
| `productStatisticalGroup` | `[String]` | Product statistical groups |
| `basePrice` | `Float` | Base price |

## Filter (`ProductFilter`)

Supports filtering by a list of codes, description text, product category, tax level, and statistical group.

## Create product (`CreateProductInput`)

| Field | Required | Description |
|---|---|---|
| `code` | Yes | Unique code of the new product |
| `productCategoryCode` | Yes | Existing category from which the product inherits properties |
| `descriptions` | Yes | List of descriptions (1 to 3, first one required) |
| `salesUnit` | No | Sales unit — if omitted, inherited from the category |
| `purchaseUnit` | No | Purchase unit — if omitted, inherited from the category |
| `taxesLevel` | No | Tax levels (1 to 3) — if omitted, inherited from the category |
| `productStatisticalGroup` | No | Statistical groups (up to 5) — if omitted, inherited from the category |
| `accountingCode` | No | Accounting code |
| `basePrice` | No | Base price (≥ 0) |

```graphql
mutation {
  createProduct(
    input: {
      code: "ART001"
      productCategoryCode: "GEN"
      descriptions: ["Produto de exemplo"]
      basePrice: 19.90
    }
  ) {
    code
    descriptions
    basePrice
  }
}
```

```graphql
query {
  getProducts(first: 20, filter: { productCategoryCode: "GEN" }) {
    edges {
      node { code descriptions salesUnit basePrice }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```
