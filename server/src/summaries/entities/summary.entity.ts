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
 * Summary Entity
 * Stores the structured GPT-generated summary for a given meeting.
 * One-to-one with Meeting (a meeting has exactly one summary once done).
 */
@Entity('summaries')
export class Summary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** High-level paragraph summarising the meeting */
  @Column({ type: 'text' })
  overview: string;

  /** Bulleted list of major discussion topics */
  @Column({ type: 'simple-array' })
  keyPoints: string[];

  /** Bulleted list of follow-up actions extracted from the transcript */
  @Column({ type: 'simple-array' })
  actionItems: string[];

  @OneToOne(() => Meeting, (meeting) => meeting.summary)
  @JoinColumn()
  meeting: Meeting;

  @CreateDateColumn()
  createdAt: Date;
}
