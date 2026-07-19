import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';
import { DEFAULT_ORGANIZATION_ID } from '../../organizations/organizations.constants';

export class AddUserRoleAndOrganizationScaffolding1788000000000
  implements MigrationInterface
{
  name = 'AddUserRoleAndOrganizationScaffolding1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'organizations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.manager.insert('organizations', {
      id: DEFAULT_ORGANIZATION_ID,
      name: 'Default Organization',
    });

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'organizationId',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.manager
      .createQueryBuilder()
      .update('users')
      .set({ organizationId: DEFAULT_ORGANIZATION_ID })
      .execute();

    await queryRunner.changeColumn(
      'users',
      'organizationId',
      new TableColumn({
        name: 'organizationId',
        type: 'uuid',
        isNullable: false,
      }),
    );

    await queryRunner.createForeignKey(
      'users',
      new TableForeignKey({
        name: 'FK_users_organizationId',
        columnNames: ['organizationId'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'role',
        type: 'enum',
        enum: ['USER', 'ADMIN'],
        enumName: 'user_role',
        isNullable: false,
        default: `'USER'`,
      }),
    );

    await queryRunner.addColumn(
      'meetings',
      new TableColumn({
        name: 'organizationId',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.manager
      .createQueryBuilder()
      .update('meetings')
      .set({
        organizationId: () =>
          `(SELECT u."organizationId" FROM "users" u WHERE u."id" = "meetings"."userId")`,
      })
      .execute();

    await queryRunner.changeColumn(
      'meetings',
      'organizationId',
      new TableColumn({
        name: 'organizationId',
        type: 'uuid',
        isNullable: false,
      }),
    );

    await queryRunner.createForeignKey(
      'meetings',
      new TableForeignKey({
        name: 'FK_meetings_organizationId',
        columnNames: ['organizationId'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createIndex(
      'meetings',
      new TableIndex({
        name: 'IDX_meetings_organizationId',
        columnNames: ['organizationId'],
      }),
    );

    await queryRunner.addColumn(
      'extracted_items',
      new TableColumn({
        name: 'organizationId',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.manager
      .createQueryBuilder()
      .update('extracted_items')
      .set({
        organizationId: () =>
          `(SELECT m."organizationId" FROM "meetings" m WHERE m."id" = "extracted_items"."meetingId")`,
      })
      .execute();

    await queryRunner.changeColumn(
      'extracted_items',
      'organizationId',
      new TableColumn({
        name: 'organizationId',
        type: 'uuid',
        isNullable: false,
      }),
    );

    await queryRunner.createForeignKey(
      'extracted_items',
      new TableForeignKey({
        name: 'FK_extracted_items_organizationId',
        columnNames: ['organizationId'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const extractedItemsTable = await queryRunner.getTable('extracted_items');
    const extractedItemsOrgFk = extractedItemsTable?.foreignKeys.find((fk) =>
      fk.columnNames.includes('organizationId'),
    );
    if (extractedItemsOrgFk) {
      await queryRunner.dropForeignKey('extracted_items', extractedItemsOrgFk);
    }
    await queryRunner.dropColumn('extracted_items', 'organizationId');

    await queryRunner.dropIndex('meetings', 'IDX_meetings_organizationId');

    const meetingsTable = await queryRunner.getTable('meetings');
    const meetingsOrgFk = meetingsTable?.foreignKeys.find((fk) =>
      fk.columnNames.includes('organizationId'),
    );
    if (meetingsOrgFk) {
      await queryRunner.dropForeignKey('meetings', meetingsOrgFk);
    }
    await queryRunner.dropColumn('meetings', 'organizationId');

    const usersTable = await queryRunner.getTable('users');
    const usersOrgFk = usersTable?.foreignKeys.find((fk) =>
      fk.columnNames.includes('organizationId'),
    );
    if (usersOrgFk) {
      await queryRunner.dropForeignKey('users', usersOrgFk);
    }

    await queryRunner.dropColumn('users', 'role');
    await queryRunner.query(`DROP TYPE IF EXISTS "user_role"`);
    await queryRunner.dropColumn('users', 'organizationId');

    await queryRunner.dropTable('organizations');
  }
}
