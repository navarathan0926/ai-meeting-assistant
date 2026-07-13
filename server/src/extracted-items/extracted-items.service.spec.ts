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
import { JiraSendService } from '../jira/jira-send.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { blocksToAdf } from '../common/jira-document/blocks-to-adf';
import { extractionConfiguration } from '../common/config/extraction.config';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../auth/enums/user-role.enum';
import { DEFAULT_ORGANIZATION_ID } from '../organizations/organizations.constants';
import { Meeting } from '../meetings/entities/meeting.entity';

const sampleAdf = blocksToAdf([{ type: 'paragraph', text: 'Users cannot log in.' }]);

const ORG_ID = DEFAULT_ORGANIZATION_ID;

function buildUser(overrides: Partial<User> = {}): User {
  const user = new User();
  user.id = 'user-1';
  user.email = 'user@example.com';
  user.name = 'Test User';
  user.passwordHash = null;
  user.provider = 'local';
  user.googleId = null;
  user.role = UserRole.User;
  user.organizationId = ORG_ID;
  user.meetings = [];
  user.createdAt = new Date();
  user.updatedAt = new Date();
  return Object.assign(user, overrides);
}

function buildMeeting(overrides: Partial<Meeting> = {}): Meeting {
  const meeting = new Meeting();
  meeting.id = 'meeting-uuid';
  meeting.userId = 'user-1';
  meeting.organizationId = ORG_ID;
  return Object.assign(meeting, overrides);
}

function buildItem(overrides: Partial<ExtractedItem> = {}): ExtractedItem {
  const item = new ExtractedItem();
  item.id = 'item-uuid';
  item.meetingId = 'meeting-uuid';
  item.type = ExtractedItemType.Task;
  item.title = 'Fix login bug';
  item.description = sampleAdf;
  item.priority = ExtractedItemPriority.High;
  item.contextSnippet = 'Discussed at 10:05';
  item.status = ExtractedItemStatus.Draft;
  item.jiraIssueKey = null;
  item.jiraSyncError = null;
  item.suggestedProjectKey = 'PROJ';
  item.projectConfidence = 0.9;
  item.extractionConfidence = 0.85;
  item.finalProjectKey = null;
  item.organizationId = ORG_ID;
  item.meeting = buildMeeting();
  item.createdAt = new Date();
  item.updatedAt = new Date();
  return Object.assign(item, overrides);
}

describe('ExtractedItemsService', () => {
  let service: ExtractedItemsService;
  let repo: jest.Mocked<Repository<ExtractedItem>>;
  let meetingsService: jest.Mocked<MeetingsService>;
  let jiraService: jest.Mocked<JiraService>;
  let jiraSendService: jest.Mocked<JiraSendService>;

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
            assertAccessible: jest.fn().mockResolvedValue(buildMeeting()),
          },
        },
        {
          provide: JiraService,
          useValue: {
            createIssue: jest.fn(),
            getIssueBrowseUrl: jest.fn().mockReturnValue(null),
            isConfigured: jest.fn().mockReturnValue(true),
            getFallbackProjectKey: jest.fn().mockReturnValue('PROJ'),
            listProjects: jest.fn().mockResolvedValue([
              { key: 'PROJ', name: 'Project', description: '', aiContext: 'Project' },
            ]),
          },
        },
        {
          provide: JiraSendService,
          useValue: {
            enqueueSend: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: extractionConfiguration.KEY,
          useValue: {
            extractionConfidenceThreshold: 0.6,
            projectConfidenceThreshold: 0.6,
            meetingRelevanceThreshold: 0.7,
          },
        },
      ],
    }).compile();

    service = module.get(ExtractedItemsService);
    repo = module.get(getRepositoryToken(ExtractedItem));
    meetingsService = module.get(MeetingsService);
    jiraService = module.get(JiraService);
    jiraSendService = module.get(JiraSendService);
  });

  describe('findByMeeting', () => {
    it('should assert ownership and return mapped items', async () => {
      repo.find.mockResolvedValue([buildItem()]);

      const result = await service.findByMeeting(buildUser(), 'meeting-uuid');

      expect(meetingsService.assertAccessible).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-1' }),
        'meeting-uuid',
      );
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Fix login bug');
    });
  });

  describe('updateDraft', () => {
    it('should update a draft item', async () => {
      repo.findOne.mockResolvedValue(buildItem());

      const result = await service.updateDraft(buildUser(), 'item-uuid', {
        title: 'Updated title',
      });

      expect(result.title).toBe('Updated title');
    });

    it('should throw ForbiddenException when user cannot access the meeting', async () => {
      repo.findOne.mockResolvedValue(
        buildItem({
          meeting: buildMeeting({ userId: 'other-user' }),
        }),
      );

      await expect(
        service.updateDraft(buildUser(), 'item-uuid', { title: 'Nope' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject updates to non-draft items', async () => {
      repo.findOne.mockResolvedValue(
        buildItem({ status: ExtractedItemStatus.Sent }),
      );

      await expect(
        service.updateDraft(buildUser(), 'item-uuid', { title: 'New title' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject', () => {
    it('should mark a draft item as rejected', async () => {
      repo.findOne.mockResolvedValue(buildItem());

      const result = await service.reject(buildUser(), 'item-uuid');

      expect(result.status).toBe(ExtractedItemStatus.Rejected);
    });

    it('should reject non-draft items', async () => {
      repo.findOne.mockResolvedValue(
        buildItem({ status: ExtractedItemStatus.Approved }),
      );

      await expect(service.reject(buildUser(), 'item-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when item is not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.reject(buildUser(), 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('approve', () => {
    it('should queue Jira send and return approved item', async () => {
      repo.findOne
        .mockResolvedValueOnce(buildItem())
        .mockResolvedValueOnce(buildItem({ status: ExtractedItemStatus.Approved }));
      repo.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

      const result = await service.approve(buildUser(), 'item-uuid');

      expect(jiraSendService.enqueueSend).toHaveBeenCalledWith('item-uuid');
      expect(result.status).toBe(ExtractedItemStatus.Approved);
    });

    it('should revert to draft and return jiraError when queueing fails', async () => {
      const approvedItem = buildItem({ status: ExtractedItemStatus.Approved });
      repo.findOne
        .mockResolvedValueOnce(buildItem())
        .mockResolvedValueOnce(approvedItem);
      repo.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });
      jiraSendService.enqueueSend.mockRejectedValue(new Error('Queue unavailable'));

      const result = await service.approve(buildUser(), 'item-uuid');

      expect(result.status).toBe(ExtractedItemStatus.Draft);
      expect(result.jiraError).toContain('Queue unavailable');
    });

    it('should throw conflict when item is already being sent', async () => {
      repo.findOne
        .mockResolvedValueOnce(buildItem())
        .mockResolvedValueOnce(
          buildItem({ status: ExtractedItemStatus.Approved }),
        );
      repo.update.mockResolvedValue({ affected: 0, raw: [], generatedMaps: [] });

      await expect(service.approve(buildUser(), 'item-uuid')).rejects.toThrow(
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

      await expect(service.approve(buildUser(), 'item-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
