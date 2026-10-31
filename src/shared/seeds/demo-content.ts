import { CertificateStatus } from '../../certificate/entities/certificate.entity';
import { ActivityStatus, ActivityType } from '../../activity/entities/activity.entity';
import { TARGET_AUDIENCES } from '../../activity/dtos/activity-input.dto';
import { COMPANY_SECTORS } from '../../company/dtos/membership-input.dto';
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
  { name: 'Liza Ramos', username: 'demo.member.9', disabled: false },
  { name: 'Marco Aquino', username: 'demo.member.10', disabled: false },
  { name: 'Sofia Navarro', username: 'demo.member.11', disabled: false },
  { name: 'Diego Salazar', username: 'demo.member.12', disabled: false },
  { name: 'Carmen Flores', username: 'demo.member.13', disabled: true },
  { name: 'Rafael Mendoza', username: 'demo.member.14', disabled: false },
  { name: 'Isabel Torres', username: 'demo.member.15', disabled: false },
  { name: 'Andres Castillo', username: 'demo.member.16', disabled: false },
  { name: 'Lucia Fernandez', username: 'demo.member.17', disabled: false },
  { name: 'Pedro Gutierrez', username: 'demo.member.18', disabled: false },
  { name: 'Marta Jimenez', username: 'demo.member.19', disabled: false },
  { name: 'Jorge Aguilar', username: 'demo.member.20', disabled: true },
  { name: 'Elena Vargas', username: 'demo.member.21', disabled: false },
  { name: 'Carlos Rivera', username: 'demo.member.22', disabled: false },
  { name: 'Teresa Domingo', username: 'demo.member.23', disabled: false },
  { name: 'Miguel Santos', username: 'demo.member.24', disabled: false },
  { name: 'Rosa Mercado', username: 'demo.member.25', disabled: false },
  { name: 'Daniel Cruz', username: 'demo.member.26', disabled: false },
  { name: 'Patricia Lim', username: 'demo.member.27', disabled: true },
  { name: 'Victor Reyes', username: 'demo.member.28', disabled: false },
  { name: 'Gloria Bautista', username: 'demo.member.29', disabled: false },
  { name: 'Felipe Santiago', username: 'demo.member.30', disabled: false },
  { name: 'Corazon Marquez', username: 'demo.member.31', disabled: false },
  { name: 'Eduardo Villanueva', username: 'demo.member.32', disabled: false },
  { name: 'Alicia Tan', username: 'demo.member.33', disabled: false },
  { name: 'Roberto Diaz', username: 'demo.member.34', disabled: true },
  { name: 'Marina Santos', username: 'demo.member.35', disabled: false },
  { name: 'Ernesto Gomez', username: 'demo.member.36', disabled: false },
  { name: 'Dolores Perez', username: 'demo.member.37', disabled: false },
  { name: 'Ignacio Castro', username: 'demo.member.38', disabled: false },
  { name: 'Beatriz Morales', username: 'demo.member.39', disabled: false },
  { name: 'Emilio Rojas', username: 'demo.member.40', disabled: false },
  { name: 'Adela Silva', username: 'demo.member.41', disabled: true },
  { name: 'Tomas Herrera', username: 'demo.member.42', disabled: false },
  { name: 'Cecilia Ortega', username: 'demo.member.43', disabled: false },
  { name: 'Ricardo Medina', username: 'demo.member.44', disabled: false },
  { name: 'Nadia Velasco', username: 'demo.member.45', disabled: false },
  { name: 'Sergio Ponce', username: 'demo.member.46', disabled: false },
  { name: 'Amalia Fuentes', username: 'demo.member.47', disabled: false },
  { name: 'Leandro Vega', username: 'demo.member.48', disabled: true },
  { name: 'Estela Campos', username: 'demo.member.49', disabled: false },
  { name: 'Hugo Salinas', username: 'demo.member.50', disabled: false },
  { name: 'Nora Espinosa', username: 'demo.member.51', disabled: false },
  { name: 'Pablo Miranda', username: 'demo.member.52', disabled: false },
  { name: 'Alba Serrano', username: 'demo.member.53', disabled: false },
  { name: 'Ivan Cortez', username: 'demo.member.54', disabled: false },
  { name: 'Olga Delgado', username: 'demo.member.55', disabled: true },
  { name: 'Raul Guerrero', username: 'demo.member.56', disabled: false },
  { name: 'Silvia Rios', username: 'demo.member.57', disabled: false },
  { name: 'Nestor Cano', username: 'demo.member.58', disabled: false },
  { name: 'Elisa Vidal', username: 'demo.member.59', disabled: false },
  { name: 'Omar Rosales', username: 'demo.member.60', disabled: false },
  { name: 'Vera Luna', username: 'demo.member.61', disabled: false },
  { name: 'Felix Duran', username: 'demo.member.62', disabled: true },
  { name: 'Ines Barros', username: 'demo.member.63', disabled: false },
  { name: 'Dario Mendez', username: 'demo.member.64', disabled: false },
  { name: 'Lina Soriano', username: 'demo.member.65', disabled: false },
  { name: 'Cesar Ibanez', username: 'demo.member.66', disabled: false },
  { name: 'Aurora Quintana', username: 'demo.member.67', disabled: false },
  { name: 'Dante Prieto', username: 'demo.member.68', disabled: false },
  { name: 'Mara Solis', username: 'demo.member.69', disabled: true },
  { name: 'Enzo Ferrer', username: 'demo.member.70', disabled: false },
  { name: 'Nina Galvez', username: 'demo.member.71', disabled: false },
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
  { name: 'Aurora Admin Support Services', members: ['demo.member.9', 'demo.member.59'] },
  { name: 'Palawan Agri Ventures', members: ['demo.member.10', 'demo.member.60'] },
  { name: 'Intramuros Arts Collective', members: ['demo.member.11', 'demo.member.61'] },
  { name: 'Davao Builders Consortium', members: ['demo.member.12', 'demo.member.62'] },
  { name: 'Laguna Consumer Goods Trading', members: ['demo.member.13', 'demo.member.63'] },
  { name: 'Batangas Learning Academy', members: ['demo.member.14', 'demo.member.64'] },
  { name: 'Ilocos Wind Energy Corp.', members: ['demo.member.15', 'demo.member.65'] },
  { name: 'Quezon Engineering Works', members: ['demo.member.16', 'demo.member.66'] },
  { name: 'Makati Finance Partners', members: ['demo.member.17', 'demo.member.67'] },
  { name: 'St. Luke Care Network', members: ['demo.member.18', 'demo.member.68'] },
  { name: 'Boracay Hospitality Group', members: ['demo.member.19', 'demo.member.69'] },
  { name: 'Kapitolyo Media Creatives', members: ['demo.member.20', 'demo.member.70'] },
  { name: 'Ortigas Insurance Brokers', members: ['demo.member.21', 'demo.member.71'] },
  { name: 'Salcedo Enterprises Management', members: ['demo.member.22'] },
  { name: 'Cavite Manufacturing Plant', members: ['demo.member.23'] },
  { name: 'Rizal Print & Media House', members: ['demo.member.24'] },
  { name: 'Benguet Mining Ventures', members: ['demo.member.25'] },
  { name: 'Tondo Community Services', members: ['demo.member.26'] },
  { name: 'Alabang Consulting Group', members: ['demo.member.27'] },
  { name: 'Taguig Property Leasing Corp.', members: ['demo.member.28'] },
  { name: 'Divisoria Retail Chain', members: ['demo.member.29'] },
  { name: 'Caloocan Social Welfare Org', members: ['demo.member.30'] },
  { name: 'Pasig Freight Movers', members: ['demo.member.31'] },
  { name: 'El Nido Travel & Tours', members: ['demo.member.32'] },
  { name: 'Quiapo Wholesale Mart', members: ['demo.member.33'] },
  { name: 'Angat Power & Utilities', members: ['demo.member.34'] },
  { name: 'Malolos Wellness Clinics', members: ['demo.member.35'] },
  { name: 'Iloilo Tech Innovators', members: ['demo.member.36'] },
  { name: 'Zamboanga Waste Recovery', members: ['demo.member.37'] },
  { name: 'Tagaytay Organic Farms', members: ['demo.member.38'] },
  { name: 'Vigan Heritage Crafts', members: ['demo.member.39'] },
  { name: 'Subic Port Constructors', members: ['demo.member.40'] },
  { name: 'Marikina Shoe Goods', members: ['demo.member.41'] },
  { name: 'Los Baños Science Tutors', members: ['demo.member.42'] },
  { name: 'Bataan Solar Energy Park', members: ['demo.member.43'] },
  { name: 'Cebu Bridge Engineers', members: ['demo.member.44'] },
  { name: 'Mandaluyong Capital Lending', members: ['demo.member.45'] },
  { name: 'Davao Medical Suppliers', members: ['demo.member.46'] },
  { name: 'Tagaytay Lake Resorts', members: ['demo.member.47'] },
  { name: 'Makati Broadcast Network', members: ['demo.member.48'] },
  { name: 'Pasay Surety & Assurance', members: ['demo.member.49'] },
  { name: 'Bulacan Steel Manufacturing', members: ['demo.member.50'] },
  { name: 'Escolta Indie Films', members: ['demo.member.51'] },
  { name: 'Surigao Nickel Mining', members: ['demo.member.52'] },
  { name: 'Payatas Livelihood Services', members: ['demo.member.53'] },
  { name: 'Burgos Research Consultancy', members: ['demo.member.54'] },
  { name: 'BGC Skyline Realty', members: ['demo.member.55'] },
  { name: 'Baclaran Bargain Retail', members: ['demo.member.56'] },
  { name: 'Marikina Shelter Services', members: ['demo.member.57'] },
  { name: 'Dumaguete Dive Resorts', members: ['demo.member.58'] },
];

