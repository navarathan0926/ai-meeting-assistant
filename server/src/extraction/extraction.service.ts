import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);

  constructor(
    @InjectQueue('extraction') private readonly extractionQueue: Queue,
  ) {}


  async addExtractJob(meetingId: string, storedFileName: string): Promise<string> {
    const job = await this.extractionQueue.add(
      'extract',
      { meetingId, storedFileName },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // retries at 5s, 10s, 20s
        },

        removeOnComplete: { count: 100 },
        removeOnFail: false,
      },
    );

    this.logger.log(
      `Extraction job [${job.id}] queued for meeting ${meetingId}`,
    );
    return job.id!;
  }
}
