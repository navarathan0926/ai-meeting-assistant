import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { meetingsApi } from './meetings.api';
import apiClient from '../axios';
import { ApiResponse } from '@/types/api';
import { Meeting, MeetingStatus } from '@/types/meeting';

// ── Setup ──────────────────────────────────────────────────────────────────────

const mock = new MockAdapter(apiClient);

afterEach(() => {
  mock.reset();
});

// ── Helpers ────────────────────────────────────────────────────────────────────

const VALID_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

function buildMeeting(overrides: Partial<Meeting> = {}): Meeting {
  return {
    id: VALID_UUID,
    originalFileName: 'standup.mp3',
    status: MeetingStatus.Pending,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function wrapInApiResponse<T>(data: T): ApiResponse<T> {
  return { data, statusCode: 200, timestamp: new Date().toISOString() };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('meetingsApi', () => {
  // ── upload ──────────────────────────────────────────────────────────────────

  describe('upload', () => {
    it('should POST to /meetings/upload with FormData and return the meeting', async () => {
      const meeting = buildMeeting({ status: MeetingStatus.Pending });
      mock.onPost('/meetings/upload').reply(202, wrapInApiResponse(meeting));

      const file = new File([Buffer.from('audio')], 'standup.mp3', { type: 'audio/mpeg' });
      const result = await meetingsApi.upload(file);

      expect(mock.history.post[0].url).toBe('/meetings/upload');
      expect(result).toEqual(meeting);
    });

    it('should set multipart/form-data content type header', async () => {
      const meeting = buildMeeting();
      mock.onPost('/meetings/upload').reply(202, wrapInApiResponse(meeting));

      const file = new File([Buffer.from('audio')], 'meeting.mp3', { type: 'audio/mpeg' });
      await meetingsApi.upload(file);

      const headers = mock.history.post[0].headers;
      expect(headers?.['Content-Type']).toContain('multipart/form-data');
    });

    it('should throw when the server returns an error', async () => {
      mock.onPost('/meetings/upload').reply(400, { message: 'No audio file provided.' });

      const file = new File([], 'bad.txt');
      await expect(meetingsApi.upload(file)).rejects.toThrow();
    });
  });

  // ── getById ─────────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('should GET /meetings/:id and return the meeting', async () => {
      const meeting = buildMeeting({ status: MeetingStatus.Completed });
      mock.onGet(`/meetings/${VALID_UUID}`).reply(200, wrapInApiResponse(meeting));

      const result = await meetingsApi.getById(VALID_UUID);

      expect(mock.history.get[0].url).toBe(`/meetings/${VALID_UUID}`);
      expect(result).toEqual(meeting);
    });

    it('should throw when meeting is not found (404)', async () => {
      mock.onGet(`/meetings/${VALID_UUID}`).reply(404, {
        message: 'Meeting not found',
        statusCode: 404,
      });

      await expect(meetingsApi.getById(VALID_UUID)).rejects.toThrow();
    });
  });

  // ── getAll ──────────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('should GET /meetings and return paginated results', async () => {
      const meetings = [buildMeeting(), buildMeeting({ id: 'uuid-5678' })];
      const paginated = {
        items: meetings,
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1,
      };
      mock.onGet('/meetings').reply(200, wrapInApiResponse(paginated));

      const result = await meetingsApi.getAll();

      expect(mock.history.get[0].url).toBe('/meetings');
      expect(result).toEqual(paginated);
      expect(result.items).toHaveLength(2);
    });

    it('should pass search query params', async () => {
      mock.onGet('/meetings').reply(200, wrapInApiResponse({
        items: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 1,
      }));

      await meetingsApi.getAll({ search: 'standup' });

      expect(mock.history.get[0].params).toEqual(
        expect.objectContaining({ search: 'standup' }),
      );
    });

    it('should return an empty page when no meetings exist', async () => {
      mock.onGet('/meetings').reply(200, wrapInApiResponse({
        items: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 1,
      }));

      const result = await meetingsApi.getAll();
      expect(result.items).toEqual([]);
    });

    it('should throw on network error', async () => {
      mock.onGet('/meetings').networkError();

      await expect(meetingsApi.getAll()).rejects.toThrow();
    });
  });

  // ── delete ──────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('should DELETE /meetings/:id and resolve with void', async () => {
      mock.onDelete(`/meetings/${VALID_UUID}`).reply(204);

      const result = await meetingsApi.delete(VALID_UUID);

      expect(mock.history.delete[0].url).toBe(`/meetings/${VALID_UUID}`);
      expect(result).toBeUndefined();
    });

    it('should throw when meeting is not found (404)', async () => {
      mock.onDelete(`/meetings/${VALID_UUID}`).reply(404, {
        message: 'Not found',
      });

      await expect(meetingsApi.delete(VALID_UUID)).rejects.toThrow();
    });
  });
});
