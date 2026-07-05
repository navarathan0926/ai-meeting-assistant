import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { authConfiguration } from '../../common/config/auth.config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    @Inject(authConfiguration.KEY)
    authConfig: ConfigType<typeof authConfiguration>,
  ) {
    super({
      clientID: authConfig.googleClientId,
      clientSecret: authConfig.googleClientSecret,
      callbackURL: authConfig.googleCallbackUrl,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      emails?: { value: string; verified?: boolean }[];
      displayName: string;
    },
    done: VerifyCallback,
  ): Promise<void> {
    const emailEntry = profile.emails?.[0];
    if (!emailEntry?.value || !emailEntry.verified) {
      return done(
        new UnauthorizedException('Google email not verified'),
        false,
      );
    }

    const { id, displayName } = profile;
    done(null, {
      googleId: id,
      email: emailEntry.value,
      name: displayName,
    });
  }
}
