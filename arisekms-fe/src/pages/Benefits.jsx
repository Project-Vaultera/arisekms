import { HugeiconsIcon } from '@hugeicons/react';
import { BookOpen01Icon, ChartUpIcon, Comment01Icon, UserGroupIcon } from '@hugeicons/core-free-icons';

import { PageHero } from '@/components/PageHero.jsx';
import benefitsBg from '/benefits_of_joining_bg.png';
// Benefits copy follows the arise.ph/membership structure.
// TODO: verify wording against the official page (arise.ph blocks automated
// fetching with 403 — confirm manually in a browser).
import { Card, CardContent } from '@/components/ui/card.jsx';

const BENEFITS = [
  {
    icon: Comment01Icon,
    color: 'bg-[#1e3a5f]',
    title: 'A voice in policy',
    body: 'Communicate your concerns on disaster risk reduction and help shape government policies and programs.',
  },
  {
    icon: BookOpen01Icon,
    color: 'bg-[var(--sendai-crimson)]',
    title: 'Knowledge resources',
    body: 'Access guides and strategies from local and international members on effective risk management.',
  },
  {
    icon: ChartUpIcon,
    color: 'bg-[var(--sendai-plum)]',
    title: 'Training & workshops',
    body: 'Join capability-building activities that make your business more disaster resilient.',
  },
  {
    icon: UserGroupIcon,
    color: 'bg-[var(--sendai-orange)]',
    title: 'Network support',
    body: 'Solicit support from network members for your own projects and programs.',
  },
];

export function Benefits() {
  return (
    <div>
      <PageHero
        title="Benefits of Joining"
        subtitle="How becoming a member of ARISE Philippines helps organizations strengthen resilience, improve continuity, and contribute to safer communities."
        bg={benefitsBg}
        overlayClassName="bg-[var(--sendai-orange)]/50"
      />
      <div className="mx-auto max-w-4xl px-4 py-10 lg:px-6">
        <Card>
          <CardContent className="space-y-4 p-6 text-sm leading-relaxed text-muted-foreground sm:p-8">
            <p>
              Membership connects your organization to the expertise and resources of the whole network
              while generating goodwill in the communities where you operate.
            </p>
            <p>
              Effective disaster risk reduction policies reduce business disruptions from disasters —
              fewer disruptions mean continuity of revenue.
            </p>
            <div className="grid gap-4 pt-2 sm:grid-cols-2">
              {BENEFITS.map((b) => (
                <div key={b.title} className="rounded-lg border border-border p-5 text-center">
                  <span className={`mx-auto flex size-12 items-center justify-center rounded-lg text-white ${b.color}`}>
                    <HugeiconsIcon icon={b.icon} size={22} strokeWidth={1.8} />
                  </span>
                  <p className="mt-3 font-heading text-sm font-bold text-[#1e3a5f]">{b.title}</p>
                  <p className="mt-1 text-xs leading-relaxed">{b.body}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
