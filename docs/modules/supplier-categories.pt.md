# Categorias de fornecedores (supplier-categories)

**Código-fonte:** `src/modules/supplier-categories`

Serviço interno auxiliar — **não expõe resolvers GraphQL próprios**. É consumido internamente para validar/consultar a categoria informada na criação de um [fornecedor](suppliers.pt.md) (campo `category` de `CreateSupplierInput`).

## `SupplierCategoryService`

| Método               | Descrição                                                                             |
| -------------------- | ------------------------------------------------------------------------------------- |
| `findCategory(code)` | Obtém a categoria de fornecedor pelo código; lança `NotFoundException` se não existir |