const REPORT_CATEGORIES = [
  ReportCategory.QUARTERLY,
  ReportCategory.ANNUAL,
  ReportCategory.GOOD_PRACTICES,
  ReportCategory.SUCCESS_STORIES,
];

export const DEMO_REGIONS = [
  'National Capital Region',
  'Central Luzon',
  'CALABARZON',
  'Western Visayas',
  'Central Visayas',
  'Davao Region',
  'Northern Mindanao',
  'Cordillera Administrative Region',
];

export interface DemoCompanyDetail {
  name: string;
  sector: string;
  region: string;
  /** Whole days before `now` the company row was created. */
  daysAgo: number;
}

// One detail row per DEMO_COMPANY_MEMBERS entry: sectors rotate through the
// full admission taxonomy (every sector gets ≥1 company), regions rotate
// through 8 groups, join dates spread over the past year so the membership
// growth chart and date filters have shape. Deterministic per seed.
export function planDemoCompanyDetails(seed = 7): DemoCompanyDetail[] {
  const rand = mulberry32(seed);
  return DEMO_COMPANY_MEMBERS.map((entry, i) => ({
    name: entry.name,
    sector: COMPANY_SECTORS[i % COMPANY_SECTORS.length],
    region: DEMO_REGIONS[i % DEMO_REGIONS.length],
    daysAgo: 5 + Math.floor(rand() * 355),
  }));
}

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

