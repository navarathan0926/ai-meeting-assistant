# External Integrations

This document describes every external service the system integrates with,
what it is used for, where the integration lives in the codebase, and what
credentials are required.

---

## OpenAI (Current — Phases 1–8+)

### Purpose
- **Whisper API** — audio transcription
- **GPT API** — meeting summarization and structured item extraction

### Usage
| Operation | Model | Location |
|-----------|-------|----------|
| Transcription | `whisper-1` | `transcriptions/transcriptions.service.ts` |
| Summarization | `gpt-4o-mini` (configurable) | `summaries/summaries.service.ts` |
| Structured extraction | `gpt-4o` with JSON schema | `extraction/extraction.processor.ts` |
| Similarity comparison (Phase 13) | `gpt-4o` | `jira/jira.service.ts` |

### Credentials
```
OPENAI_API_KEY=sk-...
```

### Rate Limits / Cost Notes
- Set a monthly spend limit in the OpenAI dashboard to avoid surprise bills.
- Track input/output token counts per job (stored in Phase 11 usage tracking).
- Whisper pricing is per minute of audio; GPT pricing is per token.
- Consider switching to `gpt-4o-mini` for extraction in high-volume orgs to
  reduce cost.

### Error Handling
- `429 Too Many Requests` — retry with exponential backoff (handled by BullMQ).
- `400 Bad Request` (invalid audio format) — mark job as failed immediately,
  do not retry.
- `500` from OpenAI — retry up to 3 times.

---

## Azure Blob Storage (Phase 3+)

### Purpose
Store uploaded and processed audio files with time-limited access URLs.

### Usage
| Operation | Location |
|-----------|----------|
| Upload audio | `storage/blob-storage.service.ts` |
| Generate SAS URL | `storage/blob-storage.service.ts` |
| Download audio for processing | `extraction/extraction.processor.ts` |

### Credentials
```
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
AZURE_STORAGE_CONTAINER_NAME=uploads
```

### SAS URL Configuration
- SAS URLs are time-limited (e.g. 1 hour) for secure access.
- Never expose the raw blob URL without a SAS token.
- Use Managed Identity instead of connection strings in production if the
  app runs on Azure infrastructure.

---

## Jira (Phases 8–13)

### Purpose
Create, search, and update issues in a Jira project from extracted meeting items.

### API
Jira Cloud REST API v3: `https://<domain>.atlassian.net/rest/api/3/`

### Authentication
Two options:
- **API token** (default): `Authorization: Basic base64(email:api_token)`
- **OAuth 2.0**: For per-user installations (future)

Store as: `jira_email` + `jira_api_token` encrypted in `integration_credentials`
(Phase 11+) or as env vars (Phases 8–10 single-account mode).

```
JIRA_BASE_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=admin@yourcompany.com
JIRA_API_TOKEN=...
JIRA_PROJECT_KEY=PROJ
```

### Key Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /rest/api/3/project/search` | Fetch available projects |
| `POST /rest/api/3/issue` | Create a new issue |
| `GET /rest/api/3/issue/createmeta` | Validate allowed issue types per project |
| `GET /rest/api/3/search` (JQL) | Search for existing issues (Phase 13) |
| `POST /rest/api/3/issue/{key}/comment` | Add comment to existing issue |

### Issue Type Mapping
```typescript
const typeMap = {
  bug:     'Bug',
  task:    'Task',
  story:   'Story',
  feature: 'Epic', // or 'New Feature' — verify via createmeta per project
};
```
Always validate against `createmeta` per project rather than assuming fixed types.

### Location
`server/src/jira/` → refactored to `server/src/integrations/adapters/jira.adapter.ts`
in Phase 17.

---

## Google OAuth (Phase 0+)

### Purpose
Allow users to sign in with their Google account.

### Credentials
```
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
```

### Scopes Used
- `email` — user email address
- `profile` — name and avatar URL

