import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Auth } from '../common/decorators/auth.decorator';
import { RequireRoles } from '../common/decorators/require-roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { PlatformSettingsService } from './platform-settings.service';
import { UpdatePlatformSettingsDto } from './dto/update-platform-settings.dto';
import { PlatformSettingsResponse } from './interfaces/platform-settings-response.interface';

@Auth()
@Controller('platform-settings')
export class PlatformSettingsController {
  constructor(
    private readonly platformSettingsService: PlatformSettingsService,
  ) {}

  @RequireRoles(UserRole.SuperAdmin)
  @Get()
  getSettings(): Promise<PlatformSettingsResponse> {
    return this.platformSettingsService.getSettings();
  }

  @RequireRoles(UserRole.SuperAdmin)
  @Patch()
  updateSettings(
    @Body() dto: UpdatePlatformSettingsDto,
  ): Promise<PlatformSettingsResponse> {
    return this.platformSettingsService.updateSettings(dto);
  }
}
