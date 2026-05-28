import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MeetingStatus } from '../enums/meeting-status.enum';
import { Transcription } from '../../transcriptions/entities/transcription.entity';
import { Summary } from '../../summaries/entities/summary.entity';

/**
 * Meeting Entity
 * Central record that ties together the uploaded file, transcription,
 * and summary. The status column tracks where in the pipeline the
 * meeting currently sits.
 */
@Entity('meetings')
export class Meeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Original filename as provided by the user's browser */
  @Column()
  originalFileName: string;

  /**
   * Human-friendly meeting title.
   * Defaults to the audio filename (without extension) set at upload time.
   * Can be updated by the user later.
   */
  @Column({ type: 'varchar', nullable: true })
  title: string | null;

  /** UUID-based filename used to store the file on disk (avoids collisions) */
  @Column()
  storedFileName: string;

  @Column({
    type: 'enum',
    enum: MeetingStatus,
    default: MeetingStatus.PENDING,
  })
  status: MeetingStatus;

  /** Populated only when status === FAILED */
  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  /**
   * eager: true means TypeORM automatically joins the transcription
   * whenever a meeting is fetched — no need for explicit .leftJoinAndSelect().
   */
  @OneToOne(() => Transcription, (transcription) => transcription.meeting, {
    cascade: true,
    eager: true,
    nullable: true,
  })
  transcription: Transcription;

  @OneToOne(() => Summary, (summary) => summary.meeting, {
    cascade: true,
    eager: true,
    nullable: true,
  })
  summary: Summary;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
