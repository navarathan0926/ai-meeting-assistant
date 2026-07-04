# Phase 17: Extended Task Manager Integrations

## Goal
The current system is tightly coupled to Jira across Phases 8–13. This phase
introduces a `TaskManagerAdapter` abstraction layer that allows organizations
to connect a different task manager — Linear, Asana, GitHub Issues, or Azure
DevOps Boards — without touching the core extraction and review pipeline.

By the end of this phase, a new adapter can be added for any future task
manager by implementing a single interface and registering the adapter, without
modifying existing Jira code. Organizations that prefer Linear or GitHub Issues
can configure their preferred tool from the organization settings page.

There is also a microservices consideration documented at the bottom of this
phase: the integration workers may be separated into their own service once
adapter count grows, to allow independent scaling and deployment.

## Before you start
1. Review the `JiraService` built across Phases 8, 9, 11, and 13 in full.
   The adapter interface must cover every method currently on `JiraService`:
   `createIssue`, `searchIssues`, `updateIssue`, and `fetchProjects`.
2. Review the `Organization` entity from Phase 11 — the `jira_*` credential
   columns need to be generalized or a parallel `integration_credentials`
   table created (see below).
3. Review the `ExtractedItem` approval flow to confirm all Jira-specific
   assumptions (issue type mapping, project key format) so they can be made
   adapter-agnostic.
4. Check the current documentation for each adapter's API before writing any
   adapter code — API tokens, OAuth scopes, and endpoint paths change
   frequently.

## What to build

### 1. TaskManagerAdapter interface
Define a TypeScript interface (and abstract NestJS service class) that every
adapter must implement:

```typescript
interface TaskManagerAdapter {
  fetchProjects(): Promise<TaskProject[]>
  createIssue(item: ExtractedItem, projectKey: string): Promise<CreatedIssue>
  searchIssues(query: string, projectKey: string): Promise<ExistingIssue[]>
  updateIssue(issueKey: string, comment: string): Promise<void>
  validateCredentials(): Promise<boolean>
}
```

Place this interface in `server/src/integrations/interfaces/task-manager-adapter.interface.ts`.

### 2. Integration credentials — generalized storage
- Introduce a new `integration_credentials` table alongside (not replacing)
  the existing Jira columns on `Organization`. Migrate Jira credentials into
  this table so all adapters share the same storage shape:

  | column | type | notes |
  |--------|------|-------|
  | id | uuid | PK |
  | organization_id | uuid | FK → organizations |
  | adapter_type | enum | `jira`, `linear`, `asana`, `github`, `azure_devops` |
  | credentials | jsonb | encrypted at rest, shape varies per adapter |
  | project_mappings | jsonb | list of `{ key, name }` objects |
  | is_active | boolean | |
  | created_at | timestamp | |
  | updated_at | timestamp | |

- Keep the existing Jira-specific columns on `Organization` as deprecated
  aliases until all data is migrated; remove them in a follow-up migration.
- Write a data migration that copies existing Jira credentials from
  `organizations` into the new `integration_credentials` table.

### 3. Refactor JiraService as JiraAdapter
- Rename `JiraService` to `JiraAdapter` and make it implement
  `TaskManagerAdapter`.
- Wire it into a new `IntegrationAdapters` registry (a NestJS provider map)
  so other modules resolve the adapter by `adapter_type` rather than by
  injecting `JiraService` directly.
- Keep all existing behaviour identical — this is a structural refactor, not a
  functional change. Verify with existing tests before moving on.

### 4. Implement the first new adapter — Linear
- Build `LinearAdapter` implementing `TaskManagerAdapter` using the Linear
  GraphQL API (`@linear/sdk`).
- Support: `fetchProjects` (as Linear teams/projects), `createIssue`,
  `searchIssues` (via Linear search API), `updateIssue` (append comment).
- Store Linear API key in `integration_credentials.credentials` (encrypted).
- Map `ExtractedItem.type` → Linear issue labels: `bug` → Bug, `task` → Task,
  `story` → Feature, `feature` → Feature.

### 5. Implement GitHub Issues adapter
- Build `GitHubIssuesAdapter` implementing `TaskManagerAdapter` using the
  GitHub REST API (`@octokit/rest`).
- Credentials: GitHub personal access token or GitHub App installation token,
  stored encrypted in `integration_credentials`.
- `fetchProjects` returns repos the token has write access to.
- Map `ExtractedItem.type` → GitHub labels (create labels if they don't exist
  on the first call, cache results per repo).

### 6. Organization adapter settings UI
- Extend the organization settings page (introduced in Phase 11) with an
  "Integrations" tab.
- Show all supported adapters with connection status.
- Clicking an adapter opens a credentials form appropriate for that adapter
  type (API token for Linear/GitHub, OAuth for Jira/Asana).
- Once connected, run `validateCredentials()` immediately and show success or
  an error message.
- An organization can only have one active adapter at a time for now (simplest
  model); add multi-adapter support in Phase 18 if needed.

### 7. Update the review and approval flow
- Replace all direct `JiraService` injections in `extraction/` with the
  adapter registry lookup.
- The review UI should show the connected adapter's name and icon in the
  approval button (e.g. "Send to Linear" or "Send to GitHub").
- The `jira_issue_key` column on `ExtractedItem` should be renamed to
  `task_manager_issue_key` (migration required) to be adapter-agnostic.

## Microservices consideration
As the number of adapters grows, the integration worker (the part that calls
external task manager APIs) may need to run with different resource profiles
than the transcription/summarization worker. Consider extracting the adapter
calls into a separate NestJS microservice (using `@nestjs/microservices` with
a Redis transport or dedicated BullMQ queues) in Phase 18 if:
- Adapter call volumes are high enough to starve the transcription worker.
- A single adapter failure should not affect the transcription pipeline.
- Different SLA requirements emerge for integration vs. processing.

Do not extract now — the complexity is not justified yet. Flag this at the
Phase 18 planning review.

## New module structure
```
server/src/
  integrations/
    integrations.module.ts
    adapters/
      jira.adapter.ts             ← renamed + refactored from JiraService
      linear.adapter.ts           ← new
      github-issues.adapter.ts    ← new
    interfaces/
      task-manager-adapter.interface.ts
      task-project.interface.ts
      created-issue.interface.ts
      existing-issue.interface.ts
    registry/
      adapter-registry.service.ts ← resolves adapter by org + adapter_type
    entities/
      integration-credential.entity.ts
    dto/
      connect-integration.dto.ts
    integration-credentials.controller.ts
    integration-credentials.service.ts
```

## Technologies & Tools
- **Linear**: `@linear/sdk` (GraphQL)
- **GitHub Issues**: `@octokit/rest`
- **Asana** (future): Asana REST API or `asana` npm package
- **Azure DevOps** (future): `azure-devops-node-api`

## Dependencies
- Phase 8–11 (Jira integration and organization model) must be complete.
- Phase 14 (subscription gating) should be in place if integration adapters
  are a paid-tier feature.

## Explicitly out of scope for this phase
- Asana and Azure DevOps adapters (design the interface to support them, build
  them in a follow-up sprint).
- Two-way sync (receiving updates back from the task manager into the app).
- Multi-adapter per organization (one active adapter is sufficient to start).

## Acceptance criteria
- An organization can switch from Jira to Linear (or GitHub Issues) from the
  settings page without any code change.
- The approval flow works identically regardless of which adapter is active —
  only the button label and the resulting issue key format differ.
- All existing Jira integration tests continue to pass after the refactor.
- Connecting a new Linear or GitHub integration with valid credentials
  successfully creates a real issue in the target system.
