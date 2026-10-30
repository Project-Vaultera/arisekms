import { Link } from 'react-router-dom';

import { PageHero } from '@/components/PageHero.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';

const SECTIONS = [
  {
    id: 'getting-around',
    title: 'Getting around',
    body: [
      'Use the sidebar to move between Home, Submit Reports, Membership Form, Knowledge Products, SkillsBuild, and Leaderboards. The Help Center section holds this manual, the Privacy Policy, and Support.',
      'The search bar at the top finds pages and knowledge documents. Press / anywhere to jump to it.',
    ],
    links: [],
  },
  {
    id: 'sharing-learning',
    title: 'Sharing and learning',
    body: [
      'Members contribute reports, learn from shared knowledge, and earn recognition for training.',
    ],
    links: [
      { to: '/submit-reports', label: 'Submit Reports', hint: 'Quarterly, annual, and good-practice reports.' },
      { to: '/knowledge-products', label: 'Knowledge Products', hint: 'Manuals, guides, and organizational knowledge.' },
      { to: '/activity', label: 'SkillsBuild', hint: 'Training courses and certificates.' },
      { to: '/leaderboards', label: 'Leaderboards', hint: 'Member recognition standings.' },
    ],
  },
  {
    id: 'membership-directory',
    title: 'Membership and directory',
    body: [
      'Manage your organization’s membership and connect with other members of the network.',
    ],
    links: [
      { to: '/membership-form', label: 'Membership Form', hint: 'Apply for or update membership.' },
      { to: '/member-directory', label: 'Member Directory', hint: 'Find and connect with member organizations.' },
    ],
  },
  {
    id: 'getting-help',
    title: 'Getting help',
    body: [
      'Run into a problem or have a question about the platform? File a support ticket and the team will follow up.',
    ],
    links: [
      { to: '/support', label: 'Support', hint: 'Submit and track help tickets.' },
      { to: '/privacy-policy', label: 'Privacy Policy', hint: 'How your personal data is handled.' },
    ],
  },
  {
    id: 'administrators',
    title: 'For administrators',
    body: [
      'Admin accounts additionally see the Admin Center: an overview dashboard, the member directory with approval controls, and queues for approving reports, certificates, and tickets.',
    ],
    links: [],
  },
];

export function UserManual() {
  return (
    <div>
      <PageHero
        title="User Manual"
        subtitle="How to use the ARISE Philippines knowledge platform, step by step."
      />
      <div className="mx-auto max-w-4xl px-4 py-10 lg:px-6">
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {SECTIONS.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-20 p-5 sm:p-6">
                <div className="flex gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[var(--sendai-teal)] text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-heading text-base font-bold text-[#1e3a5f]">{s.title}</h2>
                    {s.body.map((p, j) => (
                      <p
                        key={j}
                        className="mt-2 text-justify text-sm leading-relaxed text-muted-foreground"
                      >
                        {p}
                      </p>
                    ))}
                    {s.links.length > 0 && (
                      <ul className="mt-3 space-y-2">
                        {s.links.map((l) => (
                          <li key={l.to}>
                            <Link
                              to={l.to}
                              className="text-sm font-semibold text-[#0B4484] hover:text-[var(--sendai-teal)]"
                            >
                              {l.label}
                            </Link>
                            <span className="text-sm text-muted-foreground"> — {l.hint}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </section>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
