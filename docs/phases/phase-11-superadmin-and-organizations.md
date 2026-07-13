# Phase 11: SUPERADMIN Role and Multi-Organization Support

## Goal
Turn the single default organization from Phase 10 into real multi-tenancy.
Add a SUPERADMIN role for platform-level management across all
organizations. Each organization should be able to configure its own Jira
connection (base URL, credentials, project mappings) rather than sharing
the single hardcoded account from Phases 8 and 9.

Organization **ADMIN** users manage their org's Jira account through the
existing settings area (extended in this phase). Credentials are sensitive
and must be encrypted at rest — see section 2a below.

### Access model (carry forward from Phase 10)

| Role | Within an organization |
|------|------------------------|
| `USER` | Own meetings only — cannot view or act on other users' uploads |
| `ADMIN` | All org meetings — view, edit extracted items, approve, delete |
| `SUPERADMIN` | All orgs — platform management only; not a substitute for org ADMIN |

Do not broaden `USER` to org-wide meeting visibility in this phase.
Multi-tenancy isolation is at the **organization** boundary; within an org,
privacy remains **owner + admin**.

## Before you start
1. Review the organization scaffolding added in Phase 10 (if it was built),
   confirm `organization_id` exists on `users`, `meetings`, and `extracted_items`.
2. Review `server/src/common/access/meeting-access.ts` — all meeting and
   extracted-item access flows through `assertMeetingAccess`. Phase 11
   extends this for `SUPERADMIN` bypass where appropriate.
3. Review every existing guard and service to identify anywhere Jira
   credentials or project keys are currently hardcoded from environment
   variables — these all need to move to per-organization configuration.
4. List every query across the codebase that touches `meetings` or
   `extracted_items`, to confirm each one will be properly scoped by
   `organization_id` once real multi-tenancy is active.

## What to build

### 1. Role enum update
- Extend the role enum from **Phase 10** to include `SUPERADMIN`.
- SUPERADMIN is not tied to a specific organization; `organization_id`
  should be nullable for this role only. Enforce at the application
  level (validation on user creation / update).

### 2. Organization entity expansion
- Organization entity: add `jira_base_url`, `jira_auth_type` (`api_token`
  first), `jira_email`, `jira_api_token` (encrypted ciphertext column),
  `is_active`, `status`, `created_at`.
- Project mappings / AI context: reuse Phase 9 `project_contexts`, add
  `organizationId` (see section 7). Do not duplicate as a separate jsonb
  blob unless you prefer it — table is fine.

### 2a. Storing and retrieving org Jira credentials (sensitive data)

Each org may use a **different Jira Cloud account**. Org ADMINs enter
credentials in the settings portal; the server persists them encrypted and
loads them only when making Jira API calls for that org.

**What to store (on `organizations` or a dedicated credentials table):**

| Column | Stored as | Notes |
|--------|-----------|-------|
| `jira_base_url` | Plain text | e.g. `https://acme.atlassian.net` — not secret |
| `jira_email` | Plain text | Jira account email for Basic auth |
| `jira_api_token` | **Encrypted ciphertext** | Never plain text in DB or logs |
| `jira_auth_type` | Enum | Start with `api_token`; OAuth later if needed |

**Encryption pattern** (see `docs/architecture/security.md`):

- Create `server/src/common/utils/crypto.util.ts` with AES-256-GCM:
  - `encrypt(plaintext: string): string` — returns `iv:authTag:ciphertext`
    (hex-encoded parts, single varchar column value).
  - `decrypt(ciphertext: string): string` — reverses at point of use only.
- Encryption key: env var `ENCRYPTION_KEY` (32-byte hex string). **Not**
  stored in the database. Document in `.env.example` and deployment docs.
- On **save** (ADMIN updates Jira settings):
  1. Validate DTO (URL format, email, non-empty token on create/rotate).
  2. `encrypt(dto.jiraApiToken)` before `repository.save()`.
  3. Never return the decrypted token in API responses — use a masked
     placeholder (e.g. `"configured": true` or `"••••••••"`).
  4. Support token rotation: empty token in PATCH means "keep existing";
     non-empty means re-encrypt and replace.
- On **retrieve** (Jira API call for a meeting/item):
  1. Resolve `organizationId` from the meeting or extracted item.
  2. Load organization row (credentials selected only in service layer).
  3. `decrypt(org.jiraApiToken)` immediately before building the HTTP
     Basic auth header — do not cache decrypted values in Redis or instance
     fields beyond the request/job scope.
  4. Never log decrypted tokens, full auth headers, or raw env secrets.

**API surface for org ADMIN settings:**

- `GET /api/organizations/me/jira-config` — returns base URL, email,
  `configured: boolean`; **no** API token.
