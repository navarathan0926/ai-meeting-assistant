# Access Control

This document records how users are provisioned, how organizations are isolated,
and which API paths are used for org-admin vs platform-admin operations.

## Public signup policy

**Decision:** Public self-registration is **disabled by default**.

| Setting | Storage | Default |
|---------|---------|---------|
| `allowPublicSignup` | `platform_settings` singleton row | `false` |

**Rationale:**
- The app is intended for invited organizations, not open public signup.
- Register and Google OAuth **code paths are kept** but gated at runtime so the
  feature can be re-enabled by SUPERADMIN without redeploying.
- When disabled, only provisioned users can access the app.

**Who can create users:**

| Actor | Creates | How |
|-------|---------|-----|
| SUPERADMIN | Org `ADMIN` | `POST /api/organizations/:id/admins` |
| Org `ADMIN` | Org `USER` | `POST /api/organizations/users` |
| Public visitor | — | Blocked when `allowPublicSignup` is `false` |

**Existing users:** Email/password and Google login continue to work. Google
sign-in links to an existing account by email when the address already exists.

## API path conventions

### `me` — current user only

| Path | Purpose |
|------|---------|
| `GET /api/auth/me` | Authenticated user's profile |

Org resources do **not** use `me` in the path. Org is inferred from the JWT
(`user.organizationId`) for org ADMIN routes.

### Org ADMIN routes (no org id in URL)

| Path | Purpose |
|------|---------|
| `GET/PUT/POST /api/organizations/jira-config` | Org Jira credentials |
| `GET/POST /api/organizations/users` | List/create org users |
| `PATCH /api/organizations/users/:id/suspend` | Suspend USER |
| `PATCH /api/organizations/users/:id/reactivate` | Reactivate USER |
| `DELETE /api/organizations/users/:id` | Delete USER (meetings cascade) |

Org ADMINs cannot target another organization. The server resolves org from the
authenticated user, never from the request body or URL.

### SUPERADMIN routes (org id required)

SUPERADMIN is not tied to one organization (`organizationId` is null). Actions
on a specific org use `:id` in the path:

| Path | Purpose |
|------|---------|
| `GET/POST /api/organizations` | List/create organizations |
| `GET/PATCH /api/organizations/:id/...` | View/suspend/reactivate org |
| `GET/PATCH/DELETE /api/organizations/:id/admins/:userId/...` | List/suspend/reactivate/delete org ADMIN |
| `POST /api/organizations/:id/admins` | Create org ADMIN |

### Platform settings (SUPERADMIN)

| Path | Purpose |
|------|---------|
| `GET/PATCH /api/platform-settings` | Read/update `allowPublicSignup` |
| `GET /api/auth/config` | Public read of signup flag (client gating) |

## Org user management rules

Org ADMINs may manage **USER** accounts in their org only:

- Cannot suspend/delete/reactivate **self**
- Cannot manage other **ADMIN** or **SUPERADMIN** accounts
- Cannot create ADMIN accounts (SUPERADMIN only)
- Delete is hard delete; user meetings cascade via FK

Suspended users (`isActive: false`) cannot authenticate
(`403` with code `USER_SUSPENDED`). The client clears the bearer token and
redirects to login.

## Organization suspension

When a SUPERADMIN suspends an organization (`organizations.isActive = false`,
`status = suspended`), **all users in that org** are blocked from:

- Email/password login
- Google OAuth login
- JWT-protected API requests (re-validated on every request via `validateById`)

SUPERADMIN accounts (`organizationId` is null) are exempt from org checks.

Error code: `ORGANIZATION_SUSPENDED` (HTTP 403).

User-level `isActive` flags are **not** bulk-updated on org suspend/reactivate;
access is enforced by reading org status at auth time.

## Client alignment

HTTP paths in `client/src/lib/api/*.api.ts` mirror server routes exactly.
Marketing and auth pages call `GET /api/auth/config` to hide register CTAs when
public signup is off.
