import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateExtractedItemsTable1784000000000
  implements MigrationInterface
{
  name = 'CreateExtractedItemsTable1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'extracted_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'meetingId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['bug', 'task', 'story', 'feature'],
            enumName: 'extracted_items_type_enum',
          },
          {
            name: 'title',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'priority',
            type: 'enum',
            enum: ['low', 'medium', 'high'],
            enumName: 'extracted_items_priority_enum',
          },
          {
            name: 'contextSnippet',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['draft', 'approved', 'rejected', 'sent'],
            enumName: 'extracted_items_status_enum',
            default: `'draft'`,
          },
          {
            name: 'jiraIssueKey',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
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

    await queryRunner.createForeignKey(
      'extracted_items',
      new TableForeignKey({
        columnNames: ['meetingId'],
        referencedTableName: 'meetings',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'extracted_items',
      new TableIndex({
        name: 'IDX_extracted_items_meetingId',
        columnNames: ['meetingId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('extracted_items');
    const foreignKey = table?.foreignKeys.find((fk) =>
      fk.columnNames.includes('meetingId'),
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('extracted_items', foreignKey);
    }

    await queryRunner.dropIndex(
      'extracted_items',
      'IDX_extracted_items_meetingId',
    );
    await queryRunner.dropTable('extracted_items');

    await queryRunner.query(
      `DROP TYPE IF EXISTS "extracted_items_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "extracted_items_priority_enum"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "extracted_items_type_enum"`);
  }
}
