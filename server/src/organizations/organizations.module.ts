import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationsService } from './organizations.service';
import { OrganizationJiraService } from './organization-jira.service';
import { OrganizationsController } from './organizations.controller';
import { OrganizationGuard } from './guards/organization.guard';
import { OrganizationScopeService } from './organization-scope.service';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/entities/user.entity';
import { Meeting } from '../meetings/entities/meeting.entity';
import { ExtractedItem } from '../extracted-items/entities/extracted-item.entity';
import { OrganizationUsersModule } from '../organization-users/organization-users.module';

@Module({
  imports: [
    forwardRef(() => OrganizationUsersModule),
    TypeOrmModule.forFeature([
      Organization,
      User,
      Meeting,
      ExtractedItem,
    ]),
    AuthModule,
  ],
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    OrganizationJiraService,
    OrganizationScopeService,
    OrganizationGuard,
  ],
  exports: [
    OrganizationsService,
    OrganizationJiraService,
    OrganizationScopeService,
    OrganizationGuard,
  ],
})
export class OrganizationsModule {}
