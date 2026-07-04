# Phase 15: Real-Time Transcription and Advanced Analytics

## Goal
Extend the existing post-meeting pipeline with live transcription capabilities
so users can process meetings as they happen rather than uploading a recording
afterwards. Additionally, add a per-user and per-organization analytics
dashboard that surfaces meeting trends, AI processing costs, and extraction
quality metrics.

This phase does not remove the existing upload flow — it adds a second path
into the same pipeline for users who want real-time capture alongside the
existing recording upload.

## Before you start
1. Review the existing `ExtractionProcessor` and BullMQ pipeline from Phase 5
   to understand the job structure that the live path must feed into.
2. Confirm the current Azure Blob Storage upload flow from Phase 3 — the live
   recording will need to store the final audio file to the same location so
   the rest of the pipeline is unaffected.
3. Review the usage tracking added in Phase 11 (OpenAI token counts per org
   per meeting) — the analytics dashboard builds directly on that data.
4. Check current documentation for the WebSocket adapter you will use
   (`@nestjs/platform-socket.io` or `@nestjs/platform-ws`) before
   implementation — API details change between NestJS minor versions.

## What to build

### 1. Real-time transcription gateway (NestJS WebSocket)
- Add a NestJS `@WebSocketGateway` under a new `live-transcription/` feature
  module.
- The client streams raw audio chunks over WebSocket; the gateway buffers them
  and sends them to OpenAI Whisper (or Deepgram if lower latency is needed at
  implementation time — check pricing and latency benchmarks before
  committing).
- Transcription deltas are broadcast back to the originating client in
  real-time so the user sees the text appear as they speak.
- When the session ends, save the final audio buffer to Azure Blob Storage and
  create a `Meeting` entity + enqueue the standard BullMQ summarization and
  extraction jobs — the same path used today for uploaded recordings.
- Gate this feature behind an active subscription (Phase 14 feature gating)
  if real-time transcription is a paid-tier feature.

### 2. Speaker diarization (post-processing)
- After the Whisper transcription completes (either live session or uploaded
  recording), run a lightweight diarization pass to segment the transcript by
  speaker if the audio contains multiple voices.
- Use the OpenAI Whisper response timestamps to align diarization output with
  the transcript text.
- Store speaker labels in the `Transcription` entity as structured JSON
  alongside the plain text (add a `segments` JSONB column, migration required).
- Display speaker-attributed transcript in the results UI with each speaker
  in a distinct colour.

### 3. Meeting analytics dashboard
- New `analytics/` feature module on the backend with endpoints that aggregate
  data from existing tables — no new primary storage needed beyond the usage
  tracking introduced in Phase 11.
- Per-user view (available to all roles): meetings processed count, average
  processing time, extraction success rate, total items approved vs. rejected.
- Per-organization view (ADMIN only): same metrics aggregated across all org
  users, plus OpenAI token spend over time and Jira creation volume.
- SUPERADMIN view: cross-org summaries, top spending organizations, failed job
  trend over time.
- Frontend: a `/dashboard` route with chart components (use a lightweight
  charting library — `recharts` is already common in Next.js projects, prefer
  it over adding a heavy new dependency).

### 4. Calendar integration for pre-meeting context (optional, if time allows)
- Allow users to connect Google Calendar (OAuth, reuse the existing Google
  OAuth flow from Phase 0 if the scopes can be extended without a second
  consent round).
- Before a live session starts or a recording is uploaded, the app can look up
  the calendar event matching the meeting title/time and pull in the agenda,
  attendee list, and any linked notes as pre-context for the summarization
  prompt, producing more accurate summaries.
- Store the linked calendar event ID on the `Meeting` entity (nullable FK or
  JSON field — migration required if added).

## New module structure
```
server/src/
  live-transcription/
    live-transcription.gateway.ts    ← WebSocket gateway
    live-transcription.module.ts
    live-transcription.service.ts    ← audio buffering, session management
  analytics/
    analytics.controller.ts
    analytics.module.ts
    analytics.service.ts
    interfaces/
      analytics-response.interface.ts
```

## Technologies & Tools
- **WebSocket**: `@nestjs/platform-socket.io` or `@nestjs/platform-ws`
- **Transcription**: OpenAI Whisper API (or Deepgram for lower latency)
- **Diarization**: `pyannote-audio` via a lightweight sidecar, or speaker
  labels from Whisper's `word_timestamps` if sufficient
- **Charts**: `recharts` (Next.js frontend)
- **Calendar**: Google Calendar API (optional)

## Dependencies
- Phase 3 (Azure Blob Storage) must be complete — live sessions write to it.
- Phase 5 (BullMQ pipeline) must be complete — live sessions feed into it.
- Phase 11 (usage tracking) must be complete — analytics reads from it.
- Phase 14 (subscription gating) must be complete if live transcription is
  a paid feature.

## Explicitly out of scope for this phase
- Recording directly from Zoom, Google Meet, or Teams (that is Phase 12).
- Fine-tuning AI models on org-specific vocabulary (that is Phase 18).
- Emotion or sentiment analysis.

## Acceptance criteria
- A user can start a live session in the browser, see transcript text appear
  in real-time, end the session, and receive a summary and extracted items
  identically to the existing upload flow.
- Speaker labels are visible in the transcript view when more than one speaker
  is detected.
- The analytics dashboard shows accurate meeting counts, extraction rates, and
  OpenAI cost totals scoped to the logged-in user's role.
- The existing upload and manual workflow is completely unaffected by these
  changes.
