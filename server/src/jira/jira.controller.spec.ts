import { Test, TestingModule } from '@nestjs/testing';
import { JiraController } from './jira.controller';
import { JiraService } from './jira.service';
import { UserRole } from '../auth/enums/user-role.enum';
import { OrganizationsService } from '../organizations/organizations.service';
import { DEFAULT_ORGANIZATION_ID } from '../organizations/organizations.constants';
import { User } from '../auth/entities/user.entity';

describe('JiraController', () => {
  let controller: JiraController;
  let jiraService: jest.Mocked<JiraService>;

  const adminUser = {
    id: 'user-1',
    organizationId: DEFAULT_ORGANIZATION_ID,
    role: UserRole.Admin,
  } as User;

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
        {
          provide: OrganizationsService,
          useValue: {
            requireOrganizationId: jest
              .fn()
              .mockReturnValue(DEFAULT_ORGANIZATION_ID),
          },
        },
      ],
    }).compile();

    controller = module.get(JiraController);
    jiraService = module.get(JiraService);
  });

  it('should list projects for the user organization', async () => {
    jiraService.listProjects.mockResolvedValue([]);

    await expect(controller.listProjects(adminUser)).resolves.toEqual([]);
    expect(jiraService.listProjects).toHaveBeenCalledWith(
      DEFAULT_ORGANIZATION_ID,
    );
  });

  it('should update project context', async () => {
    jiraService.upsertProjectContext.mockResolvedValue({
      key: 'PROJ',
      name: 'Project',
      description: '',
      aiContext: 'Updated',
    });

    const result = await controller.updateProjectContext(adminUser, 'PROJ', {
      aiContext: 'Updated',
    });

    expect(result.aiContext).toBe('Updated');
    expect(jiraService.upsertProjectContext).toHaveBeenCalledWith(
      DEFAULT_ORGANIZATION_ID,
      'PROJ',
      'Updated',
    );
  });

  it('should require admin role on updateProjectContext', () => {
    const roles = Reflect.getMetadata(
      'roles',
      JiraController.prototype.updateProjectContext,
    );

    expect(roles).toContain(UserRole.Admin);
  });
});
