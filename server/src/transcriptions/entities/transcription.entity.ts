import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Meeting } from '../../meetings/entities/meeting.entity';

/**
 * Transcription Entity
 * Stores the raw text output from OpenAI Whisper for a given meeting.
 * One-to-one with Meeting (a meeting has exactly one transcription once done).
 */
@Entity('transcriptions')
export class Transcription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Full transcript text returned by Whisper */
  @Column({ type: 'text' })
  text: string;

  /** Audio duration in seconds (available in Whisper verbose_json response) */
  @Column({ type: 'float', nullable: true })
  durationSeconds: number;

  @OneToOne(() => Meeting, (meeting) => meeting.transcription)
  @JoinColumn()
  meeting: Meeting;

  @CreateDateColumn()
  createdAt: Date;
}
