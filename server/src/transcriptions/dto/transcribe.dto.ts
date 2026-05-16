import { IsString, IsNotEmpty } from 'class-validator';

/**
 * TranscribeDto
 * Payload sent from MeetingsService → TranscriptionsService.
 * Carries the server-side path of the stored audio file.
 */
export class TranscribeDto {
  @IsString()
  @IsNotEmpty()
  filePath: string;

  @IsString()
  @IsNotEmpty()
  originalFileName: string;
}
