import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { MeetingsModule } from './meetings/meetings.module';
import { HealthController } from './health/health.controller';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { ExtractionModule } from './extraction/extraction.module';
import { AuthModule } from './auth/auth.module';
import { ExtractedItemsModule } from './extracted-items/extracted-items.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { OrganizationUsersModule } from './organization-users/organization-users.module';
import { PlatformSettingsModule } from './platform-settings/platform-settings.module';
import { RedisModule } from './common/redis/redis.module';
import {
  configurations,
  redisConfiguration,
  validateEnvironment,
} from './common/config';
import { ConfigType } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: configurations,
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 100,
      },
    ]),
    RedisModule,
    BullModule.forRootAsync({
      inject: [redisConfiguration.KEY],
      useFactory: (redis: ConfigType<typeof redisConfiguration>) => ({
        connection: {
          url: redis.url,
          ...(redis.useTls
            ? { tls: { rejectUnauthorized: redis.tlsRejectUnauthorized } }
            : {}),
        },
      }),
    }),
    DatabaseModule,
    MeetingsModule,
    ExtractionModule,
    ExtractedItemsModule,
    OrganizationsModule,
    OrganizationUsersModule,
    PlatformSettingsModule,
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
