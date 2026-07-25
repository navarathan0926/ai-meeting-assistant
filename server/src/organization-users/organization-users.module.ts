import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { OrganizationsModule } from '../organizations/organizations.module';
import { OrganizationUsersService } from './organization-users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => OrganizationsModule),
  ],
  providers: [OrganizationUsersService],
  exports: [OrganizationUsersService],
})
export class OrganizationUsersModule {}
