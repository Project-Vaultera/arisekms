import { MigrationInterface, QueryRunner } from 'typeorm';

// Additive only: a new table, nothing existing altered. Reversible.
export class AddAuthTokens1793600000000 implements MigrationInterface {
  name = 'AddAuthTokens1793600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "auth_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" integer NOT NULL,
        "kind" character varying(20) NOT NULL,
        "token_hash" character varying(64) NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "used_at" TIMESTAMP WITH TIME ZONE,
        "created_by" integer,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_auth_tokens_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_auth_tokens_token_hash" ON "auth_tokens" ("token_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_auth_tokens_user_id" ON "auth_tokens" ("user_id")`,
    );
    // CASCADE so deleting a user cannot strand tokens.
    await queryRunner.query(
      `ALTER TABLE "auth_tokens" ADD CONSTRAINT "FK_auth_tokens_user"
       FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_tokens" ADD CONSTRAINT "CHK_auth_tokens_kind"
       CHECK ("kind" IN ('password_reset', 'invite'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "auth_tokens"`);
  }
}