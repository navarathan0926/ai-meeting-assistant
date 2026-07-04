import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Meeting } from '../../meetings/entities/meeting.entity';
import { ExtractedItemType } from '../enums/extracted-item-type.enum';
import { ExtractedItemPriority } from '../enums/extracted-item-priority.enum';
import { ExtractedItemStatus } from '../enums/extracted-item-status.enum';

@Entity('extracted_items')
export class ExtractedItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  meetingId: string;

  @ManyToOne(() => Meeting, (meeting) => meeting.extractedItems, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'meetingId' })
  meeting: Meeting;

  @Column({ type: 'enum', enum: ExtractedItemType })
  type: ExtractedItemType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: ExtractedItemPriority })
  priority: ExtractedItemPriority;

  @Column({ type: 'text', nullable: true })
  contextSnippet: string | null;

  @Column({
    type: 'enum',
    enum: ExtractedItemStatus,
    default: ExtractedItemStatus.Draft,
  })
  status: ExtractedItemStatus;

  @Column({ type: 'varchar', nullable: true })
  jiraIssueKey: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
