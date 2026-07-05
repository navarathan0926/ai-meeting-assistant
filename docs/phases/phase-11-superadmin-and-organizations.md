# Phase 11: SUPERADMIN Role and Multi-Organization Support

## Goal
Turn the single default organization from Phase 10 into real multi-tenancy.
Add a SUPERADMIN role for platform-level management across all
organizations. Each organization should be able to configure its own Jira
connection (base URL, credentials, project mappings) rather than sharing
the single hardcoded account from Phases 8 and 9.

## Before you start
1. Review the organization scaffolding added in Phase 10 (if it was built),
   confirm `organization_id` exists on `users`, `meetings`, and `extracted_items`.
2. Review every existing guard and service to identify anywhere Jira
   credentials or project keys are currently hardcoded from environment
   variables — these all need to move to per-organization configuration.
3. List every query across the codebase that touches `meetings` or
   `extracted_items`, to confirm each one will be properly scoped by
   `organization_id` once real multi-tenancy is active.

## What to build

### 1. Role enum update
- Extend the role enum from phase 3 to include SUPERADMIN.
- SUPERADMIN is not tied to a specific organization, organization_id
  should be nullable for this role only, enforce this at the application
  level (validation on user creation).

### 2. Organization entity expansion
- Add columns to the organizations table: jira_base_url,
  jira_auth_type (api_token or oauth, start with api_token),
  jira_email, jira_api_token (store encrypted, do not store plain text,
  use a proper encryption approach, check if the codebase already has a
  secrets or encryption utility before adding a new one),
  jira_project_mappings (jsonb, or a separate table if you prefer
  relational, your call based on query needs), is_active, created_at.
- Add a status field to allow SUPERADMIN to suspend an organization
  without deleting data.

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
- A settings page, ADMIN only, where the org admin enters their Jira base
  URL, email, and API token, and maps their Jira projects (reuse the
  project fetch logic from Phase 9, but now scoped per organization).

### 7. Basic observability and cost tracking
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

## Acceptance criteria
- Two separate organizations can each configure their own Jira account
  independently, and issues created for one organization never touch the
  other organization's Jira instance.
- A SUPERADMIN can view and manage all organizations from a dedicated
  dashboard.
- All existing meeting and extracted_item queries are correctly scoped by
  organization, verified by testing with at least two organizations and
  two separate users, confirming no data leaks across organizations.
