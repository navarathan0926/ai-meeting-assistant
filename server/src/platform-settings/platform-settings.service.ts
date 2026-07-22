import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformSettings } from './entities/platform-settings.entity';
import { PLATFORM_SETTINGS_ID } from './platform-settings.constants';
import { UpdatePlatformSettingsDto } from './dto/update-platform-settings.dto';
import { PlatformSettingsResponse } from './interfaces/platform-settings-response.interface';

@Injectable()
export class PlatformSettingsService {
  constructor(
    @InjectRepository(PlatformSettings)
    private readonly platformSettingsRepository: Repository<PlatformSettings>,
  ) {}

  async getSettings(): Promise<PlatformSettingsResponse> {
    const settings = await this.getOrCreateSingleton();
    return this.toResponse(settings);
  }

  async isPublicSignupAllowed(): Promise<boolean> {
    const settings = await this.getOrCreateSingleton();
    return settings.allowPublicSignup;
  }

  async updateSettings(
    dto: UpdatePlatformSettingsDto,
  ): Promise<PlatformSettingsResponse> {
    const settings = await this.getOrCreateSingleton();
    settings.allowPublicSignup = dto.allowPublicSignup;
    const saved = await this.platformSettingsRepository.save(settings);
    return this.toResponse(saved);
  }

  private async getOrCreateSingleton(): Promise<PlatformSettings> {
    let settings = await this.platformSettingsRepository.findOne({
      where: { id: PLATFORM_SETTINGS_ID },
    });

    if (!settings) {
      settings = this.platformSettingsRepository.create({
        id: PLATFORM_SETTINGS_ID,
        allowPublicSignup: false,
      });
      settings = await this.platformSettingsRepository.save(settings);
    }

    return settings;
  }

  private toResponse(settings: PlatformSettings): PlatformSettingsResponse {
    return {
      allowPublicSignup: settings.allowPublicSignup,
      updatedAt: settings.updatedAt,
    };
  }
}
