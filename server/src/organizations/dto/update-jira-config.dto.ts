import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateJiraConfigDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  jiraCloudId: string;

  @IsEmail()
  @MaxLength(255)
  jiraEmail: string;

  /** Omit or empty on PUT to keep the existing encrypted token. */
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  })
  @IsString()
  @MinLength(1)
  jiraApiToken?: string;
}
