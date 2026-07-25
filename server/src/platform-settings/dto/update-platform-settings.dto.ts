import { IsBoolean } from 'class-validator';

export class UpdatePlatformSettingsDto {
  @IsBoolean()
  allowPublicSignup: boolean;
}
