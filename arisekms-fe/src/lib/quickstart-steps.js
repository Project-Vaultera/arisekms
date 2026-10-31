// Role-aware quickstart checklist config (mirrors the gamsys quickstart
// shape: stable id, outcome title, one-line summary, how-to details,
// CTA button label + route). Steps complete only when the user marks them
// done — visiting a page never completes anything.
import { ROLE } from './rbac.js';

export const QUICKSTART_STEPS = {
  [ROLE.IT_ADMIN]: [
    {
      id: 'review-approvals',
      title: 'Review pending approvals',
      summary: 'Decide on membership applications waiting in the queue.',
      details: [
        'Open Approvals from the Secretariat Overview section of the sidebar.',
        'Read the company profile, then approve — or reject with a reason so the member knows what to fix.',
        'Rejected applications return to draft; the member is notified of your feedback.',
      ],
      cta: 'Open approvals',
      to: '/admin-approvals',
    },
    {
      id: 'manage-directory',
      title: 'Manage members and companies',
      summary: 'Browse the directory, assign members, toggle account status.',
      details: [
        'Use the Members tab to search by name, email, or username and enable or disable accounts.',
        'Use the Companies tab to search by name and filter by industry sector and active status.',
        'Company pages show up to 10 rows with Previous / Next — select a company to see its members and activity.',
      ],
      cta: 'Open directory',
      to: '/member-directory',
    },
    {
      id: 'review-reports',
      title: 'Review submitted reports',
      summary: 'Read quarterly, annual, and practice reports from members.',
      details: [
        'Filter the report summary by type, author gender, or date range.',
        'Watch each report move through the review pipeline: submitted, approved, or rejected.',
        'Approval rate and pending-review counts sit at the top of the page.',
      ],
      cta: 'Open report summary',
      to: '/reports-summary',
    },
    {
      id: 'review-activities',
      title: 'Review logged activities',
      summary: 'Approve the performance entries members log.',
      details: [
        'Filter the activity log by type, target audience, and review status.',
        'Approving an entry feeds it into the KPI cards and the momentum chart.',
        'Only approved activities count toward international responses, youth reached, and the other KPIs.',
      ],
      cta: 'Open activity log',
      to: '/activity',
    },
    {
      id: 'track-performance',
      title: 'Track performance and metrics',
      summary: 'Watch the KPI cards fill as activities get approved.',
      details: [
        'Key outcomes (approved only) sit above the context cards so KPIs never mix with raw counts.',
        'The review pipeline shows what share of entries is decided; the momentum chart shows approved work per month.',
        'The SkillsBuild card counts certificates as a proxy — it is labeled as such.',
      ],
      cta: 'Open performance',
      to: '/reports-performance',
    },
    {
      id: 'explore-membership',
      title: 'Explore membership analytics',
      summary: 'See the network by industry sector, region, and growth.',
      details: [
        'Filter the membership report by industry sector, region, and date range.',
        'The top-sector card names the largest share so the takeaway is immediate.',
        'The companies table is sorted newest-first with pagination.',
      ],
      cta: 'Open analytics',
      to: '/reports-membership',
    },
    {
      id: 'support-queue',
      title: 'Clear the support queue',
      summary: 'Answer member tickets from the topbar bell or the Support page.',
      details: [
        'The bell lists open tickets alongside reports and activities awaiting review.',
        'Each item links straight to its review screen.',
      ],
      cta: 'Open support',
      to: '/support',
    },
  ],
  [ROLE.MEMBER]: [
    {
      id: 'membership-form',
      title: 'Complete your membership application',
      summary: 'Fill in company, contacts, and affiliations, then submit for review.',
      details: [
        'Work through the five tabs: Company, Primary Contact, Additional Contacts, UN & CSR, Other Info.',
        'Pick your Industry Sector from the dropdown in Section C — free text is no longer accepted.',
        'Attach registration proof or explain why none is attached, then use Continue to advance and Submit for review on the last tab.',
      ],
      cta: 'Open application',
      to: '/membership-form',
    },
    {
      id: 'submit-report',
      title: 'Submit your first report',
      summary: 'Quarterly, annual, good practices, or success stories.',
      details: [
        'Upload the file and pick its type before submitting.',
        'Track its status on the report summary page as reviewers decide.',
      ],
      cta: 'Submit a report',
      to: '/submit-reports',
    },
    {
      id: 'record-certificate',
      title: 'Record a training certificate',
      summary: 'Log completed SkillsBuild courses for verification.',
      details: [
        'Open the Activity page and choose Add Certificate.',
        'Name, course, and date issued are required; admins verify each record.',
        'Verified certificates move you up the leaderboards.',
      ],
      cta: 'Record a certificate',
      to: '/activity',
    },
    {
      id: 'log-activity',
      title: 'Log a performance activity',
      summary: 'Record trainings, outreach, and collaborations.',
      details: [
        'Choose the activity type and the target audience it served.',
        'Add youth and trained counts where they apply, plus the event date.',
        'Entries count toward the KPIs once an admin approves them.',
      ],
      cta: 'Log an activity',
      to: '/activity',
    },
    {
      id: 'explore-reports',
      title: 'Browse knowledge products',
      summary: 'Manuals, guides, and policies from across the network.',
      details: [
        'Search by title or filter by category: ECE, manuals, policies, or terms.',
        'Download what you need for field work and onboarding.',
      ],
      cta: 'Browse knowledge',
      to: '/knowledge-products',
    },
    {
      id: 'leaderboards',
      title: 'Check the leaderboards',
      summary: 'See top certifying companies and your own standing.',
      details: [
        'Rankings count verified certificates only — switch to All Records to include pending ones.',
        'Filter by time range: today, last 7 or 30 days, or last quarter.',
        'Select any company to inspect its certificate history.',
      ],
      cta: 'Open leaderboards',
      to: '/leaderboards',
    },
    {
      id: 'get-help',
      title: 'Get help when stuck',
      summary: 'Manual, support tickets, and the bell are always one click away.',
      details: [
        'Open the User Manual for the full per-role walkthrough with screenshots.',
        'File a support ticket and track its status on the Support page.',
        'The topbar bell lists everything currently waiting on you.',
      ],
      cta: 'Open manual',
      to: '/user-manual',
    },
  ],
};

