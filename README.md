<p align="center">
  <img src="./docs/assets/login/logo_chapman.png" width="180" alt="Chapman Logo" />
  &nbsp;&nbsp;&nbsp;
  <img src="./docs/assets/login/logo_gsc_15.png" width="180" alt="GSC Logo" />
</p>

<p align="center">Chapman Integrations API — GraphQL integration API for Sage X3, built with <a href="http://nestjs.com" target="_blank">NestJS</a>.</p>

## About

GraphQL API exposing data from the **Sage X3** ERP (customers, suppliers, products, orders, invoices, accounting entries, and more) to external integrations and the Chapman Excel add-in, connecting directly to the X3 SQL Server database through [Prisma](https://www.prisma.io/).

📖 **Complete documentation:** see the site generated with [MkDocs](https://www.mkdocs.org/) from the [`docs/`](docs/) folder — overview, architecture, authentication, and a description of each module. Published on Cloudflare Pages (see the site deployment instructions in [`docs/index.md`](docs/index.md#deploy-desta-documentação-no-cloudflare-pages)).

## Installation

```bash
npm install
cp .env.example .env   # fill in the environment variables (see docs/index.md)
npm run prisma:generate
```

## Running

```bash
# development, with automatic reload
npm run start:dev

# production
npm run build
npm run start:prod
```

The API is available at `http://localhost:3001/graphql` (or on the port defined by `SERVER_PORT`).

## Tests

```bash
npm run test        # unit tests
npm run test:e2e     # end-to-end tests
npm run test:cov      # test coverage
```

## Documentation

For the complete API documentation (architecture, authentication, environment variables, deployment, and a description of each GraphQL module), see the [`docs/`](docs/) folder, starting with [`docs/index.md`](docs/index.md).

To generate and preview the documentation site locally:

```bash
pip install -r requirements-docs.txt
mkdocs serve   # http://127.0.0.1:8000
```

## Licence

UNLICENSED — internal use.
