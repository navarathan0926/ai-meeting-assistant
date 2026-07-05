import { Test, TestingModule } from '@nestjs/testing';
import { ExtractedItemsController } from './extracted-items.controller';
import { ExtractedItemsService } from './extracted-items.service';
import { ExtractedItemType } from './enums/extracted-item-type.enum';
import { ExtractedItemPriority } from './enums/extracted-item-priority.enum';
import { ExtractedItemStatus } from './enums/extracted-item-status.enum';
import { User } from '../auth/entities/user.entity';
import { blocksToAdf } from '../common/jira-document/blocks-to-adf';

const sampleAdf = blocksToAdf([{ type: 'paragraph', text: 'Details' }]);

const TEST_USER: User = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  name: 'Test User',
  passwordHash: null,
  provider: 'local',
  googleId: null,
  meetings: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ExtractedItemsController', () => {
  let controller: ExtractedItemsController;
  let service: jest.Mocked<ExtractedItemsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExtractedItemsController],
      providers: [
        {
          provide: ExtractedItemsService,
          useValue: {
            updateDraft: jest.fn(),
            reject: jest.fn(),
            approve: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(ExtractedItemsController);
    service = module.get(ExtractedItemsService);
  });

  const sampleResponse = {
    id: 'item-1',
    meetingId: 'meeting-1',
    type: ExtractedItemType.Task,
    title: 'Fix bug',
    description: sampleAdf,
    priority: ExtractedItemPriority.High,
    contextSnippet: 'Snippet',
    status: ExtractedItemStatus.Draft,
    jiraIssueKey: null,
    jiraIssueUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should update a draft item', async () => {
    service.updateDraft.mockResolvedValue({
      ...sampleResponse,
      title: 'Updated',
    });

    const result = await controller.updateDraft(TEST_USER, 'item-1', {
      title: 'Updated',
    });

    expect(result.title).toBe('Updated');
  });

  it('should reject an item', async () => {
    service.reject.mockResolvedValue({
      ...sampleResponse,
      status: ExtractedItemStatus.Rejected,
    });

    const result = await controller.reject(TEST_USER, 'item-1');

    expect(result.status).toBe(ExtractedItemStatus.Rejected);
  });

  it('should approve an item', async () => {
    service.approve.mockResolvedValue({
      ...sampleResponse,
      status: ExtractedItemStatus.Sent,
      jiraIssueKey: 'PROJ-1',
      jiraIssueUrl: 'https://example.atlassian.net/browse/PROJ-1',
    });

    const result = await controller.approve(TEST_USER, 'item-1');

    expect(result.jiraIssueKey).toBe('PROJ-1');
  });
});
