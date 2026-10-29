import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Award01Icon,
  BookOpen01Icon,
  File02Icon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useDashboardData } from '@/hooks/use-dashboard-data.js';
import { effectiveRole, getTokenRoles } from '@/lib/rbac.js';
import { cn } from '@/lib/utils.js';

function fmt(n) {
  return typeof n === 'number' ? n.toLocaleString() : '—';
}

export function SectionCards({ summary } = {}) {
  const fallback = useDashboardData();
  // DashboardHome passes one shared fetch; standalone use keeps its own.
  const data = summary ?? fallback;
  const role = effectiveRole(getTokenRoles());
  const c = data.counts;

  const cards =
    role === 'ADMIN'
      ? [
          {
            label: 'Active Members',
            value: fmt(c?.active),
            hint: c ? `${fmt(c.inactive)} inactive · ${fmt(c.users)} total` : 'loading…',
            icon: UserGroupIcon,
            tint: 'text-[#00ada8]/10',
            link: { label: 'View Members', to: '/member-directory' },
          },
          {
            label: 'Certifications Submitted',
            value: fmt(c?.certificates),
            hint: 'SkillsBuild certificates',
            icon: Award01Icon,
            tint: 'text-[var(--sendai-orange)]/10',
            link: { label: 'View Certificates', to: '/skillsbuild' },
          },
          {
            label: 'Submitted Reports',
            value: fmt(c?.reports),
            hint: 'Quarterly · Annual · Good Practices',
            icon: File02Icon,
            tint: 'text-[var(--sendai-teal)]/10',
            link: { label: 'View Reports', to: '/submit-reports' },
          },
          {
            label: 'Knowledge Items',
            value: fmt(c?.knowledge),
            hint: 'Manuals · Policies · Guides',
            icon: BookOpen01Icon,
            tint: 'text-[var(--sendai-plum)]/10',
            link: { label: 'View Products', to: '/knowledge-products' },
          },
        ]
      : [
          {
            label: 'My Certifications',
            value: fmt(c?.certificates),
            hint: 'SkillsBuild certificates',
            icon: Award01Icon,
            tint: 'text-[var(--sendai-orange)]/10',
            link: { label: 'View Certificates', to: '/skillsbuild' },
          },
          {
            label: 'My Reports',
            value: fmt(c?.reports),
            hint: 'Submitted Reports',
            icon: File02Icon,
            tint: 'text-[var(--sendai-teal)]/10',
            link: { label: 'View Reports', to: '/submit-reports' },
          },
          {
            label: 'Knowledge Items',
            value: fmt(c?.knowledge),
            hint: 'Manuals · Policies · Guides',
            icon: BookOpen01Icon,
            tint: 'text-[var(--sendai-plum)]/10',
            link: { label: 'View Products', to: '/knowledge-products' },
          },
        ];

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:px-6',
        cards.length === 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3',
      )}
    >
      {cards.map((card) => (
        <Card key={card.label} className="relative gap-4 overflow-hidden py-4">
          <HugeiconsIcon
            icon={card.icon}
            size={96}
            strokeWidth={1}
            className={cn('pointer-events-none absolute -right-4 -bottom-4 text-[var(--sendai-teal)] opacity-100')}
          />
          <CardHeader className="relative flex flex-row items-center justify-between pb-0">
            <p className="editorial-label text-muted-foreground">{card.label}</p>
            <Link
              to={card.link.to}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B4484]"
            >
              {card.link.label}
            </Link>
          </CardHeader>
          <CardContent className="relative">
            <p className="editorial-kpi">{data.loading && !c ? '—' : card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
