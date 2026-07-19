import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from '../meetings/entities/meeting.entity';
import { ExtractedItem } from '../extracted-items/entities/extracted-item.entity';
import { OrganizationScopeConfig } from './decorators/organization-scope.decorator';

@Injectable()
export class OrganizationScopeService {
  constructor(
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    @InjectRepository(ExtractedItem)
    private readonly extractedItemRepository: Repository<ExtractedItem>,
  ) {}

  async resolveOrganizationId(
    scope: OrganizationScopeConfig,
    resourceId: string,
  ): Promise<string | null> {
    if (scope.resource === 'meeting') {
      const meeting = await this.meetingRepository.findOne({
        where: { id: resourceId },
        select: ['id', 'organizationId'],
      });
      return meeting?.organizationId ?? null;
    }

    const item = await this.extractedItemRepository.findOne({
      where: { id: resourceId },
      select: ['id', 'organizationId'],
    });
    return item?.organizationId ?? null;
  }
}
