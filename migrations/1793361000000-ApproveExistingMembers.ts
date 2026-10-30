import { MigrationInterface, QueryRunner } from 'typeorm';

// One-time backfill: companies that already had members before the approval
// gate landed are treated as approved, so existing members keep write access.
// Fresh applications start as 'draft' via the entity default.
export class ApproveExistingMembers1793361000000 implements MigrationInterface {
  name = 'ApproveExistingMembers1793361000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "companies" SET "status" = 'approved' WHERE "id" IN (SELECT DISTINCT "company_id" FROM "user_companies")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "companies" SET "status" = 'draft' WHERE "id" IN (SELECT DISTINCT "company_id" FROM "user_companies")`,
    );
  }
}
