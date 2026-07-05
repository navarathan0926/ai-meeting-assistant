# Phase 16: Monitoring, Observability, and Maintenance

## Goal
Establish production-grade observability across the entire system so that
errors, performance regressions, queue failures, and cost anomalies are
detected and actionable before users notice them. Additionally define a
repeatable maintenance process for dependency updates, security patches, and
database schema management.

Phase 11 already introduced lightweight usage tracking (OpenAI token counts,
BullMQ failure records, Jira API errors) scoped per organization. This phase
builds on top of that to add structured error tracking, metrics dashboards,
alerting, and formal maintenance runbooks.

## Before you start
1. Review Phase 11's observability groundwork — specifically the usage and
   job failure tracking tables — to understand what data already exists
   before adding new instrumentation.
2. Review Phase 4 (Deployment) for the existing Azure Monitor / Log Analytics
   workspace setup — extend it rather than creating a parallel monitoring
   stack.
3. Check current Sentry SDK documentation (`@sentry/nestjs`, `@sentry/nextjs`)
   before implementation — the SDK initialization API changes between major
   versions.

## What to build

### 1. Error tracking — Sentry
- Integrate `@sentry/nestjs` into the NestJS backend and `@sentry/nextjs`
  into the Next.js frontend.
- Capture all unhandled exceptions and BullMQ job failures with full stack
  traces, user context (user ID, organization ID), and relevant request
  metadata.
- Configure source maps so production stack traces point to the TypeScript
  source, not the compiled output.
- Set up separate Sentry environments for `development`, `staging`, and
  `production` to avoid noise in production alerts.
- Add a `SENTRY_DSN` environment variable to both `server/.env.example` and
  `client/.env.example`.

### 2. Queue health monitoring — Bull Board
- Add Bull Board (`@bull-board/nestjs`) to expose a read-only dashboard at
  `/api/admin/queues` showing queue depths, job throughput, failed jobs, and
  retry counts for all BullMQ queues.
- Guard the route with `@Roles(Role.SUPERADMIN)` so only superadmins can
  access it in production.
- This gives immediate visibility into stuck or backed-up jobs without
  needing to query the database directly.

### 3. Structured logging with correlation IDs
- Ensure the existing `logger.middleware.ts` attaches a unique `correlationId`
  (UUID) to every incoming HTTP request and every BullMQ job.
- Pass `correlationId` through all service calls and log it with every log
  line so related log entries across the request lifecycle can be filtered
  together in Azure Log Analytics.
- Use a consistent JSON log format: `{ level, timestamp, correlationId,
  message, context, ...metadata }`.
- Do not add a new logging library if `@nestjs/common` Logger is sufficient —
  only add `winston` or `pino` if structured JSON output with log levels is
  not achievable otherwise.

### 4. Application metrics — Azure Monitor
- Extend the existing Azure Monitor setup from Phase 4 to track custom
  application metrics:
  - `meeting.processed` — counter per org, with `status` (success/failure) tag
  - `jira.issue.created` — counter per org
  - `openai.tokens.used` — gauge per org per model
  - `bullmq.job.duration` — histogram per queue
- Use Azure Application Insights custom events API or expose a `/metrics`
  endpoint compatible with Azure Monitor scraping.

### 5. Cost alerting
- Set up Azure Monitor alerts that trigger a notification (email or Slack
  webhook) when:
  - Daily OpenAI spend across all organizations exceeds a configurable
    threshold (start with a hard-coded env var, make it configurable later).
  - BullMQ job failure rate exceeds 5% over a 1-hour rolling window.
  - Any organization's Jira API call failure rate exceeds 10 failures in
    1 hour.
- Keep alert configuration in code (IaC or a documented setup script) so it
  is reproducible across environments — do not rely on manual portal clicks.

### 6. Maintenance runbooks
Document the following processes in `docs/maintenance/`:

#### `docs/maintenance/dependency-updates.md`
- Run `npm audit` weekly in both `server/` and `client/`.
- Use `npm outdated` to identify major version drifts quarterly.
- Test updates in a staging branch before merging to main.
- Pin critical dependencies (TypeORM, NestJS, Next.js) to exact versions in
  `package.json` to avoid surprise upgrades from `^` ranges in CI.

#### `docs/maintenance/database-migrations.md`
- Never use `synchronize: true` in production (already documented in Phase 2).
- All schema changes go through TypeORM migrations: `npm run migration:generate`
  followed by review, then `npm run migration:run`.
- Keep a rollback plan for each migration: test `npm run migration:revert` in
  staging before deploying to production.
- Back up the database before every production migration.

#### `docs/maintenance/incident-response.md`
- On a Sentry alert: acknowledge in Sentry, reproduce locally, fix, deploy.
- On a queue failure alert: open Bull Board, inspect failed job payload and
  error, determine if the job can be safely retried or needs a data fix.
- On a cost spike: check Azure Monitor, identify the org and meeting(s)
  responsible, contact them if needed, apply rate limiting if abuse suspected.

## New module / file additions
```
server/src/
  admin/
    admin.module.ts             ← hosts Bull Board route guard
    admin.controller.ts         ← GET /api/admin/queues (SUPERADMIN only)
docs/
  maintenance/
    dependency-updates.md
    database-migrations.md
    incident-response.md
```

## Technologies & Tools
- **Error tracking**: Sentry (`@sentry/nestjs`, `@sentry/nextjs`)
- **Queue dashboard**: Bull Board (`@bull-board/nestjs`, `@bull-board/api`)
- **Metrics**: Azure Application Insights custom events
- **Alerting**: Azure Monitor alert rules + action groups
- **Logging**: NestJS built-in Logger (JSON format), Azure Log Analytics

## Dependencies
- Phase 4 (Azure Monitor setup) must be in place.
- Phase 5 (BullMQ queues) must be in place.
- Phase 11 (usage tracking tables) should be in place for cost alerting.

## Explicitly out of scope for this phase
- Full distributed tracing (OpenTelemetry) — evaluate after Phase 18 if the
  system moves to microservices.
- A custom internal analytics BI tool — Phase 15 analytics dashboard covers
  the product-facing metrics, this phase covers operational metrics.

## Acceptance criteria
- Unhandled exceptions in both backend and frontend appear in Sentry within
  seconds with full context (user, org, stack trace).
- Bull Board shows live queue state and failed jobs are visible to SUPERADMIN
  without needing database access.
- Every log line across a single request lifecycle shares the same
  `correlationId`, verifiable in Azure Log Analytics.
- Cost alerts fire correctly in a staging environment using synthetic test
  data that exceeds the configured thresholds.
- All three maintenance runbooks are present and reviewed.
