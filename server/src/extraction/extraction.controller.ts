import {
  Controller,
  Get,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Auth } from '../common/decorators/auth.decorator';


export interface JobStatusResponse {
  jobId: string;
  state: string;
  progress: number | Record<string, unknown>;
  failedReason?: string;
  meetingId: string;
  attemptsMade: number;
}


@Auth()
@Controller('extraction')
export class ExtractionController {
  constructor(
    @InjectQueue('extraction') private readonly extractionQueue: Queue,
  ) {}


  @Get(':jobId/status')
  async getJobStatus(
    @Param('jobId') jobId: string,
  ): Promise<JobStatusResponse> {
    const job = await this.extractionQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException(
        `Extraction job "${jobId}" not found. It may have been removed after completion.`,
      );
    }

    const state = await job.getState();

    return {
      jobId: job.id!,
      state,
      progress: typeof job.progress === 'string'
        ? parseFloat(job.progress) || 0
        : (job.progress as number | Record<string, unknown>),
      failedReason: job.failedReason ?? undefined,
      meetingId: job.data.meetingId,
      attemptsMade: job.attemptsMade,
    };
  }
}
