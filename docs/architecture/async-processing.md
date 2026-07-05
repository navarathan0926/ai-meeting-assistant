# Async Processing — BullMQ Pipeline

## Overview

Long-running operations (transcription, summarization, extraction, and task
manager calls) run as background jobs via BullMQ backed by Redis. The API
returns `202 Accepted` immediately and the client polls for status.

This keeps HTTP response times fast (< 200ms) regardless of how long
OpenAI processing takes.

---

## Queue Architecture

```
POST /api/meetings (upload)
        │
        ▼
  extraction-queue
  ┌─────────────────────────────────┐
  │  Job: { meetingId, audioUrl }   │
  │  Attempts: 3                    │
  │  Backoff: exponential (5s base) │
  └──────────────┬──────────────────┘
                 │
        ┌────────▼────────┐
        │ ExtractionProcessor │   (server/src/extraction/extraction.processor.ts)
        └────────┬────────┘
                 │
   ┌─────────────▼─────────────────────┐
   │  Stage 1: Download audio (Blob)   │  progress: 50
   ├─────────────────────────────────-─┤
   │  Stage 2: Whisper transcription   │  progress: 75
   ├───────────────────────────────────┤
   │  Stage 3: GPT summarization       │  progress: 90
   ├───────────────────────────────────┤
   │  Stage 4: GPT extraction (items)  │  progress: 100
   └─────────────────────────────────-─┘
                 │
        Save results to DB
        Update meeting.status → completed
```

**Phase 18 note**: If throughput demands it, split into two separate queues:
`processing-queue` (stages 1–3) and `integration-queue` (stage 4 + task
manager calls), each with their own dedicated worker service.

---

## Queue Definitions

| Queue name | Purpose | Processor file |
|------------|---------|---------------|
| `extraction` | End-to-end processing: transcription → summary → item extraction | `extraction.processor.ts` |
| `integration` | Task manager API calls (create/update issues) — future | planned Phase 17 |

---

## Job Configuration

```typescript
// extraction.service.ts
await this.extractionQueue.add('extract', {
  meetingId,
  audioUrl,
}, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000,   // 5s, 10s, 20s
  },
  removeOnComplete: { count: 100 },   // keep last 100 completed jobs
  removeOnFail: { count: 200 },       // keep last 200 failed jobs for debugging
});
```

---

## Job Status Lifecycle

```
pending  →  processing  →  completed
                       →  failed
```

Status is stored on the `Meeting` entity in PostgreSQL (not just in Redis)
so it survives Redis flushes and can be queried without BullMQ.

| DB Status | Meaning |
|-----------|---------|
| `pending` | Job added to queue, not yet picked up |
| `processing` | Worker has started processing |
| `completed` | All stages done, results saved |
| `failed` | All retry attempts exhausted |

---

## Error Handling

- **Transient errors** (network timeout to OpenAI, Redis blip): BullMQ retries
  automatically up to 3 times with exponential backoff.
- **Permanent errors** (invalid audio format, OpenAI quota exceeded): The
  processor catches the error, sets `meeting.status = failed`, and stores the
  error message. The job moves to the BullMQ failed set.
- **Last attempt detection**: The processor checks `job.attemptsMade ===
  job.opts.attempts - 1` to set status to `failed` only on the last attempt,
  not on intermediate retries.

```typescript
// extraction.processor.ts  (pattern)
async process(job: Job) {
  try {
    await job.updateProgress(25);
    await this.meetingsService.updateStatus(meetingId, MeetingStatus.PROCESSING);
    // ... stages ...
    await job.updateProgress(100);
    await this.meetingsService.updateStatus(meetingId, MeetingStatus.COMPLETED);
  } catch (error) {
    const isLastAttempt = job.attemptsMade >= (job.opts.attempts ?? 1) - 1;
    if (isLastAttempt) {
      await this.meetingsService.updateStatus(meetingId, MeetingStatus.FAILED);
    }
    throw error;   // re-throw so BullMQ handles retry
  }
}
```

---

## Status Polling Endpoint

```
GET /api/extraction/:jobId/status

Response (200):
{
  "jobId": "123",
  "status": "processing" | "completed" | "failed" | "pending",
  "progress": 75,
  "meetingId": "uuid"
}
```

The client polls this endpoint until `status` is `completed` or `failed`,
then fetches the full meeting data from `GET /api/meetings/:id`.

Recommended polling interval: 3–5 seconds. Consider switching to WebSocket
push for status updates in Phase 15 to eliminate polling.

---

## Redis Infrastructure

| Environment | Redis | Notes |
|-------------|-------|-------|
| Local dev | `redis:6379` via Docker Compose | `redis:7-alpine` container |
| Production | Upstash Redis | TLS URL (`rediss://`), free tier for moderate load |

**Upstash free tier limits** (as of Phase 5 implementation):
- 10,000 commands/day
- 256 MB data
- 100 concurrent connections

Monitor usage via the Upstash dashboard. Upgrade to Pay-as-you-go if daily
job volume approaches the limit.

### BullMQ + TLS connection

```typescript
// app.module.ts
BullModule.forRoot({
  connection: {
    url: process.env.REDIS_URL,
    tls: process.env.REDIS_URL?.startsWith('rediss://')
      ? { rejectUnauthorized: false }
      : undefined,
  },
})
```

---

## Concurrency

The `ExtractionProcessor` runs with `concurrency: 2` — two jobs processed
simultaneously within the same NestJS process. This balances throughput
against OpenAI rate limits.

Tune by adjusting the `@Processor` decorator options:
```typescript
@Processor('extraction', { concurrency: 2 })
export class ExtractionProcessor extends WorkerHost { ... }
```

---

## Bull Board (Phase 16)

Bull Board provides a visual dashboard for queue health:

- Route: `GET /api/admin/queues` (SUPERADMIN only)
- Shows: queue depth, throughput, failed jobs, retry counts
- Package: `@bull-board/nestjs`

Use it to inspect stuck jobs, retry failed ones, and monitor queue health
without connecting directly to Redis.

---

## Scaling Considerations

Current architecture runs workers inside the same NestJS process as the API.
This is cost-efficient for moderate load but has limits:

| Limit | Current approach | Phase 18 solution |
|-------|-----------------|-------------------|
| Worker crashes affect API | Yes (same process) | Separate containers |
| Independent scaling | No | Separate Azure Container App scaling rules |
| Memory isolation | No | Separate processes |
| Deployment independence | No | Independent container deployments |

Do not split until there is a measured need — the monolith approach is
significantly simpler to operate.
