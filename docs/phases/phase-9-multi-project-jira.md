# Phase 9: Multi-Project Jira & AI Project Selection

## Goal

Extend Phase 8 so a single Jira account can own multiple projects, and the
extraction pipeline decides which project each work item belongs to — including
meetings where several projects are discussed in the same conversation.

Meetings often contain no project-relevant work at all (status updates, small
talk, sales calls, etc.). The model must detect that case explicitly and
surface confidence scores so reviewers can trust empty results and low-certainty
suggestions. This phase does **not** add roles, organizations, or duplicate
issue lookup.

## Before you start

1. Read the Phase 8 implementation — do not rebuild it, extend it:
   - `server/src/extracted-items/` — entity, processor, schema, prompts
   - `server/src/jira/jira.service.ts` — currently hardcodes `projectKey` from env
   - `server/src/jira/jira-send.processor.ts` — async approve → create issue
   - `client/src/components/extracted-items/ExtractedItemsReview.tsx`
2. Confirm existing column naming: the `extracted_items` table uses **camelCase**
   columns (`meetingId`, `contextSnippet`, `jiraIssueKey`, `jiraSyncError`).
   Follow the same convention for new columns.
3. Confirm the extraction schema already uses `description_blocks` (ADF blocks)
   and `scope` (kebab-case grouping id) — see
   `server/src/extracted-items/item-extraction.schema.ts`. Add project fields
   alongside these, do not revert to plain-text descriptions.
4. Confirm the extraction prompt already instructs the model to return an empty
   `items` array when no actionable work was committed — see
   `server/src/extracted-items/item-extraction.prompt.ts`. Phase 9 adds explicit
   meeting-level metadata and per-item confidence, not a rewrite of those rules.
5. Confirm Jira REST calls go through the Atlassian API gateway
   (`JIRA_API_GATEWAY_URL` + `CLOUD_ID`) — reuse `JiraService.buildRestUrl()`.
6. Check migration naming: timestamp-prefixed files in
   `server/src/database/migrations/` (e.g. `1786000000000-AddJiraSyncErrorToExtractedItems.ts`).

## What to build

### 1. Fetch and cache Jira projects

- Add `listProjects()` to `JiraService`:
  `GET /rest/api/3/project/search?maxResults=50` via the existing gateway URL.
- Return `{ key, name, description }[]`.
- Cache in Redis (reuse `server/src/common/redis/redis.module.ts`) with TTL
  (default 1 hour, env `JIRA_PROJECTS_CACHE_TTL_SECONDS`).
- Invalidate cache on demand (no admin UI needed yet).
- Keep `JIRA_PROJECT_KEY` as optional fallback when the model cannot suggest
  a project.

### 2. Project AI context (for the extraction prompt)

**Idea:** do not configure context per meeting. Configure it per **project**.
Each meeting's extraction loads the project list + AI context and injects that
into the prompt. The model then picks the right project per item.

**Why settings, not only Jira description:** Jira's `description` is often
empty or useless for LLM routing. We need a short editable blurb we control.

**Phase 9 (single Jira account):**

- New table `project_contexts`:
  | Column | Type | Notes |
  |--------|------|-------|
  | `projectKey` | `varchar`, unique | Matches Jira project key |
  | `aiContext` | `text` | Short description for the LLM (what this project is) |
  | `updatedAt` | `timestamptz` | |

- On extraction, build prompt project list as:
  `{ key, name, aiContext }` where `aiContext` =
  `project_contexts.aiContext` if set, else Jira `description`, else name only.
- Simple settings UI (or API-only for now): list cached Jira projects, let
  user edit `aiContext` per key. Save to `project_contexts`.
- No per-meeting project config. Meeting → global project list → prompt.

**Later (Phase 11):** same table/fields move under `organizationId`. Meeting
belongs to an org → load **that org's** projects + contexts only.

### 3. Meeting-level relevance detection

Real meetings may discuss zero project-relevant work. The model must classify
this explicitly instead of leaving the user wondering whether extraction is
still running.

Extend the structured extraction output with a top-level `meeting_analysis` object:

```json
{
  "meeting_analysis": {
    "has_actionable_work": "boolean",
    "project_relevance_confidence": "number 0–1",
    "summary": "string, one sentence explaining the classification"
  },
  "items": []
}
```

Rules for the model (add to `item-extraction.prompt.ts`):

- `has_actionable_work: false` when the meeting contains only greetings, status
  updates, off-topic chat, brainstorming without commitment, or discussion that
  cannot be mapped to any known Jira project.
- `project_relevance_confidence` reflects how certain the model is about that
  classification (high when clearly a social call with no work; lower when the
  meeting is ambiguous).
- When `has_actionable_work` is false, `items` must be an empty array. Do not
  invent placeholder items.
- When `has_actionable_work` is true but no item maps to a known project with
  sufficient confidence, still extract the item but set `project_confidence`
  low (see section 4).

