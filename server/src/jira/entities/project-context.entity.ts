import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from '../../organizations/entities/organization.entity';

@Entity('project_contexts')
export class ProjectContext {
  @PrimaryColumn('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization?: Organization;

  @PrimaryColumn({ type: 'varchar' })
  projectKey: string;

  @Column({ type: 'text', default: '' })
  aiContext: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
