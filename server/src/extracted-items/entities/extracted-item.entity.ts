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
import { Organization } from '../../organizations/entities/organization.entity';
import { ExtractedItemType } from '../enums/extracted-item-type.enum';
import { ExtractedItemPriority } from '../enums/extracted-item-priority.enum';
import { ExtractedItemStatus } from '../enums/extracted-item-status.enum';
import { JiraAdfDocument } from '../../common/jira-document/jira-document.types';

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

  @Column()
  organizationId: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;

  @Column({ type: 'enum', enum: ExtractedItemType })
  type: ExtractedItemType;

  @Column()
  title: string;

  @Column({ type: 'jsonb' })
  description: JiraAdfDocument;

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

  @Column({ type: 'text', nullable: true })
  jiraSyncError: string | null;

  @Column({ type: 'varchar', nullable: true })
  suggestedProjectKey: string | null;

  @Column({ type: 'float', nullable: true })
  projectConfidence: number | null;

  @Column({ type: 'float', nullable: true })
  extractionConfidence: number | null;

  @Column({ type: 'varchar', nullable: true })
  finalProjectKey: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

