# Phase 0 — Project Setup

## Phase Overview

Prepare the development environment and project structure for the AI Meeting Assistant.

## Goals

- Establish a robust development environment.
- Define the tech stack and folder structure.
- Configure initial dependencies and tools.

## Architecture/Design

- **Frontend**: Next.js with TypeScript and TailwindCSS.
- **Backend**: NestJS with TypeScript.
- **Database**: PostgreSQL.
- **AI Services**: OpenAI Whisper API and GPT API.
- **Cloud**: Azure Blob Storage and Azure Functions (future phases).

## Key Components

- Frontend setup with Next.js, TailwindCSS, and Axios.
- Backend setup with NestJS, PostgreSQL, and TypeORM.
- Environment variable configuration.
- Basic folder structure.

## Implementation Steps

1. Create a Next.js app for the frontend.
2. Set up TailwindCSS for styling.
3. Install and configure Axios for API calls.
4. Create a NestJS app for the backend.
5. Set up PostgreSQL connection and TypeORM.
6. Enable CORS in the backend.
7. Define environment variables for both frontend and backend.
8. Create the folder structure:
   ```
   ai-meeting-assistant/
       client/
       server/
   ```
   client app for frontend and server app for backend.

## Technologies & Tools

- **Frontend**: Next.js, TailwindCSS, Axios, React Query.
- **Backend**: NestJS, TypeORM.
- **Database**: PostgreSQL.
- **AI Services**: OpenAI APIs.

## Dependencies

- None (initial phase).

## Verification Checklist

- [x] client app runs successfully (Next.js on :3000).
- [x] server app connects to PostgreSQL (DatabaseModule via TypeORM — update `.env` DB_PASSWORD).
- [x] Environment variables are correctly configured (`.env` / `.env.local` from `.env.example`).
- [x] Folder structure matches the design.

## Further Considerations

- Ensure scalability of the folder structure.
- Plan for future integration of Azure services.
