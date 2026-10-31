import { TARGET_AUDIENCES } from '../../activity/dtos/activity-input.dto';
import { ActivityStatus, ActivityType } from '../../activity/entities/activity.entity';
import { CertificateStatus } from '../../certificate/entities/certificate.entity';
import { COMPANY_SECTORS } from '../../company/dtos/membership-input.dto';
import { KnowledgeCategory } from '../../knowledge/entities/knowledge-document.entity';
import { ReportCategory, ReportStatus } from '../../report/entities/report.entity';
import {
  daysAgoToDate,
  DEMO_COMPANY_MEMBERS,
  DEMO_COURSES,
  DEMO_USERS,
  DEMO_WEEKS,
  mulberry32,
  planDemoActivityDetails,
  planDemoCertificates,
  planDemoCompanyDetails,
  planDemoKnowledge,
  planDemoReports,
  planDemoUserDetails,
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

  it('plans company details covering every sector with valid regions and dates', () => {
    const details = planDemoCompanyDetails();
    expect(details).toHaveLength(DEMO_COMPANY_MEMBERS.length);
    expect(new Set(details.map((d) => d.sector))).toEqual(new Set([...COMPANY_SECTORS]));
    expect(details.every((d) => d.region.length > 0 && d.daysAgo >= 0)).toBe(true);
    expect(planDemoCompanyDetails()).toEqual(planDemoCompanyDetails());
  });

  it('plans activity details covering every type and status with valid authors', () => {
    const rows = planDemoActivityDetails();
    expect(rows).toHaveLength(42);
    expect(new Set(rows.map((r) => r.activityType))).toEqual(new Set(Object.values(ActivityType)));
    expect(new Set(rows.map((r) => r.status))).toEqual(
      new Set([ActivityStatus.APPROVED, ActivityStatus.SUBMITTED, ActivityStatus.REJECTED]),
    );
    expect(rows.every((r) => (TARGET_AUDIENCES as readonly string[]).includes(r.targetAudience))).toBe(true);
    expect(rows.every((r) => r.title.startsWith('Demo: ') && r.daysAgo >= 0)).toBe(true);
    // Authors are first roster members of the every-3rd (approved) companies.
    const approvedRoster = new Map();
    DEMO_COMPANY_MEMBERS.forEach((e, i) => {
      if (i % 3 === 0) approvedRoster.set(e.name, e.members[0]);
    });
    expect(rows.every((r) => approvedRoster.get(r.companyName) === r.authorUsername)).toBe(true);
    expect(planDemoActivityDetails()).toEqual(planDemoActivityDetails());
  });

  it('plans user details for every demo user with spread join dates', () => {
    const details = planDemoUserDetails();
    expect(details).toHaveLength(DEMO_USERS.length);
    expect(new Set(details.map((d) => d.username))).toEqual(new Set(DEMO_USERS.map((u) => u.username)));
    expect(details.every((d, i) => d.disabled === DEMO_USERS[i].disabled)).toBe(true);
    expect(details.every((d) => d.daysAgo >= 0)).toBe(true);
    expect(details.filter((d) => d.disabled).length).toBeGreaterThan(0);
    expect(planDemoUserDetails()).toEqual(planDemoUserDetails());
  });
});
