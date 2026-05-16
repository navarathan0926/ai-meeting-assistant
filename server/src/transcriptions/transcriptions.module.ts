import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transcription } from './entities/transcription.entity';
import { TranscriptionsService } from './transcriptions.service';

/**
 * TranscriptionsModule
 * Exports TranscriptionsService so MeetingsModule can inject it
 * without needing to know about the Transcription repository directly.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Transcription])],
  providers: [TranscriptionsService],
  exports: [TranscriptionsService],
})
export class TranscriptionsModule {}
