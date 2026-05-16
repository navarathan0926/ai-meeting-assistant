import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * DatabaseModule
 * Provides a single TypeORM connection using values from ConfigService
 * (which reads from the .env file loaded by the global ConfigModule).
 *
 * Re-export TypeOrmModule so feature modules that call
 * TypeOrmModule.forFeature([...]) can resolve the data-source.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'postgres'),
        password: config.get<string>('DB_PASSWORD', ''),
        database: config.get<string>('DB_NAME', 'meeting_assistant'),

        // Auto-discover entities from all feature modules.
        // In production, switch to explicit entities[] array.
        autoLoadEntities: true,

        // synchronize: true is convenient during development.
        // Set to false in production and use migrations instead.
        synchronize: config.get<string>('NODE_ENV') !== 'production',

        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),
  ],
})
export class DatabaseModule {}
