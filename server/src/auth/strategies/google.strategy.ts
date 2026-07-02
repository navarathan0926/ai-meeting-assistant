import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID:
        configService.get<string>('GOOGLE_CLIENT_ID') ?? 'MISSING_CLIENT_ID',
      clientSecret:
        configService.get<string>('GOOGLE_CLIENT_SECRET') ??
        'MISSING_CLIENT_SECRET',
      callbackURL:
        configService.get<string>('GOOGLE_CALLBACK_URL') ??
        'http://localhost:4000/api/auth/google/callback',
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
