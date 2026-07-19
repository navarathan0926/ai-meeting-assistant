import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from '../../auth/entities/user.entity';
import { UserRole } from '../../auth/enums/user-role.enum';
import {
  ORGANIZATION_SCOPE_KEY,
  OrganizationScopeConfig,
} from '../decorators/organization-scope.decorator';
import { OrganizationScopeService } from '../organization-scope.service';

@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly organizationScopeService: OrganizationScopeService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const scope = this.reflector.getAllAndOverride<
      OrganizationScopeConfig | undefined
    >(ORGANIZATION_SCOPE_KEY, [context.getHandler(), context.getClass()]);

    if (!scope) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user: User;
      params: Record<string, string>;
    }>();
    const { user } = request;

    if (user.role === UserRole.SuperAdmin) {
      return true;
    }

    if (!user.organizationId) {
      throw new ForbiddenException(
        'Your account is not assigned to an organization.',
      );
    }

    const resourceId = request.params[scope.param];
    if (!resourceId) {
      return true;
    }

    const organizationId =
      await this.organizationScopeService.resolveOrganizationId(
        scope,
        resourceId,
      );
    if (!organizationId) {
      throw new NotFoundException('Resource not found.');
    }

    if (organizationId !== user.organizationId) {
      throw new ForbiddenException(
        'You do not have access to this organization resource.',
      );
    }

    return true;
  }
}
