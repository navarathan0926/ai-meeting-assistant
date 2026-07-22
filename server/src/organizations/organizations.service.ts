import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { Organization } from './entities/organization.entity';
import { OrganizationStatus } from './enums/organization-status.enum';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { CreateOrganizationAdminDto } from './dto/create-organization-admin.dto';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../auth/enums/user-role.enum';
import { Meeting } from '../meetings/entities/meeting.entity';
import { ExtractedItem } from '../extracted-items/entities/extracted-item.entity';
import { OrganizationAdminSummary } from './interfaces/organization-admin-summary.interface';

export interface OrganizationSummary {
  id: string;
  name: string;
  isActive: boolean;
  status: OrganizationStatus;
  createdAt: Date;
  meetingCount: number;
  extractedItemCount: number;
}

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    @InjectRepository(ExtractedItem)
    private readonly extractedItemRepository: Repository<ExtractedItem>,
  ) {}

  async listAll(): Promise<OrganizationSummary[]> {
    const organizations = await this.organizationRepository.find({
      order: { createdAt: 'ASC' },
    });

    return Promise.all(
      organizations.map(async (org) => this.toSummary(org)),
    );
  }

  async findById(id: string): Promise<OrganizationSummary> {
    const org = await this.organizationRepository.findOne({ where: { id } });
    if (!org) {
      throw new NotFoundException(`Organization with id "${id}" not found.`);
    }
    return this.toSummary(org);
  }

  async create(dto: CreateOrganizationDto): Promise<OrganizationSummary> {
    const org = this.organizationRepository.create({
      id: randomUUID(),
      name: dto.name.trim(),
      isActive: true,
      status: OrganizationStatus.Active,
    });
    await this.organizationRepository.save(org);
    return this.toSummary(org);
  }

  async suspend(id: string): Promise<OrganizationSummary> {
    const org = await this.findOrganizationEntity(id);
    org.isActive = false;
    org.status = OrganizationStatus.Suspended;
    await this.organizationRepository.save(org);
    return this.toSummary(org);
  }

  async reactivate(id: string): Promise<OrganizationSummary> {
    const org = await this.findOrganizationEntity(id);
    org.isActive = true;
    org.status = OrganizationStatus.Active;
    await this.organizationRepository.save(org);
    return this.toSummary(org);
  }

  async createAdminUser(
    organizationId: string,
    dto: CreateOrganizationAdminDto,
  ): Promise<{ id: string; email: string; name: string; role: UserRole }> {
    await this.findOrganizationEntity(organizationId);

    const email = dto.email.toLowerCase();
    const existing = await this.userRepository.findOne({ where: { email } });

    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    if (dto.role !== UserRole.Admin) {
      throw new BadRequestException('Only ADMIN users can be provisioned for an organization.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepository.create({
      email,
      name: dto.name.trim(),
      passwordHash,
      provider: 'local',
      role: UserRole.Admin,
      organizationId,
      isActive: true,
    });
    await this.userRepository.save(user);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  async listOrganizationAdmins(
    organizationId: string,
  ): Promise<OrganizationAdminSummary[]> {
    await this.findOrganizationEntity(organizationId);

    const admins = await this.userRepository.find({
      where: { organizationId, role: UserRole.Admin },
      order: { createdAt: 'ASC' },
    });

    return admins.map((admin) => this.toAdminSummary(admin));
  }

  async suspendOrganizationAdmin(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationAdminSummary> {
    const admin = await this.getOrganizationAdmin(organizationId, userId);

    if (admin.isActive) {
      const activeAdminCount = await this.countActiveAdmins(organizationId);
      if (activeAdminCount <= 1) {
        throw new BadRequestException(
          'Cannot suspend the last active admin for this organization.',
        );
      }
    }

    admin.isActive = false;
    const saved = await this.userRepository.save(admin);
    return this.toAdminSummary(saved);
  }

  async reactivateOrganizationAdmin(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationAdminSummary> {
    const admin = await this.getOrganizationAdmin(organizationId, userId);
    admin.isActive = true;
    const saved = await this.userRepository.save(admin);
    return this.toAdminSummary(saved);
  }

  async deleteOrganizationAdmin(
    organizationId: string,
    userId: string,
  ): Promise<void> {
    await this.getOrganizationAdmin(organizationId, userId);

    const adminCount = await this.userRepository.count({
      where: { organizationId, role: UserRole.Admin },
    });
    if (adminCount <= 1) {
      throw new BadRequestException(
        'Cannot delete the last admin for this organization.',
      );
    }

    await this.userRepository.delete(userId);
  }

  requireOrganizationId(user: User): string {
    if (!user.organizationId) {
      throw new BadRequestException(
        'Your account is not assigned to an organization.',
      );
    }
    return user.organizationId;
  }

  private async findOrganizationEntity(id: string): Promise<Organization> {
    const org = await this.organizationRepository.findOne({ where: { id } });
    if (!org) {
      throw new NotFoundException(`Organization with id "${id}" not found.`);
    }
    return org;
  }

  private async getOrganizationAdmin(
    organizationId: string,
    userId: string,
  ): Promise<User> {
    await this.findOrganizationEntity(organizationId);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with id "${userId}" not found.`);
    }

    if (user.organizationId !== organizationId) {
      throw new ForbiddenException(
        'This admin does not belong to the organization.',
      );
    }

    if (user.role !== UserRole.Admin) {
      throw new BadRequestException(
        'Only ADMIN accounts can be managed from this endpoint.',
      );
    }

    return user;
  }

  private async countActiveAdmins(organizationId: string): Promise<number> {
    return this.userRepository.count({
      where: {
        organizationId,
        role: UserRole.Admin,
        isActive: true,
      },
    });
  }

  private toAdminSummary(user: User): OrganizationAdminSummary {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: UserRole.Admin,
      provider: user.provider,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  private async toSummary(org: Organization): Promise<OrganizationSummary> {
    const meetingCount = await this.meetingRepository.count({
      where: { organizationId: org.id },
    });
    const extractedItemCount = await this.extractedItemRepository.count({
      where: { organizationId: org.id },
    });

    return {
      id: org.id,
      name: org.name,
      isActive: org.isActive,
      status: org.status,
      createdAt: org.createdAt,
      meetingCount,
      extractedItemCount,
    };
  }
}
