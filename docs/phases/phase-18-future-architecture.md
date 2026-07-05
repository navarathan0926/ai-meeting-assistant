# Phase 18: Future Architecture and Scale

## Overview
This phase documents planned architectural evolution once the core product is
live and usage patterns are understood from real production data. Nothing here
should be built speculatively — each item should only be started when there is
a concrete driver (observed performance bottleneck, clear business need, or
measurable user demand).

The items are roughly ordered by when they are likely to become relevant, but
this order should be revisited at the Phase 18 planning review based on actual
production metrics.

---

## 1. Microservices: Separate Processing Workers

### When to consider
- Transcription/summarization jobs are starving integration adapter calls (or
  vice versa) despite BullMQ concurrency tuning.
- Deployment frequency requirements differ between the API layer and workers
  (e.g. a model update needs worker redeployment but should not touch the API).
- Worker autoscaling needs differ — transcription jobs are CPU/IO heavy while
  integration calls are mostly network I/O.

### What to build
- Extract the BullMQ processors into standalone NestJS microservices using
  `@nestjs/microservices` with a Redis transport (or keep BullMQ queues as the
  transport if it fits better):
  - `processing-worker` service — handles transcription and summarization jobs.
  - `integration-worker` service — handles task manager adapter calls
    (Jira/Linear/GitHub Issues etc.), introduced in Phase 17.
- The main API app becomes a thin gateway: it accepts HTTP requests, enqueues
  jobs, and serves status polling. It no longer runs processors directly.
- Each worker service has its own `Dockerfile` and can scale independently in
  Azure Container Apps.
- Update `docker-compose.yml` with the new service definitions.
- Shared TypeScript types (job payloads, events) should live in a shared
  `packages/shared` workspace or be duplicated with a comment to keep in sync
  until a proper monorepo toolchain is set up.

### Infrastructure change
```
Before (Phase 5):
  Azure Container Apps
  └── meeting-assistant-api  (API + both BullMQ processors)

After (Phase 18):
  Azure Container Apps
  ├── meeting-assistant-api          (HTTP API only)
  ├── meeting-assistant-proc-worker  (transcription + summarization)
  └── meeting-assistant-intg-worker  (task manager adapters)
```

---

## 2. AI Model Improvements

### When to consider
- Extraction quality issues are reported by organizations at scale — the
  generic GPT-4o-mini prompt is missing domain-specific terminology.
- Summarization quality is inconsistent across different meeting types.

### What to build
- **Organization-specific prompt tuning**: Allow ADMIN to configure a custom
  "context hint" per organization (company name, domain vocabulary, common
  project names) that is injected into the summarization and extraction prompts
  without fine-tuning.
- **Fine-tuning pipeline** (higher effort): If prompt tuning is insufficient,
  set up an offline fine-tuning pipeline using approved meeting transcripts as
  training data (organization opt-in only, with explicit data consent). Store
  the fine-tuned model ID per organization in the `Organization` entity.
- **Model router**: As OpenAI releases new models or as pricing changes,
  allow SUPERADMIN to configure which model is used per job type from a
  settings screen rather than requiring a code change. Store as a configurable
  env var or DB setting.

---

## 3. Native Mobile App

### When to consider
- Mobile usage makes up a meaningful portion of traffic from analytics data.
- Users request live transcription from phone microphones during in-person
  meetings.

### What to build
- Use **React Native** (or Capacitor wrapping the existing Next.js app if
  rapid delivery is prioritized over native performance) to build iOS and
  Android apps.
- The mobile app should support the same authentication (Google OAuth) and
  meeting management flows as the web app.
- Add a "Record now" mode that captures audio from the device microphone and
  streams it to the live transcription gateway (Phase 15).
- Push notifications for when a meeting finishes processing (summary ready,
  extraction complete).

---

## 4. Multi-Region Deployment

### When to consider
- User base spans multiple continents and latency to Azure region is a
  complaint.
- Data residency regulations require certain organizations' data to stay in
  a specific geography.

### What to build
- Deploy additional Azure Container Apps environments in target regions
  (e.g. West Europe, Southeast Asia).
- Use Azure Front Door or Azure Traffic Manager to route users to the nearest
  region.
- PostgreSQL: Azure Flexible Server with geo-replication, or separate
  per-region databases with organization-level routing.
- Azure Blob Storage: replicate to paired regions with read-access geo-
  redundant storage (RA-GRS).
- Review GDPR / data residency requirements and implement per-organization
  region assignment if needed.

---

## 5. Webhooks API for External Automation

### When to consider
- Power users and enterprise organizations want to build their own workflows
  triggered by meeting events (e.g. post summary to Slack, sync to Notion).

### What to build
- A `webhooks` feature module: organizations can register one or more webhook
  endpoints with a secret and a list of event types they want to receive.
- Events: `meeting.processed`, `extraction.completed`, `issue.approved`,
  `issue.sent`.
- Each event fires a signed HTTP POST to all registered endpoints for that org.
- Include a delivery log (stored in DB, retained for 7 days) and a retry
  mechanism (3 attempts, exponential backoff).
- Expose a webhook management UI in the organization settings page.

---

## 6. Two-Way Task Manager Sync

### When to consider
- Organizations want status updates from Jira/Linear/GitHub to flow back into
  the meeting assistant (e.g. marking an extracted item as "Done" when the
  issue is closed in Jira).

### What to build
- Register incoming webhooks with each connected task manager adapter.
- On receiving a status change event, find the matching `ExtractedItem` by
  `task_manager_issue_key` and update its status.
- Display the current task manager status alongside each extracted item in the
  UI.
- This requires that each adapter in Phase 17 implements an additional
  `registerWebhook()` method on the `TaskManagerAdapter` interface.

---

## Planning notes

At the Phase 18 planning review, use the following checklist to decide which
items to prioritize:

- [ ] What is the top user pain point from support tickets and analytics?
- [ ] What is the largest infrastructure cost driver?
- [ ] Is there a compliance or data residency requirement driving multi-region?
- [ ] Has mobile usage crossed a threshold that justifies a native app?
- [ ] Are worker jobs contending in ways that BullMQ concurrency can't solve?

Do not start any item without a clear "yes" to at least one question above.
