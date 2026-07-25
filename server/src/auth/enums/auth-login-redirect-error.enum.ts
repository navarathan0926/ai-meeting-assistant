/** Query `error=` values used when redirecting to the frontend login page. */
export enum AuthLoginRedirectError {
  GOOGLE_AUTH_FAILED = 'google_auth_failed',
  REGISTRATION_DISABLED = 'registration_disabled',
  ORGANIZATION_SUSPENDED = 'organization_suspended',
  ORGANIZATION_REQUIRED = 'organization_required',
  USER_SUSPENDED = 'user_suspended',
}
