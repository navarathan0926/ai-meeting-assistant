# Data Flow

## 1. Audio Upload and Processing (Current — Phases 1–5)

The primary user journey: upload a recording, get a summary and extracted
action items.

```
Client                    NestJS API               External Services
  │                           │                           │
  │  POST /api/meetings        │                           │
  │  (multipart audio file)   │                           │
  │──────────────────────────>│                           │
  │                           │                           │
  │                           │── Upload to Azure Blob ──>│
  │                           │<── audioUrl ─────────────│
  │                           │                           │
  │                           │── Create Meeting (DB) ────│
  │                           │   status: pending         │
  │                           │                           │
  │                           │── Enqueue BullMQ job ─────│
  │                           │   { meetingId, audioUrl } │
  │                           │                           │
  │<── 202 Accepted ──────────│                           │
  │    { meetingId, jobId }   │                           │
  │                           │                           │
  │  GET /api/extraction/:jobId/status  (polling)         │
  │──────────────────────────>│                           │
  │<── { status: pending } ───│                           │
  │                           │                           │
  │                      [BullMQ Worker picks up job]     │
  │                           │                           │
  │                           │── Download audio ────────>│ Azure Blob
  │                           │<── audio buffer ──────────│
  │                           │                           │
  │                           │── Whisper transcribe ────>│ OpenAI
  │                           │<── transcript text ───────│
  │                           │                           │
  │                           │── Save Transcription (DB) │
  │                           │── GPT summarize ─────────>│ OpenAI
  │                           │<── summary JSON ──────────│
  │                           │                           │
  │                           │── Save Summary (DB)       │
  │                           │── Update Meeting status   │
  │                           │   → completed             │
  │                           │                           │
  │  GET /api/extraction/:jobId/status                    │
  │──────────────────────────>│                           │
  │<── { status: completed } ─│                           │
  │                           │                           │
  │  GET /api/meetings/:id    │                           │
  │──────────────────────────>│                           │
  │<── Meeting + Transcript   │                           │
  │    + Summary ─────────────│                           │
```

### Job progress milestones (stored in BullMQ + DB)

| Progress | Stage |
|----------|-------|
| 0 | Job picked up by worker |
| 25 | DB status → `processing` |
| 50 | Audio downloaded from Blob Storage |
| 75 | Transcription complete |
| 100 | Summary saved, DB status → `completed` |

---

## 2. Jira Draft Extraction and Approval (Phases 8–13)

After a meeting is processed, extracted items can be reviewed and sent to a
task manager.

```
Client                    NestJS API               OpenAI / Jira
  │                           │                           │
  │  [Meeting processed]      │                           │
  │                           │── Extraction BullMQ job   │
  │                           │   (triggered after sum.)  │
  │                           │                           │
  │                           │── GPT structured output ─>│ OpenAI
  │                           │   (JSON schema mode)      │
  │                           │<── items[] ───────────────│
  │                           │                           │
  │                           │── Save ExtractedItems (DB)│
  │                           │   status: draft           │
  │                           │                           │
  │  GET /api/meetings/:id/extracted-items                │
  │──────────────────────────>│                           │
  │<── [{ id, type, title,    │                           │
  │       description, ... }] │                           │
  │                           │                           │
  │  PATCH /api/extracted-items/:id  (edit draft)        │
  │──────────────────────────>│                           │
  │<── { updated item } ──────│                           │
  │                           │                           │
  │  POST /api/extracted-items/:id/approve  [ADMIN only] │
  │──────────────────────────>│                           │
  │                           │                           │
  │                           │── (Phase 13) JQL search ─>│ Jira
  │                           │<── candidate duplicates ──│
  │                           │                           │
  │                           │── LLM similarity check ──>│ OpenAI
  │                           │<── duplicate confidence ──│
  │                           │                           │
  │<── { duplicates? } ───────│                           │
  │                           │                           │
  │  POST /api/extracted-items/:id/approve                │
  │  { action: "create_new" | "update_existing" }        │
  │──────────────────────────>│                           │
  │                           │── Create / Update issue ─>│ Jira
  │                           │<── { issueKey } ──────────│
  │                           │                           │
  │                           │── Update ExtractedItem    │
  │                           │   status: sent            │
  │                           │   jiraIssueKey: "PROJ-42" │
  │<── { issueKey, url } ─────│                           │
```

