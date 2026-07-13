# Phase 10: Roles (USER, ADMIN) and Admin-Only Jira Approval

**Implementation status:** Complete.

## Goal

Introduce a role system with `USER` and `ADMIN` (`SUPERADMIN` comes in
Phase 11 — do not build it yet). From this phase on, only `ADMIN` can
approve and send items to Jira. `USER` can still upload recordings and
edit extracted draft items, but cannot approve them.

Organizations are not introduced in this phase. Keep everything scoped to
a single implicit organization for now; Phase 11 will formalize multi-
tenancy. If it is low effort, add an `organization_id` column now with a
single default organization row, since that will make Phase 11 migrations
easier, but do not build organization management UI yet.

## Current state (pre-Phase 10)

Use this as the baseline when implementing. Nothing below should be
replaced — extend it.

### Authentication

| Piece | Path |
|-------|------|
| User entity (no `role`, no `organization_id`) | `server/src/auth/entities/user.entity.ts` |
| JWT strategy | `server/src/auth/strategies/jwt.strategy.ts` |
| `@Auth()` decorator (JWT only) | `server/src/common/decorators/auth.decorator.ts` |
| `AuthGuard` | `server/src/common/guards/auth.guard.ts` |
| Profile endpoint | `GET /api/auth/me` → `server/src/auth/auth.controller.ts` |
| Profile shape (no role) | `server/src/auth/interfaces/user-profile.interface.ts` |
| Client auth types | `client/src/types/auth.ts` |
| Client session | `client/src/providers/AuthProvider.tsx` |

### Authorization today (ownership only)

All protected routes use `@Auth()` — JWT validation only. There is no
`RolesGuard`, no `@Roles()` decorator, and no organization scoping.

| Resource | Enforcement | Path |
|----------|-------------|------|
| Meetings | `meeting.userId === req.user.id` | `server/src/meetings/meetings.service.ts` (`assertOwned`) |
| Extracted items | Parent meeting must be owned | `server/src/extracted-items/extracted-items.service.ts` (`findOwnedItem`) |
| Jira project context | Any authenticated user | `server/src/jira/jira.controller.ts` |

### Endpoints that need role changes

| Method | Route | Controller | Today |
|--------|-------|------------|-------|
| `POST` | `/extracted-items/:id/approve` | `extracted-items.controller.ts` | Owner can approve → queues Jira send |
| `PATCH` | `/extracted-items/:id` | `extracted-items.controller.ts` | Owner can edit drafts |
| `PATCH` | `/extracted-items/:id/reject` | `extracted-items.controller.ts` | Owner can reject drafts |
| `PUT` | `/jira/projects/:key/context` | `jira.controller.ts` | Any authenticated user (should become ADMIN-only) |

Jira issue creation is triggered indirectly: `approve` →
`JiraSendService.enqueueSend` → `jira-send.processor.ts`. No separate
public endpoint creates issues; guarding `approve` is sufficient for Phase
10.

### Frontend today

| Piece | Path | Today |
|-------|------|-------|
| Approve / reject buttons | `client/src/components/extracted-items/ExtractedItemsReview.tsx` | Shown to all authenticated users |
| Jira project context settings | `client/src/app/(app)/settings/page.tsx`, `ProjectContextSettings.tsx` | No role gate |
| Account header | `client/src/app/(app)/dashboard/page.tsx` | Shows name only, no role badge |

### Migrations (existing — none for roles/orgs)

Latest migration: `1787000000000-AddMultiProjectExtractionFields.ts` (Phase
9). No `role` column or `organizations` table exists yet.

## Before you start

1. Read the auth module end-to-end — JWT via `@Auth()`, not sessions.
   Do **not** replace the auth mechanism; extend `User`, `/auth/me`, and
   client types.
2. Read `server/src/extracted-items/extracted-items.controller.ts` and
   `extracted-items.service.ts` — all four item endpoints and the
   ownership helpers.
3. Read `server/src/jira/jira.controller.ts` and
   `client/src/components/extracted-items/ExtractedItemsReview.tsx` for
   approve UI and Jira settings touchpoints.
4. Skim `docs/architecture/security.md` and `database-schema.md` — they
   describe the **target** RBAC model. Update both docs when this phase
   ships so they match the implementation.
5. Confirm Phase 9 (multi-project Jira) is working — approve flow depends
   on `finalProjectKey` / `suggestedProjectKey` resolution in
   `ExtractedItemsService.approve`.

## What to build

### 1. Role column and enum

- Add `server/src/auth/enums/user-role.enum.ts` with `USER` and `ADMIN`
  only.
- Add a `role` column to `users`, enum `USER` | `ADMIN`, default `USER`.
- New migration (e.g. `1788000000000-AddUserRole.ts`):
  - Create PostgreSQL enum `user_role`.
  - Add `role` column, default `USER`.
  - Backfill all existing users as `USER`.
- Default new signups (local + Google) to `USER` in
  `server/src/auth/auth.service.ts`.
- Expose `role` on `UserProfileResponse` and `GET /api/auth/me`.
- Add `role` to `client/src/types/auth.ts` and ensure `AuthProvider`
  receives it from `fetchCurrentUser`.
- **Do not** add `role` to the JWT payload unless you have a concrete
  need — loading from DB on `/auth/me` is enough for the client; guards
  should read `req.user.role` from the JWT strategy's user lookup.
- After migration, manually set your own account to `ADMIN` in the
  database for testing.

### 2. Optional organization scaffolding

Low-effort prep for Phase 11 (recommended if migration is straightforward):

- New `organizations` table: `id`, `name`, `created_at`.
- Insert one default row (e.g. `"Default Organization"`).
- Add nullable `organization_id` (FK) to `users`, `meetings`, and
  `extracted_items`; backfill all existing rows to the default org.
