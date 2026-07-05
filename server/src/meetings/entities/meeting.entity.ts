import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MeetingStatus } from '../enums/meeting-status.enum';
import { Transcription } from '../../transcriptions/entities/transcription.entity';
import { Summary } from '../../summaries/entities/summary.entity';
import { User } from '../../auth/entities/user.entity';
import { ExtractedItem } from '../../extracted-items/entities/extracted-item.entity';

@Entity('meetings')
export class Meeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  originalFileName: string;

  @Column({ type: 'varchar', nullable: true })
  title: string | null;

  @Column()
  storedFileName: string;

  @Column({
    type: 'enum',
    enum: MeetingStatus,
    default: MeetingStatus.PENDING,
  })
  status: MeetingStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.meetings, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToOne(() => Transcription, (transcription) => transcription.meeting, {
    cascade: true,
    nullable: true,
  })
  transcription: Transcription;

  @OneToOne(() => Summary, (summary) => summary.meeting, {
    cascade: true,
    nullable: true,
  })
  summary: Summary;

  @OneToMany(() => ExtractedItem, (item) => item.meeting)
  extractedItems: ExtractedItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
