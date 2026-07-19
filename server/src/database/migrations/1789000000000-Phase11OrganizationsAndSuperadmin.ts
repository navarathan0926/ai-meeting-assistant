import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';
import { encrypt } from '../../common/utils/crypto.util';
import { EnvKey } from '../../common/config/env.keys';
import { DEFAULT_ORGANIZATION_ID } from '../../organizations/organizations.constants';

export class Phase11OrganizationsAndSuperadmin1789000000000
  implements MigrationInterface
{
  name = 'Phase11OrganizationsAndSuperadmin1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'SUPERADMIN'`,
    );

    await queryRunner.changeColumn(
      'users',
      'organizationId',
      new TableColumn({
        name: 'organizationId',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "organization_status" AS ENUM ('active', 'suspended');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "jira_auth_type" AS ENUM ('api_token');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.addColumns('organizations', [
      new TableColumn({
        name: 'jiraAuthType',
        type: 'enum',
        enum: ['api_token'],
        enumName: 'jira_auth_type',
        default: `'api_token'`,
      }),
      new TableColumn({
        name: 'jiraEmail',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'jiraApiToken',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'jiraCloudId',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'jiraAccountId',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'isActive',
        type: 'boolean',
        default: true,
      }),
      new TableColumn({
        name: 'status',
        type: 'enum',
        enum: ['active', 'suspended'],
        enumName: 'organization_status',
        default: `'active'`,
      }),
    ]);

    await this.migrateEnvJiraToDefaultOrganization(queryRunner);

    await queryRunner.addColumn(
      'project_contexts',
      new TableColumn({
        name: 'organizationId',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.manager
      .createQueryBuilder()
      .update('project_contexts')
      .set({ organizationId: DEFAULT_ORGANIZATION_ID })
      .execute();

    await queryRunner.changeColumn(
      'project_contexts',
      'organizationId',
      new TableColumn({
        name: 'organizationId',
        type: 'uuid',
        isNullable: false,
      }),
    );

    await queryRunner.dropPrimaryKey('project_contexts');

    await queryRunner.createPrimaryKey('project_contexts', [
      'organizationId',
      'projectKey',
    ]);

    await queryRunner.createForeignKey(
      'project_contexts',
      new TableForeignKey({
        name: 'FK_project_contexts_organizationId',
        columnNames: ['organizationId'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'project_contexts',
      new TableIndex({
        name: 'IDX_project_contexts_organizationId',
        columnNames: ['organizationId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'project_contexts',
      'IDX_project_contexts_organizationId',
    );

    const projectContextsTable = await queryRunner.getTable('project_contexts');
    const projectContextsOrgFk = projectContextsTable?.foreignKeys.find((fk) =>
      fk.columnNames.includes('organizationId'),
    );
    if (projectContextsOrgFk) {
      await queryRunner.dropForeignKey(
        'project_contexts',
        projectContextsOrgFk,
      );
    }

    await queryRunner.dropPrimaryKey('project_contexts');
    await queryRunner.createPrimaryKey('project_contexts', ['projectKey']);
    await queryRunner.dropColumn('project_contexts', 'organizationId');

    await queryRunner.dropColumn('organizations', 'status');
    await queryRunner.dropColumn('organizations', 'isActive');
    await queryRunner.dropColumn('organizations', 'jiraCloudId');
    await queryRunner.dropColumn('organizations', 'jiraAccountId');
    await queryRunner.dropColumn('organizations', 'jiraApiToken');
    await queryRunner.dropColumn('organizations', 'jiraEmail');
    await queryRunner.dropColumn('organizations', 'jiraAuthType');

    await queryRunner.query(`DROP TYPE IF EXISTS "organization_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "jira_auth_type"`);

    await queryRunner.changeColumn(
      'users',
      'organizationId',
      new TableColumn({
        name: 'organizationId',
        type: 'uuid',
        isNullable: false,
      }),
    );
  }

  private async migrateEnvJiraToDefaultOrganization(
    queryRunner: QueryRunner,
  ): Promise<void> {
    const email = process.env[EnvKey.JiraEmail]?.trim();
    const apiKey = process.env[EnvKey.JiraApiKey]?.trim();
    const cloudId = process.env[EnvKey.CloudId]?.trim();
    const accountId = process.env[EnvKey.JiraAccountId]?.trim();
    const encryptionKey = process.env[EnvKey.EncryptionKey]?.trim();

    if (!email && !apiKey && !cloudId && !accountId) {
      return;
    }

    const update: Record<string, string | boolean> = {};
    if (email) {
      update.jiraEmail = email;
    }
    if (cloudId) {
      update.jiraCloudId = cloudId;
    }
    if (accountId) {
      update.jiraAccountId = accountId;
    }
    if (apiKey && encryptionKey) {
      update.jiraApiToken = encrypt(apiKey, encryptionKey);
    }

    if (Object.keys(update).length === 0) {
      return;
    }

    await queryRunner.manager
      .createQueryBuilder()
      .update('organizations')
      .set(update)
      .where('id = :id', { id: DEFAULT_ORGANIZATION_ID })
      .execute();
  }
}
