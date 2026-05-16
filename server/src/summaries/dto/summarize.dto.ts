import { IsString, IsNotEmpty, MinLength } from 'class-validator';

/**
 * SummarizeDto
 * Payload sent from MeetingsService → SummariesService.
 * Carries the raw transcript text to summarise.
 */
export class SummarizeDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(50, { message: 'Transcript is too short to summarise meaningfully.' })
  transcript: string;
}
