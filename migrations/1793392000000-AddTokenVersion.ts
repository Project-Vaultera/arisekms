import { MigrationInterface, QueryRunner } from 'typeorm';

// Revocable sessions: tokenVersion is checked on every request.
// Bumped on password/role/disable changes so old tokens stop working.
export class AddTokenVersion1793392000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tokenVersion" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "tokenVersion"`);
  }
}
