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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        ...(process.env.REDIS_URL?.startsWith('rediss://')
          ? { tls: { rejectUnauthorized: false } }
          : {}),
      },
    }),
    DatabaseModule,
    MeetingsModule,
    ExtractionModule,
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
