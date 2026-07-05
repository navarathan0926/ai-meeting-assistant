import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddJiraSyncErrorToExtractedItems1786000000000
  implements MigrationInterface
{
  name = 'AddJiraSyncErrorToExtractedItems1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "extracted_items"
      ADD COLUMN IF NOT EXISTS "jiraSyncError" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "extracted_items"
      DROP COLUMN IF EXISTS "jiraSyncError"
    `);
  }
}
