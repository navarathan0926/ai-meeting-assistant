# Phase 5 — Async Processing Architecture

## Phase Overview
Implement an asynchronous processing architecture to handle long-running jobs like transcription and summarization using BullMQ and Upstash Redis, running within the existing NestJS Container App on Azure.

## Goals
- Use job queues for background processing.
- Avoid extra infrastructure cost by reusing existing Container App.
- Scale the system to handle large audio files efficiently.
- Ensure fault tolerance with retries and error handling.

## Architecture/Design

### Flow
```
API Request (POST /extract)
        ↓
Return 202 Accepted (immediately)
        ↓
Queue Job (BullMQ → Upstash Redis)
        ↓
BullMQ Worker (inside same NestJS app)
        ↓
Transcription (OpenAI API)
        ↓
Summarization / Extraction
        ↓
Save Results to DB
        ↓
Update Job Status → completed / failed
```

### Infrastructure
```
Azure Container Apps Environment (ai-meeting)
└── ai-meeting-api (single container)
    ├── NestJS API        → handles HTTP requests
    └── BullMQ Worker     → processes background jobs (same process)

External (Free)
└── Upstash Redis         → queue backend (free tier)
```

## Key Components
- **Job Queue** — BullMQ backed by Upstash Redis.
- **Background Worker** — BullMQ processor running inside the same NestJS container.
- **Job Status Tracking** — stored in existing DB (`pending` → `processing` → `completed` → `failed`).
- **Retry & Error Handling** — 3 retries with exponential backoff.

## Technologies & Tools
- **Queue**: BullMQ (`@nestjs/bullmq`)
- **Redis**: Upstash Redis (free tier — 10,000 commands/day, 256MB)
- **Backend**: NestJS (existing Container App)
- **Connection**: Upstash Redis URL via TLS (`rediss://`)

## Implementation Steps

### 1. Upstash Redis Setup
- Sign up at [upstash.com](https://upstash.com) (free, no credit card needed).
- Create a new Redis database.
- Copy the Redis URL (`rediss://default:xxx@your-db.upstash.io:6379`).
- Add `REDIS_URL` as an environment variable in Azure Container App:
  ```bash
  az containerapp update \
    --name ai-meeting-api \
    --resource-group ai-meeting \
    --set-env-vars REDIS_URL=rediss://default:xxx@your-db.upstash.io:6379
  ```

### 2. Install Dependencies
```bash
npm install @nestjs/bullmq bullmq ioredis
```

### 3. BullMQ Module Setup
Configure in `app.module.ts`:
```typescript
BullModule.forRoot({
  connection: {
    url: process.env.REDIS_URL,
    tls: { rejectUnauthorized: false }  // required for Upstash TLS
  }
})
```

### 4. Extraction Module Structure
```
src/
  extraction/
    extraction.module.ts
    extraction.processor.ts   ← BullMQ worker
    extraction.service.ts     ← adds jobs to queue
    extraction.controller.ts  ← POST endpoint (returns 202)
```

### 5. Job Queue (extraction.service.ts)
```typescript
await this.extractionQueue.add('extract', {
  meetingId,
  transcript
}, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000   // retries at 5s, 10s, 20s
  }
});
```

### 6. Background Worker (extraction.processor.ts)
```typescript
@Processor('extraction')
export class ExtractionProcessor extends WorkerHost {
  async process(job: Job) {
    const { meetingId, transcript } = job.data;
    // 1. Update status → processing
    // 2. Call OpenAI for transcription/summarization
    // 3. Save results to DB
    // 4. Update status → completed
  }
}
```

### 7. API Update (extraction.controller.ts)
- Update existing endpoints to enqueue jobs instead of processing synchronously.
- Return `202 Accepted` with a `jobId` immediately.
- Add a `GET /extraction/:jobId/status` endpoint for polling job status.

## Job Status Tracking

Store job state in your existing DB:

| Status | Description |
|---|---|
| `pending` | Job added to queue |
| `processing` | Worker picked up the job |
| `completed` | Extraction finished, results saved |
| `failed` | All retries exhausted |

## Cost Summary

| Resource | Cost |
|---|---|
| Upstash Redis (free tier) | $0 |
| BullMQ in existing container | $0 |
| No extra Container App needed | $0 |
| **Total extra cost** | **$0** |

## Upstash Free Tier Limits

| Limit | Free Tier |
|---|---|
| Commands/day | 10,000 |
| Max data size | 256MB |
| Connections | 100 |

> Sufficient for moderate meeting extraction usage. Upgrade only if daily job volume exceeds limits.

## Dependencies
- Phase 1: Transcription and summarization APIs must be functional.
- Upstash Redis account created and `REDIS_URL` configured in Azure.

## Verification Checklist
- [ ] Upstash Redis database created and URL added to Container App env vars.
- [ ] BullMQ module configured with Upstash Redis connection (TLS enabled).
- [ ] Extraction queue and processor implemented in NestJS.
- [ ] API returns `202 Accepted` with `jobId` on extraction request.
- [ ] Job status endpoint (`GET /extraction/:jobId/status`) working.
- [ ] Worker processes jobs successfully (check Azure Log Analytics).
- [ ] Retry logic working — failed jobs retry 3 times with exponential backoff.
- [ ] Job status updates correctly in DB (`pending` → `processing` → `completed/failed`).

## Further Considerations
- Monitor queue performance via Upstash dashboard (free).
- Monitor worker logs via Azure Log Analytics (`workspaceaimeeting8944`).
- If daily commands exceed 10,000, upgrade Upstash to Pay-as-you-go (~$0.20 per 100K commands).
- When scaling up, move worker to a separate Container App for independent scaling.
- Plan for scaling workers if meeting volume grows significantly.
- Ensure fault tolerance — jobs must not be lost if the container restarts (Upstash persists the queue).