Persist meeting-level analysis on the `meetings` table (new nullable JSONB
column `extractionAnalysis`):

```typescript
{
  hasActionableWork: boolean;
  projectRelevanceConfidence: number;
  summary: string;
  extractedAt: string; // ISO timestamp
}
```

Write a migration following the existing camelCase convention.

### 4. Update the structured extraction schema

Add project selection and per-item confidence fields to each item in
`ITEM_EXTRACTION_JSON_SCHEMA` (`item-extraction.schema.ts`):

```json
{
  "meeting_analysis": { "...": "see section 3" },
  "items": [
    {
      "type": "bug | task | story | feature",
      "title": "string",
      "description_blocks": ["..."],
      "priority": "low | medium | high",
      "context_snippet": "string",
      "scope": "string, kebab-case",
      "suggested_project_key": "string, must be from the provided project list",
      "project_confidence": "number 0–1",
      "extraction_confidence": "number 0–1"
    }
  ]
}
```

Field semantics:

| Field | Meaning |
|-------|---------|
| `suggested_project_key` | Best-match Jira project key from the cached list |
| `project_confidence` | How sure the model is that this item belongs in that project |
| `extraction_confidence` | How sure the model is that this is a real, committed work item |

Prompt changes (`item-extraction.prompt.ts`):

- Inject project list as `key`, `name`, `aiContext` (from section 2).
  Model must pick from those keys only — never invent keys.
- When a meeting spans multiple projects, assign each item independently.
- When project context is unclear, still extract if work was committed, pick
  closest project, set `project_confidence` low.
- Prefer precision: omit uncertain commitments rather than low-confidence junk.

Post-processing (`consolidateExtractedItems`):

- When merging items by `scope`, keep the `suggested_project_key` and confidence
  scores from the primary item. If merged items had different project
  suggestions, take the higher `project_confidence` key; if tied, keep primary.

Configurable thresholds (env vars, with sensible defaults):

| Env var | Default | Effect |
|---------|---------|--------|
| `EXTRACTION_CONFIDENCE_THRESHOLD` | `0.6` | Below → flag item as "low extraction confidence" in UI |
| `PROJECT_CONFIDENCE_THRESHOLD` | `0.6` | Below → flag item as "needs manual project selection" |
| `MEETING_RELEVANCE_THRESHOLD` | `0.7` | Below → show meeting-level warning even if items exist |

### 5. Update the ExtractedItem entity

Add columns to `server/src/extracted-items/entities/extracted-item.entity.ts`:

| Column | Type | Notes |
|--------|------|-------|
| `suggestedProjectKey` | `varchar`, nullable | AI suggestion |
| `projectConfidence` | `float`, nullable | 0–1 |
| `extractionConfidence` | `float`, nullable | 0–1 |
| `finalProjectKey` | `varchar`, nullable | Set by reviewer override or copied from suggestion on approve |

Write a migration (camelCase column names, matching `meetingId` / `jiraIssueKey`).

Update `client/src/types/extracted-item.ts` and
`server/src/extracted-items/interfaces/extracted-item-response.interface.ts`
to expose the new fields and computed flags:

```typescript
needsProjectReview: boolean;   // projectConfidence < threshold
lowExtractionConfidence: boolean; // extractionConfidence < threshold
```

### 6. Update approval and Jira creation flow

**Approve path** (`extracted-items.service.ts` → `jira-send.processor.ts`):

- On approve, resolve project key: `finalProjectKey ?? suggestedProjectKey ?? env fallback`.
- Reject approve with `400` if no project key can be resolved.
- Pass the resolved project key into `JiraService.createIssue()`.

**JiraService changes**:

- Accept `projectKey` as a parameter on `createIssue()` instead of always reading
  from config.
- Before creating an issue, call
  `GET /rest/api/3/issue/createmeta?projectKeys={key}&expand=projects.issuetypes.fields`
  for that project. Use the response to:
  - Confirm the mapped issue type (`Bug`, `Task`, `Story`) exists in that project.
  - Fall back to the closest available type if the preferred name is missing.
- Cache createmeta per project key in Redis (TTL 30 minutes).

**Edit path**:

- Extend `UpdateExtractedItemDto` with optional `finalProjectKey` so reviewers
  can override the project before approving.
- Validate that `finalProjectKey` exists in the cached project list.

**Failure behavior** (keep existing Phase 8 semantics):

- On Jira failure, revert item to `draft`, set `jiraSyncError`, clear
  `jiraIssueKey`. Do not change status to a new value.

### 7. Frontend review experience

Update `ExtractedItemsReview.tsx` and related hooks/API types.

**Meeting-level banner** (above the item list):

- When `extractionAnalysis.hasActionableWork === false` and
  `projectRelevanceConfidence >= MEETING_RELEVANCE_THRESHOLD`:
  show a clear message — e.g. "No project-relevant work was found in this
  meeting" with the model's `summary` text. Do not show a loading spinner or
  "still processing" message.
