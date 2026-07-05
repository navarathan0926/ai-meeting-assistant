import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExtractedItem } from '../extracted-items/entities/extracted-item.entity';
import { JiraService } from './jira.service';
import { JiraSendService } from './jira-send.service';
import { JiraSendProcessor } from './jira-send.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'jira-send',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    }),
    TypeOrmModule.forFeature([ExtractedItem]),
  ],
  providers: [JiraService, JiraSendService, JiraSendProcessor],
  exports: [JiraService, JiraSendService],
})
export class JiraModule {}
