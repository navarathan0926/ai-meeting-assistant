import {
  BadRequestException,
  ConflictException,
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
    console.log('existing', existing);

    if (existing) {
      console.log('existing', existing);
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
    });
    await this.userRepository.save(user);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
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
