# Authentication (auth)

**Source code:** `src/modules/auth`

Cross-cutting module responsible for validating the identity of API callers. It does not expose GraphQL queries or mutations — it acts as a global *guard*, applied to all requests before they reach any resolver.

## Components

| Component | File | Responsibility |
|---|---|---|
| `HmacAuthGuard` | `src/modules/auth/guards/hmac-auth.guard.ts` | Global guard (registered in `main.ts` via `app.useGlobalGuards`). Extracts the authentication headers from the GraphQL request and delegates validation to `AuthService` |
| `AuthService` | `src/modules/auth/auth.service.ts` | Validates the HMAC signature and request timestamp |

## Validation flow

1. The guard checks whether the resolver/field is marked with the `@Public()` decorator (see `src/common/decorators/public.decorator.ts`); if so, the request proceeds without authentication.
2. Otherwise, it extracts the `X-App-Key`, `X-Client-Id`, `X-Timestamp`, and `X-Signature` headers. Missing any of them results in `401 Unauthorized`.
3. `AuthService`:
      - Confirms that `X-Timestamp` is within the `AUTH_SIGNATURE_TTL_SECONDS` window (300 seconds by default), to mitigate replay attacks.
      - Looks up the active credential corresponding to the `appKey` / `clientId` pair (via `ApiCredentialService` — see [common](common.md)).
      - Decrypts the application secret (stored encrypted in the database) and recalculates the expected signature: `HMAC-SHA256(appKey + clientId + timestamp, appSecret)`.
      - Compares the received signature with the expected one using `crypto.timingSafeEqual`, to prevent *timing attacks*.
4. If valid, the user data (`login`) and the originating system (`systemUsed`, see the `SystemUsedGQL` enum) are stored in the request context (`RequestContextService`), making them available to subsequent resolvers.

## How to sign a request (example)

```text
message   = appKey + clientId + timestamp
signature = HMAC_SHA256(message, appSecret)   // in hexadecimal
```

HTTP headers to send with each GraphQL request:

```
X-App-Key: <app key>
X-Client-Id: <client id>
X-Timestamp: <unix timestamp in seconds>
X-Signature: <hexadecimal signature>
X-Excel-Key: <optional, present when the request comes from the Excel add-in>
```

Credentials (`appKey` / `appSecret`) are issued through the `createApiCredential` mutation, documented in [Configuration and utilities (common)](common.md).

### Administrative route

!!! note
    Some internal operations alternatively use `AdminGuard` (`X-Admin-Key` header, compared with the `ADMIN_API_KEY` environment variable), instead of the HMAC flow. See [common](common.md#getactivitycodedimension).
