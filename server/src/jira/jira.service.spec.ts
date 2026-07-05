import { Test, TestingModule } from '@nestjs/testing';

import { JiraService } from './jira.service';

import { ExtractedItemType } from '../extracted-items/enums/extracted-item-type.enum';

import { ExtractedItemPriority } from '../extracted-items/enums/extracted-item-priority.enum';

import { InternalServerErrorException } from '@nestjs/common';

import { provideJiraConfig } from '../common/config/config.testing';

import { blocksToAdf } from '../common/jira-document/blocks-to-adf';

import { JiraAdfDocument } from '../common/jira-document/jira-document.types';



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



  describe('assertValidAdf', () => {

    it('should accept a valid ADF document', () => {

      expect(service.assertValidAdf(sampleDescription)).toEqual(sampleDescription);

    });



    it('should reject malformed ADF documents', () => {

      expect(() =>

        service.assertValidAdf({ type: 'doc', version: 1, content: [] } as JiraAdfDocument),

      ).toThrow(InternalServerErrorException);

    });

  });



  describe('createIssue', () => {

    it('should POST ADF description to the Jira gateway and return issue key', async () => {

      fetchMock.mockResolvedValue({

        ok: true,

        json: async () => ({ id: '10001', key: 'PROJ-42' }),

      });



      const result = await service.createIssue({

        type: ExtractedItemType.Bug,

        title: 'Login fails on mobile',

        description: sampleDescription,

        priority: ExtractedItemPriority.High,

      });



      expect(result.issueKey).toBe('PROJ-42');

      const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];

      const body = JSON.parse(requestInit.body as string) as {

        fields: { description: JiraAdfDocument };

      };

      expect(body.fields.description.type).toBe('doc');

      expect(body.fields.description.content[0].type).toBe('heading');

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



    it('should send table nodes in ADF description', async () => {

      fetchMock.mockResolvedValue({

        ok: true,

        json: async () => ({ id: '10001', key: 'PROJ-43' }),

      });



      await service.createIssue({

        type: ExtractedItemType.Task,

        title: 'Task with table',

        description: tableDescription,

        priority: ExtractedItemPriority.Medium,

      });



      const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];

      const body = JSON.parse(requestInit.body as string) as {

        fields: { description: JiraAdfDocument };

      };

      expect(body.fields.description.content[0].type).toBe('table');

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

          description: sampleDescription,

          priority: ExtractedItemPriority.Medium,

        }),

      ).rejects.toThrow(InternalServerErrorException);

    });

  });

});

