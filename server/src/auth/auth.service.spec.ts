import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { AuthOauthCodeService } from './auth-oauth-code.service';
import { User } from './entities/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { OrganizationStatus } from '../organizations/enums/organization-status.enum';
import { UserRole } from './enums/user-role.enum';
import { AuthErrorCode } from './enums/auth-error-code.enum';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<Repository<User>>;
  let organizationRepo: jest.Mocked<Repository<Organization>>;
  let jwtService: jest.Mocked<JwtService>;
  let oauthCodeService: jest.Mocked<AuthOauthCodeService>;
  let platformSettingsService: jest.Mocked<
    Pick<PlatformSettingsService, 'isPublicSignupAllowed'>
  >;

  beforeEach(async () => {
    const mockQueryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Organization),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: AuthOauthCodeService,
          useValue: {
            createCode: jest.fn().mockResolvedValue('oauth-code-123'),
            exchangeCode: jest.fn(),
          },
        },
        {
          provide: PlatformSettingsService,
          useValue: {
            isPublicSignupAllowed: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get(getRepositoryToken(User));
    organizationRepo = module.get(getRepositoryToken(Organization));
    jwtService = module.get(JwtService);
    oauthCodeService = module.get(AuthOauthCodeService);
    platformSettingsService = module.get(PlatformSettingsService);
  });

  describe('register', () => {
    it('should throw ForbiddenException when public signup is disabled', async () => {
      platformSettingsService.isPublicSignupAllowed.mockResolvedValue(false);

      await expect(
        service.register({
          name: 'Test',
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
    it('should throw ConflictException if user email already exists', async () => {
      userRepo.findOne.mockResolvedValue(new User());

      await expect(
        service.register({
          name: 'Test',
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw GOOGLE_ACCOUNT_EXISTS when email belongs to Google-only user', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'user-uuid',
        email: 'test@example.com',
        googleId: 'google-123',
        provider: 'google',
      } as User);

      await expect(
        service.register({
          name: 'Test',
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toMatchObject({
        response: {
          code: AuthErrorCode.GOOGLE_ACCOUNT_EXISTS,
        },
      });
    });

    it('should create and save a new user, and return JWT + user info', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const mockUser = {
        id: 'user-uuid',
        name: 'Test User',
        email: 'test@example.com',
        provider: 'local',
        role: UserRole.User,
      } as User;

      userRepo.create.mockReturnValue(mockUser);
      userRepo.save.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.register({
        name: 'Test User',
        email: 'TEST@example.com',
        password: 'password123',
      });

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test User',
          email: 'test@example.com',
          provider: 'local',
          role: UserRole.User,
          organizationId: '00000000-0000-4000-8000-000000000001',
          isActive: true,
        }),
      );
      expect(userRepo.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({
        accessToken: 'mock-jwt-token',
        user: {
          id: 'user-uuid',
          email: 'test@example.com',
          name: 'Test User',
          provider: 'local',
          role: UserRole.User,
        },
      });
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user does not exist', async () => {
      const mockQb = userRepo.createQueryBuilder();
      (mockQb.getOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({
          email: 'notfound@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw GOOGLE_AUTH_REQUIRED for Google-only accounts', async () => {
      const mockUser = {
        id: 'user-uuid',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: null,
        googleId: 'google-123',
        provider: 'google',
        role: UserRole.User,
        organizationId: 'org-1',
        isActive: true,
      } as User;

      const mockQb = userRepo.createQueryBuilder();
      (mockQb.getOne as jest.Mock).mockResolvedValue(mockUser);
      organizationRepo.findOne.mockResolvedValue({
        id: 'org-1',
        isActive: true,
        status: OrganizationStatus.Active,
      } as Organization);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toMatchObject({
        response: {
          code: AuthErrorCode.GOOGLE_AUTH_REQUIRED,
        },
      });
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const passwordHash = await bcrypt.hash('correctpassword', 12);
      const mockUser = {
        id: 'user-uuid',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash,
        role: UserRole.User,
        organizationId: 'org-1',
        isActive: true,
      } as User;

      const mockQb = userRepo.createQueryBuilder();
      (mockQb.getOne as jest.Mock).mockResolvedValue(mockUser);
      organizationRepo.findOne.mockResolvedValue({
        id: 'org-1',
        isActive: true,
        status: OrganizationStatus.Active,
      } as Organization);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw USER_SUSPENDED for suspended users', async () => {
      const passwordHash = await bcrypt.hash('correctpassword', 12);
      const mockUser = {
        id: 'user-uuid',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash,
        provider: 'local',
        isActive: false,
      } as User;

      const mockQb = userRepo.createQueryBuilder();
      (mockQb.getOne as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'correctpassword',
        }),
      ).rejects.toMatchObject({
        response: {
          code: AuthErrorCode.USER_SUSPENDED,
        },
      });
    });

    it('should throw ORGANIZATION_SUSPENDED when org is suspended', async () => {
      const passwordHash = await bcrypt.hash('correctpassword', 12);
      const mockUser = {
        id: 'user-uuid',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash,
        provider: 'local',
        role: UserRole.User,
        organizationId: 'org-1',
        isActive: true,
      } as User;

      const mockQb = userRepo.createQueryBuilder();
      (mockQb.getOne as jest.Mock).mockResolvedValue(mockUser);
      organizationRepo.findOne.mockResolvedValue({
        id: 'org-1',
        isActive: false,
        status: OrganizationStatus.Suspended,
      } as Organization);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'correctpassword',
        }),
      ).rejects.toMatchObject({
        response: {
          code: AuthErrorCode.ORGANIZATION_SUSPENDED,
        },
      });
    });

    it('should login successfully and return access token', async () => {
      const passwordHash = await bcrypt.hash('correctpassword', 12);
      const mockUser = {
        id: 'user-uuid',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash,
        provider: 'local',
        role: UserRole.User,
        organizationId: 'org-1',
        isActive: true,
      } as User;

      const mockQb = userRepo.createQueryBuilder();
      (mockQb.getOne as jest.Mock).mockResolvedValue(mockUser);
      organizationRepo.findOne.mockResolvedValue({
        id: 'org-1',
        isActive: true,
        status: OrganizationStatus.Active,
      } as Organization);
      jwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.login({
        email: 'test@example.com',
        password: 'correctpassword',
      });

      expect(result).toEqual({
        accessToken: 'mock-jwt-token',
        user: {
          id: 'user-uuid',
          email: 'test@example.com',
          name: 'Test User',
          provider: 'local',
          role: UserRole.User,
        },
      });
    });
  });

  describe('googleLogin', () => {
    it('should return auth result for existing user with matching googleId', async () => {
      const mockUser = {
        id: 'user-uuid',
        email: 'test@example.com',
        name: 'Test User',
        googleId: 'google-123',
        provider: 'google',
        role: UserRole.User,
        organizationId: 'org-1',
        isActive: true,
      } as User;

      userRepo.findOne.mockResolvedValueOnce(mockUser);
      organizationRepo.findOne.mockResolvedValue({
        id: 'org-1',
        isActive: true,
        status: OrganizationStatus.Active,
      } as Organization);

      const result = await service.googleLogin({
        googleId: 'google-123',
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { googleId: 'google-123' },
      });
      expect(result.user.id).toBe('user-uuid');
    });

    it('should link Google to existing local account without changing provider', async () => {
      const mockUser = {
        id: 'user-uuid',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'local',
        role: UserRole.User,
        organizationId: 'org-1',
        isActive: true,
      } as User;

      userRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUser);
      organizationRepo.findOne.mockResolvedValue({
        id: 'org-1',
        isActive: true,
        status: OrganizationStatus.Active,
      } as Organization);

      const result = await service.googleLogin({
        googleId: 'google-123',
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(mockUser.googleId).toBe('google-123');
      expect(mockUser.provider).toBe('local');
      expect(userRepo.save).toHaveBeenCalledWith(mockUser);
      expect(result.user.id).toBe('user-uuid');
    });

    it('should block new Google users when public signup is disabled', async () => {
      platformSettingsService.isPublicSignupAllowed.mockResolvedValue(false);
      userRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(
        service.googleLogin({
          googleId: 'google-999',
          email: 'new@example.com',
          name: 'New Google User',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create new user if googleId and email do not exist', async () => {
      userRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const mockUser = {
        id: 'new-uuid',
        email: 'new@example.com',
        name: 'New Google User',
        googleId: 'google-999',
        provider: 'google',
      } as User;

      userRepo.create.mockReturnValue(mockUser);

      const result = await service.googleLogin({
        googleId: 'google-999',
        email: 'new@example.com',
        name: 'New Google User',
      });

      expect(userRepo.create).toHaveBeenCalledWith({
        name: 'New Google User',
        email: 'new@example.com',
        googleId: 'google-999',
        provider: 'google',
        passwordHash: null,
        role: UserRole.User,
        organizationId: '00000000-0000-4000-8000-000000000001',
        isActive: true,
      });
      expect(userRepo.save).toHaveBeenCalledWith(mockUser);
      expect(result.user.id).toBe('new-uuid');
    });
  });

  describe('createOAuthRedirectCode', () => {
    it('should delegate to oauth code service', async () => {
      const code = await service.createOAuthRedirectCode('jwt-token');

      expect(oauthCodeService.createCode).toHaveBeenCalledWith('jwt-token');
      expect(code).toBe('oauth-code-123');
    });
  });

  describe('exchangeOAuthCode', () => {
    it('should throw when code is invalid or expired', async () => {
      oauthCodeService.exchangeCode.mockResolvedValue(null);

      await expect(service.exchangeOAuthCode('bad-code')).rejects.toMatchObject({
        response: {
          code: AuthErrorCode.OAUTH_CODE_INVALID,
        },
      });
    });

    it('should return auth result for valid code', async () => {
      oauthCodeService.exchangeCode.mockResolvedValue('stored-jwt');
      jwtService.verify.mockReturnValue({
        sub: 'user-uuid',
        email: 'test@example.com',
      });
      userRepo.findOne.mockResolvedValue({
        id: 'user-uuid',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'google',
        role: UserRole.User,
        organizationId: 'org-1',
        isActive: true,
      } as User);
      organizationRepo.findOne.mockResolvedValue({
        id: 'org-1',
        isActive: true,
        status: OrganizationStatus.Active,
      } as Organization);
      jwtService.sign.mockReturnValue('fresh-jwt-token');

      const result = await service.exchangeOAuthCode('valid-code');

      expect(result).toEqual({
        accessToken: 'fresh-jwt-token',
        user: {
          id: 'user-uuid',
          email: 'test@example.com',
          name: 'Test User',
          provider: 'google',
          role: UserRole.User,
        },
      });
    });
  });

  describe('validateById', () => {
    it('should throw NotFoundException if user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.validateById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return user if found', async () => {
      const mockUser = {
        id: 'user-uuid',
        email: 'test@example.com',
        role: UserRole.User,
        organizationId: 'org-1',
        isActive: true,
      } as User;
      userRepo.findOne.mockResolvedValue(mockUser);
      organizationRepo.findOne.mockResolvedValue({
        id: 'org-1',
        isActive: true,
        status: OrganizationStatus.Active,
      } as Organization);

      const result = await service.validateById('user-uuid');
      expect(result).toBe(mockUser);
    });

    it('should throw ORGANIZATION_SUSPENDED when org is suspended', async () => {
      const mockUser = {
        id: 'user-uuid',
        email: 'test@example.com',
        role: UserRole.User,
        organizationId: 'org-1',
        isActive: true,
      } as User;

      userRepo.findOne.mockResolvedValue(mockUser);
      organizationRepo.findOne.mockResolvedValue({
        id: 'org-1',
        isActive: false,
        status: OrganizationStatus.Suspended,
      } as Organization);

      await expect(service.validateById('user-uuid')).rejects.toMatchObject({
        response: {
          code: AuthErrorCode.ORGANIZATION_SUSPENDED,
        },
      });
    });

    it('should throw USER_SUSPENDED when user is suspended', async () => {
      const mockUser = {
        id: 'user-uuid',
        email: 'test@example.com',
        role: UserRole.User,
        organizationId: 'org-1',
        isActive: false,
      } as User;

      userRepo.findOne.mockResolvedValue(mockUser);

      await expect(service.validateById('user-uuid')).rejects.toMatchObject({
        response: {
          code: AuthErrorCode.USER_SUSPENDED,
        },
      });
      expect(organizationRepo.findOne).not.toHaveBeenCalled();
    });

    it('should throw ORGANIZATION_REQUIRED when non-superadmin has no organization', async () => {
      const mockUser = {
        id: 'user-uuid',
        email: 'test@example.com',
        role: UserRole.User,
        organizationId: null,
        isActive: true,
      } as User;

      userRepo.findOne.mockResolvedValue(mockUser);

      await expect(service.validateById('user-uuid')).rejects.toMatchObject({
        response: {
          code: AuthErrorCode.ORGANIZATION_REQUIRED,
        },
      });
      expect(organizationRepo.findOne).not.toHaveBeenCalled();
    });

    it('should allow SUPERADMIN without organization', async () => {
      const mockUser = {
        id: 'admin-uuid',
        email: 'admin@example.com',
        role: UserRole.SuperAdmin,
        organizationId: null,
        isActive: true,
      } as User;

      userRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.validateById('admin-uuid');
      expect(result).toBe(mockUser);
      expect(organizationRepo.findOne).not.toHaveBeenCalled();
    });
  });
});
