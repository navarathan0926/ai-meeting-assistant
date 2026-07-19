import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Auth } from '../common/decorators/auth.decorator';
import { RequireRoles } from '../common/decorators/require-roles.decorator';
import { JiraService, JiraProjectSummary } from './jira.service';
import { UpdateProjectContextDto } from './dto/update-project-context.dto';
import { UserRole } from '../auth/enums/user-role.enum';

@Auth()
@Controller('jira')
export class JiraController {
  constructor(private readonly jiraService: JiraService) {}

  @Get('projects')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async listProjects(): Promise<JiraProjectSummary[]> {
    return this.jiraService.listProjects();
  }

  @RequireRoles(UserRole.Admin)
  @Put('projects/:key/context')
  async updateProjectContext(
    @Param('key') key: string,
    @Body() dto: UpdateProjectContextDto,
  ): Promise<JiraProjectSummary> {
    return this.jiraService.upsertProjectContext(key, dto.aiContext);
  }
}
