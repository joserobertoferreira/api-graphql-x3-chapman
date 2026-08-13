# Encomendas de compra (purchase-order)

**Código-fonte:** `src/modules/purchase-order`

Criação e consulta de encomendas de compra no X3, com resolução do produto de cada linha via `DataLoader`.

## Operações

| Resolver | Operação | Tipo | Nome GraphQL | Descrição |
|---|---|---|---|---|
| `PurchaseOrderResolver` | `createPurchaseOrder` | Mutation | `createPurchaseOrder` | Cria uma nova encomenda de compra com as respetivas linhas |
| `PurchaseOrderResolver` | `findPaginated` | Query | `getPurchaseOrders` | Lista encomendas de compra, paginada por cursor, com filtro |
| `PurchaseOrderLineResolver` | `getProduct` | `@ResolveField` | `product` (em cada linha) | Resolve o [produto](products.md) de cada linha via `DataLoader` |

!!! note "Fecho de linhas"
    O código já prevê uma mutation `closePurchaseOrderLines` (equivalente ao `closeSalesOrderLines` das [encomendas de venda](sales-order.md#fechar-linhas-de-uma-encomenda-closesalesorderlineinput)), mas está atualmente comentada em `purchase-order.resolver.ts` e não faz parte do schema publicado.

## `PurchaseOrderEntity`

| Campo | Tipo | Descrição |
|---|---|---|
| `purchaseOrderNumber` | `ID` | Número único da encomenda |
| `orderDate` | `Date` | Data da encomenda |
| `buyer` | `String` | Comprador responsável |
| `accountingStatus` | `OrderAccountingStatus` | Estado contabilístico |
| `currency` | `String` | Moeda |
| `currencyRate` | `Float` | Taxa de câmbio aplicada |
| `company` | `String` | Empresa |
| `purchaseSite` | `String` | Estabelecimento de compra ([Estabelecimentos](sites.md)) |
| `totalAmountExcludingTax` / `totalAmountIncludingTax` | `Float` | Totais sem/com imposto |
| `supplier` | `PurchaseOrderSupplierInfo` | Informação do fornecedor |
| `lines` | `[PurchaseOrderLineEntity]` | Linhas da encomenda (cada uma com `product` resolvido por `DataLoader`) |

## Filtro (`PurchaseOrderFilterInput`)

Suporta filtro por lista de números de encomenda, código de fornecedor, empresa, intervalo de datas (`from`/`to`) e dimensão de *fixture*.

## Criar encomenda de compra (`CreatePurchaseOrderInput`)

| Campo | Obrigatório | Descrição |
|---|---|---|
| `purchaseSite` | Sim | Estabelecimento de compra |
| `orderDate` | Não | Data da encomenda (`YYYY-MM-DD`) |
| `supplierCode` | Sim | Código do fornecedor |
| `buyerCode` | Não | Código do comprador |
| `taxRule` | Não | Regra de imposto |
| `currency` | Não | Moeda |
| `lines` | Sim | Lista de linhas (`PurchaseOrderLineInput`) |

Cada linha (`PurchaseOrderLineInput`) suporta: `product` (SKU), `quantity`, `unitPrice`, `taxLevel` e `dimensions` ([Dimensões](dimensions.md) específicas da linha).

```graphql
mutation {
  createPurchaseOrder(
    input: {
      purchaseSite: "STL01"
      supplierCode: "F000123"
      currency: "EUR"
      lines: [{ product: "ART001", quantity: 100, unitPrice: 5.5 }]
    }
  ) {
    purchaseOrderNumber
    totalAmountIncludingTax
    lines { product { code descriptions } quantity unitPrice }
  }
}
```

```graphql
query {
  getPurchaseOrders(first: 10, filter: { supplierCode: "F000123" }) {
    edges {
      node { purchaseOrderNumber orderDate totalAmountIncludingTax }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

!!! note "Transações intersite/intercompany"
    À semelhança das encomendas de venda, a criação de encomendas de compra pode envolver validação de transações entre estabelecimentos/empresas diferentes — ver [Parceiros de negócio](business-partners.md#regra-de-negocio-transacoes-intersiteintercompany).
