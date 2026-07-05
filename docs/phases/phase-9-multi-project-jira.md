# Phase 9: Multiple Jira Projects, AI Project Selection

## Goal
Extend phase 1 so the same Jira account can have multiple projects, and the
extraction step decides which project each item most likely belongs to.

## Before you start
1. Re-read the Phase 8 entities and JiraService, do not rebuild them from
   scratch, extend them.
2. Confirm the exact column name used for the Jira issue key from phase 1
   before adding new columns, keep naming consistent (snake_case or
   camelCase, whichever the rest of the schema already uses).

## What to build

### 1. Fetch and cache Jira projects
- Add a method to JiraService to fetch available projects via
  GET /rest/api/3/project/search.
- Cache this list, either in Redis with a reasonable TTL or in a small
  new table, project_key, project_name, description. Prefer Redis since
  this data changes rarely and does not need to be relational yet.

### 2. Update the structured extraction schema
- Add a project field to the JSON schema from phase 1:

```json
{
  "items": [
    {
      "type": "bug | task | story | feature",
      "title": "string",
      "description": "string",
      "priority": "low | medium | high",
      "context_snippet": "string",
      "suggested_project_key": "string, Jira project key",
      "project_confidence": "number between 0 and 1"
    }
  ]
}
```

- Pass the cached project list, key, name, description, into the
  extraction prompt as context so the model can choose from real options
  only. Do not let it invent project keys.
- If confidence is below a threshold (suggest 0.6 as a starting point,
  make this configurable), still save the item but flag it clearly in the
  UI as needing manual project selection.

### 3. Update the ExtractedItem entity
- Add columns: suggested_project_key, project_confidence,
  final_project_key (nullable, filled in when the reviewer confirms or
  overrides the suggestion).
- Write a migration for this, check the existing migration naming
  convention from phase 1 and follow it exactly.

### 4. Update approval flow
- On approve, use final_project_key if set, otherwise
  suggested_project_key, to determine which Jira project to create the
  issue in.
- Before calling create issue, call GET /rest/api/3/issue/createmeta for
  that project to confirm required fields and valid issue types, do not
  hardcode issue type mappings since they can vary per project.

### 5. Frontend
- In the review screen, show the suggested project and confidence score
  per item.
- Add a dropdown to override the project selection before approving.
- Low confidence items should be visually distinct (a warning badge or
  similar) so the reviewer notices them.

### 6. Confirm task_id storage
- Ensure the jira_issue_key column from phase 1 is being populated
  correctly per project, since issue keys are project prefixed (e.g.
  PROJ-123), no schema change should be needed here if phase 1 was built
  correctly, but verify.

## Explicitly out of scope for this phase
- Roles and organizations.
- Checking for existing/duplicate Jira issues before creating new ones.

## Acceptance criteria
- Extraction results now include a suggested project per item.
- Low confidence suggestions are visibly flagged for manual review.
- Approving an item creates the issue in the correct, possibly
  overridden, Jira project.
- createmeta is used to validate fields per project rather than assuming
  a fixed issue type mapping.
