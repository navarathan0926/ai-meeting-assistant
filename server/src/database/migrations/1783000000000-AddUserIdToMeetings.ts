import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserIdToMeetings1783000000000 implements MigrationInterface {
  name = 'AddUserIdToMeetings1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "meetings"
      ADD COLUMN "userId" uuid NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_meetings_userId" ON "meetings" ("userId")
    `);
    await queryRunner.query(`
      ALTER TABLE "meetings"
      ADD CONSTRAINT "FK_meetings_userId"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "meetings" DROP CONSTRAINT "FK_meetings_userId"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_meetings_userId"`);
    await queryRunner.query(`ALTER TABLE "meetings" DROP COLUMN "userId"`);
  }
}
