import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { PLATFORM_SETTINGS_ID } from '../platform-settings.constants';

@Entity('platform_settings')
export class PlatformSettings {
  @PrimaryColumn('uuid')
  id: string = PLATFORM_SETTINGS_ID;

  @Column({ default: false })
  allowPublicSignup: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}
