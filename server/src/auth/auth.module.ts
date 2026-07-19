import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ConfigType } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthOauthCodeService } from './auth-oauth-code.service';
import { AuthController } from './auth.controller';
import { User } from './entities/user.entity';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GoogleOauthGuard } from './guards/google-oauth.guard';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { authConfiguration } from '../common/config/auth.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [authConfiguration.KEY],
      useFactory: (auth: ConfigType<typeof authConfiguration>) => ({
        secret: auth.jwtSecret,
        signOptions: {
          expiresIn: auth.jwtExpiresIn as any,
        },
      }),
    }),
  ],
  providers: [
    AuthService,
    AuthOauthCodeService,
    JwtStrategy,
    GoogleStrategy,
    GoogleOauthGuard,
    AuthGuard,
    RolesGuard,
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    AuthGuard,
    RolesGuard,
    PassportModule,
    JwtModule,
  ],
})
export class AuthModule {}
