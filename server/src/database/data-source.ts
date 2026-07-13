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
import { User } from '../auth/entities/user.entity';
import { ExtractedItem } from '../extracted-items/entities/extracted-item.entity';
import { ProjectContext } from '../jira/entities/project-context.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { buildDatabaseConfig } from '../common/config/database.config';

// Ensure .env is loaded when this file is imported by the CLI
dotenv.config();

/**
 * Returns a plain DataSourceOptions object built from process.env.
 * Called by:
 *  - AppDataSource below (TypeORM CLI)
 *  - DatabaseModule (NestJS module — .env already loaded by dotenv above)
 */
export function buildDataSourceOptions(): DataSourceOptions {
  const db = buildDatabaseConfig();

  return {
    type: 'postgres',
    host: db.host,
    port: db.port,
    username: db.username,
    password: db.password,
    database: db.database,
    entities: [
      Meeting,
      Transcription,
      Summary,
      User,
      ExtractedItem,
      ProjectContext,
      Organization,
    ],
    synchronize: false,
    logging: false,
    ssl: db.ssl ? { rejectUnauthorized: false } : false,
  };
}

/** CLI-only DataSource — do NOT inject this into NestJS providers */
export const AppDataSource = new DataSource({
  ...buildDataSourceOptions(),
  migrations: [__dirname + '/migrations/*.{js,ts}'],
});
