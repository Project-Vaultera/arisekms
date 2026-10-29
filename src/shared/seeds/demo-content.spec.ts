import { CertificateStatus } from '../../certificate/entities/certificate.entity';
import { KnowledgeCategory } from '../../knowledge/entities/knowledge-document.entity';
import { ReportCategory, ReportStatus } from '../../report/entities/report.entity';
import {
  daysAgoToDate,
  DEMO_COURSES,
  DEMO_USERS,
  DEMO_WEEKS,
  mulberry32,
  planDemoCertificates,
  planDemoKnowledge,
  planDemoReports,
} from './demo-content';

describe('demo-content planner', () => {
  it('is deterministic for the same seed', () => {
    expect(planDemoReports()).toEqual(planDemoReports());
    expect(planDemoCertificates()).toEqual(planDemoCertificates());
  });

  it('plans a realistic volume of reports across all weeks', () => {
    const rows = planDemoReports();
    expect(rows.length).toBeGreaterThan(30);
    expect(rows.length).toBeLessThanOrEqual(DEMO_WEEKS * 3);
    expect(rows.every((r) => r.daysAgo >= 0 && r.daysAgo <= DEMO_WEEKS * 7)).toBe(true);
  });

  it('covers every report category and status', () => {
    const rows = planDemoReports();
    const categories = new Set(rows.map((r) => r.category));
    const statuses = new Set(rows.map((r) => r.status));
    expect(categories).toEqual(
      new Set([
        ReportCategory.QUARTERLY,
        ReportCategory.ANNUAL,
        ReportCategory.GOOD_PRACTICES,
        ReportCategory.SUCCESS_STORIES,
      ]),
    );
    expect(statuses).toEqual(new Set([ReportStatus.APPROVED, ReportStatus.SUBMITTED, ReportStatus.REJECTED]));
  });

  it('keeps row references inside the demo catalogs', () => {
    const rows = planDemoReports();
    expect(rows.every((r) => r.authorIndex >= 0 && r.authorIndex < DEMO_USERS.length)).toBe(true);
    const certs = planDemoCertificates();
    expect(certs).toHaveLength(30);
    expect(certs.every((c) => c.courseIndex >= 0 && c.courseIndex < DEMO_COURSES.length)).toBe(true);
    expect(new Set(certs.map((c) => c.status))).toEqual(
      new Set([CertificateStatus.VERIFIED, CertificateStatus.PENDING, CertificateStatus.REJECTED]),
    );
  });

  it('plans one knowledge row per demo title with valid categories', () => {
    const rows = planDemoKnowledge();
    expect(rows).toHaveLength(12);
    const categories = new Set(rows.map((r) => r.category));
    expect(categories).toEqual(
      new Set([
        KnowledgeCategory.ECE,
        KnowledgeCategory.MANUAL,
        KnowledgeCategory.POLICIES,
        KnowledgeCategory.TERMS,
      ]),
    );
    expect(rows.every((r) => r.title.startsWith('Demo: '))).toBe(true);
  });

  it('derives dates in the past for a fixed now', () => {
    const now = new Date(2026, 9, 30, 12).getTime();
    expect(daysAgoToDate(0, now).getTime()).toBeLessThanOrEqual(now);
    expect(mulberry32(1)()).toBeGreaterThanOrEqual(0);
  });
});
