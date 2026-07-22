import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { CreateOrganizationUserDto } from '../organization-users/dto/create-organization-user.dto';
import { OrganizationUserSummary } from '../organization-users/interfaces/organization-user-summary.interface';
import { OrganizationUsersService } from '../organization-users/organization-users.service';
import { OrganizationsService } from './organizations.service';
import { OrganizationJiraService } from './organization-jira.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreateOrganizationAdminDto } from './dto/create-organization-admin.dto';
import { UpdateJiraConfigDto } from './dto/update-jira-config.dto';
import { OrganizationAdminSummary } from './interfaces/organization-admin-summary.interface';

@Auth()
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly organizationJiraService: OrganizationJiraService,
    private readonly organizationUsersService: OrganizationUsersService,
  ) {}

  @RequireRoles(UserRole.Admin)
  @Get('jira-config')
  getJiraConfig(@CurrentUser() user: User) {
    const organizationId = this.organizationsService.requireOrganizationId(user);
    return this.organizationJiraService.getConfig(organizationId);
  }

  @RequireRoles(UserRole.Admin)
  @Put('jira-config')
  updateJiraConfig(
    @CurrentUser() user: User,
    @Body() dto: UpdateJiraConfigDto,
  ) {
    const organizationId = this.organizationsService.requireOrganizationId(user);
    return this.organizationJiraService.updateConfig(organizationId, dto);
  }

  @RequireRoles(UserRole.Admin)
  @Post('jira-config/test')
  testJiraConfig(
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

  @RequireRoles(UserRole.Admin)
  @Get('users')
  listOrganizationUsers(
    @CurrentUser() user: User,
  ): Promise<OrganizationUserSummary[]> {
    return this.organizationUsersService.listOrganizationUsers(user);
  }

  @RequireRoles(UserRole.Admin)
  @Post('users')
  createOrganizationUser(
    @CurrentUser() user: User,
    @Body() dto: CreateOrganizationUserDto,
  ): Promise<OrganizationUserSummary> {
    return this.organizationUsersService.createOrganizationUser(user, dto);
  }

  @RequireRoles(UserRole.Admin)
  @Patch('users/:id/suspend')
  suspendOrganizationUser(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrganizationUserSummary> {
    return this.organizationUsersService.suspendOrganizationUser(user, id);
  }

  @RequireRoles(UserRole.Admin)
  @Patch('users/:id/reactivate')
  reactivateOrganizationUser(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrganizationUserSummary> {
    return this.organizationUsersService.reactivateOrganizationUser(user, id);
  }

  @RequireRoles(UserRole.Admin)
  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteOrganizationUser(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.organizationUsersService.deleteOrganizationUser(user, id);
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

  @RequireRoles(UserRole.SuperAdmin)
  @Get(':id/admins')
  listOrganizationAdmins(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrganizationAdminSummary[]> {
    return this.organizationsService.listOrganizationAdmins(id);
  }

  @RequireRoles(UserRole.SuperAdmin)
  @Patch(':id/admins/:userId/suspend')
  suspendOrganizationAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<OrganizationAdminSummary> {
    return this.organizationsService.suspendOrganizationAdmin(id, userId);
  }

  @RequireRoles(UserRole.SuperAdmin)
  @Patch(':id/admins/:userId/reactivate')
  reactivateOrganizationAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<OrganizationAdminSummary> {
    return this.organizationsService.reactivateOrganizationAdmin(id, userId);
  }

  @RequireRoles(UserRole.SuperAdmin)
  @Delete(':id/admins/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteOrganizationAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    return this.organizationsService.deleteOrganizationAdmin(id, userId);
  }
}
