import apiClient from '../axios';
import MockAdapter from 'axios-mock-adapter';
import { extractedItemsApi } from './extracted-items.api';
import { ApiResponse } from '@/types/api';
import {
  ExtractedItem,
  ExtractedItemPriority,
  ExtractedItemStatus,
  ExtractedItemType,
} from '@/types/extracted-item';

const mock = new MockAdapter(apiClient);

afterEach(() => {
  mock.reset();
});

const MEETING_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const ITEM_ID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

function buildItem(overrides: Partial<ExtractedItem> = {}): ExtractedItem {
  return {
    id: ITEM_ID,
    meetingId: MEETING_ID,
    type: ExtractedItemType.Task,
    title: 'Fix login bug',
    description: 'Users cannot log in on mobile.',
    priority: ExtractedItemPriority.High,
    contextSnippet: 'Discussed at 10:05',
    status: ExtractedItemStatus.Draft,
    jiraIssueKey: null,
    jiraIssueUrl: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function wrapInApiResponse<T>(data: T): ApiResponse<T> {
  return { data, statusCode: 200, timestamp: new Date().toISOString() };
}

describe('extractedItemsApi', () => {
  describe('listByMeeting', () => {
    it('should GET extracted items for a meeting', async () => {
      const items = [buildItem()];
      mock
        .onGet(`/meetings/${MEETING_ID}/extracted-items`)
        .reply(200, wrapInApiResponse(items));

      const result = await extractedItemsApi.listByMeeting(MEETING_ID);

      expect(result).toEqual(items);
    });
  });

  describe('update', () => {
    it('should PATCH an extracted item', async () => {
      const updated = buildItem({ title: 'Updated title' });
      mock
        .onPatch(`/extracted-items/${ITEM_ID}`)
        .reply(200, wrapInApiResponse(updated));

      const result = await extractedItemsApi.update(ITEM_ID, {
        title: 'Updated title',
      });

      expect(result.title).toBe('Updated title');
    });
  });

  describe('reject', () => {
    it('should PATCH reject endpoint', async () => {
      const rejected = buildItem({ status: ExtractedItemStatus.Rejected });
      mock
        .onPatch(`/extracted-items/${ITEM_ID}/reject`)
        .reply(200, wrapInApiResponse(rejected));

      const result = await extractedItemsApi.reject(ITEM_ID);

      expect(result.status).toBe(ExtractedItemStatus.Rejected);
    });
  });

  describe('approve', () => {
    it('should POST approve endpoint and return sent item', async () => {
      const approved = buildItem({
        status: ExtractedItemStatus.Sent,
        jiraIssueKey: 'PROJ-42',
        jiraIssueUrl: 'https://example.atlassian.net/browse/PROJ-42',
      });
      mock
        .onPost(`/extracted-items/${ITEM_ID}/approve`)
        .reply(200, wrapInApiResponse(approved));

      const result = await extractedItemsApi.approve(ITEM_ID);

      expect(result.jiraIssueKey).toBe('PROJ-42');
    });
  });
});
