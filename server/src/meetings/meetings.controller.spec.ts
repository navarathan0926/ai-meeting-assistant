import { Test, TestingModule } from '@nestjs/testing';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { MeetingStatus } from './enums/meeting-status.enum';
import { MeetingResponse } from './interfaces/meeting-response.interface';

// ── Helpers ────────────────────────────────────────────────────────────────────

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

// ── Tests ──────────────────────────────────────────────────────────────────────

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
    }).compile();

    controller = module.get<MeetingsController>(MeetingsController);
    meetingsService = module.get(MeetingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── upload ────────────────────────────────────────────────────────────────

  describe('upload', () => {
    it('should delegate to MeetingsService.createFromUpload and return its result', async () => {
      const file = buildMulterFile();
      const response = buildMeetingResponse({ jobId: 'job-123' });
      meetingsService.createFromUpload.mockResolvedValue(response);

      const result = await controller.upload(file);

      expect(meetingsService.createFromUpload).toHaveBeenCalledWith(file);
      expect(result).toBe(response);
    });

    it('should pass the file object unchanged to the service', async () => {
      const file = buildMulterFile({ originalname: 'standup.mp3' });
      meetingsService.createFromUpload.mockResolvedValue(buildMeetingResponse());

      await controller.upload(file);

      expect(meetingsService.createFromUpload).toHaveBeenCalledWith(
        expect.objectContaining({ originalname: 'standup.mp3' }),
      );
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all meetings without search term', async () => {
      const meetings = [buildMeetingResponse(), buildMeetingResponse({ id: 'uuid-5678' })];
      meetingsService.findAll.mockResolvedValue(meetings);

      const result = await controller.findAll();

      expect(meetingsService.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(meetings);
    });

    it('should forward the search query parameter to the service', async () => {
      meetingsService.findAll.mockResolvedValue([]);

      await controller.findAll('standup');

      expect(meetingsService.findAll).toHaveBeenCalledWith('standup');
    });

    it('should return an empty array when no meetings match', async () => {
      meetingsService.findAll.mockResolvedValue([]);
      const result = await controller.findAll('no-match');
      expect(result).toEqual([]);
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should delegate to MeetingsService.findOne with the given id', async () => {
      const meeting = buildMeetingResponse({ status: MeetingStatus.COMPLETED });
      meetingsService.findOne.mockResolvedValue(meeting);

      const result = await controller.findOne('uuid-1234');

      expect(meetingsService.findOne).toHaveBeenCalledWith('uuid-1234');
      expect(result).toBe(meeting);
    });

    it('should propagate NotFoundException from the service', async () => {
      const { NotFoundException } = await import('@nestjs/common');
      meetingsService.findOne.mockRejectedValue(new NotFoundException('Meeting not found'));

      await expect(controller.findOne('non-existent')).rejects.toThrow('Meeting not found');
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delegate to MeetingsService.deleteMeeting and return void', async () => {
      meetingsService.deleteMeeting.mockResolvedValue(undefined);

      const result = await controller.remove('uuid-1234');

      expect(meetingsService.deleteMeeting).toHaveBeenCalledWith('uuid-1234');
      expect(result).toBeUndefined();
    });

    it('should propagate NotFoundException when meeting does not exist', async () => {
      const { NotFoundException } = await import('@nestjs/common');
      meetingsService.deleteMeeting.mockRejectedValue(new NotFoundException());

      await expect(controller.remove('ghost-id')).rejects.toThrow(NotFoundException);
    });
  });
});
