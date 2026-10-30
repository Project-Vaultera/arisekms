import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMembershipProfile1793360029510 implements MigrationInterface {
    name = 'AddMembershipProfile1793360029510'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "membership_contacts" ("id" SERIAL NOT NULL, "isPrimary" boolean NOT NULL DEFAULT false, "title" character varying(60), "firstName" character varying(120), "middleName" character varying(120), "lastName" character varying(120), "position" character varying(200), "email" character varying(260), "phone" character varying(60), "contactType" character varying(120), "sameAsRegistered" boolean NOT NULL DEFAULT false, "country" character varying(120), "province" character varying(120), "city" character varying(120), "street" character varying(300), "zip" character varying(30), "companyId" integer, CONSTRAINT "PK_b42bd6f2859df028f4927e0fa78" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."membership_documents_kind_enum" AS ENUM('registration_proof', 'supporting')`);
        await queryRunner.query(`CREATE TABLE "membership_documents" ("id" SERIAL NOT NULL, "kind" "public"."membership_documents_kind_enum" NOT NULL, "originalName" character varying(260) NOT NULL, "storedName" character varying(260) NOT NULL, "mimeType" character varying(100) NOT NULL, "size" integer NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "companyId" integer, CONSTRAINT "PK_1e269b25f66c844a7c76629d655" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "legalRepName" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "legalRepTitle" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "applicantCountry" character varying(120)`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "registeredCountry" character varying(120)`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "noAttachmentExplanation" text`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "sector" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "isTradeAssociation" boolean`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "isBusinessAssociation" boolean`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "exchangeSymbol" character varying(200)`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "parentCompanyDetails" text`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "street" character varying(300)`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "city" character varying(120)`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "province" character varying(120)`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "zip" character varying(30)`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "country" character varying(120)`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "phone" character varying(60)`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "website" character varying(300)`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "fax" character varying(60)`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "staffCount" integer`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "annualRevenue" character varying(120)`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "unGlobalCompact" boolean`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "otherUnAgency" boolean`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "whichAgency" character varying(300)`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "otherOrgs" text`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "affiliationDetails" text`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "businessOverview" text`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "geographicFocus" text`);
        await queryRunner.query(`CREATE TYPE "public"."companies_status_enum" AS ENUM('draft', 'submitted', 'approved', 'rejected')`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "status" "public"."companies_status_enum" NOT NULL DEFAULT 'draft'`);
        await queryRunner.query(`ALTER TABLE "companies" ADD "rejectReason" text`);
        await queryRunner.query(`ALTER TABLE "membership_contacts" ADD CONSTRAINT "FK_be29f3aaa581822364b83380275" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "membership_documents" ADD CONSTRAINT "FK_cf8ae57798be47b821584248520" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "membership_documents" DROP CONSTRAINT "FK_cf8ae57798be47b821584248520"`);
        await queryRunner.query(`ALTER TABLE "membership_contacts" DROP CONSTRAINT "FK_be29f3aaa581822364b83380275"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "rejectReason"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."companies_status_enum"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "geographicFocus"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "businessOverview"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "affiliationDetails"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "otherOrgs"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "whichAgency"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "otherUnAgency"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "unGlobalCompact"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "annualRevenue"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "staffCount"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "fax"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "website"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "country"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "zip"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "province"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "city"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "street"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "parentCompanyDetails"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "exchangeSymbol"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "isBusinessAssociation"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "isTradeAssociation"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "sector"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "noAttachmentExplanation"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "registeredCountry"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "applicantCountry"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "legalRepTitle"`);
        await queryRunner.query(`ALTER TABLE "companies" DROP COLUMN "legalRepName"`);
        await queryRunner.query(`DROP TABLE "membership_documents"`);
        await queryRunner.query(`DROP TYPE "public"."membership_documents_kind_enum"`);
        await queryRunner.query(`DROP TABLE "membership_contacts"`);
    }

}
