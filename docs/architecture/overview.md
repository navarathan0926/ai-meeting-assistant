# Architecture Overview

## System Summary

The AI Meeting Assistant is a full-stack web application that processes audio
recordings of meetings, generates transcripts and AI summaries, extracts
actionable items, and pushes them to an external task manager (Jira, Linear,
GitHub Issues, etc.).

---

## High-Level Component Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser (Next.js)                     │
│   Upload UI  │  Results UI  │  Review UI  │  Analytics UI   │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTPS / WebSocket
┌──────────────────────────▼───────────────────────────────────┐
│                    NestJS API  (:4000/api)                    │
│                                                               │
│  auth/   meetings/   transcriptions/   summaries/            │
│  extraction/   storage/   health/   analytics/               │
│  integrations/   live-transcription/   admin/                │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │             BullMQ Workers (same process*)             │   │
│  │   extraction-queue   │   integration-queue            │   │
│  └───────────────────────────────────────────────────────┘   │
└──────┬────────────────┬──────────────┬────────────────┬──────┘
       │                │              │                │
┌──────▼──────┐  ┌──────▼──────┐ ┌────▼────┐ ┌────────▼──────┐
│  PostgreSQL  │  │    Redis     │ │  Azure  │ │   OpenAI API   │
│  (TypeORM)  │  │  (BullMQ)   │ │  Blob   │ │ Whisper + GPT  │
└─────────────┘  └─────────────┘ └─────────┘ └───────────────┘
                                                       │
                                          ┌────────────▼──────────┐
                                          │  External Task Manager │
                                          │  Jira / Linear /       │
                                          │  GitHub Issues         │
                                          └───────────────────────┘

* Phase 18 separates workers into independent microservices.
```

---

## Application Layers

### Frontend — Next.js (`client/`)

| Concern | Location |
|---------|----------|
| Pages / routes | `src/app/` (App Router) |
| UI components | `src/components/` |
| React Query hooks | `src/hooks/` |
| HTTP client (Axios) | `src/lib/axios.ts` |
| API call functions | `src/lib/api/*.api.ts` |
| TypeScript types | `src/types/` |
| Auth context | `src/providers/AuthProvider.tsx` |

Key conventions:
- All HTTP calls go through the shared Axios instance in `lib/axios.ts`.
- Server state is managed by React Query; local UI state by `useState`.
- No business logic in components — calculations and transformations belong in
  hooks or API functions.

### Backend — NestJS (`server/`)

| Concern | Location |
|---------|----------|
| Feature modules | `src/<feature>/` |
| Cross-cutting code | `src/common/` |
| DB config + migrations | `src/database/` |
| Entry point | `src/main.ts` |

Existing feature modules:

| Module | Responsibility |
|--------|---------------|
| `auth` | JWT auth, Google OAuth, user registration/login |
| `meetings` | Meeting CRUD, upload trigger, status management |
| `transcriptions` | Whisper API calls, transcript storage |
| `summaries` | GPT summarization, summary storage |
| `extraction` | BullMQ job queue, extraction processor |
| `storage` | Azure Blob Storage upload/download/SAS URLs |
| `health` | Health check endpoint |

Planned feature modules (not yet built):

| Module | Phase | Responsibility |
|--------|-------|---------------|
| `jira` | 8–11 | Jira issue creation and project management |
| `organizations` | 10–11 | Multi-tenancy, org CRUD |
| `integrations` | 17 | Task manager adapter registry |
| `analytics` | 15 | Usage and cost metrics |
| `live-transcription` | 15 | WebSocket real-time transcription gateway |
| `admin` | 16 | Bull Board, SUPERADMIN operations |
| `subscriptions` | 14 | Stripe subscription management |
| `webhooks` | 18 | Outbound webhook delivery |

---

## Infrastructure

| Component | Technology | Details |
|-----------|-----------|---------|
| API hosting | Azure Container Apps | `meeting-assistant-api` container |
| Frontend hosting | Azure Container Apps | `meeting-assistant-client` container |
| Database | PostgreSQL | Hosted on Azure Flexible Server (or local in dev) |
| Queue backend | Redis | Upstash Redis (free tier) or local Redis in Docker |
| File storage | Azure Blob Storage | `uploads` container, SAS URLs for access |
| CI/CD | GitHub Actions | Build, test, push image, deploy to Azure |
| Secrets | Azure Container App env vars | Never committed to source control |

Local development uses `docker-compose.yml` at the repo root which starts
Redis and both app containers, with PostgreSQL running on the host.

---

## Environment Variables

### Backend (`server/.env`)

| Variable | Purpose |
|----------|---------|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL connection |
| `JWT_SECRET` | JWT signing key |
| `OPENAI_API_KEY` | OpenAI Whisper + GPT |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob Storage |
| `AZURE_STORAGE_CONTAINER_NAME` | Blob container name |
| `REDIS_URL` | BullMQ Redis connection |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `GOOGLE_CALLBACK_URL` | OAuth callback URL |
| `CLIENT_URL` | Allowed CORS origin |
| `SENTRY_DSN` | Sentry error tracking (Phase 16) |

### Frontend (`client/.env.local`)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error tracking (Phase 16) |

---

## Port Reference

| Service | Port | Notes |
|---------|------|-------|
| Next.js frontend | 3000 | Dev and Docker |
| NestJS backend | 4000 | All routes under `/api` |
| PostgreSQL | 5432 | Host machine (not in Docker Compose) |
| Redis | 6379 | Docker Compose service `redis` |

---

## See Also

- [Data Flow](./data-flow.md) — request lifecycle diagrams
- [Database Schema](./database-schema.md) — entity relationships
- [Async Processing](./async-processing.md) — BullMQ pipeline details
- [Security](./security.md) — auth, authorization, and guards
- [Integrations](./integrations.md) — external service contracts