- When `projectRelevanceConfidence` is below the threshold: show an amber
  warning — "Extraction confidence is low; review carefully or re-run."
- When items exist but meeting confidence is low: show the warning banner AND
  the item list.

**Per-item UI**:

- Show `suggestedProjectKey` with a project dropdown (populated from
  `GET /api/jira/projects` — new endpoint wrapping `JiraService.listProjects()`).
- Show confidence scores as compact badges:
  - Green (≥ threshold), amber (below threshold).
  - Label: "Project match 85%" / "Extraction confidence 72%".
- Low `project_confidence` → amber "Select project" badge; dropdown defaults
  to suggested key but requires explicit attention (subtle border highlight).
- Low `extraction_confidence` → amber "Review carefully" badge on the card.
- Persist `finalProjectKey` via the existing PATCH endpoint when the reviewer
  changes the dropdown (draft items only).

**Empty state copy** (replace current generic message):

- Distinguish "extraction complete, no items found" (with meeting analysis
  summary) from "still processing" (meeting status not yet completed).

### 8. New API endpoints

- `GET /api/jira/projects` — cached project list + merged `aiContext`.
  Auth-guarded. No per-org scoping yet (Phase 11).
- `PUT /api/jira/projects/:key/context` — save/update `aiContext` for a
  project key (writes `project_contexts`).

### 9. Verify jiraIssueKey storage

- Issue keys are project-prefixed (e.g. `PROJ-123`, `OTHER-45`). The existing
  `jiraIssueKey` column handles this — no schema change needed.
- Confirm `JiraService.getIssueBrowseUrl()` still works for multi-project keys.

## New module structure

No new top-level modules. Changes stay inside existing features:

```
server/src/jira/
├── jira.service.ts              # + listProjects(), createmeta, projectKey param
├── jira.controller.ts           # NEW — GET /jira/projects, PUT .../context
├── jira-send.processor.ts       # pass resolved projectKey
└── entities/project-context.entity.ts  # NEW — projectKey + aiContext

server/src/extracted-items/
├── entities/extracted-item.entity.ts   # + project/confidence columns
├── item-extraction.schema.ts           # + meeting_analysis, project fields
├── item-extraction.prompt.ts           # + project list (key, name, aiContext)
├── item-extraction.processor.ts        # persist meeting_analysis on Meeting
├── dto/update-extracted-item.dto.ts    # + finalProjectKey
└── interfaces/extracted-item-response.interface.ts

server/src/meetings/entities/meeting.entity.ts  # + extractionAnalysis JSONB

server/src/database/migrations/
└── <timestamp>-AddMultiProjectExtractionFields.ts

client/src/
├── types/extracted-item.ts
├── types/meeting.ts                    # + extractionAnalysis
├── lib/api/jira.api.ts                 # NEW — projects + save aiContext
├── hooks/useJiraProjects.ts            # NEW
├── components/extracted-items/
│   ├── ExtractedItemsReview.tsx        # meeting banner, confidence badges
│   └── ProjectSelector.tsx             # NEW — dropdown
└── components/settings/                # NEW — edit aiContext per project
    └── ProjectContextSettings.tsx
```

## Technologies & Tools

| Tool | Purpose |
|------|---------|
| Existing Redis connection | Project list + createmeta cache |
| Jira REST API v3 | `project/search`, `issue/createmeta`, `issue` (create) |
| OpenAI structured outputs | Extended JSON schema (unchanged client) |

No new npm packages expected.

## Dependencies

- Phase 8 (extracted items pipeline, JiraService, review UI) — complete.
- Phase 7 (auth guards, throttling) — complete.
- Redis — already used for BullMQ; reuse for project cache.

## Explicitly out of scope for this phase

- Roles and approval permissions (Phase 10).
- Per-organization Jira credentials / org-scoped project contexts (Phase 11).
- Checking for existing/duplicate Jira issues before creating new ones (Phase 13).
- Automatic creation without human approval.
- Storing Jira credentials in the database (still env vars for now).
- Per-meeting project context overrides (not needed — use project settings).

## Acceptance criteria

1. `GET /api/jira/projects` returns cached keys/names with merged `aiContext`.
2. Saving `aiContext` via `PUT /api/jira/projects/:key/context` persists it;
   the next extraction prompt includes that text for that project.
3. Meeting across two projects → each item gets the correct
   `suggestedProjectKey` with `project_confidence >= 0.6` when clear.
4. Small-talk meeting → `has_actionable_work: false`, empty `items`, UI shows
   "no project-relevant work" (not loading/error).
5. Low `project_confidence` → amber warning + highlighted dropdown; reviewer
   can set `finalProjectKey` before approve.
6. Low `extraction_confidence` → "review carefully" badge; still editable.
7. Approve creates issue in `finalProjectKey ?? suggestedProjectKey`;
   `jiraIssueKey` stored and linked.
8. `createmeta` per project before create; missing issue type → graceful
   fallback + log.
9. Jira create failure → item back to `draft` with `jiraSyncError`.
