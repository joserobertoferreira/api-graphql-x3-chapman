# Visão geral dos módulos

Cada módulo abaixo corresponde a uma pasta em `src/modules/*` (ou `src/common/*`, no caso de funcionalidades transversais). A tabela resume o objetivo de cada um; os detalhes de queries, mutations e campos ficam nas páginas específicas, acessíveis pelo menu lateral.

| Módulo | Código-fonte | Resumo |
|---|---|---|
| [Autenticação (auth)](auth.md) | `src/modules/auth` | Validação da assinatura HMAC usada por todos os pedidos |
| [Configuração e utilitários (common)](common.md) | `src/modules/common`, `src/common/api-credential` | Gestão de credenciais de API e consultas auxiliares de configuração do X3 |
| [Utilizadores (users)](users.md) | `src/modules/users` | Consulta de utilizadores do X3 |
| [Parceiros de negócio (business-partners)](business-partners.md) | `src/modules/business-partners` | Serviço partilhado subjacente a clientes e fornecedores |
| [Clientes (customers)](customers.md) | `src/modules/customers` | Consulta e criação de clientes |
| [Fornecedores (suppliers)](suppliers.md) | `src/modules/suppliers` | Consulta e criação de fornecedores |
| [Empresas (companies)](companies.md) | `src/modules/companies` | Consulta de empresas (holdings jurídicas) |
| [Estabelecimentos (sites)](sites.md) | `src/modules/sites` | Consulta de estabelecimentos/sites operacionais |
| [Moradas (addresses)](addresses.md) | `src/modules/addresses` | Serviço partilhado de moradas associadas a qualquer entidade |
| [Produtos (products)](products.md) | `src/modules/products` | CRUD de produtos |
| [Categorias de clientes](customer-categories.md) | `src/modules/customer-categories` | Serviço auxiliar de categorias de clientes |
| [Categorias de fornecedores](supplier-categories.md) | `src/modules/supplier-categories` | Serviço auxiliar de categorias de fornecedores |
| [Categorias de produtos](product-categories.md) | `src/modules/product-categories` | Serviço auxiliar de categorias de produtos |
| [Dimensões (dimensions)](dimensions.md) | `src/modules/dimensions` | Consulta e criação de dimensões analíticas |
| [Tipos de dimensão (dimension-types)](dimension-types.md) | `src/modules/dimension-types` | Consulta dos tipos de dimensão configurados no X3 |
| [Condições de pagamento (payment-terms)](payment-terms.md) | `src/modules/payment-terms` | Consulta de condições de pagamento |
| [Taxas de câmbio (currency-rate)](currency-rate.md) | `src/modules/currency-rate` | Consulta de taxas de câmbio |
| [Encomendas de venda (sales-order)](sales-order.md) | `src/modules/sales-order` | Criação e consulta de encomendas de venda, linhas, estado e textos |
| [Encomendas de compra (purchase-order)](purchase-order.md) | `src/modules/purchase-order` | Criação e consulta de encomendas de compra e respetivas linhas |
| [Faturas de compra (purchase-invoice)](purchase-invoice.md) | `src/modules/purchase-invoice` | Consulta de faturas de compra *(módulo atualmente desativado)* |
| [Faturas de compra personalizadas (custom-purchase-invoice)](custom-purchase-invoice.md) | `src/modules/custom-purchase-invoice` | Consulta de faturas de compra numa vista/relatório personalizado |
| [Faturas de fornecedor (supplier-invoice)](supplier-invoice.md) | `src/modules/supplier-invoice` | Criação e consulta de faturas de fornecedor |
| [Financeiro (financials)](financials.md) | `src/modules/financials/*` | Lançamentos contabilísticos, lançamentos intercompany e saldos de conta |
