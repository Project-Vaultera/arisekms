import { MigrationInterface, QueryRunner } from "typeorm";

export class KnowledgeCategoryText1793351797723 implements MigrationInterface {
    name = 'KnowledgeCategoryText1793351797723'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "knowledge_documents" ALTER COLUMN "category" TYPE character varying(50) USING "category"::text`);
        await queryRunner.query(`DROP TYPE "public"."knowledge_documents_category_enum"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."knowledge_documents_category_enum" AS ENUM('ECE', 'Manual', 'Policies', 'Terms')`);
        await queryRunner.query(`ALTER TABLE "knowledge_documents" ALTER COLUMN "category" TYPE "public"."knowledge_documents_category_enum" USING "category"::"public"."knowledge_documents_category_enum"`);
    }

}