// Secretariat works the same ops queue as IT admin (approvals, directory, reports).
QUICKSTART_STEPS[ROLE.SECRETARIAT] = QUICKSTART_STEPS[ROLE.IT_ADMIN];

// Analysts read content only: no submissions, uploads, or membership actions.
QUICKSTART_STEPS[ROLE.DATA_ANALYST] = [
  {
    id: 'browse-knowledge',
    title: 'Browse knowledge products',
    summary: 'Manuals, guides, and policies from across the network.',
    details: [
      'Search by title or filter by category: ECE, manuals, policies, or terms.',
      'Download what you need for analysis work.',
    ],
    cta: 'Browse knowledge',
    to: '/knowledge-products',
  },
  {
    id: 'review-reports',
    title: 'Read submitted reports',
    summary: 'Quarterly, annual, and practice reports from members.',
    details: [
      'Filter the report summary by type, author gender, or date range.',
      'Watch each report move through the review pipeline: submitted, approved, or rejected.',
    ],
    cta: 'Open report summary',
    to: '/reports-summary',
  },
  {
    id: 'review-activities',
    title: 'Read logged activities',
    summary: 'Performance entries members log, once approved.',
    details: [
      'Filter the activity log by type, target audience, and review status.',
      'Only approved entries feed the KPI cards.',
    ],
    cta: 'Open activity log',
    to: '/activity',
  },
  {
    id: 'track-performance',
    title: 'Track performance and metrics',
    summary: 'Approved activities, KPIs, and the momentum chart.',
    details: [
      'Key outcomes (approved only) sit above the context cards.',
      'The SkillsBuild card counts certificates as a proxy — it is labeled as such.',
    ],
    cta: 'Open performance',
    to: '/reports-performance',
  },
];
