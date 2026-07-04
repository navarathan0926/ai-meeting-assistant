# Phase 8: Jira Draft Extraction and Approval (Single Jira Account)

## Goal
Introduce a new pipeline step that extracts bugs, issues, tasks, and user stories
from an already generated meeting summary or transcript, saves them as draft
records, lets the logged in user review and edit them, then approve and save
them as real issues in a single, hardcoded Jira account and project.

This phase does NOT need multiple projects, roles, or organizations. Keep the
scope tight. The goal is to validate the end to end workflow: extract, draft,
review, approve, create in Jira.

## Before you start
1. Inspect the existing Postgres schema via the current TypeORM entities.
   Do not assume table or column names, read the actual entity files first.
2. Identify the existing meeting entity, its relation to the user entity,
   and where the summary text is stored.
3. Identify the existing BullMQ queue and processor setup used for
   summarization, so the new extraction job follows the same conventions
   (queue naming, job options, retry policy, logging pattern).
4. Confirm which OpenAI client wrapper or service already exists in the
   codebase and reuse it, do not create a second one.

## What to build

### 1. Structured extraction job
- Add a new BullMQ job, triggered after the summarization job completes
  successfully for a meeting.
- The job sends the meeting transcript and or summary to OpenAI using
  structured outputs (JSON schema mode), not freeform prompting.
- Use this JSON schema for the extraction result. Adjust field names only
  if they clash with existing conventions in the codebase, otherwise keep
  as is:

```json
{
  "items": [
    {
      "type": "bug | task | story | feature",
      "title": "string, short and specific",
      "description": "string, full context pulled from the discussion",
      "priority": "low | medium | high",
      "context_snippet": "string, the part of the transcript this came from"
    }
  ]
}
```

- If no actionable items are found, return an empty items array. Do not
  force the model to invent items.
- Run a lightweight de duplication pass on the items in the same job, if
  two items clearly describe the same issue, merge them before saving.
- Extraction rules live in `server/src/extracted-items/item-extraction.prompt.ts`.
  The model must group by business intent (one bug/story per card), put sub-steps
  in the description, and assign a shared `scope` id for related work.
- Post-processing consolidation in `item-extraction.schema.ts` merges by scope,
  context overlap, and related subtask titles before saving.

### 2. New entity and table
- Create a new entity, something like `ExtractedItem`, with a migration.
  Check the existing migration folder structure and naming convention
  before adding a new one.
- Suggested columns: id, meeting_id (FK), type, title, description,
  priority, context_snippet, status (draft, approved, rejected, sent),
  jira_issue_key (nullable), created_at, updated_at.
- Relation: one meeting has many extracted items.

### 3. API endpoints (NestJS)
- GET endpoint to list extracted items for a given meeting, scoped to the
  logged in user who owns that meeting.
- PATCH endpoint to edit a draft item, title, description, type, priority.
- PATCH endpoint to reject an item, status becomes rejected.
- POST endpoint to approve an item, this triggers the Jira creation call.

### 4. Jira integration service
- New NestJS service, JiraService, using the jira.js package or a plain
  axios client with a Jira API token and email, stored in environment
  variables for now, hardcoded to one account and one project.
- On approve, call the Jira REST API to create the issue using the fields
  from the extracted item. Map type to the correct Jira issue type.
- Store the returned Jira issue key back on the extracted_item row, and
  set status to sent.
- Handle and log failures clearly, if Jira creation fails, keep status as
  approved (not sent) and surface the error to the frontend so the user
  knows it did not go through.

### 5. Frontend (Next.js)
- A simple review screen per meeting, listing extracted items with inline
  edit fields for title, description, type, priority.
- Approve and reject buttons per item.
- Visual indicator once an item has been sent to Jira, showing the
  returned issue key as a link to the Jira issue.

## Explicitly out of scope for this phase
- Multiple Jira projects.
- Roles and permissions beyond the existing single user model.
- Organizations.
- Duplicate checking against existing Jira issues.

## Acceptance criteria
- A user can upload a recording, get a summary as before, and additionally
  see a list of extracted draft items.
- The user can edit and approve or reject each item.
- Approving an item creates a real issue in the configured Jira project
  and the returned issue key is visible in the app.
