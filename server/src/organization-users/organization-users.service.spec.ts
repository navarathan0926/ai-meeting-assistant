import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationUsersService } from './organization-users.service';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../auth/enums/user-role.enum';
import { OrganizationsService } from '../organizations/organizations.service';

describe('OrganizationUsersService', () => {
  let service: OrganizationUsersService;
  let userRepo: jest.Mocked<Repository<User>>;

  const admin = {
    id: 'admin-1',
    role: UserRole.Admin,
    organizationId: 'org-1',
  } as User;

  const orgUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Org User',
    role: UserRole.User,
    provider: 'local',
    organizationId: 'org-1',
    isActive: true,
    createdAt: new Date('2026-01-01'),
  } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationUsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: OrganizationsService,
          useValue: {
            requireOrganizationId: jest.fn().mockReturnValue('org-1'),
          },
        },
      ],
    }).compile();

    service = module.get(OrganizationUsersService);
    userRepo = module.get(getRepositoryToken(User));
  });

  it('should list users for admin organization', async () => {
    userRepo.find.mockResolvedValue([orgUser]);

    const result = await service.listOrganizationUsers(admin);

    expect(userRepo.find).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
      order: { createdAt: 'ASC' },
    });
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe('user@example.com');
  });

  it('should create a USER in admin organization', async () => {
    userRepo.findOne.mockResolvedValue(null);
    userRepo.create.mockReturnValue(orgUser);
    userRepo.save.mockResolvedValue(orgUser);

    const result = await service.createOrganizationUser(admin, {
      email: 'user@example.com',
      name: 'Org User',
      password: 'password123',
    });

    expect(userRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        role: UserRole.User,
        organizationId: 'org-1',
        isActive: true,
      }),
    );
    expect(result.id).toBe('user-1');
  });

  it('should reject duplicate email on create', async () => {
    userRepo.findOne.mockResolvedValue(orgUser);

    await expect(
      service.createOrganizationUser(admin, {
        email: 'user@example.com',
        name: 'Org User',
        password: 'password123',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should reject managing self', async () => {
    await expect(
      service.suspendOrganizationUser(admin, 'admin-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject managing users from another org', async () => {
    userRepo.findOne.mockResolvedValue({
      ...orgUser,
      organizationId: 'org-2',
    } as User);

    await expect(
      service.suspendOrganizationUser(admin, 'user-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should reject managing ADMIN accounts', async () => {
    userRepo.findOne.mockResolvedValue({
      ...orgUser,
      role: UserRole.Admin,
    } as User);

    await expect(
      service.suspendOrganizationUser(admin, 'user-1'),
    ).rejects.toThrow(ForbiddenException);
  });
});
