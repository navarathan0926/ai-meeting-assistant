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
import { ItemExtractionService } from '../extracted-items/item-extraction.service';


interface ExtractionJobData {
  meetingId: string;
  storedFileName: string;
}


@Processor('extraction', { concurrency: 2 })
export class ExtractionProcessor extends WorkerHost {
  private readonly logger = new Logger(ExtractionProcessor.name);

  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    private readonly transcriptionsService: TranscriptionsService,
    private readonly summariesService: SummariesService,
    private readonly blobStorageService: BlobStorageService,
    private readonly itemExtractionService: ItemExtractionService,
  ) {
    super();
  }

  async process(job: Job<ExtractionJobData>): Promise<void> {
    const { meetingId, storedFileName } = job.data;
    const attempt = job.attemptsMade + 1;

    this.logger.log(
      `Processing extraction job [${job.id}] for meeting ${meetingId} (attempt ${attempt}/3)`,
    );

    const meeting = await this.meetingRepository.findOne({
      where: { id: meetingId },
    });

    if (!meeting) {

      this.logger.warn(
        `Meeting ${meetingId} not found — job [${job.id}] discarded.`,
      );
      return;
    }

    await job.updateProgress(0);

    const { filePath, cleanup } =
      await this.blobStorageService.downloadToTempFile(storedFileName);

    try {

      await this.updateStatus(meeting, MeetingStatus.PROCESSING);
      await job.updateProgress(25);


      await job.updateProgress(50);
      this.logger.log(`Audio downloaded to temp file: ${filePath}`);


      const transcription = await this.transcriptionsService.transcribeAudio({
        filePath,
        originalFileName: meeting.originalFileName,
      });
      transcription.meeting = meeting;
      meeting.transcription = transcription;
      await job.updateProgress(75);
      this.logger.log(`Transcription complete for meeting ${meetingId}`);


      const summary = await this.summariesService.summariseTranscript({
        transcript: transcription.text,
      });
      summary.meeting = meeting;
      meeting.summary = summary;


      await this.updateStatus(meeting, MeetingStatus.COMPLETED);
      await job.updateProgress(100);

      await this.itemExtractionService.addExtractItemsJob(meetingId);

      this.logger.log(
        `Meeting ${meetingId} fully processed — job [${job.id}] complete.`,
      );
    } catch (error) {
      const message = (error as Error).message ?? String(error);
      this.logger.error(
        `Job [${job.id}] failed on attempt ${attempt} for meeting ${meetingId}: ${message}`,
        (error as Error).stack,
      );


      const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      if (isLastAttempt) {
        await this.updateStatus(meeting, MeetingStatus.FAILED, message);
      }

      throw error; // Re-throw so BullMQ applies retry/backoff policy.
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
    if (errorMessage !== undefined) {
      meeting.errorMessage = errorMessage;
    }
    await this.meetingRepository.save(meeting);
  }
}
