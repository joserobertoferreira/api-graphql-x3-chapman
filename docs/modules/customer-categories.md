# Categorias de clientes (customer-categories)

**Código-fonte:** `src/modules/customer-categories`

Serviço interno auxiliar — **não expõe resolvers GraphQL próprios**. É consumido internamente para validar/consultar a categoria informada na criação de um [cliente](customers.md) (campo `category` de `CreateCustomerInput`).

## `CustomerCategoryService`

| Método | Descrição |
|---|---|
| `findCategory(code)` | Obtém a categoria de cliente pelo código; lança `NotFoundException` se não existir |