- Set `organization_id` NOT NULL after backfill (except defer
  `SUPERADMIN` nullable handling to Phase 11).
- No organization CRUD UI, no `OrganizationGuard` yet — Phase 11.

If org scaffolding is skipped, `ADMIN` "act on any item" means any meeting
in the single-tenant app (broader than owner-only `USER`). Document the
choice in the PR.

### 3. Guards and service-level checks

Create under `server/src/common/` (or `server/src/auth/guards/` — pick one
and stay consistent with `docs/architecture/security.md`):

- `roles.decorator.ts` — `@Roles(...roles: UserRole[])`
- `roles.guard.ts` — `RolesGuard` reading roles from `req.user`

Wire `RolesGuard` alongside existing `AuthGuard`:

```typescript
@Auth()
@Roles(UserRole.ADMIN)
@UseGuards(RolesGuard) // or compose inside @Auth() if you extend the decorator
@Post(':id/approve')
```

**ADMIN-only:**

- `POST /extracted-items/:id/approve`
- `PUT /jira/projects/:key/context` (Jira AI context configuration from
  Phase 9)

**USER and ADMIN (with ownership rules):**

- `PATCH /extracted-items/:id` (edit draft)
- `PATCH /extracted-items/:id/reject`
- `GET /extracted-items/meeting/:meetingId`

Ownership logic in `ExtractedItemsService`:

- `USER`: keep current behavior — only items whose parent meeting has
  `userId === req.user.id` (and, if org scaffolding exists,
  `organization_id === req.user.organization_id`).
- `ADMIN`: may act on any item in their organization. Without org
  scaffolding, any item in the app.
- Return `403 Forbidden` (not `404`) when a `USER` hits another user's
  item, so the role boundary is explicit.

The reject action for a `USER` may be renamed to **"Dismiss"** in frontend
copy only; keep `ExtractedItemStatus.Rejected` as the status value. Add a
brief code comment in `ExtractedItemsReview.tsx` if you rename the label.

### 4. Frontend changes

- `ExtractedItemsReview.tsx`: hide the Approve button when
  `user.role !== 'ADMIN'`. Keep edit fields and Dismiss/Reject for
  `USER`.
- `settings/page.tsx` / `ProjectContextSettings.tsx`: show Jira context
  editing only for `ADMIN`; `USER` sees read-only or a short message.
- Dashboard header (`dashboard/page.tsx`): show role badge next to the
  signed-in name, e.g. `ADMIN` / `USER`.
- No user-management UI. Assign `ADMIN` via SQL or a one-off script.

### 5. Tests

Add or extend specs:

- `extracted-items.controller.spec.ts` — `USER` gets `403` on approve;
  `ADMIN` succeeds.
- `extracted-items.service.spec.ts` — ownership: `USER` cannot edit
  another user's item; `ADMIN` can (within org when scaffolded).
- `jira.controller.spec.ts` (or service spec) — non-admin cannot update
  project context.
- Client: `ExtractedItemsReview.spec.tsx` — approve button absent for
  `USER`, present for `ADMIN`.

## New module structure

```
server/src/
├── auth/
│   └── enums/
│       └── user-role.enum.ts          # NEW
├── common/
│   ├── decorators/
│   │   └── roles.decorator.ts         # NEW
│   └── guards/
│       └── roles.guard.ts             # NEW
├── database/
│   └── migrations/
│       └── 1788000000000-AddUserRole.ts                    # NEW
│       └── 1788100000000-AddOrganizationScaffolding.ts     # OPTIONAL
└── organizations/
    └── entities/
        └── organization.entity.ts     # OPTIONAL (minimal)

client/src/
└── types/
    └── auth.ts                        # add role to AuthUser
```

## Dependencies

- **Phase 8** — Jira draft extraction, approve/reject flow, extracted item
  statuses.
- **Phase 9** — Multi-project Jira, `finalProjectKey`, settings page,
  `PUT /jira/projects/:key/context`.

## Explicitly out of scope for this phase

- `SUPERADMIN` role.
- `OrganizationGuard` and multi-organization management UI.
- Per-organization Jira credentials (still single env-based Jira account
  from Phases 8–9).
- User management screen / invite flows.
- Refresh tokens or auth mechanism changes.

## Acceptance criteria

1. A `USER` can upload meetings, view results, and edit draft extracted
   items on their own meetings.
2. A `USER` does not see an Approve button in
   `ExtractedItemsReview`.
3. A `USER` calling `POST /api/extracted-items/:id/approve` directly
   receives **403 Forbidden**, even for their own meeting's items.
4. A `USER` calling `PUT /api/jira/projects/:key/context` receives **403
   Forbidden**.
5. An `ADMIN` can approve items (own or, with org scaffolding, any item
   in the default organization) and trigger Jira creation.
6. An `ADMIN` can update Jira project AI context on the settings page.
7. `GET /api/auth/me` returns `role` (`USER` or `ADMIN`); the dashboard
   header displays it.
8. Migration backfills existing users as `USER` without breaking login,
   meeting history, or extraction flows.
9. `docs/architecture/security.md` and `database-schema.md` are updated to
   reflect what was actually built (including whether org scaffolding
   was added).

## Architecture docs to update on completion

| Doc | What to change |
|-----|----------------|
| `docs/architecture/security.md` | Mark `RolesGuard` as implemented; document actual guard paths and 403 behavior |
| `docs/architecture/database-schema.md` | Add `users.role` (and org tables/FKs if scaffolded); remove "planned" wording |
| `README.md` | Mark Phase 10 complete in the development phases table |
