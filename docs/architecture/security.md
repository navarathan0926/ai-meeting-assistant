# Security Architecture

## Authentication

### Strategy
All API routes (except health check and OAuth callbacks) require a valid JWT
in the `Authorization: Bearer <token>` header.

### JWT Flow
1. User logs in via email/password (`POST /api/auth/login`) or Google OAuth.
2. Server validates credentials, signs a JWT with `JWT_SECRET`.
3. Client stores the JWT (in memory or `localStorage`) and attaches it to
   every subsequent request via the Axios instance in `lib/axios.ts`.
4. The `JwtAuthGuard` (applied globally via `APP_GUARD` or per-route) validates
   the token on every protected request.

### Google OAuth
- Passport `GoogleStrategy` handles the OAuth 2.0 consent flow.
- On success, the strategy upserts a `User` record using `googleId` and
  returns a signed JWT.
- The client receives the JWT via a redirect query param:
  `FRONTEND_URL/login?code=<oauth-code>`.
- **New Google accounts** are only created when `platform_settings.allowPublicSignup`
  is `true`. Existing users can always sign in with Google.

### Public signup gate
- Platform-wide toggle stored in `platform_settings.allowPublicSignup`
  (default `false`).
- SUPERADMIN reads/updates via `GET/PATCH /api/platform-settings`.
- Public clients read via `GET /api/auth/config` (no auth).
- When disabled, `POST /api/auth/register` and the Google **new-user** branch
  return **403 Forbidden**. Register/OAuth code paths remain in the codebase.

### Suspended users
- Users have `isActive` (default `true`). Org ADMINs suspend/reactivate USER
  accounts via `/api/organizations/users/:id/suspend|reactivate`.
- Suspended users cannot log in via password or Google (`403 Forbidden`).

### Token Expiry
- JWT expiry is configured via `JWT_EXPIRY` env var (recommended: `7d` for
  development, `1d` for production).
- There is no refresh token mechanism yet — on expiry the user must
  re-authenticate. Add refresh tokens before production if session longevity
  is a concern.

---

## Authorization

### Role-Based Access Control (RBAC)

Introduced in Phase 10. Three roles, ordered by permission level:

| Role | Can do |
|------|--------|
| `USER` | Upload meetings, view own meetings, edit draft extracted items |
| `ADMIN` | Everything USER can do + approve items, configure org Jira/integrations, manage org users |
| `SUPERADMIN` | Manage all organizations, platform settings, create org ADMINs; no org meeting access |

### Guards

| Guard | Location | Purpose |
|-------|----------|---------|
| `JwtAuthGuard` | `common/guards/auth.guard.ts` | Validates JWT on every protected route |
| `RolesGuard` | `common/guards/roles.guard.ts` | Checks `@Roles()` / `@RequireRoles()` on endpoint |
| `OrganizationGuard` | `organizations/` (Phase 11) | Ensures resource belongs to requester's org |

### Decorator Usage

```typescript
// Require authentication only
@Auth()

// Require ADMIN (auth + role check)
@RequireRoles(UserRole.Admin)

// Compose manually if needed
@Auth()
@Roles(UserRole.Admin)
@UseGuards(RolesGuard)
```

### Resource Ownership

- A `USER` can only access meetings they uploaded (`meeting.userId === req.user.id`). Cross-user access returns **403 Forbidden**.
- An `ADMIN` can access all meetings and extracted items within their organization (`organizationId` match).
- A `SUPERADMIN` manages platform orgs and settings but cannot access organization
  meetings via the standard meeting APIs (`assertMeetingAccess` blocks SUPERADMIN).
- `OrganizationGuard` (Phase 11) formalizes org-level scoping on meeting and
  extracted-item routes.

See also [`access-control.md`](access-control.md) for org-admin API paths and
the public signup decision record.

---

## Secrets Management

### Environment Variables
All secrets are stored as environment variables, never in source code.

