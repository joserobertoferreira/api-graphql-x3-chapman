# Produtos (products)

**Código-fonte:** `src/modules/products`

Consulta e criação de artigos/produtos do X3. Ao criar um produto, pode indicar-se apenas o código de uma [categoria de produtos](product-categories.pt.md) existente para herdar automaticamente unidades, níveis de imposto e grupos estatísticos.

## Operações

| Operação        | Tipo     | Nome GraphQL    | Descrição                                                  |
| --------------- | -------- | --------------- | ---------------------------------------------------------- |
| `createProduct` | Mutation | `createProduct` | Cria um novo produto                                       |
| `findPaginated` | Query    | `getProducts`   | Lista produtos, paginada por cursor, com filtros opcionais |

!!! note "Mutations preparadas mas ainda não ativas"
O código-fonte já contém a estrutura para `updateProduct` e `removeProduct`, mas estas mutations estão comentadas em `product.resolver.ts` e **não fazem parte do schema publicado atualmente**.

## `ProductEntity`

| Campo                     | Tipo       | Descrição                      |
| ------------------------- | ---------- | ------------------------------ |
| `code`                    | `ID`       | Código único do produto        |
| `productCategoryCode`     | `String`   | Categoria do produto           |
| `descriptions`            | `[String]` | Lista de descrições (até 3)    |
| `salesUnit`               | `String`   | Unidade de venda               |
| `purchaseUnit`            | `String`   | Unidade de compra              |
| `taxesLevel`              | `[String]` | Níveis de imposto              |
| `productStatisticalGroup` | `[String]` | Grupos estatísticos do produto |
| `basePrice`               | `Float`    | Preço base                     |

## Filtro (`ProductFilter`)

Suporta filtro por lista de códigos, texto de descrição, categoria de produto, nível de imposto e grupo estatístico.

## Criar produto (`CreateProductInput`)

| Campo                     | Obrigatório | Descrição                                                         |
| ------------------------- | ----------- | ----------------------------------------------------------------- |
| `code`                    | Sim         | Código único do novo produto                                      |
| `productCategoryCode`     | Sim         | Categoria existente a partir da qual o produto herda propriedades |
| `descriptions`            | Sim         | Lista de descrições (1 a 3, a primeira obrigatória)               |
| `salesUnit`               | Não         | Unidade de venda — se omitida, é herdada da categoria             |
| `purchaseUnit`            | Não         | Unidade de compra — se omitida, é herdada da categoria            |
| `taxesLevel`              | Não         | Níveis de imposto (1 a 3) — se omitido, é herdado da categoria    |
| `productStatisticalGroup` | Não         | Grupos estatísticos (até 5) — se omitido, é herdado da categoria  |
| `accountingCode`          | Não         | Código contabilístico                                             |
| `basePrice`               | Não         | Preço base (≥ 0)                                                  |

```graphql
mutation {
  createProduct(
    input: { code: "ART001", productCategoryCode: "GEN", descriptions: ["Produto de exemplo"], basePrice: 19.90 }
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
      node {
        code
        descriptions
        salesUnit
        basePrice
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```
