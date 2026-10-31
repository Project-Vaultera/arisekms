import { MigrationInterface, QueryRunner } from 'typeorm';

const SECTORS = [
  'Agriculture & Food',
  'Manufacturing',
  'Technology & IT Services',
  'Healthcare & Pharmaceuticals',
  'Financial Services & Insurance',
  'Education & Training',
  'Energy & Utilities',
  'Construction & Infrastructure',
  'Real Estate & Property',
  'Logistics & Transportation',
  'Retail & E-commerce',
  'Hospitality & Tourism',
  'Media & Telecommunications',
  'Professional Services',
  'Mining & Extractives',
  'Other',
];

/**
 * Reconciles free-text `companies.sector` values with the canonical taxonomy
 * (see COMPANY_SECTORS). Case-insensitive matches snap to canonical casing;
 * anything else maps to 'Other' so the new IsIn validation never locks a
 * legacy row out of draft saves. NULLs stay NULL.
 */
export class NormalizeCompanySectors1793380000000 implements MigrationInterface {
  name = 'NormalizeCompanySectors1793380000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const sector of SECTORS) {
      if (sector === 'Other') continue;
      await queryRunner.query(
        `UPDATE "companies" SET "sector" = $1 WHERE "sector" IS NOT NULL AND lower(trim("sector")) = lower($1) AND "sector" <> $1`,
        [sector],
      );
    }
    await queryRunner.query(
      `UPDATE "companies" SET "sector" = 'Other' WHERE "sector" IS NOT NULL AND trim("sector") <> '' AND "sector" NOT IN (${SECTORS.map((_, i) => `$${i + 1}`).join(', ')})`,
      SECTORS,
    );
    await queryRunner.query(
      `UPDATE "companies" SET "sector" = NULL WHERE trim("sector") = ''`,
    );
  }

  public async down(): Promise<void> {
    // Lossy by design (legacy free text cannot be restored) — no-op.
  }
}
