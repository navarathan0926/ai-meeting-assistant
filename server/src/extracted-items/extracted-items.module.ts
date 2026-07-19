import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meeting } from '../meetings/entities/meeting.entity';
import { ExtractedItem } from './entities/extracted-item.entity';
import { ExtractedItemsService } from './extracted-items.service';
import { ExtractedItemsController } from './extracted-items.controller';
import { ItemExtractionService } from './item-extraction.service';
import { ItemExtractionProcessor } from './item-extraction.processor';
import { AuthModule } from '../auth/auth.module';
import { MeetingsModule } from '../meetings/meetings.module';
import { JiraModule } from '../jira/jira.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'item-extraction',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    }),
    TypeOrmModule.forFeature([Meeting, ExtractedItem]),
    AuthModule,
    forwardRef(() => MeetingsModule),
    JiraModule,
    OrganizationsModule,
  ],
  controllers: [ExtractedItemsController],
  providers: [
    ExtractedItemsService,
    ItemExtractionService,
    ItemExtractionProcessor,
  ],
  exports: [ItemExtractionService, ExtractedItemsService],
})
export class ExtractedItemsModule {}