---

## 3. Authentication Flow (Google OAuth)

```
Client                    NestJS API               Google
  │                           │                           │
  │  GET /api/auth/google     │                           │
  │──────────────────────────>│                           │
  │<── 302 redirect ──────────│──── OAuth consent ───────>│
  │                           │                           │
  │                           │<─── authorization code ───│
  │                           │                           │
  │  GET /api/auth/google/callback?code=...               │
  │──────────────────────────>│                           │
  │                           │── Exchange code ─────────>│
  │                           │<── access + id token ─────│
  │                           │                           │
  │                           │── Upsert User (DB)        │
  │                           │── Sign JWT                │
  │<── 302 redirect to        │                           │
  │    /auth/callback?token=  │                           │
  │                           │                           │
  │  [Client stores JWT]      │                           │
  │  Authorization: Bearer <token> on all future requests │
```

---

## 4. Zoom Recording Ingestion (Phase 12)

An alternative ingestion path that bypasses manual upload.

```
Zoom                      NestJS API               Azure Blob
  │                           │                           │
  │  POST /api/zoom/webhook   │                           │
  │  { recording_completed }  │                           │
  │──────────────────────────>│                           │
  │                           │── Verify Zoom webhook sig │
  │                           │── Lookup user by Zoom ID  │
  │                           │── Fetch audio via         │
  │                           │   user's access_token ───>│ Zoom
  │                           │<── audio binary ──────────│
  │                           │                           │
  │                           │── Upload to Blob ─────────>│
  │                           │<── audioUrl ──────────────│
  │                           │                           │
  │                           │── Create Meeting (DB)     │
  │                           │   source: zoom            │
  │                           │                           │
  │                           │── [Same BullMQ pipeline   │
  │                           │    as manual upload]      │
```

---

## 5. Live Transcription Session (Phase 15)

Real-time path — no file upload required.

```
Client (Browser)          NestJS WebSocket Gateway     OpenAI
  │                           │                           │
  │  WS connect               │                           │
  │──────────────────────────>│                           │
  │  { event: start_session } │                           │
  │──────────────────────────>│                           │
  │                           │── Create Session record   │
  │                           │                           │
  │  [audio chunks stream]    │                           │
  │  Binary frames ──────────>│                           │
  │                           │── Buffer audio chunks     │
  │                           │── Whisper streaming ─────>│
  │                           │<── partial transcript ────│
  │                           │                           │
  │<── { transcript_delta } ──│                           │
  │  [text appears live]      │                           │
  │                           │                           │
  │  { event: end_session }   │                           │
  │──────────────────────────>│                           │
  │                           │── Save audio to Blob ────>│ Azure Blob
  │                           │── Create Meeting (DB)     │
  │                           │── Enqueue BullMQ job      │
  │                           │   [same processing pipeline]
  │<── { meetingId } ─────────│                           │
```

---

## API Conventions

- **Base path**: `/api` (all routes)
- **Auth**: `Authorization: Bearer <jwt>` header on protected routes
- **Long-running ops**: `202 Accepted` with `{ jobId }` + status polling via
  `GET /api/extraction/:jobId/status`
- **Errors**: Consistent shape from `AllExceptionsFilter`:
  ```json
  { "statusCode": 400, "message": "...", "timestamp": "...", "path": "..." }
  ```
- **Pagination**: `GET /api/meetings?page=1&limit=20` (where applicable)
- **Search**: `GET /api/meetings?search=keyword` (ILIKE on title + filename)
