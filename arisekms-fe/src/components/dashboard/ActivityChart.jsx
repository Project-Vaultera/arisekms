import { useMemo, useState } from 'react';

import { Area } from '@/components/charts/area';
import { AreaChart } from '@/components/charts/area-chart';
import { Grid } from '@/components/charts/grid';
import { ChartTooltip } from '@/components/charts/tooltip';
import { XAxis } from '@/components/charts/x-axis';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { cn } from '@/lib/utils.js';

// Placeholder series (no backend aggregate yet).
// TODO: replace with workspace-scoped GET /api/v1/... once KMS domain lands.
function weeks(count, endISO, fn) {
  const end = new Date(`${endISO}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - (count - 1 - i) * 7);
    return { date: d, ...fn(i) };
  });
}

const docs = [38, 44, 41, 52, 47, 58, 55, 63, 61, 74, 70, 82, 89];
const readers = [280, 310, 295, 350, 390, 420, 405, 470, 540, 520, 610, 660, 720];

const ACTIVITY = weeks(13, '2026-10-26', (i) => ({
  documents: docs[i],
  readers: readers[i],
}));

const RANGES = [
  { id: '3m', label: 'Last 3 months', days: 90 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '7d', label: 'Last 7 days', days: 7 },
];

const VIEWS = [
  { id: 'both', label: 'Both' },
  { id: 'documents', label: 'Documents' },
  { id: 'readers', label: 'Readers' },
];

export function ActivityChart() {
  const [range, setRange] = useState('3m');
  const [view, setView] = useState('both');

  const data = useMemo(() => {
    const cutoff = new Date(ACTIVITY[ACTIVITY.length - 1].date);
    cutoff.setUTCDate(cutoff.getUTCDate() - RANGES.find((r) => r.id === range).days);
    return ACTIVITY.filter((d) => d.date >= cutoff);
  }, [range]);

  const showDocs = view === 'both' || view === 'documents';
  const showReaders = view === 'both' || view === 'readers';

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Total activity</CardTitle>
          <CardDescription>Documents published vs. active readers</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border bg-muted/40 p-0.5 text-xs font-medium">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={cn(
                  'rounded px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground',
                  range === r.id && 'bg-card text-foreground shadow-sm',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <select
            value={view}
            onChange={(e) => setView(e.target.value)}
            aria-label="View"
            className="h-8 rounded-md border border-input bg-card px-2 text-xs font-medium"
          >
            {VIEWS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      <CardContent>
        <AreaChart data={data} aspectRatio="3 / 1">
          <Grid horizontal />
          {showDocs && <Area dataKey="documents" fill="var(--chart-1)" fillOpacity={0.35} />}
          {showReaders && <Area dataKey="readers" fill="var(--chart-4)" fillOpacity={0.25} />}
          <XAxis />
          <ChartTooltip />
        </AreaChart>
      </CardContent>
    </Card>
  );
}
