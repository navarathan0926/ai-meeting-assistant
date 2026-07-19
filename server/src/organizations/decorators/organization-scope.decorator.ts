import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { OrganizationGuard } from '../guards/organization.guard';

export const ORGANIZATION_SCOPE_KEY = 'organizationScope';

export type OrganizationScopeConfig = {
  resource: 'meeting' | 'extracted-item';
  param: string;
};

/** Attach resource metadata for OrganizationGuard checks. */
export const OrganizationScope = (config: OrganizationScopeConfig) =>
  SetMetadata(ORGANIZATION_SCOPE_KEY, config);

/** Apply OrganizationGuard with resource metadata on a route. */
export const OrgScoped = (config: OrganizationScopeConfig) =>
  applyDecorators(OrganizationScope(config), UseGuards(OrganizationGuard));
