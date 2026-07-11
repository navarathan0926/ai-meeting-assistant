import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('project_contexts')
export class ProjectContext {
  @PrimaryColumn({ type: 'varchar' })
  projectKey: string;

  @Column({ type: 'text', default: '' })
  aiContext: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
