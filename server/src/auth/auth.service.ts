import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { UserRole } from './enums/user-role.enum';
import { DEFAULT_ORGANIZATION_ID } from '../organizations/organizations.constants';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthOauthCodeService } from './auth-oauth-code.service';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { PublicAuthConfigResponse } from '../platform-settings/interfaces/platform-settings-response.interface';

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthResult {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    provider: string;
    role: UserRole;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly oauthCodeService: AuthOauthCodeService,
    private readonly platformSettingsService: PlatformSettingsService,
  ) {}

  async getPublicConfig(): Promise<PublicAuthConfigResponse> {
    return {
      allowPublicSignup:
        await this.platformSettingsService.isPublicSignupAllowed(),
    };
  }

  // ─── Register ────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<AuthResult> {
    await this.assertPublicSignupAllowed();

    const existing = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      if (existing.googleId && existing.provider === 'google') {
        throw new ConflictException({
          message:
            'An account with this email already exists. Sign in with Google instead.',
          code: 'GOOGLE_ACCOUNT_EXISTS',
        });
      }
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepository.create({
      name: dto.name.trim(),
      email: dto.email.toLowerCase(),
      passwordHash,
      provider: 'local',
      role: UserRole.User,
      organizationId: DEFAULT_ORGANIZATION_ID,
      isActive: true,
    });
    await this.userRepository.save(user);

    return this.buildAuthResult(user);
  }

  // ─── Login ───────────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: dto.email.toLowerCase() })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    this.assertUserIsActive(user);

    if (!user.passwordHash) {
      if (user.googleId) {
        throw new UnauthorizedException({
          message:
            'This account uses Google Sign-In. Please continue with Google.',
          code: 'GOOGLE_AUTH_REQUIRED',
        });
      }
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.buildAuthResult(user);
  }

  // ─── Google OAuth upsert ─────────────────────────────────────────────────────

  async googleLogin(profile: {
    googleId: string;
    email: string;
    name: string;
  }): Promise<AuthResult> {
    let user = await this.userRepository.findOne({
      where: { googleId: profile.googleId },
    });

    if (!user) {
      user = await this.userRepository.findOne({
        where: { email: profile.email.toLowerCase() },
      });

      if (user) {
        this.assertUserIsActive(user);
        user.googleId = profile.googleId;
        await this.userRepository.save(user);
      } else {
        await this.assertPublicSignupAllowed();

        user = this.userRepository.create({
          name: profile.name,
          email: profile.email.toLowerCase(),
          googleId: profile.googleId,
          provider: 'google',
          passwordHash: null,
          role: UserRole.User,
          organizationId: DEFAULT_ORGANIZATION_ID,
          isActive: true,
        });
        await this.userRepository.save(user);
      }
    } else {
      this.assertUserIsActive(user);
    }

    return this.buildAuthResult(user);
  }

  // ─── OAuth one-time code exchange ────────────────────────────────────────────

  async createOAuthRedirectCode(accessToken: string): Promise<string> {
    return this.oauthCodeService.createCode(accessToken);
  }

  async exchangeOAuthCode(code: string): Promise<AuthResult> {
    const accessToken = await this.oauthCodeService.exchangeCode(code);
    if (!accessToken) {
      throw new UnauthorizedException({
        message: 'Invalid or expired authorization code.',
        code: 'OAUTH_CODE_INVALID',
      });
    }

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(accessToken) as JwtPayload;
    } catch {
      throw new UnauthorizedException({
        message: 'Invalid or expired authorization code.',
        code: 'OAUTH_CODE_INVALID',
      });
    }

    const user = await this.validateById(payload.sub);
    this.assertUserIsActive(user);
    return this.buildAuthResult(user);
  }

  // ─── Validate (used by JWT strategy) ────────────────────────────────────────

  async validateById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async assertPublicSignupAllowed(): Promise<void> {
    const allowed = await this.platformSettingsService.isPublicSignupAllowed();
    if (!allowed) {
      throw new ForbiddenException('Public registration is disabled.');
    }
  }

  private assertUserIsActive(user: User): void {
    if (user.isActive === false) {
      throw new ForbiddenException(
        'This account has been suspended. Contact your organization admin.',
      );
    }
  }

  private buildAuthResult(user: User): AuthResult {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload);
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
        role: user.role,
      },
    };
  }
}
