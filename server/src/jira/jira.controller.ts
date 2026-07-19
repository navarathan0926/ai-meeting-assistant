import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireRoles } from '../common/decorators/require-roles.decorator';
import { JiraService, JiraProjectSummary } from './jira.service';
import { UpdateProjectContextDto } from './dto/update-project-context.dto';
import { UserRole } from '../auth/enums/user-role.enum';
import { User } from '../auth/entities/user.entity';
import { OrganizationsService } from '../organizations/organizations.service';

@Auth()
@Controller('jira')
export class JiraController {
  constructor(
    private readonly jiraService: JiraService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  @Get('projects')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async listProjects(
    @CurrentUser() user: User,
  ): Promise<JiraProjectSummary[]> {
    const organizationId =
      this.organizationsService.requireOrganizationId(user);
    return this.jiraService.listProjects(organizationId);
  }

  @RequireRoles(UserRole.Admin)
  @Put('projects/:key/context')
  async updateProjectContext(
    @CurrentUser() user: User,
    @Param('key') key: string,
    @Body() dto: UpdateProjectContextDto,
  ): Promise<JiraProjectSummary> {
    const organizationId =
      this.organizationsService.requireOrganizationId(user);
    return this.jiraService.upsertProjectContext(
      organizationId,
      key,
      dto.aiContext,
    );
  }
}
