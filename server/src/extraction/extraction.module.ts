import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meeting } from '../meetings/entities/meeting.entity';
import { TranscriptionsModule } from '../transcriptions/transcriptions.module';
import { SummariesModule } from '../summaries/summaries.module';
import { StorageModule } from '../storage/storage.module';
import { ExtractionService } from './extraction.service';
import { ExtractionProcessor } from './extraction.processor';
import { ExtractionController } from './extraction.controller';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'extraction',
      // Process up to 2 jobs concurrently within this worker instance.
      // Increase if the container has more CPU/memory headroom.
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    }),
    TypeOrmModule.forFeature([Meeting]),
    TranscriptionsModule,
    SummariesModule,
    StorageModule,
  ],
  controllers: [ExtractionController],
  providers: [ExtractionService, ExtractionProcessor],
  exports: [ExtractionService],
})
export class ExtractionModule {}

