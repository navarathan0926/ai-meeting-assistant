import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Auth } from '../common/decorators/auth.decorator';
import { GoogleOauthGuard } from './guards/google-oauth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('google')
  @UseGuards(GoogleOauthGuard)
  async googleAuth() {
    // Initiates the Google OAuth2 login flow
  }

  @Get('google/callback')
  @UseGuards(GoogleOauthGuard)
  async googleAuthRedirect(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.googleLogin({
      googleId: req.user.googleId,
      email: req.user.email,
      name: req.user.name,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/login?token=${result.accessToken}`);
  }

  @Auth()
  @Get('me')
  async getProfile(@Req() req: any) {
    return req.user;
  }
}