- `PUT /api/organizations/me/jira-config` — ADMIN only; accepts base URL,
  email, and optional new API token; encrypts before save.
- `POST /api/organizations/me/jira-config/test` (optional) — verifies
  credentials against Jira before persisting.

**Migration from env-based Jira (Phases 8–9):**

- Copy current `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_KEY` into the
  default organization's encrypted columns so existing deployments keep
  working after migration.
- Keep env vars as a **fallback** only during transition if needed, but
  prefer org DB credentials as the single source of truth once Phase 11
  ships.

**Frontend (org ADMIN portal / settings):**

- Password-style input for API token; never pre-fill with stored value.
- Show "Token saved" indicator when `configured` is true.
- All writes over HTTPS; no token in client `localStorage` beyond the
  session JWT.

### 3. OrganizationGuard
- Add a guard, separate from RolesGuard, that checks the requested
  resource's organization_id matches the requester's organization_id.
- SUPERADMIN bypasses this guard entirely.
- Apply this guard alongside RolesGuard on all meeting and extracted_item
  endpoints.

### 4. Update JiraService
- `JiraService` should no longer read a single hardcoded Jira account from
  environment variables. It should accept an `organization_id` (or a
  resolved organization entity) and load that organization's Jira
  credentials and project mappings before making any Jira API call.
- Decrypt credentials only at the point of use, never log them.

### 5. SUPERADMIN endpoints and UI
- Endpoints to list all organizations, create a new organization, suspend
  or reactivate one, and view basic usage stats (meeting count, extracted
  item count) per organization.
- Endpoint to create the first ADMIN user for a newly created
  organization, since a new org needs at least one admin to configure
  Jira and manage users.
- A simple SUPERADMIN dashboard in the Next.js app, separate route,
  guarded so only SUPERADMIN can access it, listing organizations with
  basic actions (suspend, view details).

### 6. Organization-scoped Jira configuration UI (for ADMIN)
- Extend the existing settings page (ADMIN only) into the org admin portal:
  Jira base URL, email, API token (password field — never echo stored token).
- Fetch that org's Jira projects (`listProjects`, now using decrypted org
  credentials server-side).
- Same page: edit `aiContext` per project (Phase 9 `project_contexts`, now
  scoped by `organizationId`).
- UI copy should clarify that credentials are encrypted in the database
  and only org admins can view or change them.

### 7. Project AI context → per organization

Phase 9 stores `project_contexts` globally (one Jira account). Here:

- Add `organizationId` FK to `project_contexts` (unique on
  `(organizationId, projectKey)`).
- Migrate existing rows onto the default organization.
- Extraction for a meeting:
  1. Read `meeting.organizationId`
  2. Load that org's Jira credentials
  3. Load that org's projects + `aiContext`
  4. Inject only those into the prompt
- Org A never sees Org B's projects or contexts.

No per-meeting context config. Meeting → org → org's project contexts → prompt.

### 8. Basic observability and cost tracking
- Add a lightweight usage tracking mechanism, this does not need to be a
  separate monitoring stack, a new table or a set of counters is enough.
- Track OpenAI token usage per organization, per meeting, both for the
  summarization call and the extraction call. Store input and output
  token counts if the OpenAI response includes them, and a rough cost
  estimate based on current pricing.
- Track BullMQ job failures with the reason, queue name, and related
  meeting or organization, so failed extraction or summarization jobs
  are visible somewhere other than server logs.
- Track Jira API failures (creation or update calls that returned an
  error) with organization, extracted item id, and the error message.
- Surface all three of these on the SUPERADMIN dashboard, a simple table
  or count per organization is enough for now, no need for charts or
  time series graphs at this stage.
- This is meant to give visibility into cost and reliability once
  multiple organizations are live, not to be a full production
  monitoring solution, keep the scope small.

## Explicitly out of scope for this phase
- Payment or billing — that is Phase 14.
- Direct meeting platform integrations — that is Phase 12.
- Org-wide meeting library for `USER` role (owner-only access stays).

## Acceptance criteria
- Two orgs configure separate Jira accounts; issues never cross orgs.
- Org Jira API tokens are stored encrypted; API responses never return
  decrypted tokens; logs never contain plaintext credentials.
- Extraction for an org meeting only receives that org's projects +
  `aiContext` in the prompt.
- SUPERADMIN can manage all orgs from a dedicated dashboard.
- Org ADMIN can save Jira credentials via settings; subsequent Jira calls
  use that org's account.
- Meeting / extracted_item queries scoped by organization — verified with
  two orgs, two users, no data leaks.
- `USER` in org A cannot see meetings uploaded by another `USER` in org A;
  `ADMIN` in org A can view, edit, approve, and delete those meetings.
