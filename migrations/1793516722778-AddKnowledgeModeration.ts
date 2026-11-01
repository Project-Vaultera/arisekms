import { MigrationInterface, QueryRunner } from "typeorm";

export class AddKnowledgeModeration1793516722778 implements MigrationInterface {
    name = 'AddKnowledgeModeration1793516722778'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."knowledge_documents_status_enum" AS ENUM('submitted', 'approved', 'rejected')`);
        await queryRunner.query(`ALTER TABLE "knowledge_documents" ADD "status" "public"."knowledge_documents_status_enum" NOT NULL DEFAULT 'submitted'`);
        await queryRunner.query(`ALTER TABLE "knowledge_documents" ADD "rejectReason" character varying(500)`);
        // Existing documents were published live before moderation: backfill approved.
        await queryRunner.query(`UPDATE "knowledge_documents" SET "status" = 'approved'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "knowledge_documents" DROP COLUMN "rejectReason"`);
        await queryRunner.query(`ALTER TABLE "knowledge_documents" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."knowledge_documents_status_enum"`);
    }

}
