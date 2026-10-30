import { CertificateStatus } from '../../certificate/entities/certificate.entity';
import { KnowledgeCategory } from '../../knowledge/entities/knowledge-document.entity';
import { ReportCategory, ReportStatus } from '../../report/entities/report.entity';

// Deterministic demo-data planner (pure, unit-tested). The seed script
// consumes these rows; nothing here touches the database.

export const DEMO_WEEKS = 26;
export const DEMO_PASSWORD = 'DemoPass123!';

export const DEMO_USERS = [
  { name: 'Maria Santos', username: 'demo.member.1', disabled: false },
  { name: 'Jose Cruz', username: 'demo.member.2', disabled: false },
  { name: 'Ana Reyes', username: 'demo.member.3', disabled: false },
  { name: 'Mark Villanueva', username: 'demo.member.4', disabled: false },
  { name: 'Jenny Lim', username: 'demo.member.5', disabled: false },
  { name: 'Paolo Aquino', username: 'demo.member.6', disabled: false },
  { name: 'Rosa Diaz', username: 'demo.member.7', disabled: true },
  { name: 'Kevin Tan', username: 'demo.member.8', disabled: true },
];

export const DEMO_COURSES = [
  'Cybersecurity Fundamentals',
  'Disaster Risk Reduction 101',
  'Data Analytics Basics',
  'First Aid and Emergency Response',
  'Community Early Warning Systems',
  'Climate Resilience Planning',
];

export const DEMO_COMPANY_MEMBERS = [
  { name: 'Luzon Harvest Foods', members: ['demo.member.1', 'demo.member.2'] },
  { name: 'Visayas Marine Goods', members: ['demo.member.3', 'demo.member.4'] },
  { name: 'Mindanao Agri Producers', members: ['demo.member.5', 'demo.member.6'] },
  { name: 'Metro Builders Inc.', members: ['demo.member.7', 'demo.member.8'] },
  { name: 'Harbor Logistics Co.', members: ['demo.member.5'] },
  { name: 'Summit Textiles Ltd.', members: ['demo.member.6'] },
  { name: 'Pacific Components Inc.', members: ['demo.member.7'] },
  { name: 'Greenfield Energy Corp.', members: ['demo.member.8'] },
  { name: 'Clearwater Utilities Co.', members: ['demo.member.1'] },
  { name: 'Northgate Retail Group', members: ['demo.member.2'] },
  { name: 'Archipelago Health Supplies', members: ['demo.member.3'] },
  { name: 'Cordillera Crafts Collective', members: ['demo.member.4'] },
  { name: 'Bayanihan Foods Mfg.', members: ['demo.member.5'] },
  { name: 'Silangan Electronics Ltd.', members: ['demo.member.6'] },
  { name: 'Kanluran Freight Services', members: ['demo.member.7'] },
  { name: 'Timog Aqua Farms', members: ['demo.member.8'] },
  { name: 'Hilaga Grains Cooperative', members: ['demo.member.1'] },
  { name: 'Luntian Pharma Distributors', members: ['demo.member.2'] },
  { name: 'Alon Outdoor Gear Inc.', members: ['demo.member.3'] },
  { name: 'Sikat Learning Systems Inc.', members: ['demo.member.4'] },
];

const REPORT_CATEGORIES = [
  ReportCategory.QUARTERLY,
  ReportCategory.ANNUAL,
  ReportCategory.GOOD_PRACTICES,
  ReportCategory.SUCCESS_STORIES,
];

