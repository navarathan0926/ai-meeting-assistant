import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDataSourceOptions } from './data-source';

/**
 * DatabaseModule
 * Registers TypeORM using the shared buildDataSourceOptions() factory from
 * data-source.ts — the single source of truth for all DB connection config.
 *
 * dotenv.config() is called inside data-source.ts at import time, so
 * process.env is already populated with .env values when forRoot() runs.
 */
@Module({
  imports: [
    TypeOrmModule.forRoot(buildDataSourceOptions()),
  ],
})
export class DatabaseModule {}
