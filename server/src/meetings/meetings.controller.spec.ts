import { Test, TestingModule } from '@nestjs/testing';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { ExtractedItemsService } from '../extracted-items/extracted-items.service';
import { MeetingStatus } from './enums/meeting-status.enum';
import { MeetingResponse } from './interfaces/meeting-response.interface';
import { ExtractedItemType } from '../extracted-items/enums/extracted-item-type.enum';
import { ExtractedItemPriority } from '../extracted-items/enums/extracted-item-priority.enum';
import { ExtractedItemStatus } from '../extracted-items/enums/extracted-item-status.enum';
import { User } from '../auth/entities/user.entity';

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

function buildMeetingResponse(overrides: Partial<MeetingResponse> = {}): MeetingResponse {
  return {
    id: 'uuid-1234',
    originalFileName: 'meeting.mp3',
    title: 'meeting',
    status: MeetingStatus.PENDING,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function buildMulterFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'audio',
    originalname: 'meeting.mp3',
    encoding: '7bit',
    mimetype: 'audio/mpeg',
    buffer: Buffer.from('fake'),
    size: 1024,
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
    ...overrides,
  };
}

describe('MeetingsController', () => {
  let controller: MeetingsController;
  let meetingsService: jest.Mocked<MeetingsService>;
  let extractedItemsService: jest.Mocked<ExtractedItemsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeetingsController],
      providers: [
        {
          provide: MeetingsService,
          useValue: {
            createFromUpload: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            deleteMeeting: jest.fn(),
          },
        },
        {
          provide: ExtractedItemsService,
          useValue: {
            findByMeeting: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MeetingsController>(MeetingsController);
    meetingsService = module.get(MeetingsService);
    extractedItemsService = module.get(ExtractedItemsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('upload', () => {
    it('should delegate to MeetingsService.createFromUpload with user id', async () => {
      const file = buildMulterFile();
      const response = buildMeetingResponse({ jobId: 'job-123' });
      meetingsService.createFromUpload.mockResolvedValue(response);

      const result = await controller.upload(TEST_USER, file);

      expect(meetingsService.createFromUpload).toHaveBeenCalledWith(
        file,
        TEST_USER.id,
      );
      expect(result).toBe(response);
    });
  });

  describe('findAll', () => {
    it('should pass user id and search term to the service', async () => {
      meetingsService.findAll.mockResolvedValue([]);

      await controller.findAll(TEST_USER, 'standup');

      expect(meetingsService.findAll).toHaveBeenCalledWith(
        TEST_USER.id,
        'standup',
      );
    });
  });

  describe('findOne', () => {
    it('should delegate to MeetingsService.findOne with user id and meeting id', async () => {
      const meeting = buildMeetingResponse({ status: MeetingStatus.COMPLETED });
      meetingsService.findOne.mockResolvedValue(meeting);

      const result = await controller.findOne(TEST_USER, 'uuid-1234');

      expect(meetingsService.findOne).toHaveBeenCalledWith(
        TEST_USER.id,
        'uuid-1234',
      );
      expect(result).toBe(meeting);
    });
  });

  describe('listExtractedItems', () => {
    it('should delegate to ExtractedItemsService.findByMeeting', async () => {
      const items = [
        {
          id: 'item-1',
          meetingId: 'uuid-1234',
          type: ExtractedItemType.Task,
          title: 'Fix bug',
          description: 'Details',
          priority: ExtractedItemPriority.High,
          contextSnippet: 'Snippet',
          status: ExtractedItemStatus.Draft,
          jiraIssueKey: null,
          jiraIssueUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      extractedItemsService.findByMeeting.mockResolvedValue(items);

      const result = await controller.listExtractedItems(TEST_USER, 'uuid-1234');

      expect(extractedItemsService.findByMeeting).toHaveBeenCalledWith(
        TEST_USER.id,
        'uuid-1234',
      );
      expect(result).toBe(items);
    });
  });

  describe('remove', () => {
    it('should delegate to MeetingsService.deleteMeeting with user id', async () => {
      meetingsService.deleteMeeting.mockResolvedValue(undefined);

      await controller.remove(TEST_USER, 'uuid-1234');

      expect(meetingsService.deleteMeeting).toHaveBeenCalledWith(
        TEST_USER.id,
        'uuid-1234',
      );
    });
  });
});
