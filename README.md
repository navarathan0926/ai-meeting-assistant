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
| 3     | Cloud Storage (Azure Blob)         | ✅ Done |
| 4     | Async Processing (BullMQ + Redis)  | 🔜 Next |
| 6     | Deployment & Infrastructure (Docker)| 🚀 Active |

## Docker Deployment (ASAP Production Method)

You can spin up the entire application stack (PostgreSQL, NestJS Backend, and Next.js Frontend) in production-ready containerized mode with single-command ease.

### 1. Prerequisites
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed on the host machine.

### 2. Environment Setup
Create a `.env` file at the root level of the project (same directory as this README):

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Azure Blob Storage Configuration
AZURE_STORAGE_CONNECTION_STRING=your_azure_storage_connection_string_here
AZURE_STORAGE_CONTAINER_NAME=uploads

# Next.js API URL Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Build & Run
From the root directory, execute:
```bash
docker-compose up --build -d
```

### 4. Apply Database Schema Migrations
Once the containers are running and healthy, run the production database migrations inside the server container to initialize the tables (`meetings`, `transcriptions`, `summaries`):
```bash
docker-compose exec server npm run migration:run:prod
```

### 5. Services URLs
- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:4000](http://localhost:4000)
- **Database (Postgres)**: Exposed on port `5432` (User: `postgres`, Pass: `meeting_secret_pass`)

