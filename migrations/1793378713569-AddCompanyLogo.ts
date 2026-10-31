import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompanyLogo1793378713569 implements MigrationInterface {
    name = 'AddCompanyLogo1793378713569'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "activities" DROP CONSTRAINT "FK_activities_company"`);
        await queryRunner.query(`ALTER TABLE "activities" DROP CONSTRAINT "FK_activities_createdBy"`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "logoOriginalName" character varying(260)`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "logoStoredName" character varying(260)`);
        await queryRunner.query(`ALTER TABLE "activities" ADD CONSTRAINT "FK_f6deb4e21ba78416f476cd661e1" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "activities" ADD CONSTRAINT "FK_579056df0c92b0f6432e96b2048" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "activities" DROP CONSTRAINT "FK_579056df0c92b0f6432e96b2048"`);
        await queryRunner.query(`ALTER TABLE "activities" DROP CONSTRAINT "FK_f6deb4e21ba78416f476cd661e1"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "logoStoredName"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "logoOriginalName"`);
        await queryRunner.query(`ALTER TABLE "activities" ADD CONSTRAINT "FK_activities_createdBy" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "activities" ADD CONSTRAINT "FK_activities_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
