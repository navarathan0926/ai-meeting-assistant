import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ItemExtractionService {
  private readonly logger = new Logger(ItemExtractionService.name);

  constructor(
    @InjectQueue('item-extraction') private readonly itemExtractionQueue: Queue,
  ) {}

  async addExtractItemsJob(meetingId: string): Promise<string> {
    const jobId = `extract-items-${meetingId}`;
    const job = await this.itemExtractionQueue.add(
      'extract-items',
      { meetingId },
      {
        jobId,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: false,
      },
    );

    this.logger.log(
      `Item extraction job [${job.id}] queued for meeting ${meetingId}`,
    );
    return job.id!;
  }
}
