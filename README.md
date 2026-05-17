# AI Meeting Assistant

An AI-powered meeting assistant that transcribes audio recordings and generates smart summaries using OpenAI APIs.

## Tech Stack

| Layer    | Technology                           |
| -------- | ------------------------------------ |
| Frontend | Next.js 16, TailwindCSS, React Query |
| Backend  | NestJS 10, TypeORM                   |
| Database | PostgreSQL                           |
| AI       | OpenAI Whisper + GPT APIs            |

## Project Structure

```
sample-meeting-assistent/
├── client/               # Next.js frontend
│   └── src/
│       ├── app/          # App Router pages & layouts
│       ├── components/   # Shared UI components
│       ├── hooks/        # Custom React Query hooks
│       ├── lib/          # Axios instance & utilities
│       ├── providers/    # Context / QueryProvider
│       └── types/        # Shared TypeScript interfaces
└── server/               # NestJS backend
    └── src/
        ├── common/       # Guards, filters, interceptors
        ├── database/     # TypeORM DatabaseModule
        ├── meetings/     # Meetings feature module (Phase 1)
        ├── summaries/    # Summarization module (Phase 1)
        └── transcriptions/ # Transcription module (Phase 1)
```

## Getting Started

### Prerequisites

- Node.js ≥ 18
- PostgreSQL running locally

### 1. Backend (NestJS)

```bash
cd server
cp .env.example .env          # Fill in your DB credentials & API keys
npm install
npm run start:dev             # Starts on http://localhost:4000/api
```

### 2. Frontend (Next.js)

```bash
cd client
cp .env.example .env.local    # Set NEXT_PUBLIC_API_URL
npm install
npm run dev                   # Starts on http://localhost:3000
```

## Development Phases

| Phase | Description                        | Status  |
| ----- | ---------------------------------- | ------- |
| 0     | Project Setup                      | ✅ Done |
| 1     | MVP Core Flow (upload, transcribe) | ✅ Done |
| 2     | Database Integration               | ✅ Done |
| 3     | Cloud Storage (Azure Blob)         | 🔜 Next |
