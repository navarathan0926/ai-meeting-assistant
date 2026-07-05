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
import { appConfiguration } from '../common/config/app.config';
import { authConfiguration } from '../common/config/auth.config';
import {
  clearAuthCookie,
  parseJwtDurationToMs,
  resolveAuthCookieDomain,
  setAuthCookie,
} from './auth-cookie.util';
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
    @Inject(authConfiguration.KEY)
    private readonly authConfig: ConfigType<typeof authConfiguration>,
  ) {}

  private authCookieOptions() {
    const isProduction = this.appConfig.nodeEnv === 'production';

    return {
      secure: isProduction,
      domain: isProduction
        ? resolveAuthCookieDomain(this.appConfig.clientUrl)
        : undefined,
    };
  }

  private applyAuthCookie(res: Response, accessToken: string): void {
    setAuthCookie(res, accessToken, {
      ...this.authCookieOptions(),
      maxAgeMs: parseJwtDurationToMs(this.authConfig.jwtExpiresIn),
    });
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(registerDto);
    this.applyAuthCookie(res, result.accessToken);
    return { user: result.user };
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);
    this.applyAuthCookie(res, result.accessToken);
    return { user: result.user };
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('oauth/exchange')
  async exchangeOAuthCode(
    @Body() dto: ExchangeOAuthCodeDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.exchangeOAuthCode(dto.code);
    this.applyAuthCookie(res, result.accessToken);
    return { user: result.user };
  }

  @Get('google')
  @UseGuards(GoogleOauthGuard)
  async googleAuth() {
    // Initiates the Google OAuth2 login flow
  }

  @Get('google/callback')
  @UseGuards(GoogleOauthGuard)
  async googleAuthRedirect(@Req() req: GoogleAuthRequest, @Res() res: Response) {
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
  }

  @Auth()
  @Get('me')
  getProfile(@CurrentUser() user: User): UserProfileResponse {
    return toUserProfile(user);
  }

  @Auth()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response): void {
    clearAuthCookie(res, this.authCookieOptions());
  }
}
