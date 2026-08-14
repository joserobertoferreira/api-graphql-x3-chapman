# Faturas de compra (purchase-invoice)

**Código-fonte:** `src/modules/purchase-invoice`

!!! warning "Módulo atualmente desativado"
O `PurchaseInvoiceModule` está implementado no código-fonte, mas encontra-se **comentado** em `src/app.module.ts` (`// PurchaseInvoiceModule`). Isto significa que, na aplicação em execução, as operações abaixo **não estão disponíveis no schema GraphQL** até o módulo ser reativado. Para uso equivalente atualmente ativo, ver [Faturas de compra personalizadas](custom-purchase-invoice.pt.md) e [Faturas de fornecedor](supplier-invoice.pt.md).

## Operações (quando ativo)

| Operação        | Tipo  | Nome GraphQL          | Descrição                                                |
| --------------- | ----- | --------------------- | -------------------------------------------------------- |
| `findPaginated` | Query | `getPurchaseInvoices` | Lista faturas de compra, paginada por cursor, com filtro |

### Campos calculados (`@ResolveField`)

| Campo   | Descrição                                                                           |
| ------- | ----------------------------------------------------------------------------------- |
| `lines` | Linhas da fatura, resolvidas via `DataLoader` (`invoiceLinesByInvoiceNumberLoader`) |

## `PurchaseInvoiceEntity`

Inclui, entre outros, os blocos `PurchaseInvoiceControlsEntity`:

- **Origem** (`PurchaseInvoiceSourceInfoEntity`): data e número do documento original do fornecedor, código de "pay to", moeda, taxa de câmbio, número da fatura original.
- **Pagamento** (`PurchaseInvoicePaymentInfoEntity`): referência interna, data base de vencimento, condições de pagamento, código de desconto, regra de imposto, datas de serviço, número VCS.
- **Comentários** (`PurchaseInvoiceCommentsInfoEntity`): lista de textos de comentário da fatura.
- **Montantes** (`PurchaseInvoiceAmountInfoEntity`): total sem imposto, imposto, total, estado da fatura e estado de reconciliação (_matching_).

`PurchaseInvoiceLineEntity` inclui número de linha, descrição, quantidade, preço bruto/líquido, códigos de imposto consolidados e o [produto](products.pt.md) associado.
