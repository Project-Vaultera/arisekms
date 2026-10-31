import { MigrationInterface, QueryRunner } from 'typeorm';

const SECTORS = [
  'Administrative, Support, Waste Management & Remediation Service',
  'Agriculture',
  'Arts, Entertainment & Recreation',
  'Construction',
  'Consumer Goods',
  'Educational Services',
  'Energy',
  'Engineering',
  'Finance',
  'Healthcare',
  'Hospitality',
  'Information & Communication',
  'Insurance and Reinsurance',
  'Management of Companies & Enterprises',
  'Manufacturing',
  'Media',
  'Mining',
  'Other Services (except public administration)',
  'Professional, Scientific & Technical Services (incl. consulting)',
  'Real Estate, Rental and Leasing',
  'Retail Trade',
  'Social Assistance',
  'Transportation',
  'Tourism',
  'Wholesale Trade',
  'Utilities',
  'Health',
  'Technology',
];

// Maps the short-lived 16-value taxonomy (NormalizeCompanySectors1793380000000)
// onto the admission applicant taxonomy (28 values, kept verbatim).
const RENAMES: Array<[string, string]> = [
  ['Agriculture & Food', 'Agriculture'],
  ['Technology & IT Services', 'Technology'],
  ['Healthcare & Pharmaceuticals', 'Healthcare'],
  ['Financial Services & Insurance', 'Finance'],
  ['Education & Training', 'Educational Services'],
  ['Energy & Utilities', 'Energy'],
  ['Construction & Infrastructure', 'Construction'],
  ['Real Estate & Property', 'Real Estate, Rental and Leasing'],
  ['Logistics & Transportation', 'Transportation'],
  ['Retail & E-commerce', 'Retail Trade'],
  ['Hospitality & Tourism', 'Hospitality'],
  ['Media & Telecommunications', 'Media'],
  ['Professional Services', 'Professional, Scientific & Technical Services (incl. consulting)'],
  ['Mining & Extractives', 'Mining'],
  ['Other', 'Other Services (except public administration)'],
];

/**
 * Adopts the admission applicant sector taxonomy. Exact renames first, then
 * case-insensitive snap to canonical casing; anything left over maps to
 * 'Other Services (except public administration)'. NULLs stay NULL.
 */
export class AdoptAdmissionSectors1793381000000 implements MigrationInterface {
  name = 'AdoptAdmissionSectors1793381000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [from, to] of RENAMES) {
      await queryRunner.query(`UPDATE "companies" SET "sector" = $1 WHERE "sector" = $2`, [to, from]);
    }
    for (const sector of SECTORS) {
      await queryRunner.query(
        `UPDATE "companies" SET "sector" = $1 WHERE "sector" IS NOT NULL AND lower(trim("sector")) = lower($1) AND "sector" <> $1`,
        [sector],
      );
    }
    await queryRunner.query(
      `UPDATE "companies" SET "sector" = 'Other Services (except public administration)' WHERE "sector" IS NOT NULL AND trim("sector") <> '' AND "sector" NOT IN (${SECTORS.map((_, i) => `$${i + 1}`).join(', ')})`,
      SECTORS,
    );
    await queryRunner.query(`UPDATE "companies" SET "sector" = NULL WHERE trim("sector") = ''`);
  }

  public async down(): Promise<void> {
    // Lossy by design (previous taxonomy cannot be restored) — no-op.
  }
}
