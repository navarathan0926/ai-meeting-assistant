import { Test, TestingModule } from '@nestjs/testing';
import { JiraService } from './jira.service';
import { ExtractedItemType } from '../extracted-items/enums/extracted-item-type.enum';
import { ExtractedItemPriority } from '../extracted-items/enums/extracted-item-priority.enum';
import { InternalServerErrorException } from '@nestjs/common';
import { provideJiraConfig } from '../common/config/config.testing';

describe('JiraService', () => {
  let service: JiraService;
  const fetchMock = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    global.fetch = fetchMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [JiraService, provideJiraConfig()],
    }).compile();

    service = module.get(JiraService);
  });

  describe('isConfigured', () => {
    it('should return true when required env vars are present', () => {
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('getIssueBrowseUrl', () => {
    it('should build a browse URL from JIRA_BASE_URL', () => {
      expect(service.getIssueBrowseUrl('PROJ-42')).toBe(
        'https://example.atlassian.net/browse/PROJ-42',
      );
    });
  });

  describe('createIssue', () => {
    it('should POST to the Jira gateway and return issue key', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ id: '10001', key: 'PROJ-42' }),
      });

      const result = await service.createIssue({
        type: ExtractedItemType.Bug,
        title: 'Login fails on mobile',
        description: 'Detailed description',
        priority: ExtractedItemPriority.High,
      });

      expect(result.issueKey).toBe('PROJ-42');
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.atlassian.com/ex/jira/cloud-123/rest/api/3/issue',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic '),
          }),
        }),
      );
    });

    it('should throw InternalServerErrorException when Jira returns an error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({ errorMessages: ['Project not found'] }),
      });

      await expect(
        service.createIssue({
          type: ExtractedItemType.Task,
          title: 'Task',
          description: 'Desc',
          priority: ExtractedItemPriority.Medium,
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
