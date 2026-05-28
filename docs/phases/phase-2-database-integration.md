# Phase 2 — Database Integration

## Phase Overview
Integrate a database to persist meeting data, including transcripts and summaries.

## Goals
- Design and implement a database schema.
- Store meeting data after processing.
- Enable retrieval of meeting history.

## Architecture/Design
- **Database**: PostgreSQL with TypeORM.
- **Schema**:
  - `meetings` table:
    ```
    id
    title
    audioUrl
    transcript
    summary
    createdAt
    ```

## Key Components
- Database schema.
- Migrations.
- Meeting data storage logic.
- Meeting history retrieval API.

## Implementation Steps
1. **Database Schema**:
   - Define the `meetings` table.
   - Include fields for metadata, transcript, and summary.
2. **Migrations**:
   - Create and run migrations to set up the schema.
3. **Data Storage**:
   - Save meeting data after transcription and summarization.
4. **Meeting History API**:
   - Create endpoints to list and retrieve meeting records.
   - Implement search functionality.

## Technologies & Tools
- **Database**: PostgreSQL.
- **ORM**: TypeORM.
- **Backend**: NestJS.

## Dependencies
- Phase 1: Core flow must be functional.

## Verification Checklist
- [x] Database schema matches the design (`meetings`, `transcriptions`, `summaries` tables with all required fields).
- [x] Migrations run successfully (`npm run migration:run` — `InitialSchema` applied cleanly).
- [x] Meeting data is stored correctly (entity relations cascade-saved via async pipeline).
- [x] Meeting history API returns accurate results (`GET /api/meetings`, `GET /api/meetings/:id`).
- [x] Search functionality implemented (`GET /api/meetings?search=<term>` — ILIKE on title + originalFileName).
- [x] `title` field added to meetings (auto-derived from filename on upload, nullable varchar).

## Migration Commands
```bash
npm run migration:generate   # diff entities → new migration file
npm run migration:run        # apply pending migrations to DB
npm run migration:revert     # undo the last applied migration
npm run migration:create     # create a blank migration file
```

## Further Considerations
- Optimize queries for performance (add indexes on `status`, `createdAt`).
- Plan for future schema changes via new migrations (never use `synchronize: true` in production).
- Ensure data integrity and consistency.