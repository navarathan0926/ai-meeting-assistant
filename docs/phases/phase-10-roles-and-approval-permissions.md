# Phase 10: Roles (USER, ADMIN) and Admin-Only Jira Approval

## Goal
Introduce a role system with USER and ADMIN (SUPERADMIN comes in Phase 11,
do not build it yet). From this phase on, only ADMIN can approve and send
items to Jira. USER can still upload recordings and edit extracted draft
items, but cannot approve them.

Organizations are not introduced in this phase, keep everything scoped to
a single implicit organization for now, Phase 11 will formalize multi-
tenancy. If it is low effort to add an `organization_id` column now with a
single default organization row, do that, since it will make Phase 11
migrations easier, but do not build organization management UI yet.

## Before you start
1. Review the existing users table and auth module (check whatever auth
   strategy is already implemented, JWT, session, etc), do not replace
   the auth mechanism, extend it.
2. Review all existing endpoints touching meetings and extracted_items to
   understand what needs new guards.

## What to build

### 1. Role column and enum
- Add a role column to the users table, enum: USER, ADMIN. Default new
  signups to USER.
- Migration should backfill all existing users as USER, except you should
  manually set your own account to ADMIN after migration for testing.

### 2. Optional organization scaffolding
- If low effort: add an organizations table with just id, name,
  created_at, insert one default row, add organization_id (FK) to users,
  meetings, and extracted_items, backfill all existing rows to point to
  the default organization. This is prep work for phase 4, keep it
  minimal, no organization CRUD UI yet.

### 3. Guards
- Add a RolesGuard with a @Roles() decorator, following standard NestJS
  patterns.
- Apply @Roles(Role.ADMIN) to:
  - The approve endpoint (POST .../approve) from phase 1/2.
  - Any future endpoint that calls JiraService to create issues.
- The edit and reject endpoints remain open to both USER and ADMIN, but
  add a check that a USER can only edit or reject items belonging to
  their own meetings, while ADMIN can act on any item.
- The reject action for a USER should probably be renamed conceptually to
  "dismiss" or similar in the frontend copy, but keep status enum values
  as they are unless it causes confusion, your call, note the reasoning
  in a code comment if you rename.

### 4. Frontend changes
- Hide the approve button entirely for USER role, show it only for
  ADMIN.
- USER still sees edit fields and can save changes to draft items.
- Add a simple role indicator somewhere in the UI (e.g. account menu)
  showing whether the logged in user is USER or ADMIN.
- For now, since there is no organization management UI, ADMIN role can
  be assigned manually via database or a temporary internal script, do
  not build a full user management screen yet unless you want to get
  ahead of phase 4, in which case flag it as such.

## Explicitly out of scope for this phase
- SUPERADMIN role.
- Multi-organization management UI.
- Per-organization Jira credentials, still using the single hardcoded
  Jira account and projects from Phase 9.

## Acceptance criteria
- A USER can upload, view, and edit extracted items, but has no way to
  trigger Jira creation, the approve action is hidden and blocked at the
  API level even if called directly.
- An ADMIN can do everything a USER can, plus approve and trigger Jira
  creation.
- Existing users and data are correctly migrated without breaking
  current functionality.
