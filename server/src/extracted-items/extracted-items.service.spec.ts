import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExtractedItemsService } from './extracted-items.service';
import { ExtractedItem } from './entities/extracted-item.entity';
import { ExtractedItemType } from './enums/extracted-item-type.enum';
import { ExtractedItemPriority } from './enums/extracted-item-priority.enum';
import { ExtractedItemStatus } from './enums/extracted-item-status.enum';
import { MeetingsService } from '../meetings/meetings.service';
import { JiraService } from '../jira/jira.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

function buildItem(overrides: Partial<ExtractedItem> = {}): ExtractedItem {
  const item = new ExtractedItem();
  item.id = 'item-uuid';
  item.meetingId = 'meeting-uuid';
  item.type = ExtractedItemType.Task;
  item.title = 'Fix login bug';
  item.description = 'Users cannot log in.';
  item.priority = ExtractedItemPriority.High;
  item.contextSnippet = 'Discussed at 10:05';
  item.status = ExtractedItemStatus.Draft;
  item.jiraIssueKey = null;
  item.createdAt = new Date();
  item.updatedAt = new Date();
  return Object.assign(item, overrides);
}

describe('ExtractedItemsService', () => {
  let service: ExtractedItemsService;
  let repo: jest.Mocked<Repository<ExtractedItem>>;
  let meetingsService: jest.Mocked<MeetingsService>;
  let jiraService: jest.Mocked<JiraService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtractedItemsService,
        {
          provide: getRepositoryToken(ExtractedItem),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn().mockImplementation((item) => Promise.resolve(item)),
            update: jest.fn(),
          },
        },
        {
          provide: MeetingsService,
          useValue: {
            assertOwned: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: JiraService,
          useValue: {
            createIssue: jest.fn(),
            getIssueBrowseUrl: jest.fn().mockReturnValue(null),
            isConfigured: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    service = module.get(ExtractedItemsService);
    repo = module.get(getRepositoryToken(ExtractedItem));
    meetingsService = module.get(MeetingsService);
    jiraService = module.get(JiraService);
  });

  describe('findByMeeting', () => {
    it('should assert ownership and return mapped items', async () => {
      repo.find.mockResolvedValue([buildItem()]);

      const result = await service.findByMeeting('user-1', 'meeting-uuid');

      expect(meetingsService.assertOwned).toHaveBeenCalledWith(
        'user-1',
        'meeting-uuid',
      );
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Fix login bug');
    });
  });

  describe('updateDraft', () => {
    it('should update a draft item', async () => {
      repo.findOne.mockResolvedValue(buildItem());

      const result = await service.updateDraft('user-1', 'item-uuid', {
        title: 'Updated title',
      });

      expect(result.title).toBe('Updated title');
    });

    it('should reject updates to non-draft items', async () => {
      repo.findOne.mockResolvedValue(
        buildItem({ status: ExtractedItemStatus.Sent }),
      );

      await expect(
        service.updateDraft('user-1', 'item-uuid', { title: 'New title' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject', () => {
    it('should mark a draft item as rejected', async () => {
      repo.findOne.mockResolvedValue(buildItem());

      const result = await service.reject('user-1', 'item-uuid');

      expect(result.status).toBe(ExtractedItemStatus.Rejected);
    });

    it('should reject non-draft items', async () => {
      repo.findOne.mockResolvedValue(
        buildItem({ status: ExtractedItemStatus.Approved }),
      );

      await expect(service.reject('user-1', 'item-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when item is not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.reject('user-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('approve', () => {
    it('should create a Jira issue and mark item as sent', async () => {
      repo.findOne
        .mockResolvedValueOnce(buildItem())
        .mockResolvedValueOnce(buildItem({ status: ExtractedItemStatus.Approved }));
      repo.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });
      jiraService.createIssue.mockResolvedValue({
        issueKey: 'PROJ-42',
        issueId: '10001',
      });
      jiraService.getIssueBrowseUrl.mockReturnValue(
        'https://example.atlassian.net/browse/PROJ-42',
      );

      const result = await service.approve('user-1', 'item-uuid');

      expect(jiraService.createIssue).toHaveBeenCalled();
      expect(result.status).toBe(ExtractedItemStatus.Sent);
      expect(result.jiraIssueKey).toBe('PROJ-42');
    });

    it('should revert to draft and return jiraError when Jira fails', async () => {
      const approvedItem = buildItem({ status: ExtractedItemStatus.Approved });
      repo.findOne
        .mockResolvedValueOnce(buildItem())
        .mockResolvedValueOnce(approvedItem);
      repo.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });
      jiraService.createIssue.mockRejectedValue(new Error('Jira unavailable'));

      const result = await service.approve('user-1', 'item-uuid');

      expect(result.status).toBe(ExtractedItemStatus.Draft);
      expect(result.jiraError).toContain('Jira unavailable');
    });

    it('should throw conflict when item is already being sent', async () => {
      repo.findOne
        .mockResolvedValueOnce(buildItem())
        .mockResolvedValueOnce(
          buildItem({ status: ExtractedItemStatus.Approved }),
        );
      repo.update.mockResolvedValue({ affected: 0, raw: [], generatedMaps: [] });

      await expect(service.approve('user-1', 'item-uuid')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should not approve rejected items', async () => {
      repo.findOne
        .mockResolvedValueOnce(
          buildItem({ status: ExtractedItemStatus.Rejected }),
        )
        .mockResolvedValueOnce(
          buildItem({ status: ExtractedItemStatus.Rejected }),
        );
      repo.update.mockResolvedValue({ affected: 0, raw: [], generatedMaps: [] });

      await expect(service.approve('user-1', 'item-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
