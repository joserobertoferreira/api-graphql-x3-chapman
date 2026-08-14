# Business Partners (business-partners)

**Source code:** `src/modules/business-partners`

Shared internal service — **does not expose GraphQL resolvers directly**. In X3, customers and suppliers share the same base entity (`BusinessPartner`, `BPARTNER` table); this module centralizes access to that entity and is consumed by the [Customers](customers.md) and [Suppliers](suppliers.md) modules, among others (e.g. resolving the VAT number/`europeanUnionVatNumber` via `DataLoader`).

## `BusinessPartnerService`

| Method | Description |
|---|---|
| `businessPartnerExists(code)` | Checks whether a business partner with the given code exists |
| `findBusinessPartnerByCode(code, include?)` | Retrieves a business partner by code, with the option to include relations (e.g. addresses) |
| `findBusinessPartners(args)` | Searches for business partners with Prisma filters, sorting, and pagination |
| `createBusinessPartner(data)` | Creates a new business partner record |
| `updateBusinessPartner(code, data)` | Updates an existing business partner |
| `deleteBusinessPartner(code)` | Deletes a business partner |
| `isIntersiteTransaction(originSite, senderType, sender)` | Determines whether a transaction (order) is *intersite*/*intercompany*, validating whether the originating site and the business partner (customer or supplier) belong to different sites/companies, and whether the corresponding commercial authorizations exist |

## Business rule: intersite/intercompany transactions

`isIntersiteTransaction` is used by the [Sales Orders](sales-order.md) and [Purchase Orders](purchase-order.md) modules to detect scenarios where the originating site of an order is itself also a business partner (e.g. a branch that purchases from another branch of the group). In such cases it validates:

- Whether the business partner associated with the originating site is active and properly configured as a customer or supplier.
- Whether there is a commercial authorization between the company of the sales/purchasing site and the business partner (`CompanyService.companySiteThirdPartyAuthorization`).
- Whether the business partner's site is configured for sales or purchasing, depending on the transaction direction.
- Whether the legal company of the two sites is different, marking the transaction as *intercompany*.
