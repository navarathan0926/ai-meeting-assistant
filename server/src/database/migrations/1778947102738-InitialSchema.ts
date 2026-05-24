import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1778947102738 implements MigrationInterface {
    name = 'InitialSchema1778947102738'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Ensure the UUID extension is available
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // Create the Meeting Status Enum
        await queryRunner.query(`CREATE TYPE "meetings_status_enum" AS ENUM('pending', 'processing', 'completed', 'failed')`);

        // Create the meetings table
        await queryRunner.query(`
            CREATE TABLE "meetings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "originalFileName" character varying NOT NULL,
                "title" character varying,
                "storedFileName" character varying NOT NULL,
                "status" "meetings_status_enum" NOT NULL DEFAULT 'pending',
                "errorMessage" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_meetings" PRIMARY KEY ("id")
            )
        `);

        // Create the transcriptions table
        await queryRunner.query(`
            CREATE TABLE "transcriptions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "text" text NOT NULL,
                "durationSeconds" double precision,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "meetingId" uuid,
                CONSTRAINT "PK_transcriptions" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_transcriptions_meetingId" UNIQUE ("meetingId"),
                CONSTRAINT "FK_transcriptions_meetingId" FOREIGN KEY ("meetingId") 
                    REFERENCES "meetings" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);

        // Create the summaries table
        await queryRunner.query(`
            CREATE TABLE "summaries" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "overview" text NOT NULL,
                "keyPoints" text NOT NULL,
                "actionItems" text NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "meetingId" uuid,
                CONSTRAINT "PK_summaries" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_summaries_meetingId" UNIQUE ("meetingId"),
                CONSTRAINT "FK_summaries_meetingId" FOREIGN KEY ("meetingId") 
                    REFERENCES "meetings" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop tables in reverse order of creation
        await queryRunner.query(`DROP TABLE "summaries"`);
        await queryRunner.query(`DROP TABLE "transcriptions"`);
        await queryRunner.query(`DROP TABLE "meetings"`);
        await queryRunner.query(`DROP TYPE "meetings_status_enum"`);
    }
}
