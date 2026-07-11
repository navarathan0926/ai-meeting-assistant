# Database Schema

PostgreSQL with TypeORM. All migrations live in `server/src/database/migrations/`.
Never use `synchronize: true` in production — all schema changes go through
versioned migration files.

---

## Entity Relationship Diagram

```
┌──────────────────┐       ┌──────────────────────┐
│   organizations  │       │        users          │
│──────────────────│       │──────────────────────│
│ id (PK)          │◄──────│ organization_id (FK) │
│ name             │       │ id (PK)               │
│ is_active        │       │ email (unique)        │
│ status           │       │ name                 │
│ created_at       │       │ google_id            │
│ updated_at       │       │ role (USER/ADMIN/     │
└──────────────────┘       │         SUPERADMIN)  │
         │                 │ created_at           │
         │                 └──────────┬───────────┘
         │                            │
         │              ┌─────────────▼────────────┐
         │              │         meetings          │
         │              │──────────────────────────│
         └─────────────►│ organization_id (FK)     │
                        │ id (PK)                  │
                        │ title                    │
                        │ original_file_name       │
                        │ audio_url                │
                        │ status (enum)            │
                        │ source (upload/zoom)     │
                        │ user_id (FK)             │
                        │ created_at               │
                        └──┬───────────────────────┘
                           │
              ┌────────────┼────────────────┐
              │            │                │
   ┌──────────▼──┐  ┌──────▼──────┐  ┌─────▼──────────────┐
   │transcriptions│  │  summaries  │  │   extracted_items  │
   │─────────────│  │─────────────│  │────────────────────│
   │ id (PK)     │  │ id (PK)     │  │ id (PK)            │
   │ meeting_id  │  │ meeting_id  │  │ meeting_id (FK)    │
   │   (FK)      │  │   (FK)      │  │ type (enum)        │
   │ text        │  │ content     │  │ title              │
   │ segments    │  │   (jsonb)   │  │ description        │
   │   (jsonb)   │  │ created_at  │  │ priority (enum)    │
   │ created_at  │  └─────────────┘  │ context_snippet    │
   └─────────────┘                   │ status (enum)      │
                                     │ suggested_project_ │
                                     │   key              │
                                     │ project_confidence │
                                     │ final_project_key  │
                                     │ task_manager_issue_│
                                     │   key (nullable)   │
                                     │ possible_duplicate_│
                                     │   of (nullable)    │
                                     │ duplicate_confidence│
                                     │ action_taken (enum)│
                                     │ created_at         │
                                     │ updated_at         │
                                     └────────────────────┘

┌─────────────────────────────┐   ┌──────────────────────────┐
│  meeting_platform_connections│   │      subscriptions       │
│─────────────────────────────│   │──────────────────────────│
│ id (PK)                     │   │ id (PK)                  │
│ user_id (FK)                │   │ organization_id (FK)     │
│ platform (enum: zoom, ...)  │   │ plan (enum)              │
│ access_token (encrypted)    │   │ status (enum)            │
│ refresh_token (encrypted)   │   │ provider_customer_id     │
│ expires_at                  │   │ provider_subscription_id │
│ connected_at                │   │ current_period_end       │
└─────────────────────────────┘   │ created_at               │
                                   │ updated_at               │
┌─────────────────────────────┐   └──────────────────────────┘
│   integration_credentials   │
│─────────────────────────────│
│ id (PK)                     │
│ organization_id (FK)        │
│ adapter_type (enum)         │
│ credentials (jsonb, encrypted)│
│ project_mappings (jsonb)    │
│ is_active                   │
│ created_at                  │
│ updated_at                  │
└─────────────────────────────┘
```

---

## Entity Details

### `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, generated |
| `email` | varchar | unique, not null |
| `name` | varchar | nullable |
| `google_id` | varchar | nullable, unique — set on Google OAuth login |
| `password_hash` | varchar | nullable — set on email/password registration |
| `role` | enum | `USER` \| `ADMIN` \| `SUPERADMIN`, default `USER` |
| `organization_id` | uuid | FK → `organizations`, nullable for SUPERADMIN |
| `created_at` | timestamp | |

### `organizations`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `name` | varchar | |
| `is_active` | boolean | default true |
| `status` | enum | `active` \| `suspended` |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### `meetings`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `title` | varchar | nullable, auto-derived from filename if empty |
| `original_file_name` | varchar | |
| `audio_url` | varchar | Azure Blob SAS URL path |
| `status` | enum | `pending` \| `processing` \| `completed` \| `failed` |
| `source` | enum | `upload` \| `zoom` — how the recording arrived |
| `user_id` | uuid | FK → `users` |
| `organization_id` | uuid | FK → `organizations` |
| `extraction_analysis` | jsonb | Phase 9 meeting-level relevance result (nullable) |
| `created_at` | timestamp | |

### `transcriptions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `meeting_id` | uuid | FK → `meetings`, unique (one per meeting) |
| `text` | text | Full transcript |
| `segments` | jsonb | Speaker-attributed segments (Phase 15) — nullable |
| `created_at` | timestamp | |

