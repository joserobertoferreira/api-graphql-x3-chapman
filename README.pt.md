<p align="center">
  <img src="./docs/assets/login/logo_chapman.png" width="180" alt="Chapman Logo" />
  &nbsp;&nbsp;&nbsp;
  <img src="./docs/assets/login/logo_gsc_15.png" width="180" alt="GSC Logo" />
</p>

<p align="center">Chapman Integrations API — API GraphQL de integração com o Sage X3, construída em <a href="http://nestjs.com" target="_blank">NestJS</a>.</p>

## Sobre

API GraphQL que expõe os dados do ERP **Sage X3** (clientes, fornecedores, produtos, encomendas, faturas, lançamentos contabilísticos, entre outros) a integrações externas e ao add-in de Excel da Chapman, ligando-se diretamente à base de dados SQL Server do X3 através do [Prisma](https://www.prisma.io/).

📖 **Documentação completa:** consulte o site gerado com [MkDocs](https://www.mkdocs.org/) a partir da pasta [`docs/`](docs/) — visão geral, arquitetura, autenticação e a descrição de cada módulo. Publicado no Cloudflare Pages (ver instruções de deploy do site em [`docs/index.md`](docs/index.md#deploy-desta-documentação-no-cloudflare-pages)).

## Instalação

```bash
npm install
cp .env.example .env   # preencher as variáveis de ambiente (ver docs/index.md)
npm run prisma:generate
```

## Executar

```bash
# desenvolvimento, com reload automático
npm run start:dev

# produção
npm run build
npm run start:prod
```

A API fica disponível em `http://localhost:3001/graphql` (ou na porta definida em `SERVER_PORT`).

## Testes

```bash
npm run test        # testes unitários
npm run test:e2e     # testes end-to-end
npm run test:cov      # cobertura de testes
```

## Documentação

Para a documentação completa da API (arquitetura, autenticação, variáveis de ambiente, deploy e a descrição de cada módulo GraphQL), veja a pasta [`docs/`](docs/), começando por [`docs/index.pt.md`](docs/index.pt.md).

Para gerar e pré-visualizar o site de documentação localmente:

```bash
pip install -r requirements-docs.txt
mkdocs serve   # http://127.0.0.1:8000
```

## Licença

UNLICENSED — uso interno.