export interface DemoUserDetail {
  username: string;
  disabled: boolean;
  /** Whole days before `now` the user row was created. */
  daysAgo: number;
}

// One detail row per DEMO_USERS entry: disabled flags come straight from the
// roster (existing 8 untouched, ~1 in 7 inactive thereafter), join dates
// spread over the past year so the member Joined column has shape.
export function planDemoUserDetails(seed = 21): DemoUserDetail[] {
  const rand = mulberry32(seed);
  return DEMO_USERS.map((u) => ({
    username: u.username,
    disabled: u.disabled,
    daysAgo: 5 + Math.floor(rand() * 355),
  }));
}

const DEMO_ACTIVITY_TITLES: Record<ActivityType, string> = {
  [ActivityType.INTERNATIONAL_RESPONSE]: 'Cross-border relief coordination',
  [ActivityType.YOUTH]: 'Youth resilience workshop',
  [ActivityType.TECHNICAL_ASSISTANCE]: 'Technical assistance mission',
  [ActivityType.F2F_TRAINING]: 'Face-to-face responder training',
  [ActivityType.SKILLSBUILD]: 'SkillsBuild learning session',
  [ActivityType.COLLABORATION]: 'Partnership forum',
  [ActivityType.OTHER]: 'Community engagement visit',
};

export interface DemoActivityRow {
  title: string;
  activityType: ActivityType;
  targetAudience: string;
  status: ActivityStatus;
  youthCount: number | null;
  trainedCount: number | null;
  isInternational: boolean;
  /** Whole days before `now` the activity happened/was logged. */
  daysAgo: number;
  companyName: string;
  authorUsername: string;
}

// 42 activity rows (6 per type) spread over the past 6 months, ~70/20/10
// approved/submitted/rejected. Companies cycle through the every-3rd seed
// companies (the subset the seed marks approved), authors are those
// companies' first roster members — so member-authored creation passes the
// approved-company gate. Deterministic per seed.
export function planDemoActivityDetails(seed = 31, total = 42): DemoActivityRow[] {
  const rand = mulberry32(seed);
  const types = [
    ActivityType.INTERNATIONAL_RESPONSE,
    ActivityType.YOUTH,
    ActivityType.TECHNICAL_ASSISTANCE,
    ActivityType.F2F_TRAINING,
    ActivityType.SKILLSBUILD,
    ActivityType.COLLABORATION,
    ActivityType.OTHER,
  ];
  const approvedPool = DEMO_COMPANY_MEMBERS.map((e, i) => ({ e, i })).filter(({ i }) => i % 3 === 0);
  return Array.from({ length: total }, (_, n) => {
    const type = types[n % types.length];
    const { e } = approvedPool[n % approvedPool.length];
    const s = rand();
    return {
      title: `Demo: ${DEMO_ACTIVITY_TITLES[type]} #${n + 1}`,
      activityType: type,
      targetAudience: TARGET_AUDIENCES[Math.floor(rand() * TARGET_AUDIENCES.length)],
      status: s < 0.7 ? ActivityStatus.APPROVED : s < 0.9 ? ActivityStatus.SUBMITTED : ActivityStatus.REJECTED,
      youthCount:
        type === ActivityType.YOUTH
          ? 10 + Math.floor(rand() * 90)
          : rand() < 0.2
            ? Math.floor(rand() * 30)
            : null,
      trainedCount:
        type === ActivityType.F2F_TRAINING
          ? 15 + Math.floor(rand() * 120)
          : rand() < 0.2
            ? Math.floor(rand() * 50)
            : null,
      isInternational: type === ActivityType.INTERNATIONAL_RESPONSE || rand() < 0.12,
      daysAgo: 2 + Math.floor(rand() * 180),
      companyName: e.name,
      authorUsername: e.members[0],
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
