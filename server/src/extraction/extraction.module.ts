import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meeting } from '../meetings/entities/meeting.entity';
import { TranscriptionsModule } from '../transcriptions/transcriptions.module';
import { SummariesModule } from '../summaries/summaries.module';
import { StorageModule } from '../storage/storage.module';
import { ExtractionService } from './extraction.service';
import { ExtractionProcessor } from './extraction.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'extraction',
    }),
    TypeOrmModule.forFeature([Meeting]),
    TranscriptionsModule,
    SummariesModule,
    StorageModule,
  ],
  providers: [ExtractionService, ExtractionProcessor],
  exports: [ExtractionService],
})
export class ExtractionModule {}
