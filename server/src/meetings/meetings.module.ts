import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meeting } from './entities/meeting.entity';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { TranscriptionsModule } from '../transcriptions/transcriptions.module';
import { SummariesModule } from '../summaries/summaries.module';

/**
 * MeetingsModule
 * Imports Transcriptions and Summaries modules so the MeetingsService
 * can inject their services without coupling directly to their internals.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Meeting]),
    TranscriptionsModule,
    SummariesModule,
  ],
  controllers: [MeetingsController],
  providers: [MeetingsService],
})
export class MeetingsModule {}
