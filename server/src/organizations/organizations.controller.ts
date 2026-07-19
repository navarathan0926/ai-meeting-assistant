import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireRoles } from '../common/decorators/require-roles.decorator';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../auth/enums/user-role.enum';
import { OrganizationsService } from './organizations.service';
import { OrganizationJiraService } from './organization-jira.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreateOrganizationAdminDto } from './dto/create-organization-admin.dto';
import { UpdateJiraConfigDto } from './dto/update-jira-config.dto';

@Auth()
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly organizationJiraService: OrganizationJiraService,
  ) {}

  @RequireRoles(UserRole.Admin)
  @Get('me/jira-config')
  getMyJiraConfig(@CurrentUser() user: User) {
    const organizationId = this.organizationsService.requireOrganizationId(user);
    return this.organizationJiraService.getConfig(organizationId);
  }

  @RequireRoles(UserRole.Admin)
  @Put('me/jira-config')
  updateMyJiraConfig(
    @CurrentUser() user: User,
    @Body() dto: UpdateJiraConfigDto,
  ) {
    const organizationId = this.organizationsService.requireOrganizationId(user);
    return this.organizationJiraService.updateConfig(organizationId, dto);
  }

  @RequireRoles(UserRole.Admin)
  @Post('me/jira-config/test')
  testMyJiraConfig(
    @CurrentUser() user: User,
    @Body() dto: UpdateJiraConfigDto,
  ) {
    const organizationId = this.organizationsService.requireOrganizationId(user);
    return this.organizationJiraService.testConfig(organizationId, dto);
  }

  @RequireRoles(UserRole.SuperAdmin)
  @Get()
  listOrganizations() {
    return this.organizationsService.listAll();
  }

  @RequireRoles(UserRole.SuperAdmin)
  @Post()
  createOrganization(@Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(dto);
  }

  @RequireRoles(UserRole.SuperAdmin)
  @Get(':id')
  getOrganization(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationsService.findById(id);
  }

  @RequireRoles(UserRole.SuperAdmin)
  @Patch(':id/suspend')
  suspendOrganization(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationsService.suspend(id);
  }

  @RequireRoles(UserRole.SuperAdmin)
  @Patch(':id/reactivate')
  reactivateOrganization(@Param('id', ParseUUIDPipe) id: string) {
    return this.organizationsService.reactivate(id);
  }

  @RequireRoles(UserRole.SuperAdmin)
  @Post(':id/admins')
  createOrganizationAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateOrganizationAdminDto,
  ) {
    return this.organizationsService.createAdminUser(id, dto);
  }
}
