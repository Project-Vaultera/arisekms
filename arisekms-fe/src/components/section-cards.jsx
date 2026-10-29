import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  BarChartIcon,
  File02Icon,
  Folder01Icon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils.js';

const CARDS = [
  {
    label: 'Total documents',
    value: '379',
    delta: '+12.5%',
    up: true,
    hint: 'vs. last month',
    icon: File02Icon,
  },
  {
    label: 'Active readers',
    value: '2,340',
    delta: '+8.1%',
    up: true,
    hint: 'vs. last month',
    icon: UserGroupIcon,
  },
  {
    label: 'Drafts in review',
    value: '98',
    delta: '-4.2%',
    up: false,
    hint: 'needs attention',
    icon: BarChartIcon,
  },
  {
    label: 'Workspaces',
    value: '12',
    delta: '+2',
    up: true,
    hint: 'this quarter',
    icon: Folder01Icon,
  },
];

export function SectionCards() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:px-6 xl:grid-cols-4">
      {CARDS.map((card) => (
        <Card key={card.label} className="relative overflow-hidden">
          <HugeiconsIcon
            icon={card.icon}
            size={96}
            strokeWidth={1}
            className="pointer-events-none absolute -right-4 -bottom-4 text-foreground/[0.06]"
          />
          <CardHeader className="relative flex flex-row items-center justify-between pb-2">
            <p className="editorial-label text-muted-foreground">{card.label}</p>
            <Badge variant="outline">
              <HugeiconsIcon icon={card.up ? ArrowUpRightIcon : ArrowDownRightIcon} />
              {card.delta}
            </Badge>
          </CardHeader>
          <CardContent className="relative">
            <p className="editorial-kpi">{card.value}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              <span className={cn('font-semibold', card.up ? 'text-[#15803d]' : 'text-[var(--sendai-crimson)]')}>
                {card.delta}
              </span>{' '}
              {card.hint}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
