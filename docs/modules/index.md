# Modules overview

Each module below corresponds to a folder under `src/modules/*` (or `src/common/*`, for cross-cutting functionality). The table summarizes the purpose of each module; details about queries, mutations, and fields are available on the specific pages, accessible from the side menu.

| Module                                                                           | Source code                                       | Summary                                                             |
| -------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------- |
| [Authentication (auth)](auth.md)                                                 | `src/modules/auth`                                | Validates the HMAC signature used by all requests                   |
| [Configuration and utilities (common)](common.md)                                | `src/modules/common`, `src/common/api-credential` | Manages API credentials and auxiliary X3 configuration queries      |
| [Users (users)](users.md)                                                        | `src/modules/users`                               | Queries X3 users                                                    |
| [Business Partners (business-partners)](business-partners.md)                    | `src/modules/business-partners`                   | Shared service underlying customers and suppliers                   |
| [Customers (customers)](customers.md)                                            | `src/modules/customers`                           | Queries and creates customers                                       |
| [Suppliers (suppliers)](suppliers.md)                                            | `src/modules/suppliers`                           | Queries and creates suppliers                                       |
| [Companies (companies)](companies.md)                                            | `src/modules/companies`                           | Queries companies (legal holdings)                                  |
| [Sites (sites)](sites.md)                                                        | `src/modules/sites`                               | Queries operational sites                                           |
| [Addresses (addresses)](addresses.md)                                            | `src/modules/addresses`                           | Shared address service associated with any entity                   |
| [Products (products)](products.md)                                               | `src/modules/products`                            | Product CRUD                                                        |
| [Customer categories](customer-categories.md)                                    | `src/modules/customer-categories`                 | Auxiliary customer category service                                 |
| [Supplier categories](supplier-categories.md)                                    | `src/modules/supplier-categories`                 | Auxiliary supplier category service                                 |
| [Product categories](product-categories.md)                                      | `src/modules/product-categories`                  | Auxiliary product category service                                  |
| [Dimensions (dimensions)](dimensions.md)                                         | `src/modules/dimensions`                          | Queries and creates analytical dimensions                           |
| [Dimension types (dimension-types)](dimension-types.md)                          | `src/modules/dimension-types`                     | Queries dimension types configured in X3                            |
| [Payment terms (payment-terms)](payment-terms.md)                                | `src/modules/payment-terms`                       | Queries payment terms                                               |
| [Exchange rates (currency-rate)](currency-rate.md)                               | `src/modules/currency-rate`                       | Queries exchange rates                                              |
| [Sales orders (sales-order)](sales-order.md)                                     | `src/modules/sales-order`                         | Creates and queries sales orders, lines, status, and texts          |
| [Purchase orders (purchase-order)](purchase-order.md)                            | `src/modules/purchase-order`                      | Creates and queries purchase orders and their lines                 |
| [Purchase invoices (purchase-invoice)](purchase-invoice.md)                      | `src/modules/purchase-invoice`                    | Queries purchase invoices _(module currently disabled)_             |
| [Custom purchase invoices (custom-purchase-invoice)](custom-purchase-invoice.md) | `src/modules/custom-purchase-invoice`             | Queries purchase invoices through a custom view/report              |
| [Supplier invoices (supplier-invoice)](supplier-invoice.md)                      | `src/modules/supplier-invoice`                    | Creates and queries supplier invoices                               |
| [Financials (financials)](financials.md)                                         | `src/modules/financials/*`                        | Journal entries, intercompany journal entries, and account balances |
