import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { meetingsApi } from './meetings.api';
import apiClient from '../axios';
import { Meeting, MeetingStatus, ApiResponse } from '@/types/meeting';

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
    it('should POST to /api/meetings/upload with FormData and return the meeting', async () => {
      const meeting = buildMeeting({ status: MeetingStatus.Pending });
      mock.onPost('/api/meetings/upload').reply(202, wrapInApiResponse(meeting));

      const file = new File([Buffer.from('audio')], 'standup.mp3', { type: 'audio/mpeg' });
      const result = await meetingsApi.upload(file);

      expect(mock.history.post[0].url).toBe('/api/meetings/upload');
      expect(result).toEqual(meeting);
    });

    it('should set multipart/form-data content type header', async () => {
      const meeting = buildMeeting();
      mock.onPost('/api/meetings/upload').reply(202, wrapInApiResponse(meeting));

      const file = new File([Buffer.from('audio')], 'meeting.mp3', { type: 'audio/mpeg' });
      await meetingsApi.upload(file);

      const headers = mock.history.post[0].headers;
      expect(headers?.['Content-Type']).toContain('multipart/form-data');
    });

    it('should throw when the server returns an error', async () => {
      mock.onPost('/api/meetings/upload').reply(400, { message: 'No audio file provided.' });

      const file = new File([], 'bad.txt');
      await expect(meetingsApi.upload(file)).rejects.toThrow();
    });
  });

  // ── getById ─────────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('should GET /api/meetings/:id and return the meeting', async () => {
      const meeting = buildMeeting({ status: MeetingStatus.Completed });
      mock.onGet(`/api/meetings/${VALID_UUID}`).reply(200, wrapInApiResponse(meeting));

      const result = await meetingsApi.getById(VALID_UUID);

      expect(mock.history.get[0].url).toBe(`/api/meetings/${VALID_UUID}`);
      expect(result).toEqual(meeting);
    });

    it('should throw when meeting is not found (404)', async () => {
      mock.onGet(`/api/meetings/${VALID_UUID}`).reply(404, {
        message: 'Meeting not found',
        statusCode: 404,
      });

      await expect(meetingsApi.getById(VALID_UUID)).rejects.toThrow();
    });
  });

  // ── getAll ──────────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('should GET /api/meetings and return the array', async () => {
      const meetings = [buildMeeting(), buildMeeting({ id: 'uuid-5678' })];
      mock.onGet('/api/meetings').reply(200, wrapInApiResponse(meetings));

      const result = await meetingsApi.getAll();

      expect(mock.history.get[0].url).toBe('/api/meetings');
      expect(result).toEqual(meetings);
      expect(result).toHaveLength(2);
    });

    it('should return an empty array when no meetings exist', async () => {
      mock.onGet('/api/meetings').reply(200, wrapInApiResponse([]));

      const result = await meetingsApi.getAll();
      expect(result).toEqual([]);
    });

    it('should throw on network error', async () => {
      mock.onGet('/api/meetings').networkError();

      await expect(meetingsApi.getAll()).rejects.toThrow();
    });
  });

  // ── delete ──────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('should DELETE /api/meetings/:id and resolve with void', async () => {
      mock.onDelete(`/api/meetings/${VALID_UUID}`).reply(204);

      const result = await meetingsApi.delete(VALID_UUID);

      expect(mock.history.delete[0].url).toBe(`/api/meetings/${VALID_UUID}`);
      expect(result).toBeUndefined();
    });

    it('should throw when meeting is not found (404)', async () => {
      mock.onDelete(`/api/meetings/${VALID_UUID}`).reply(404, {
        message: 'Not found',
      });

      await expect(meetingsApi.delete(VALID_UUID)).rejects.toThrow();
    });
  });
});
