import { applyDecorators, UseGuards } from '@nestjs/common';
import { UserRole } from '../../auth/enums/user-role.enum';
import { Auth } from './auth.decorator';
import { Roles } from './roles.decorator';
import { RolesGuard } from '../guards/roles.guard';

/** Authenticated route restricted to one or more roles. */
export const RequireRoles = (...roles: UserRole[]) =>
  applyDecorators(Auth(), Roles(...roles), UseGuards(RolesGuard));
