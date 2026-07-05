# Phase 12: Direct Audio Ingestion from Zoom

## Goal
Allow users to connect their Zoom account so completed cloud recordings
are pulled into the app automatically, instead of requiring a manual
upload every time. The existing manual upload feature must remain fully
functional, this is an additional path into the same pipeline, not a
replacement.

Google Meet, Microsoft Teams, and Discord are intentionally out of scope
for this phase. They may be added later as separate phases once Zoom is
working well and the value of automatic ingestion has been proven with
real usage. Do not build shared abstractions for multiple platforms yet,
that kind of generalization is easier to add once a second platform is
actually being built, building it speculatively now adds complexity for
no current benefit.

## Before you start
1. Review the existing upload endpoint and the start of the
   summarization pipeline, to understand exactly where audio currently
   enters the system, file storage location, how the meeting entity gets
   created, how the BullMQ job gets triggered.
2. Confirm the exact audio format and storage mechanism currently used,
   local disk, S3, or similar, so a Zoom pulled recording can be
   normalized into the same format and storage path before entering the
   pipeline.
3. Check current Zoom API documentation before implementation, OAuth
   scopes, webhook payload structure, and recording download endpoints
   change over time and this document may be out of date by the time you
   build this.

## What to build

### 1. Integration entity
- New table, meeting_platform_connections: id, user_id, platform (start
  with just "zoom" as the only value, but keep the column as a string or
  enum rather than a boolean, so future platforms can be added without a
  schema change), access_token, refresh_token (encrypted), expires_at,
  connected_at.

### 2. Zoom OAuth connection flow
- Register a Zoom OAuth app, confirm the required scopes for reading
  cloud recordings.
- Build a settings page where a user can click "Connect Zoom" and
  complete the OAuth consent flow, storing the resulting tokens.
- Implement token refresh logic before it is actually needed, do not
  wait to discover refresh is broken once a token has already expired in
  production.
- Add a disconnect action that revokes the token if Zoom's API supports
  it, and deletes the stored connection record either way.

### 3. Recording ingestion
- Use Zoom's recording completed webhook to get notified when a cloud
  recording finishes processing.
- On receiving the webhook, fetch the audio file via Zoom's API using the
  stored access token for the relevant user.
- Save the audio file into the exact same storage path and format used
  by manual uploads, then create a meeting entity and enqueue the same
  summarization BullMQ job used today. Do not build a parallel pipeline,
  funnel this into the existing one so summarization and extraction work
  identically regardless of how the audio arrived.
- Handle the case where the webhook fires but the user who owns that
  Zoom meeting is not clearly identifiable in your system, log this
  clearly rather than silently dropping the recording.

### 4. Frontend
- Settings page showing Zoom connection status, with connect and
  disconnect actions.
- Meetings list should show a small icon or label indicating whether a
  meeting was uploaded manually or pulled from Zoom.
- Manual upload button remains visible and functional at all times,
  nothing about this phase should change or hide the existing upload
  flow.

## Explicitly out of scope for this phase
- Google Meet, Microsoft Teams, Discord, or any platform other than
  Zoom.
- Real time transcription during a live meeting, this is post meeting
  recording ingestion only.
- Any shared multi platform abstraction layer, keep the Zoom integration
  straightforward and specific, generalize later only if and when a
  second platform is actually built.

## Acceptance criteria
- A user can connect their Zoom account and have a completed cloud
  recording automatically appear as a meeting in the app without manual
  upload.
- Manual upload continues to work exactly as before, unaffected by these
  changes.
- Both ingestion paths, manual and Zoom pulled, converge into the same
  summarization and extraction pipeline, with no divergent behavior after
  the meeting entity is created.

## Future work, not part of this phase
Google Meet, Microsoft Teams, and Discord integrations may be added as
separate future phases once Zoom has been live long enough to validate
whether automatic ingestion is actually used and valuable. Discord in
particular has no native meeting recording API, so it would likely
require a bot with a voice channel recording library, treat it as the
lowest priority of the three if pursued at all.
