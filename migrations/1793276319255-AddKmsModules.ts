import { MigrationInterface, QueryRunner } from "typeorm";

export class AddKmsModules1793276319255 implements MigrationInterface {
    name = 'AddKmsModules1793276319255'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."support_tickets_status_enum" AS ENUM('Open', 'In progress', 'Resolved')`);
        await queryRunner.query(`CREATE TABLE "support_tickets" ("id" SERIAL NOT NULL, "subject" character varying(200) NOT NULL, "category" character varying(100) NOT NULL, "priority" character varying(20) NOT NULL, "description" text NOT NULL, "status" "public"."support_tickets_status_enum" NOT NULL DEFAULT 'Open', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "authorId" integer, CONSTRAINT "PK_942e8d8f5df86100471d2324643" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."reports_category_enum" AS ENUM('quarterly', 'annual', 'good-practices', 'success-stories')`);
        await queryRunner.query(`CREATE TYPE "public"."reports_status_enum" AS ENUM('submitted', 'approved', 'rejected')`);
        await queryRunner.query(`CREATE TABLE "reports" ("id" SERIAL NOT NULL, "category" "public"."reports_category_enum" NOT NULL, "originalName" character varying(260) NOT NULL, "storedName" character varying(260) NOT NULL, "mimeType" character varying(100) NOT NULL, "size" integer NOT NULL, "status" "public"."reports_status_enum" NOT NULL DEFAULT 'submitted', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "authorId" integer, CONSTRAINT "PK_d9013193989303580053c0b5ef6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."knowledge_documents_category_enum" AS ENUM('ECE', 'Manual', 'Policies', 'Terms')`);
        await queryRunner.query(`CREATE TABLE "knowledge_documents" ("id" SERIAL NOT NULL, "title" character varying(200) NOT NULL, "description" character varying(2000), "category" "public"."knowledge_documents_category_enum" NOT NULL, "kind" character varying(10) NOT NULL DEFAULT 'PDF', "originalName" character varying(260) NOT NULL, "storedName" character varying(260) NOT NULL, "mimeType" character varying(100) NOT NULL, "size" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "authorId" integer, CONSTRAINT "PK_402a3c43fb263aa5289670e4e21" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."certificates_status_enum" AS ENUM('pending', 'verified', 'rejected')`);
        await queryRunner.query(`CREATE TABLE "certificates" ("id" SERIAL NOT NULL, "memberName" character varying(200) NOT NULL, "course" character varying(200) NOT NULL, "issuer" character varying(200) NOT NULL DEFAULT 'IBM SkillsBuild', "dateIssued" date NOT NULL, "credentialId" character varying(100), "status" "public"."certificates_status_enum" NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "submittedById" integer, CONSTRAINT "PK_e4c7e31e2144300bea7d89eb165" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD CONSTRAINT "FK_8e497fee97c617387d296123c15" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reports" ADD CONSTRAINT "FK_80aefe60537fc97e08862f6a489" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "knowledge_documents" ADD CONSTRAINT "FK_b8bf17fbe345119143b539e5364" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "certificates" ADD CONSTRAINT "FK_e51b9598817d8872b54f4f4b126" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "certificates" DROP CONSTRAINT "FK_e51b9598817d8872b54f4f4b126"`);
        await queryRunner.query(`ALTER TABLE "knowledge_documents" DROP CONSTRAINT "FK_b8bf17fbe345119143b539e5364"`);
        await queryRunner.query(`ALTER TABLE "reports" DROP CONSTRAINT "FK_80aefe60537fc97e08862f6a489"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP CONSTRAINT "FK_8e497fee97c617387d296123c15"`);
        await queryRunner.query(`DROP TABLE "certificates"`);
        await queryRunner.query(`DROP TYPE "public"."certificates_status_enum"`);
        await queryRunner.query(`DROP TABLE "knowledge_documents"`);
        await queryRunner.query(`DROP TYPE "public"."knowledge_documents_category_enum"`);
        await queryRunner.query(`DROP TABLE "reports"`);
        await queryRunner.query(`DROP TYPE "public"."reports_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."reports_category_enum"`);
        await queryRunner.query(`DROP TABLE "support_tickets"`);
        await queryRunner.query(`DROP TYPE "public"."support_tickets_status_enum"`);
    }

}