| Secret | Notes |
|--------|-------|
| `JWT_SECRET` | Long random string, rotate if compromised |
| `OPENAI_API_KEY` | Never log; set spend limits on the OpenAI dashboard |
| `AZURE_STORAGE_CONNECTION_STRING` | Contains SAS key; rotate via Azure portal |
| `GOOGLE_CLIENT_SECRET` | Google OAuth app secret |
| `DB_PASSWORD` | PostgreSQL password |
| `REDIS_URL` | Contains Upstash credentials; use `rediss://` (TLS) |

### Encrypted Credentials in DB
Credentials stored in the database (Jira API tokens, Zoom OAuth tokens,
integration adapter credentials) must be encrypted at rest:

- Use AES-256-GCM encryption via Node.js `crypto` module.
- The encryption key is an env var (`ENCRYPTION_KEY` — 32 bytes hex string).
- Never store plain-text credentials in the DB.
- Decrypt only at the point of use; never log decrypted values.

```typescript
// server/src/common/utils/crypto.util.ts
function encrypt(plaintext: string, keyHex: string): string { /* AES-256-GCM */ }
function decrypt(ciphertext: string, keyHex: string): string { /* AES-256-GCM */ }
```

---

## Input Validation

- All request bodies are validated via NestJS `ValidationPipe` with
  `class-validator` decorators on DTOs.
- `ValidationPipe` is applied globally in `main.ts` with `whitelist: true`
  (strips unknown properties) and `forbidNonWhitelisted: true`.
- File upload size and type are validated by Multer configuration on the
  upload endpoint.

---

## CORS

CORS is configured in `main.ts` to allow requests only from `CLIENT_URL`:

```typescript
app.enableCors({
  origin: process.env.CLIENT_URL,
  credentials: true,
});
```

In production, `CLIENT_URL` should be the exact frontend domain (no wildcard).

---

## Webhook Signature Verification

### Zoom Webhooks (Phase 12)
Zoom signs every webhook payload with a shared secret. The webhook controller
must verify the `x-zm-signature` header before processing:

```typescript
const expectedSig = crypto
  .createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET)
  .update(`v0:${timestamp}:${rawBody}`)
  .digest('hex');
if (`v0=${expectedSig}` !== receivedSig) throw new UnauthorizedException();
```

### Stripe Webhooks (Phase 14)
Stripe provides a `stripe.webhooks.constructEvent()` helper that validates
the `Stripe-Signature` header. Never process webhook events without this check.

### Outbound Webhooks (Phase 18)
Outbound webhook deliveries include an `X-Webhook-Signature` header (HMAC-SHA256
of the payload using the organization's webhook secret) so receiving systems
can verify the payload origin.

---

## Sensitive Data Handling

- **Audio files**: Stored in Azure Blob Storage. Access is via time-limited
  SAS URLs generated per request, not permanent public URLs.
- **Transcripts and summaries**: Stored in PostgreSQL. Access is scoped to
  the owning user/organization via the API.
- **OpenAI API calls**: Audio and transcript content is sent to OpenAI. Review
  OpenAI's data usage policy and inform users. Add opt-out if required by
  regulation.
- **PII in transcripts**: No automatic PII scrubbing is implemented. Future
  phases may add a PII redaction step in the extraction pipeline.

---

## Security Checklist Per Phase

| Phase | Security item |
|-------|--------------|
| 0–7 | JWT auth, CORS, input validation, Multer file type/size limits |
| 8–9 | Jira API token stored in env var (not DB) — single account, acceptable |
| 10 | `RolesGuard` + `@Roles()` decorator for approve endpoint |
| 11 | Org-level data isolation (`OrganizationGuard`); Jira credentials encrypted in DB |
| 12 | Zoom webhook signature verification; OAuth token encryption |
| 13 | No new attack surface (read-only Jira search) |
| 14 | Stripe webhook signature verification; subscription status enforced server-side |
| 15 | WebSocket auth: validate JWT on WS connection handshake |
| 16 | Sentry: no PII in error payloads; Bull Board behind SUPERADMIN guard |
| 17 | All adapter credentials encrypted; new adapter APIs follow same pattern |
| 18 | Outbound webhook HMAC signing; review blast radius of microservice split |
