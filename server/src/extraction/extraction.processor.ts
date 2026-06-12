import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from '../meetings/entities/meeting.entity';
import { MeetingStatus } from '../meetings/enums/meeting-status.enum';
import { TranscriptionsService } from '../transcriptions/transcriptions.service';
import { SummariesService } from '../summaries/summaries.service';
import { BlobStorageService } from '../storage/blob-storage.service';

@Processor('extraction')
export class ExtractionProcessor extends WorkerHost {
  private readonly logger = new Logger(ExtractionProcessor.name);

  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    private readonly transcriptionsService: TranscriptionsService,
    private readonly summariesService: SummariesService,
    private readonly blobStorageService: BlobStorageService,
  ) {
    super();
  }

  async process(job: Job<{ meetingId: string; storedFileName: string }>) {
    const { meetingId, storedFileName } = job.data;
    
    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
    });
    
    if (!meeting) {
      this.logger.warn(`Meeting ${meetingId} not found, skipping job.`);
      return;
    }

    const { filePath, cleanup } =
      await this.blobStorageService.downloadToTempFile(storedFileName);

    try {
      // 1. Mark as processing
      await this.updateStatus(meeting, MeetingStatus.PROCESSING);

      // 2. Transcribe
      const transcription = await this.transcriptionsService.transcribeAudio({
        filePath,
        originalFileName: meeting.originalFileName,
      });
      transcription.meeting = meeting;
      meeting.transcription = transcription;

      // 3. Summarise
      const summary = await this.summariesService.summariseTranscript({
        transcript: transcription.text,
      });
      summary.meeting = meeting;
      meeting.summary = summary;

      // 4. Mark completed
      await this.updateStatus(meeting, MeetingStatus.COMPLETED);

      this.logger.log(`Meeting ${meetingId} processing complete.`);
    } catch (error) {
      this.logger.error(`Processing failed for meeting ${meetingId}`, error);
      await this.updateStatus(
        meeting,
        MeetingStatus.FAILED,
        (error as Error).message,
      );
      throw error; // Let BullMQ handle the retry if attempts remain
    } finally {
      await cleanup();
    }
  }

  private async updateStatus(
    meeting: Meeting,
    status: MeetingStatus,
    errorMessage?: string,
  ): Promise<void> {
    meeting.status = status;
    if (errorMessage) meeting.errorMessage = errorMessage;
    await this.meetingRepository.save(meeting);
  }
}