const KNOWLEDGE_TITLES: Array<{ category: KnowledgeCategory; title: string }> = [
  { category: KnowledgeCategory.ECE, title: 'Demo: Barangay Evacuation Center Guidelines' },
  { category: KnowledgeCategory.ECE, title: 'Demo: Early Childhood Care in Emergencies' },
  { category: KnowledgeCategory.MANUAL, title: 'Demo: Field Operations Manual' },
  { category: KnowledgeCategory.MANUAL, title: 'Demo: Volunteer Onboarding Handbook' },
  { category: KnowledgeCategory.MANUAL, title: 'Demo: Relief Distribution Playbook' },
  { category: KnowledgeCategory.POLICIES, title: 'Demo: Data Privacy Policy Template' },
  { category: KnowledgeCategory.POLICIES, title: 'Demo: Incident Reporting Policy' },
  { category: KnowledgeCategory.POLICIES, title: 'Demo: Child Protection Safeguarding' },
  { category: KnowledgeCategory.TERMS, title: 'Demo: Membership Terms Glossary' },
  { category: KnowledgeCategory.TERMS, title: 'Demo: Humanitarian Terms Reference' },
  { category: KnowledgeCategory.TERMS, title: 'Demo: Acronym Guide for Responders' },
  { category: KnowledgeCategory.ECE, title: 'Demo: School Safety Checklist' },
];

// Deterministic PRNG (mulberry32) so re-runs plan identical rows.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DemoReportRow {
  authorIndex: number;
  category: ReportCategory;
  status: ReportStatus;
  /** Whole days before `now` the row was created. */
  daysAgo: number;
}

// ~50 reports: 1-3 per week over DEMO_WEEKS, all categories covered.
export function planDemoReports(weeks = DEMO_WEEKS, seed = 42, now = Date.now()): DemoReportRow[] {
  const rand = mulberry32(seed);
  const rows: DemoReportRow[] = [];
  const today = new Date(now);
  const thisSunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());

  for (let w = 0; w < weeks; w++) {
    const r = rand();
    const perWeek = r < 0.25 ? 1 : r < 0.7 ? 2 : 3;
    for (let i = 0; i < perWeek; i++) {
      const colStart = new Date(thisSunday);
      colStart.setDate(thisSunday.getDate() - (weeks - 1 - w) * 7);
      const dayOffset = Math.floor(rand() * 7);
      const date = new Date(colStart);
      date.setDate(colStart.getDate() + dayOffset);
      if (date.getTime() > now) continue;
      const daysAgo = Math.max(0, Math.floor((now - date.getTime()) / 86_400_000));
      const s = rand();
      rows.push({
        authorIndex: Math.floor(rand() * DEMO_USERS.length),
        category: REPORT_CATEGORIES[Math.floor(rand() * REPORT_CATEGORIES.length)],
        status: s < 0.6 ? ReportStatus.APPROVED : s < 0.85 ? ReportStatus.SUBMITTED : ReportStatus.REJECTED,
        daysAgo,
      });
    }
  }
  return rows;
}

export interface DemoCertificateRow {
  authorIndex: number;
  courseIndex: number;
  status: CertificateStatus;
  daysAgo: number;
}

// 30 certificates spread over the past ~6 months.
export function planDemoCertificates(total = 30, seed = 13): DemoCertificateRow[] {
  const rand = mulberry32(seed);
  return Array.from({ length: total }, () => {
    const s = rand();
    return {
      authorIndex: Math.floor(rand() * DEMO_USERS.length),
      courseIndex: Math.floor(rand() * DEMO_COURSES.length),
      status:
        s < 0.6 ? CertificateStatus.VERIFIED : s < 0.9 ? CertificateStatus.PENDING : CertificateStatus.REJECTED,
      daysAgo: Math.floor(rand() * 180),
    };
  });
}

export interface DemoKnowledgeRow {
  category: KnowledgeCategory;
  title: string;
  daysAgo: number;
}

// One row per demo title, spread over the past ~6 months.
export function planDemoKnowledge(seed = 13): DemoKnowledgeRow[] {
  const rand = mulberry32(seed);
  return KNOWLEDGE_TITLES.map((t) => ({
    category: t.category,
    title: t.title,
    daysAgo: Math.floor(rand() * 180),
  }));
}

export function daysAgoToDate(daysAgo: number, now = Date.now()): Date {
  const d = new Date(now - daysAgo * 86_400_000);
  d.setHours(10, 0, 0, 0);
  return d;
}
