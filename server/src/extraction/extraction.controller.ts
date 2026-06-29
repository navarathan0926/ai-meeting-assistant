import {
  Controller,
  Get,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { MeetingsService } from '../meetings/meetings.service';
import { JobStatusResponse } from './interfaces/job-status-response.interface';

@Auth()
@Controller('extraction')
export class ExtractionController {
  constructor(
    @InjectQueue('extraction') private readonly extractionQueue: Queue,
    private readonly meetingsService: MeetingsService,
  ) {}

  @Get(':jobId/status')
  async getJobStatus(
    @CurrentUser() user: User,
    @Param('jobId') jobId: string,
  ): Promise<JobStatusResponse> {
    const job = await this.extractionQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException(
        `Extraction job "${jobId}" not found. It may have been removed after completion.`,
      );
    }

    await this.meetingsService.assertOwned(user.id, job.data.meetingId);

    const state = await job.getState();

    return {
      jobId: job.id!,
      state,
      progress:
        typeof job.progress === 'string'
          ? parseFloat(job.progress) || 0
          : (job.progress as number | Record<string, unknown>),
      failedReason: job.failedReason ?? undefined,
      meetingId: job.data.meetingId,
      attemptsMade: job.attemptsMade,
    };
  }
}
