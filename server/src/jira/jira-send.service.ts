import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class JiraSendService {
  constructor(
    @InjectQueue('jira-send') private readonly jiraSendQueue: Queue,
  ) {}

  async enqueueSend(itemId: string): Promise<void> {
    await this.jiraSendQueue.add(
      'send',
      { itemId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 200 },
        removeOnFail: false,
      },
    );
  }
}
