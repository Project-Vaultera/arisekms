// Role-aware quickstart checklist config (mirrors the gamsys quickstart
// shape: stable id, outcome title, one-line summary, how-to details,
// CTA label + route). Steps complete only when the user marks them done.
export const QUICKSTART_STEPS = {
  ADMIN: [
    {
      id: 'review-approvals',
      title: 'Review pending approvals',
      summary: 'Decide on membership applications waiting in the queue.',
      details: ['Open Approvals from the sidebar.', 'Approve or reject with a reason for rejections.'],
      cta: 'Open approvals',
      to: '/admin-approvals',
    },
    {
      id: 'manage-directory',
      title: 'Manage members and companies',
      summary: 'Browse the directory, assign members, toggle account status.',
      details: ['Use search plus industry and status filters on the Companies tab.', 'Company pages show up to 10 rows with Previous / Next.'],
      cta: 'Open directory',
      to: '/member-directory',
    },
    {
      id: 'review-reports',
      title: 'Review submitted reports',
      summary: 'Read quarterly, annual, and practice reports from members.',
      details: ['Filter by report type, author gender, or date range.', 'Track the review pipeline from submitted to decided.'],
      cta: 'Open report summary',
      to: '/reports-summary',
    },
    {
      id: 'track-performance',
      title: 'Track performance and metrics',
      summary: 'Watch the KPI cards fill as activities get approved.',
      details: ['Log an activity, approve it, and see the momentum chart move.', 'Only approved activities feed the KPIs.'],
      cta: 'Open performance',
      to: '/reports-performance',
    },
  ],
  USER: [
    {
      id: 'membership-form',
      title: 'Complete your membership application',
      summary: 'Fill in company, contacts, and affiliations, then submit.',
      details: ['Pick your Industry Sector from the dropdown in Section C.', 'Attach registration proof or explain why none is attached.'],
      cta: 'Open application',
      to: '/membership-form',
    },
    {
      id: 'submit-report',
      title: 'Submit your first report',
      summary: 'Quarterly, annual, good practices, or success stories.',
      details: ['Upload the file and pick its type.', 'Watch its status move through the review pipeline.'],
      cta: 'Submit a report',
      to: '/submit-reports',
    },
    {
      id: 'log-activity',
      title: 'Log a performance activity',
      summary: 'Record trainings, outreach, and collaborations.',
      details: ['Choose the activity type and target audience.', 'Add youth and trained counts where they apply.'],
      cta: 'Log an activity',
      to: '/activity',
    },
    {
      id: 'explore-reports',
      title: 'Explore reports and leaderboards',
      summary: 'See where your company stands.',
      details: ['Filter membership analytics by industry sector.', 'Check the leaderboards for top certifying companies.'],
      cta: 'Explore analytics',
      to: '/reports-membership',
    },
  ],
};
