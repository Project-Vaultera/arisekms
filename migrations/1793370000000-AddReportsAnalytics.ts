import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReportsAnalytics1793370000000 implements MigrationInterface {
  name = 'AddReportsAnalytics1793370000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "gender" character varying(20)`);
    await queryRunner.query(`ALTER TABLE "companies" ADD "region" character varying(120)`);
    await queryRunner.query(
      `CREATE TYPE "public"."activities_activitytype_enum" AS ENUM('international-response', 'youth', 'technical-assistance', 'f2f-training', 'skillsbuild', 'collaboration', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."activities_status_enum" AS ENUM('submitted', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "activities" ("id" SERIAL NOT NULL, "title" character varying(200) NOT NULL, "activityType" "public"."activities_activitytype_enum" NOT NULL DEFAULT 'other', "targetAudience" character varying(120), "status" "public"."activities_status_enum" NOT NULL DEFAULT 'submitted', "happenedAt" date, "youthCount" integer, "trainedCount" integer, "isInternational" boolean NOT NULL DEFAULT false, "notes" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "companyId" integer, "createdById" integer, CONSTRAINT "PK_7f400442ab7745c7cb0a2e6b37" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD CONSTRAINT "FK_activities_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD CONSTRAINT "FK_activities_createdBy" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "activities" DROP CONSTRAINT "FK_activities_createdBy"`);
    await queryRunner.query(`ALTER TABLE "activities" DROP CONSTRAINT "FK_activities_company"`);
    await queryRunner.query(`DROP TABLE "activities"`);
    await queryRunner.query(`DROP TYPE "public"."activities_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."activities_activitytype_enum"`);
    await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "region"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "gender"`);
  }
}
