import { MigrationInterface, QueryRunner } from 'typeorm';

// Single-tenant audit trail for the IT admin (Governance -> Audit Logs).
// No organization column: arisekms has no org/workspace entity.
export class CreateAuditLogs1793391000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "audit_logs" (
        "id" SERIAL NOT NULL,
        "actorId" integer REFERENCES "users"("id") ON DELETE SET NULL,
        "action" character varying(80) NOT NULL,
        "entityType" character varying(80) NOT NULL,
        "entityId" character varying(64),
        "statusCode" integer,
        "outcome" character varying(20),
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_actorId" ON "audit_logs" ("actorId")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_entityType" ON "audit_logs" ("entityType")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_createdAt" ON "audit_logs" ("createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_outcome" ON "audit_logs" ("outcome")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}
