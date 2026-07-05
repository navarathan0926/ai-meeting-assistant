import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigType } from '@nestjs/config';
import { appConfiguration } from '../../common/config/app.config';

@Injectable()
export class GoogleOauthGuard extends AuthGuard('google') {
  constructor(
    @Inject(appConfiguration.KEY)
    private readonly appConfig: ConfigType<typeof appConfiguration>,
  ) {
    super();
  }

  getAuthenticateOptions(_context: ExecutionContext) {
    return {
      failureRedirect: `${this.appConfig.frontendUrl}/login?error=google_auth_failed`,
      session: false,
    };
  }
}
