import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { MeetingsModule } from './meetings/meetings.module';

@Module({
  imports: [
    // ── Config (global) ─────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ── Database ────────────────────────────────────────────────────
    DatabaseModule,

    // ── Feature modules ─────────────────────────────────────────────
    // TranscriptionsModule and SummariesModule are imported transitively
    // through MeetingsModule — no need to add them here.
    MeetingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
