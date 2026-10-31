import { MigrationInterface, QueryRunner } from 'typeorm';

// Adapts stored roles to the Arise model: ADMIN -> ARISE_IT_ADMIN,
// USER -> ARISE_MEMBER. Order matters (ARISE_IT_ADMIN contains 'ADMIN').
export class AriseRoles1793390000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE users SET roles = REPLACE(REPLACE(roles, 'ADMIN', 'ARISE_IT_ADMIN'), 'USER', 'ARISE_MEMBER')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE users SET roles = REPLACE(REPLACE(roles, 'ARISE_MEMBER', 'USER'), 'ARISE_IT_ADMIN', 'ADMIN')`,
    );
  }
}
