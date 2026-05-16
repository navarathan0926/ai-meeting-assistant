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
- [ ] Database schema matches the design.
- [ ] Migrations run successfully.
- [ ] Meeting data is stored correctly.
- [ ] Meeting history API returns accurate results.

## Further Considerations
- Optimize queries for performance.
- Plan for future schema changes.
- Ensure data integrity and consistency.