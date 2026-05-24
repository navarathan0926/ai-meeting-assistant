/**
 * AppDataSource & buildDataSourceOptions
 *
 * Single source of truth for TypeORM connection config.
 *
 * - `buildDataSourceOptions()` is shared by DatabaseModule (NestJS runtime)
 *   and AppDataSource (TypeORM CLI for migrations).
 * - `AppDataSource` is the CLI-only DataSource used by:
 *     npm run migration:generate
 *     npm run migration:run
 *     npm run migration:revert
 */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Meeting } from '../meetings/entities/meeting.entity';
import { Transcription } from '../transcriptions/entities/transcription.entity';
import { Summary } from '../summaries/entities/summary.entity';

// Ensure .env is loaded when this file is imported by the CLI
dotenv.config();

/**
 * Returns a plain DataSourceOptions object built from process.env.
 * Called by:
 *  - AppDataSource below (TypeORM CLI)
 *  - DatabaseModule (NestJS module — .env already loaded by dotenv above)
 */
export function buildDataSourceOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ai_meeting_assistant',
    entities: [Meeting, Transcription, Summary],
    synchronize: false,
    logging: false,
  };
}

/** CLI-only DataSource — do NOT inject this into NestJS providers */
export const AppDataSource = new DataSource({
  ...buildDataSourceOptions(),
  migrations: [__dirname + '/migrations/*.{js,ts}'],
});