### Location
`server/src/auth/strategies/google.strategy.ts`

### Phase 15 Extension (Optional)
Google Calendar integration may reuse this OAuth app by adding the
`https://www.googleapis.com/auth/calendar.readonly` scope during the initial
consent, if the user accepts. Requires updating the authorized scopes in the
Google Cloud Console.

---

## Zoom (Phase 12)

### Purpose
Ingest completed Zoom cloud recordings automatically via webhook.

### OAuth App Setup
1. Create a Server-to-Server OAuth app in the Zoom Marketplace.
2. Configure the webhook endpoint: `https://your-domain/api/zoom/webhook`.
3. Subscribe to the `recording.completed` event.
4. Copy the webhook secret for signature verification.

### Credentials
```
ZOOM_CLIENT_ID=...
ZOOM_CLIENT_SECRET=...
ZOOM_WEBHOOK_SECRET=...
```

Per-user tokens are stored encrypted in `meeting_platform_connections`.

### Key Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /v2/users/{userId}/recordings` | List recordings |
| `GET <downloadUrl>` with `Authorization: Bearer <token>` | Download audio |
| `POST /oauth/token` | Refresh access token |

### Location
`server/src/meeting-platforms/zoom/` (planned, Phase 12)

---

## Stripe (Phase 14)

### Purpose
Subscription billing and payment management.

### Credentials
```
STRIPE_SECRET_KEY=sk_live_...   (or sk_test_... in development)
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Key Operations

| Operation | How |
|-----------|-----|
| Create customer | `stripe.customers.create()` on org creation |
| Create subscription | `stripe.subscriptions.create()` or hosted Checkout |
| Billing portal | `stripe.billingPortal.sessions.create()` |
| Webhook events | `stripe.webhooks.constructEvent()` |

### Subscribed Webhook Events
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

### Location
`server/src/subscriptions/` (planned, Phase 14)

---

## Linear (Phase 17)

### Purpose
Alternative task manager adapter — create and search issues in Linear projects.

### Authentication
Linear API key: `Authorization: Bearer <api_key>`

### SDK
`@linear/sdk` (GraphQL-based)

### Key Operations
- `client.teams()` — list teams (maps to "projects" in the adapter interface)
- `client.createIssue()` — create a new issue
- `client.issues()` with filter — search issues

### Credentials
Stored encrypted in `integration_credentials.credentials`:
```json
{ "apiKey": "lin_api_..." }
```

---

## GitHub Issues (Phase 17)

### Purpose
Alternative task manager adapter — create and search GitHub Issues.

### Authentication
Personal access token or GitHub App installation token.

### SDK
`@octokit/rest`

### Key Operations
- `octokit.repos.listForAuthenticatedUser()` — fetch repos (maps to "projects")
- `octokit.issues.create()` — create a new issue
- `octokit.search.issuesAndPullRequests()` — search issues

### Credentials
Stored encrypted in `integration_credentials.credentials`:
```json
{ "token": "ghp_...", "owner": "org-name" }
```

---

## Sentry (Phase 16)

### Purpose
Error tracking for both frontend and backend.

### Credentials
```
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...   (frontend)
```

### Setup
- Backend: `@sentry/nestjs` — wrap `main.ts`, capture unhandled exceptions
  and BullMQ job failures.
- Frontend: `@sentry/nextjs` — `sentry.server.config.ts` + `sentry.client.config.ts`.
- Source maps uploaded during CI/CD build for readable stack traces.

---

## Integration Credential Pattern

All credentials added after Phase 11 follow this storage pattern:

```typescript
// Fetch and decrypt credentials for the active adapter
const cred = await this.integrationCredentialsService.getActive(organizationId);
const decryptedCreds = decrypt(cred.credentials);
// Use decryptedCreds only within the request scope, never cache in memory
```

Never:
- Store plain-text credentials in the database.
- Log decrypted credentials.
- Pass credentials via query parameters or response bodies.
