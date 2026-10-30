import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';

import { Card, CardContent, CardHeader } from '@/components/ui/card.jsx';
import { cn } from '@/lib/utils.js';

// Home-page number-card style adapted for the reports pages.
export function StatCard({ label, value, hint, icon, tint = 'text-[var(--sendai-teal)]/10', to, linkLabel, loading }) {
  return (
    <Card className="relative gap-4 overflow-hidden py-4">
      {icon && (
        <HugeiconsIcon
          icon={icon}
          size={96}
          strokeWidth={1}
          className={cn('pointer-events-none absolute -right-4 -bottom-4 opacity-100', tint)}
        />
      )}
      <CardHeader className="relative flex flex-row items-center justify-between pb-0">
        <p className="editorial-label text-muted-foreground">{label}</p>
        {to && (
          <Link to={to} className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B4484]">
            {linkLabel ?? 'View'}
          </Link>
        )}
      </CardHeader>
      <CardContent className="relative">
        <p className="editorial-kpi">{loading ? '—' : value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
