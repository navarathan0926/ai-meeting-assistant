import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
} from 'typeorm';
import { PLATFORM_SETTINGS_ID } from '../../platform-settings/platform-settings.constants';

export class PlatformSettingsAndUserIsActive1790000000000
  implements MigrationInterface
{
  name = 'PlatformSettingsAndUserIsActive1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'platform_settings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'allowPublicSignup',
            type: 'boolean',
            default: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.manager.insert('platform_settings', {
      id: PLATFORM_SETTINGS_ID,
      allowPublicSignup: false,
    });

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'isActive',
        type: 'boolean',
        default: true,
      }),
    );

    await queryRunner.query(
      `UPDATE "users" SET "isActive" = true WHERE "isActive" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'isActive');
    await queryRunner.dropTable('platform_settings');
  }
}
