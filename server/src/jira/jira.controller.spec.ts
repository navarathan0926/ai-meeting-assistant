import { Test, TestingModule } from '@nestjs/testing';
import { JiraController } from './jira.controller';
import { JiraService } from './jira.service';
import { UserRole } from '../auth/enums/user-role.enum';

describe('JiraController', () => {
  let controller: JiraController;
  let jiraService: jest.Mocked<JiraService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JiraController],
      providers: [
        {
          provide: JiraService,
          useValue: {
            listProjects: jest.fn(),
            upsertProjectContext: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(JiraController);
    jiraService = module.get(JiraService);
  });

  it('should list projects', async () => {
    jiraService.listProjects.mockResolvedValue([]);

    await expect(controller.listProjects()).resolves.toEqual([]);
  });

  it('should update project context', async () => {
    jiraService.upsertProjectContext.mockResolvedValue({
      key: 'PROJ',
      name: 'Project',
      description: '',
      aiContext: 'Updated',
    });

    const result = await controller.updateProjectContext('PROJ', {
      aiContext: 'Updated',
    });

    expect(result.aiContext).toBe('Updated');
  });

  it('should require admin role on updateProjectContext', () => {
    const roles = Reflect.getMetadata(
      'roles',
      JiraController.prototype.updateProjectContext,
    );

    expect(roles).toContain(UserRole.Admin);
  });
});
