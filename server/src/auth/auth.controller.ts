import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigType } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ExchangeOAuthCodeDto } from './dto/exchange-oauth-code.dto';
import { Auth } from '../common/decorators/auth.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GoogleOauthGuard } from './guards/google-oauth.guard';
import { User } from './entities/user.entity';
import { AuthErrorCode } from './enums/auth-error-code.enum';
import { AuthLoginRedirectError } from './enums/auth-login-redirect-error.enum';
import { appConfiguration } from '../common/config/app.config';
import { toUserProfile, UserProfileResponse } from './interfaces/user-profile.interface';

interface GoogleAuthRequest extends Request {
  user: {
    googleId: string;
    email: string;
    name: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(appConfiguration.KEY)
    private readonly appConfig: ConfigType<typeof appConfiguration>,
  ) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Get('config')
  getPublicConfig() {
    return this.authService.getPublicConfig();
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('oauth/exchange')
  exchangeOAuthCode(@Body() dto: ExchangeOAuthCodeDto) {
    return this.authService.exchangeOAuthCode(dto.code);
  }

  @Get('google')
  @UseGuards(GoogleOauthGuard)
  async googleAuth() {
    // Initiates the Google OAuth2 login flow
  }

  @Get('google/callback')
  @UseGuards(GoogleOauthGuard)
  async googleAuthRedirect(@Req() req: GoogleAuthRequest, @Res() res: Response) {
    try {
      const result = await this.authService.googleLogin({
        googleId: req.user.googleId,
        email: req.user.email,
        name: req.user.name,
      });

      const code = await this.authService.createOAuthRedirectCode(
        result.accessToken,
      );
      return res.redirect(
        `${this.appConfig.frontendUrl}/login?code=${code}`,
      );
    } catch (error) {
      if (error instanceof ForbiddenException) {
        const response = error.getResponse();
        const body =
          typeof response === 'object' && response !== null
            ? (response as Record<string, unknown>)
            : { message: response };

        if (body.code === AuthErrorCode.ORGANIZATION_SUSPENDED) {
          return res.redirect(
            `${this.appConfig.frontendUrl}/login?error=${AuthLoginRedirectError.ORGANIZATION_SUSPENDED}`,
          );
        }

        if (body.code === AuthErrorCode.ORGANIZATION_REQUIRED) {
          return res.redirect(
            `${this.appConfig.frontendUrl}/login?error=${AuthLoginRedirectError.ORGANIZATION_REQUIRED}`,
          );
        }

        if (body.code === AuthErrorCode.USER_SUSPENDED) {
          return res.redirect(
            `${this.appConfig.frontendUrl}/login?error=${AuthLoginRedirectError.USER_SUSPENDED}`,
          );
        }

        if (body.code === AuthErrorCode.REGISTRATION_DISABLED) {
          return res.redirect(
            `${this.appConfig.frontendUrl}/login?error=${AuthLoginRedirectError.REGISTRATION_DISABLED}`,
          );
        }
      }

      return res.redirect(
        `${this.appConfig.frontendUrl}/login?error=${AuthLoginRedirectError.GOOGLE_AUTH_FAILED}`,
      );
    }
  }

  @Auth()
  @Get('me')
  getProfile(@CurrentUser() user: User): UserProfileResponse {
    return toUserProfile(user);
  }

  @Auth()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(): void {
    // Stateless JWT — client clears the stored token.
  }
}
