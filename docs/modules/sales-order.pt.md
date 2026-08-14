# Encomendas de venda (sales-order)

**Código-fonte:** `src/modules/sales-order`

Criação e consulta de encomendas de venda no X3. O módulo agrupa quatro resolvers: encomendas propriamente ditas, o produto associado a cada linha, o estado/faturação da encomenda e os textos livres (cabeçalho, rodapé, linhas).

## Operações

| Resolver                   | Operação               | Tipo            | Nome GraphQL              | Descrição                                                                      |
| -------------------------- | ---------------------- | --------------- | ------------------------- | ------------------------------------------------------------------------------ |
| `SalesOrderResolver`       | `createSalesOrder`     | Mutation        | `createSalesOrder`        | Cria uma nova encomenda de venda com as respetivas linhas                      |
| `SalesOrderResolver`       | `closeSalesOrderLine`  | Mutation        | `closeSalesOrderLines`    | Fecha (encerra) uma ou mais linhas de uma encomenda de venda existente         |
| `SalesOrderResolver`       | `findPaginated`        | Query           | `getSalesOrders`          | Lista encomendas de venda, paginada por cursor, com filtro                     |
| `SalesOrderStatusResolver` | `findPaginated`        | Query           | `getSalesOrdersStatus`    | Lista o estado de faturação/contabilização das encomendas, paginada por cursor |
| `SalesOrderTextResolver`   | `createSalesOrderText` | Mutation        | `createSalesOrderText`    | Define os textos de cabeçalho, rodapé e/ou linhas de uma encomenda             |
| `SalesOrderLineResolver`   | `getProduct`           | `@ResolveField` | `product` (em cada linha) | Resolve o [produto](products.pt.md) de cada linha via `DataLoader`             |

## `SalesOrderEntity`

| Campo                                                 | Tipo                           | Descrição                                                               |
| ----------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------- |
| `salesOrderNumber`                                    | `ID`                           | Número único da encomenda                                               |
| `orderDate`                                           | `Date`                         | Data da encomenda                                                       |
| `orderStatus`                                         | `OrderStatus`                  | Estado (`open`, `closed`)                                               |
| `invoiceStatus`                                       | `InvoiceAccountingStatus`      | Estado de faturação                                                     |
| `accountingStatus`                                    | `OrderAccountingStatus`        | Estado contabilístico                                                   |
| `currency`                                            | `String`                       | Moeda                                                                   |
| `currencyRateType`                                    | `ExchangeRateType`             | Tipo de taxa de câmbio                                                  |
| `currencyRate`                                        | `Float`                        | Taxa de câmbio aplicada                                                 |
| `salesSite`                                           | `String`                       | Estabelecimento de venda ([Estabelecimentos](sites.pt.md))              |
| `company`                                             | `String`                       | Empresa                                                                 |
| `reference`                                           | `String`                       | Referência externa                                                      |
| `shippingSite`                                        | `String`                       | Estabelecimento de expedição                                            |
| `taxRule`                                             | `String`                       | Regra de imposto                                                        |
| `paymentTerms`                                        | `String`                       | Condições de pagamento ([Payment terms](payment-terms.pt.md))           |
| `totalAmountExcludingTax` / `totalAmountIncludingTax` | `Float`                        | Totais sem/com imposto                                                  |
| `soldToCustomer`                                      | `SalesOrderSoldToCustomerInfo` | Informação do cliente destinatário                                      |
| `lines`                                               | `[SalesOrderLineEntity]`       | Linhas da encomenda (cada uma com `product` resolvido por `DataLoader`) |

## Filtro (`SalesOrderFilterInput`)

Suporta filtro por lista de números de encomenda, código de cliente, empresa, intervalo de datas (`from`/`to`) e dimensão de _fixture_.

## Criar encomenda de venda (`CreateSalesOrderInput`)

| Campo                | Obrigatório | Descrição                               |
| -------------------- | ----------- | --------------------------------------- |
| `salesSite`          | Sim         | Estabelecimento de venda                |
| `orderType`          | Não         | Tipo de encomenda                       |
| `orderDate`          | Não         | Data da encomenda (`YYYY-MM-DD`)        |
| `soldToCustomerCode` | Sim         | Código do cliente destinatário          |
| `reference`          | Não         | Referência externa                      |
| `taxRule`            | Não         | Regra de imposto                        |
| `currency`           | Não         | Moeda                                   |
| `paymentTerms`       | Não         | Condições de pagamento                  |
| `lines`              | Sim         | Lista de linhas (`SalesOrderLineInput`) |

Cada linha (`SalesOrderLineInput`) suporta: `product` (SKU), `description`, `quantity`, `unitPrice`, `taxLevel`, `dimensions` ([Dimensões](dimensions.pt.md) específicas da linha), `text` e, para linhas de serviço, `serviceStartDate`/`serviceEndDate`.

```graphql
mutation {
  createSalesOrder(
    input: {
      salesSite: "STL01"
      soldToCustomerCode: "C000123"
      currency: "EUR"
      lines: [{ product: "ART001", quantity: 10, unitPrice: 19.9 }]
    }
  ) {
    salesOrderNumber
    orderStatus
    totalAmountIncludingTax
    lines {
      product {
        code
        descriptions
      }
      quantity
      unitPrice
    }
  }
}
```

## Fechar linhas de uma encomenda (`CloseSalesOrderLineInput`)

Recebe o número da encomenda e a lista de números de linha a fechar, devolvendo `ClosedSalesOrderEntity` com o estado atualizado da encomenda e das linhas fechadas.

```graphql
mutation {
  closeSalesOrderLines(input: { salesOrderNumber: "SO000123", lines: [1, 2] }) {
    salesOrderNumber
    orderStatus
    lines {
      lineNumber
    }
  }
}
```

## Estado da encomenda (`getSalesOrdersStatus`)

Devolve, por encomenda, o estado da linha, o estado de faturação (`InvoiceStatus`), o estado contabilístico e informação sobre a última fatura emitida (`SalesOrderLastInvoiceInfo`, incluindo a respetiva data).

## Textos da encomenda (`createSalesOrderText`)

Permite definir texto de cabeçalho (`headerText`), rodapé (`footerText`) e/ou texto por linha (`lines`, indicando `lineNumber` e `text`) de uma encomenda já existente (`CreateSalesOrderTextInput`).

```graphql
mutation {
  createSalesOrderText(
    input: {
      salesOrderNumber: "SO000123"
      headerText: "Entrega urgente"
      lines: [{ lineNumber: 1, text: "Embalar com cuidado" }]
    }
  ) {
    salesOrderNumber
    headerText
    lines {
      lineNumber
      text
    }
  }
}
```

!!! note "Transações intersite/intercompany"
A criação de encomendas pode envolver validação de transações entre estabelecimentos/empresas diferentes — ver [Parceiros de negócio](business-partners.pt.md#regra-de-negocio-transacoes-intersiteintercompany).
