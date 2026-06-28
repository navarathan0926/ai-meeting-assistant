import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<Repository<User>>;
  let jwtService: jest.Mocked<JwtService>;

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
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
  });

  describe('register', () => {
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

    it('should create and save a new user, and return JWT + user info', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const mockUser = {
        id: 'user-uuid',
        name: 'Test User',
        email: 'test@example.com',
        provider: 'local',
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

    it('should throw UnauthorizedException if password does not match', async () => {
      const passwordHash = await bcrypt.hash('correctpassword', 12);
      const mockUser = {
        id: 'user-uuid',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash,
      } as User;

      const mockQb = userRepo.createQueryBuilder();
      (mockQb.getOne as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should login successfully and return access token', async () => {
      const passwordHash = await bcrypt.hash('correctpassword', 12);
      const mockUser = {
        id: 'user-uuid',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash,
        provider: 'local',
      } as User;

      const mockQb = userRepo.createQueryBuilder();
      (mockQb.getOne as jest.Mock).mockResolvedValue(mockUser);
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
      } as User;

      userRepo.findOne.mockResolvedValueOnce(mockUser);

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

    it('should link Google to existing account if email matches but googleId is missing', async () => {
      const mockUser = {
        id: 'user-uuid',
        email: 'test@example.com',
        name: 'Test User',
        provider: 'local',
      } as User;

      userRepo.findOne
        .mockResolvedValueOnce(null) // googleId not found
        .mockResolvedValueOnce(mockUser); // email found

      const result = await service.googleLogin({
        googleId: 'google-123',
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(mockUser.googleId).toBe('google-123');
      expect(mockUser.provider).toBe('google');
      expect(userRepo.save).toHaveBeenCalledWith(mockUser);
      expect(result.user.id).toBe('user-uuid');
    });

    it('should create new user if googleId and email do not exist', async () => {
      userRepo.findOne
        .mockResolvedValueOnce(null) // googleId not found
        .mockResolvedValueOnce(null); // email not found

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
      });
      expect(userRepo.save).toHaveBeenCalledWith(mockUser);
      expect(result.user.id).toBe('new-uuid');
    });
  });

  describe('validateById', () => {
    it('should throw NotFoundException if user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.validateById('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should return user if found', async () => {
      const mockUser = { id: 'user-uuid', email: 'test@example.com' } as User;
      userRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.validateById('user-uuid');
      expect(result).toBe(mockUser);
    });
  });
});
