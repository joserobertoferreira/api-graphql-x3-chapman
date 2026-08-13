# Configuração e utilitários (common)

**Código-fonte:** `src/modules/common`, `src/common/api-credential`

Agrupa operações transversais que não pertencem a nenhuma entidade de negócio específica: emissão de credenciais de API e consultas auxiliares de configuração do X3.

## Credenciais de API (`src/common/api-credential`)

Gere o ciclo de emissão das credenciais (`appKey` / `appSecret`) usadas na autenticação HMAC (ver [Autenticação](auth.md)). As credenciais estão associadas a um login/password válidos de utilizador do X3 — o serviço valida essas credenciais contra a tabela de utilizadores do X3 (senha decifrada com o parâmetro `CRYPTSECRE` do X3) antes de gerar qualquer chave.

| Operação | Tipo | Nome GraphQL | Descrição |
|---|---|---|---|
| `create` | Mutation | `createApiCredential` | Valida o login/password do X3 e gera um novo par `appKey`/`appSecret` para essa conta. Falha se já existirem credenciais para o utilizador |
| `get` | Query | `getApiCredential` | Reemite as credenciais existentes de um utilizador, mediante validação do login/password. Uso interno, apenas para configuração inicial |

Ambas as operações estão marcadas com `@Public()` — não exigem assinatura HMAC prévia (fazem sentido para *provisionar* a própria credencial), mas exigem login/password válidos do X3.

**Input (`createApiCredential` / `getApiCredential`):**

| Campo | Tipo | Descrição |
|---|---|---|
| `login` | `String` | Login do utilizador X3 (normalizado para minúsculas) |
| `password` | `String` | Password do utilizador X3 |

**Resposta (`ApiCredentialEntity`):**

| Campo | Descrição |
|---|---|
| `name` | Nome/descrição do utilizador |
| `clientId` | Identificador de cliente gerado (UUID sem hífens) |
| `appKey` | Chave da aplicação — usar no cabeçalho `X-App-Key` |
| `appSecret` | Segredo em texto simples — **só é devolvido nesta resposta**, guardado encriptado na base de dados a partir daqui |
| `system` | Sistema de origem da credencial (`sageX3`, `magma`, `pioneer` — enum `SystemUsed`) |

```graphql
mutation {
  createApiCredential(input: { login: "utilizador.x3", password: "********" }) {
    clientId
    appKey
    appSecret
    system
  }
}
```

!!! warning "Guarde o `appSecret` imediatamente"
    O `appSecret` só é devolvido em texto simples nesta chamada. A partir daí, apenas a versão encriptada fica guardada — não existe forma de o recuperar posteriormente, apenas gerar um novo (repetindo o fluxo de `getApiCredential`, que decifra e devolve o segredo já existente).

## Consultas auxiliares de configuração (`src/modules/common`)

| Operação | Tipo | Nome GraphQL | Descrição |
|---|---|---|---|
| `getActivityCodeDimension` | Query | `getActivityCodeDimension` | Devolve o tamanho de ecrã/dimensão configurado no X3 para um determinado código de atividade |

### getActivityCodeDimension

Esta query está protegida pelo `AdminGuard` (cabeçalho `X-Admin-Key`, ver [Autenticação](auth.md#rota-administrativa)) em vez do fluxo HMAC normal, por se destinar a ferramentas internas de configuração.

```graphql
query {
  getActivityCodeDimension(input: { activityCode: "COD" }) {
    screenSize
  }
}
```
