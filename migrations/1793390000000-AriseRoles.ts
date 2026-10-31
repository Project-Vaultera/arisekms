import { MigrationInterface, QueryRunner } from 'typeorm';

// Adapts stored roles to the Arise model with exact matches only.
// Substring REPLACE would corrupt ARISE_* on re-run and mangle words
// containing ADMIN/USER, so only touch exact legacy values.
export class AriseRoles1793390000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE users SET roles = CASE roles WHEN 'ADMIN' THEN 'ARISE_IT_ADMIN' WHEN 'USER' THEN 'ARISE_MEMBER' ELSE roles END WHERE roles IN ('ADMIN', 'USER')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE users SET roles = CASE roles WHEN 'ARISE_MEMBER' THEN 'USER' WHEN 'ARISE_IT_ADMIN' THEN 'ADMIN' ELSE roles END WHERE roles IN ('ARISE_MEMBER', 'ARISE_IT_ADMIN')`,
    );
  }
}
