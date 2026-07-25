import { Test, TestingModule } from '@nestjs/testing';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { MeetingStatus } from './enums/meeting-status.enum';
import { MeetingResponse } from './interfaces/meeting-response.interface';
import { User } from '../auth/entities/user.entity';

import { UserRole } from '../auth/enums/user-role.enum';
import { DEFAULT_ORGANIZATION_ID } from '../organizations/organizations.constants';
import { OrganizationGuard } from '../organizations/guards/organization.guard';

const TEST_USER: User = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  name: 'Test User',
  passwordHash: null,
  provider: 'local',
  googleId: null,
  role: UserRole.User,
  organizationId: DEFAULT_ORGANIZATION_ID,
  isActive: true,
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
      ],
    })
      .overrideGuard(OrganizationGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<MeetingsController>(MeetingsController);
    meetingsService = module.get(MeetingsService);
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
        TEST_USER,
      );
      expect(result).toBe(response);
    });
  });

  describe('findAll', () => {
    it('should pass user id and pagination options to the service', async () => {
      meetingsService.findAll.mockResolvedValue({ items: [], total: 0 });

      const result = await controller.findAll(TEST_USER, {
        page: 2,
        limit: 10,
        search: 'standup',
      });

      expect(meetingsService.findAll).toHaveBeenCalledWith(TEST_USER, {
        page: 2,
        limit: 10,
        search: 'standup',
      });
      expect(result).toEqual({
        items: [],
        total: 0,
        page: 2,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('findOne', () => {
    it('should delegate to MeetingsService.findOne with user id and meeting id', async () => {
      const meeting = buildMeetingResponse({ status: MeetingStatus.COMPLETED });
      meetingsService.findOne.mockResolvedValue(meeting);

      const result = await controller.findOne(TEST_USER, 'uuid-1234');

      expect(meetingsService.findOne).toHaveBeenCalledWith(
        TEST_USER,
        'uuid-1234',
      );
      expect(result).toBe(meeting);
    });
  });

  describe('remove', () => {
    it('should delegate to MeetingsService.deleteMeeting with user', async () => {
      meetingsService.deleteMeeting.mockResolvedValue(undefined);

      await controller.remove(TEST_USER, 'uuid-1234');

      expect(meetingsService.deleteMeeting).toHaveBeenCalledWith(
        TEST_USER,
        'uuid-1234',
      );
    });
  });
});
