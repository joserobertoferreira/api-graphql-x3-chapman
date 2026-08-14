# Autenticação (auth)

**Código-fonte:** `src/modules/auth`

Módulo transversal responsável por validar a identidade de quem chama a API. Não expõe queries nem mutations GraphQL — atua como _guard_ global, aplicado a todos os pedidos antes de chegarem a qualquer resolver.

## Componentes

| Componente      | Ficheiro                                     | Responsabilidade                                                                                                                                              |
| --------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HmacAuthGuard` | `src/modules/auth/guards/hmac-auth.guard.ts` | Guard global (registado em `main.ts` via `app.useGlobalGuards`). Extrai os cabeçalhos de autenticação do pedido GraphQL e delega a validação no `AuthService` |
| `AuthService`   | `src/modules/auth/auth.service.ts`           | Valida a assinatura HMAC e o timestamp do pedido                                                                                                              |

## Fluxo de validação

1. O guard verifica se o resolver/campo está marcado com o decorator `@Public()` (ver `src/common/decorators/public.decorator.ts`); se estiver, o pedido passa sem autenticação.
2. Caso contrário, extrai os cabeçalhos `X-App-Key`, `X-Client-Id`, `X-Timestamp` e `X-Signature`. A ausência de qualquer um deles resulta em `401 Unauthorized`.
3. O `AuthService`:
   - Confirma que o `X-Timestamp` está dentro da janela `AUTH_SIGNATURE_TTL_SECONDS` (por omissão 300 segundos), para mitigar ataques de repetição.
   - Procura a credencial ativa correspondente ao par `appKey` / `clientId` (via `ApiCredentialService` — ver [common](common.pt.md)).
   - Decifra o segredo da aplicação (guardado encriptado na base de dados) e recalcula a assinatura esperada: `HMAC-SHA256(appKey + clientId + timestamp, appSecret)`.
   - Compara a assinatura recebida com a esperada usando `crypto.timingSafeEqual`, para evitar _timing attacks_.
4. Se válido, os dados do utilizador (`login`) e do sistema de origem (`systemUsed`, ver enum `SystemUsedGQL`) são guardados no contexto do pedido (`RequestContextService`), ficando disponíveis aos resolvers seguintes.

## Como assinar um pedido (exemplo)

```text
message   = appKey + clientId + timestamp
signature = HMAC_SHA256(message, appSecret)   // em hexadecimal
```

Cabeçalhos HTTP a enviar em cada pedido GraphQL:

```
X-App-Key: <app key>
X-Client-Id: <client id>
X-Timestamp: <unix timestamp em segundos>
X-Signature: <assinatura hexadecimal>
X-Excel-Key: <opcional, presente quando o pedido vem do add-in de Excel>
```

As credenciais (`appKey` / `appSecret`) são emitidas através da mutation `createApiCredential`, documentada em [Configuração e utilitários (common)](common.pt.md).

### Rota administrativa

!!! note
Algumas operações internas usam em alternativa o `AdminGuard` (cabeçalho `X-Admin-Key`, comparado com a variável de ambiente `ADMIN_API_KEY`), em vez do fluxo HMAC. Ver [common](common.pt.md#getactivitycodedimension).
