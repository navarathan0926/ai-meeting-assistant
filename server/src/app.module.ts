import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { MeetingsModule } from './meetings/meetings.module';
import { HealthController } from './health/health.controller';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { ExtractionModule } from './extraction/extraction.module';
import { AuthModule } from './auth/auth.module';
import { ExtractedItemsModule } from './extracted-items/extracted-items.module';
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
    BullModule.forRootAsync({
      inject: [redisConfiguration.KEY],
      useFactory: (redis: ConfigType<typeof redisConfiguration>) => ({
        connection: {
          url: redis.url,
          ...(redis.useTls ? { tls: { rejectUnauthorized: false } } : {}),
        },
      }),
    }),
    DatabaseModule,
    MeetingsModule,
    ExtractionModule,
    ExtractedItemsModule,
    AuthModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
