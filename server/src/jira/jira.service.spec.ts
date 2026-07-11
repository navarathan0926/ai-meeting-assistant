import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InternalServerErrorException } from '@nestjs/common';
import { JiraService } from './jira.service';
import { ExtractedItemType } from '../extracted-items/enums/extracted-item-type.enum';
import { ExtractedItemPriority } from '../extracted-items/enums/extracted-item-priority.enum';
import { provideJiraConfig } from '../common/config/config.testing';
import { blocksToAdf } from '../common/jira-document/blocks-to-adf';
import { JiraAdfDocument } from '../common/jira-document/jira-document.types';
import { REDIS_CLIENT } from '../common/redis/redis.constants';
import { ProjectContext } from './entities/project-context.entity';

const sampleDescription: JiraAdfDocument = blocksToAdf([
  { type: 'heading', level: 2, text: 'Context' },
  { type: 'paragraph', text: 'Detailed description' },
  { type: 'bulletList', items: ['Criterion one'] },
]);

const tableDescription: JiraAdfDocument = blocksToAdf([
  {
    type: 'table',
    headers: ['Field', 'Value'],
    rows: [['Status', 'Open']],
  },
]);

describe('JiraService', () => {
  let service: JiraService;
  const fetchMock = jest.fn();
  const redisMock = {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    global.fetch = fetchMock;
    redisMock.get.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JiraService,
        provideJiraConfig(),
        { provide: REDIS_CLIENT, useValue: redisMock },
        {
          provide: getRepositoryToken(ProjectContext),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
            save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
          },
        },
      ],
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

  describe('assertValidAdf', () => {
    it('should accept a valid ADF document', () => {
      expect(service.assertValidAdf(sampleDescription)).toEqual(sampleDescription);
    });

    it('should reject malformed ADF documents', () => {
      expect(() =>
        service.assertValidAdf({
          type: 'doc',
          version: 1,
          content: [],
        } as JiraAdfDocument),
      ).toThrow(InternalServerErrorException);
    });
  });

  describe('createIssue', () => {
    function mockCreateMetaThenCreate(createResponse: {
      ok: boolean;
      id?: string;
      key?: string;
      status?: number;
      errorBody?: string;
    }) {
      fetchMock.mockImplementation(async (url: string) => {
        if (String(url).includes('createmeta')) {
          return {
            ok: true,
            json: async () => ({
              projects: [
                {
                  key: 'PROJ',
                  issuetypes: [{ name: 'Bug' }, { name: 'Task' }, { name: 'Story' }],
                },
              ],
            }),
          };
        }

        if (!createResponse.ok) {
          return {
            ok: false,
            status: createResponse.status ?? 400,
            text: async () => createResponse.errorBody ?? 'error',
          };
        }

        return {
          ok: true,
          json: async () => ({
            id: createResponse.id,
            key: createResponse.key,
          }),
        };
      });
    }

    it('should POST ADF description to the Jira gateway and return issue key', async () => {
      mockCreateMetaThenCreate({ ok: true, id: '10001', key: 'PROJ-42' });

      const result = await service.createIssue({
        type: ExtractedItemType.Bug,
        title: 'Login fails on mobile',
        description: sampleDescription,
        priority: ExtractedItemPriority.High,
      });

      expect(result.issueKey).toBe('PROJ-42');

      const createCall = fetchMock.mock.calls.find(([url]) =>
        String(url).endsWith('/rest/api/3/issue'),
      ) as [string, RequestInit];
      expect(createCall).toBeDefined();

      const body = JSON.parse(createCall[1].body as string) as {
        fields: { description: JiraAdfDocument; project: { key: string } };
      };
      expect(body.fields.description.type).toBe('doc');
      expect(body.fields.description.content[0].type).toBe('heading');
      expect(body.fields.project.key).toBe('PROJ');
      expect(createCall[1]).toEqual(
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic '),
          }),
        }),
      );
    });

    it('should use the provided projectKey override', async () => {
      mockCreateMetaThenCreate({ ok: true, id: '10002', key: 'OTHER-1' });

      await service.createIssue({
        type: ExtractedItemType.Task,
        title: 'Task',
        description: sampleDescription,
        priority: ExtractedItemPriority.Medium,
        projectKey: 'OTHER',
      });

      const createCall = fetchMock.mock.calls.find(([url]) =>
        String(url).endsWith('/rest/api/3/issue'),
      ) as [string, RequestInit];
      const body = JSON.parse(createCall[1].body as string) as {
        fields: { project: { key: string } };
      };
      expect(body.fields.project.key).toBe('OTHER');
    });

    it('should send table nodes in ADF description', async () => {
      mockCreateMetaThenCreate({ ok: true, id: '10001', key: 'PROJ-43' });

      await service.createIssue({
        type: ExtractedItemType.Task,
        title: 'Task with table',
        description: tableDescription,
        priority: ExtractedItemPriority.Medium,
      });

      const createCall = fetchMock.mock.calls.find(([url]) =>
        String(url).endsWith('/rest/api/3/issue'),
      ) as [string, RequestInit];
      const body = JSON.parse(createCall[1].body as string) as {
        fields: { description: JiraAdfDocument };
      };
      expect(body.fields.description.content[0].type).toBe('table');
    });

    it('should throw InternalServerErrorException when Jira returns an error', async () => {
      mockCreateMetaThenCreate({
        ok: false,
        status: 400,
        errorBody: JSON.stringify({ errorMessages: ['Project not found'] }),
      });

      await expect(
        service.createIssue({
          type: ExtractedItemType.Task,
          title: 'Task',
          description: sampleDescription,
          priority: ExtractedItemPriority.Medium,
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