### `summaries`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `meeting_id` | uuid | FK → `meetings`, unique |
| `content` | jsonb | Structured summary (overview, key points, action items) |
| `created_at` | timestamp | |

### `extracted_items`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `meeting_id` | uuid | FK → `meetings` |
| `type` | enum | `bug` \| `task` \| `story` \| `feature` |
| `title` | varchar | |
| `description` | text | |
| `priority` | enum | `low` \| `medium` \| `high` |
| `context_snippet` | text | Excerpt from transcript this was drawn from |
| `status` | enum | `draft` \| `approved` \| `rejected` \| `sent` |
| `suggested_project_key` | varchar | AI-suggested task manager project key |
| `project_confidence` | float | 0–1 confidence score for suggested project |
| `extraction_confidence` | float | 0–1 confidence that the item is real committed work |
| `final_project_key` | varchar | Reviewer-confirmed project key (nullable) |
| `jira_issue_key` | varchar | Jira issue key after creation (e.g. `PROJ-42`) — Phase 8/9 |
| `jira_sync_error` | text | Last Jira send failure message (nullable) |
| `task_manager_issue_key` | varchar | Generic key after Phase 17 adapter refactor |
| `possible_duplicate_of` | varchar | Issue key of possible duplicate found via Phase 13 |
| `duplicate_confidence` | float | Similarity score for the duplicate candidate |
| `action_taken` | enum | `create_new` \| `update_existing` \| `none` |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### `project_contexts` (Phase 9)

Editable AI routing blurbs per Jira project key (single-account mode). Moves under `organization_id` in Phase 11.

| Column | Type | Notes |
|--------|------|-------|
| `projectKey` | varchar | PK — matches Jira project key |
| `aiContext` | text | Short description injected into extraction prompts |
| `updatedAt` | timestamptz | |

### `meeting_platform_connections`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → `users` |
| `platform` | enum | `zoom` (more values added per Phase 12 future work) |
| `access_token` | varchar | Encrypted at rest |
| `refresh_token` | varchar | Encrypted at rest |
| `expires_at` | timestamp | |
| `connected_at` | timestamp | |

### `subscriptions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `organization_id` | uuid | FK → `organizations` |
| `plan` | enum | `free` \| `starter` \| `pro` |
| `status` | enum | `active` \| `past_due` \| `cancelled` \| `trialing` |
| `provider_customer_id` | varchar | Stripe customer ID |
| `provider_subscription_id` | varchar | Stripe subscription ID |
| `current_period_end` | timestamp | |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

### `integration_credentials`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `organization_id` | uuid | FK → `organizations` |
| `adapter_type` | enum | `jira` \| `linear` \| `github` \| `asana` \| `azure_devops` |
| `credentials` | jsonb | Encrypted; shape varies per adapter type |
| `project_mappings` | jsonb | List of `{ key, name }` objects from adapter |
| `is_active` | boolean | Only one active per org at a time (Phase 17) |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

---

## Enums

```typescript
// meeting_status
enum MeetingStatus { pending, processing, completed, failed }

// meeting_source (Phase 12)
enum MeetingSource { upload, zoom }

// user_role (Phase 10–11)
enum UserRole { USER, ADMIN, SUPERADMIN }

// extracted_item_type
enum ExtractedItemType { bug, task, story, feature }

// extracted_item_priority
enum ExtractedItemPriority { low, medium, high }

// extracted_item_status
enum ExtractedItemStatus { draft, approved, rejected, sent }

// extracted_item_action
enum ExtractedItemAction { create_new, update_existing, none }

// subscription_plan (Phase 14)
enum SubscriptionPlan { free, starter, pro }

// subscription_status (Phase 14)
enum SubscriptionStatus { active, past_due, cancelled, trialing }

// integration_adapter_type (Phase 17)
enum IntegrationAdapterType { jira, linear, github, asana, azure_devops }
```

---

## Migration Commands

```bash
cd server

# Generate a new migration from entity diff
npm run migration:generate -- src/database/migrations/<MigrationName>

# Apply pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Create a blank migration file
npm run migration:create -- src/database/migrations/<MigrationName>
```

Migration file naming convention: `<timestamp>-<PascalCaseName>.ts`
e.g. `1783000000000-AddUserIdToMeetings.ts`

---

## Indexes to Consider

| Table | Column(s) | Reason |
|-------|-----------|--------|
| `meetings` | `user_id` | All meeting list queries filter by user |
| `meetings` | `organization_id` | All org-scoped queries |
| `meetings` | `status` | Status polling and filtering |
| `meetings` | `created_at` | Default sort order |
| `extracted_items` | `meeting_id` | Joined on every item list request |
| `extracted_items` | `status` | Filter by draft/approved/sent |
| `users` | `email` | Auth login lookup |
| `users` | `google_id` | OAuth login lookup |
| `integration_credentials` | `organization_id, is_active` | Adapter resolution per request |
