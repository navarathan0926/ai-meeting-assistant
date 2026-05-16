# Phase 1 — MVP Core Flow

## Phase Overview
Implement the core functionality of the AI Meeting Assistant: audio upload, transcription, summary generation, and result display.

## Goals
- Allow users to upload audio files.
- Transcribe audio to text.
- Generate AI summaries from transcripts.
- Display results in the UI.

## Architecture/Design
- **Frontend**: File upload UI with drag-and-drop support.
- **Backend**: APIs for file upload, transcription, and summarization.
- **AI Services**: OpenAI Whisper API for transcription, GPT API for summarization.

## Key Components
- Audio upload UI.
- File upload API.
- Transcription API.
- Summarization API.
- Results display UI.

## Implementation Steps
1. **Audio Upload UI**:
   - Create an upload page.
   - Implement a file upload component with drag-and-drop support.
   - Add loading states and success/error messages.
2. **File Upload API**:
   - Create a `POST /upload` endpoint.
   - Handle multipart/form-data.
   - Save files locally (initially).
3. **Transcription API**:
   - Create a `POST /transcribe` endpoint.
   - Send audio files to OpenAI Whisper API.
   - Return the transcript.
4. **Summarization API**:
   - Create a `POST /summarize` endpoint.
   - Send transcripts to OpenAI GPT API.
   - Return the summary.
5. **Results Display**:
   - Show uploaded file name, transcript, summary, and action items in the UI.

## Technologies & Tools
- **Frontend**: React, TailwindCSS, Axios.
- **Backend**: NestJS, Multer, OpenAI APIs.

## Dependencies
- Phase 0: Project setup must be complete.

## Verification Checklist
- [x] Users can upload audio files (drag-and-drop + file picker with type/size validation).
- [x] Transcription API returns accurate transcripts (Whisper via TranscriptionsService).
- [x] Summarisation API generates structured summaries (GPT-4o-mini via SummariesService).
- [x] Results are displayed correctly in the UI (overview, key points, action items, transcript).

## Further Considerations
- Validate file types and sizes during upload.
- Handle API errors gracefully.
- Optimize API calls for performance.