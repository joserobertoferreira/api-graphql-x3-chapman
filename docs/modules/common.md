# Configuration and utilities (common)

**Source code:** `src/modules/common`, `src/common/api-credential`

Groups cross-cutting operations that do not belong to any specific business entity: issuing API credentials and auxiliary X3 configuration queries.

## API credentials (`src/common/api-credential`)

Manages the credential issuance lifecycle (`appKey` / `appSecret`) used for HMAC authentication (see [Authentication](auth.md)). Credentials are associated with valid X3 user login/password credentials — the service validates them against the X3 user table (password decrypted using the X3 `CRYPTSECRE` parameter) before generating any key.

| Operation | Type | GraphQL name | Description |
|---|---|---|---|
| `create` | Mutation | `createApiCredential` | Validates the X3 login/password and generates a new `appKey`/`appSecret` pair for that account. Fails if credentials already exist for the user |
| `get` | Query | `getApiCredential` | Reissues an existing user's credentials after validating the login/password. Internal use, only for initial configuration |

Both operations are marked with `@Public()` — they do not require a prior HMAC signature (they are intended to *provision* the credential itself), but they do require valid X3 login/password credentials.

**Input (`createApiCredential` / `getApiCredential`):**

| Field | Type | Description |
|---|---|---|
| `login` | `String` | X3 user login (normalized to lowercase) |
| `password` | `String` | X3 user password |

**Response (`ApiCredentialEntity`):**

| Field | Description |
|---|---|
| `name` | User name/description |
| `clientId` | Generated client identifier (UUID without hyphens) |
| `appKey` | Application key — use in the `X-App-Key` header |
| `appSecret` | Plain-text secret — **only returned in this response**, stored encrypted in the database from this point onward |
| `system` | Credential source system (`sageX3`, `magma`, `pioneer` — `SystemUsed` enum) |

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

!!! warning "Store the `appSecret` immediately"
    The `appSecret` is only returned in plain text in this call. From then on, only the encrypted version is stored — there is no way to retrieve it later, only to generate a new one (by repeating the `getApiCredential` flow, which decrypts and returns the existing secret).

## Auxiliary configuration queries (`src/modules/common`)

| Operation | Type | GraphQL name | Description |
|---|---|---|---|
| `getActivityCodeDimension` | Query | `getActivityCodeDimension` | Returns the screen size/dimension configured in X3 for a given activity code |

### getActivityCodeDimension

This query is protected by `AdminGuard` (`X-Admin-Key` header, see [Authentication](auth.md#administrative-route) instead of the normal HMAC flow, because it is intended for internal configuration tools.

```graphql
query {
  getActivityCodeDimension(input: { activityCode: "COD" }) {
    screenSize
  }
}
```
