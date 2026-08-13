# Parceiros de negócio (business-partners)

**Código-fonte:** `src/modules/business-partners`

Serviço interno partilhado — **não expõe resolvers GraphQL diretamente**. No X3, clientes e fornecedores partilham a mesma entidade base (`BusinessPartner`, tabela `BPARTNER`); este módulo concentra o acesso a essa entidade e é consumido pelos módulos [Clientes](customers.md) e [Fornecedores](suppliers.md), entre outros (ex.: resolução do NIF/`europeanUnionVatNumber` via `DataLoader`).

## `BusinessPartnerService`

| Método | Descrição |
|---|---|
| `businessPartnerExists(code)` | Verifica se existe um parceiro de negócio com o código indicado |
| `findBusinessPartnerByCode(code, include?)` | Obtém um parceiro de negócio pelo código, com possibilidade de incluir relações (ex.: moradas) |
| `findBusinessPartners(args)` | Pesquisa parceiros de negócio com filtros, ordenação e paginação Prisma |
| `createBusinessPartner(data)` | Cria um novo registo de parceiro de negócio |
| `updateBusinessPartner(code, data)` | Atualiza um parceiro de negócio existente |
| `deleteBusinessPartner(code)` | Remove um parceiro de negócio |
| `isIntersiteTransaction(originSite, senderType, sender)` | Determina se uma transação (encomenda) é *intersite*/*intercompany*, validando se o estabelecimento de origem e o parceiro de negócio (cliente ou fornecedor) pertencem a estabelecimentos/empresas diferentes, e se as respetivas autorizações comerciais existem |

## Regra de negócio: transações intersite/intercompany

`isIntersiteTransaction` é usada pelos módulos de [Encomendas de venda](sales-order.md) e [Encomendas de compra](purchase-order.md) para detetar cenários em que o estabelecimento de origem de uma encomenda é, ele próprio, também um parceiro de negócio (ex.: uma filial que compra a outra filial do grupo). Nesses casos valida:

- Se o parceiro de negócio associado ao estabelecimento de origem está ativo e devidamente configurado como cliente ou fornecedor.
- Se existe autorização comercial entre a empresa do estabelecimento de venda/compra e o parceiro de negócio (`CompanyService.companySiteThirdPartyAuthorization`).
- Se o estabelecimento do parceiro de negócio está configurado para vendas ou compras, consoante o sentido da transação.
- Se a empresa legal dos dois estabelecimentos é diferente, marcando a transação como *intercompany*.
