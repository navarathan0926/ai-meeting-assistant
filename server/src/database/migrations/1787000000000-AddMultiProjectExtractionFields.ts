import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMultiProjectExtractionFields1787000000000
  implements MigrationInterface
{
  name = 'AddMultiProjectExtractionFields1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_contexts" (
        "projectKey" character varying NOT NULL,
        "aiContext" text NOT NULL DEFAULT '',
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_contexts_projectKey" PRIMARY KEY ("projectKey")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "meetings"
      ADD COLUMN IF NOT EXISTS "extractionAnalysis" jsonb
    `);

    await queryRunner.query(`
      ALTER TABLE "extracted_items"
      ADD COLUMN IF NOT EXISTS "suggestedProjectKey" character varying,
      ADD COLUMN IF NOT EXISTS "projectConfidence" double precision,
      ADD COLUMN IF NOT EXISTS "extractionConfidence" double precision,
      ADD COLUMN IF NOT EXISTS "finalProjectKey" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "extracted_items"
      DROP COLUMN IF EXISTS "finalProjectKey",
      DROP COLUMN IF EXISTS "extractionConfidence",
      DROP COLUMN IF EXISTS "projectConfidence",
      DROP COLUMN IF EXISTS "suggestedProjectKey"
    `);

    await queryRunner.query(`
      ALTER TABLE "meetings"
      DROP COLUMN IF EXISTS "extractionAnalysis"
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "project_contexts"`);
  }
}
