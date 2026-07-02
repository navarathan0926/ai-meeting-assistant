import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleOauthGuard extends AuthGuard('google') {
  getAuthenticateOptions(_context: ExecutionContext) {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

    return {
      failureRedirect: `${frontendUrl}/login?error=google_auth_failed`,
      session: false,
    };
  }
}
