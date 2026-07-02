import { IsString, IsUUID } from 'class-validator';

export class ExchangeOAuthCodeDto {
  @IsString()
  @IsUUID()
  code: string;
}
