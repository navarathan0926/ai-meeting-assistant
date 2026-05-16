import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Summary } from './entities/summary.entity';
import { SummariesService } from './summaries.service';

/**
 * SummariesModule
 * Exports SummariesService so MeetingsModule can inject it.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Summary])],
  providers: [SummariesService],
  exports: [SummariesService],
})
export class SummariesModule {}
