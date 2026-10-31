// Single source for the company-sector dropdown (mirrors COMPANY_SECTORS
// in src/company/dtos/membership-input.dto.ts, which mirrors the admission
// applicant taxonomy — 28 values kept verbatim). Keep all three in sync.
export const COMPANY_SECTORS = [
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

// Exact match against the canonical list; returns false for legacy values
// so callers can fall back to a legacy bucket instead of silently accepting
// a typo as a new sector.
export function isKnownSector(value) {
  return COMPANY_SECTORS.includes(value);
}

// Normalizes a stored sector for grouping: trims whitespace; returns '' for
// empty so callers can bucket it as Unspecified.
export function normalizeSector(value) {
  return String(value ?? '').trim();
}
