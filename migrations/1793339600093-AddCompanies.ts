import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCompanies1793339600093 implements MigrationInterface {
    name = 'AddCompanies1793339600093'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "companies" ("id" SERIAL NOT NULL, "name" character varying(200) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "company_name" UNIQUE ("name"), CONSTRAINT "PK_d4bc3e82a314fa9e29f652c2c22" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_companies" ("company_id" integer NOT NULL, "user_id" integer NOT NULL, CONSTRAINT "PK_ca73b87c901966a9fb8960916df" PRIMARY KEY ("company_id", "user_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9e735e90e4fd3bbb4268ed96d9" ON "user_companies" ("company_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_50c7d6aeb4ab214ad9fff29ab6" ON "user_companies" ("user_id") `);
        await queryRunner.query(`ALTER TABLE "user_companies" ADD CONSTRAINT "FK_9e735e90e4fd3bbb4268ed96d94" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "user_companies" ADD CONSTRAINT "FK_50c7d6aeb4ab214ad9fff29ab68" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_companies" DROP CONSTRAINT "FK_50c7d6aeb4ab214ad9fff29ab68"`);
        await queryRunner.query(`ALTER TABLE "user_companies" DROP CONSTRAINT "FK_9e735e90e4fd3bbb4268ed96d94"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_50c7d6aeb4ab214ad9fff29ab6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9e735e90e4fd3bbb4268ed96d9"`);
        await queryRunner.query(`DROP TABLE "user_companies"`);
        await queryRunner.query(`DROP TABLE "companies"`);
    }

}
