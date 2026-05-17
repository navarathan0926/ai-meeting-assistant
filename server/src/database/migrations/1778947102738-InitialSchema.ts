import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1778947102738 implements MigrationInterface {
    name = 'InitialSchema1778947102738'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "meetings" ADD "title" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "meetings" DROP COLUMN "title"`);
    }

}
