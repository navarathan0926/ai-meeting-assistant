import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthOauthCodeService } from './auth-oauth-code.service';

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
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly oauthCodeService: AuthOauthCodeService,
  ) {}

  // ─── Register ────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<AuthResult> {
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
        user.googleId = profile.googleId;
        await this.userRepository.save(user);
      } else {
        user = this.userRepository.create({
          name: profile.name,
          email: profile.email.toLowerCase(),
          googleId: profile.googleId,
          provider: 'google',
          passwordHash: null,
        });
        await this.userRepository.save(user);
      }
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
    return this.buildAuthResult(user);
  }

  // ─── Validate (used by JWT strategy) ────────────────────────────────────────

  async validateById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

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
      },
    };
  }
}
