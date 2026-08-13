# Categorias de produtos (product-categories)

**Código-fonte:** `src/modules/product-categories`

Serviço interno auxiliar — **não expõe resolvers GraphQL próprios**. É consumido internamente na criação de um [produto](products.md) (campo `productCategoryCode` de `CreateProductInput`), de onde são herdadas propriedades por omissão (unidades, níveis de imposto, grupos estatísticos) quando não indicadas explicitamente.

## `ProductCategoryService`

| Método | Descrição |
|---|---|
| `findCategory(stockSite, code)` | Obtém a categoria de produto pela chave composta estabelecimento de stock + código; lança `NotFoundException` se não existir |

!!! note "Categoria por estabelecimento"
    Ao contrário das categorias de cliente/fornecedor, a categoria de produto no X3 é definida por estabelecimento de stock (`stockSite`), refletindo o facto de as propriedades do produto poderem variar entre estabelecimentos.
