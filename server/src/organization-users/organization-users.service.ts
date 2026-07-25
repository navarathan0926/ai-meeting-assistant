import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../auth/enums/user-role.enum';
import { OrganizationsService } from '../organizations/organizations.service';
import { CreateOrganizationUserDto } from './dto/create-organization-user.dto';
import { OrganizationUserSummary } from './interfaces/organization-user-summary.interface';

@Injectable()
export class OrganizationUsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async listOrganizationUsers(admin: User): Promise<OrganizationUserSummary[]> {
    const organizationId =
      this.organizationsService.requireOrganizationId(admin);

    const users = await this.userRepository.find({
      where: { organizationId },
      order: { createdAt: 'ASC' },
    });

    return users.map((user) => this.toSummary(user));
  }

  async createOrganizationUser(
    admin: User,
    dto: CreateOrganizationUserDto,
  ): Promise<OrganizationUserSummary> {
    const organizationId =
      this.organizationsService.requireOrganizationId(admin);

    const email = dto.email.toLowerCase();
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepository.create({
      email,
      name: dto.name.trim(),
      passwordHash,
      provider: 'local',
      role: UserRole.User,
      organizationId,
      isActive: true,
    });
    const saved = await this.userRepository.save(user);
    return this.toSummary(saved);
  }

  async suspendOrganizationUser(
    admin: User,
    userId: string,
  ): Promise<OrganizationUserSummary> {
    const user = await this.getManageableUser(admin, userId);
    user.isActive = false;
    const saved = await this.userRepository.save(user);
    return this.toSummary(saved);
  }

  async reactivateOrganizationUser(
    admin: User,
    userId: string,
  ): Promise<OrganizationUserSummary> {
    const user = await this.getManageableUser(admin, userId);
    user.isActive = true;
    const saved = await this.userRepository.save(user);
    return this.toSummary(saved);
  }

  async deleteOrganizationUser(admin: User, userId: string): Promise<void> {
    const user = await this.getManageableUser(admin, userId);
    await this.userRepository.delete(user.id);
  }

  private async getManageableUser(
    admin: User,
    userId: string,
  ): Promise<User> {
    const organizationId =
      this.organizationsService.requireOrganizationId(admin);

    if (admin.id === userId) {
      throw new BadRequestException('You cannot manage your own account here.');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with id "${userId}" not found.`);
    }

    if (user.organizationId !== organizationId) {
      throw new ForbiddenException(
        'You do not have access to this organization user.',
      );
    }

    if (user.role !== UserRole.User) {
      throw new ForbiddenException(
        'Only USER accounts can be managed from this endpoint.',
      );
    }

    return user;
  }

  private toSummary(user: User): OrganizationUserSummary {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      provider: user.provider,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
