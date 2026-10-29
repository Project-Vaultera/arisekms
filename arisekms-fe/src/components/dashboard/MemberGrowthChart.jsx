import { Area } from '@/components/charts/area';
import { AreaChart } from '@/components/charts/area-chart';
import { Grid } from '@/components/charts/grid';
import { XAxis } from '@/components/charts/x-axis';
import { ChartTooltip } from '@/components/charts/tooltip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';

const SERIES = [
  { key: 'active', label: 'Active', color: '#00ada8' },
  { key: 'inactive', label: 'Inactive', color: 'var(--sendai-crimson)' },
];

// Member growth over time as an area trend chart.
export function MemberGrowthChart({ months = [], loading = false }) {
  const hasData = months.some((m) => m.active > 0 || m.inactive > 0);

  // Attach a real month-start Date so the time-series x-scale works.
  const data = months.map((m) => {
    const [y, mo] = (m.key ?? '').split('-').map(Number);
    const date = Number.isFinite(y) && Number.isFinite(mo) ? new Date(y, mo, 1) : new Date();
    return { date, active: m.active ?? 0, inactive: m.inactive ?? 0 };
  });

  return (
    <Card className="h-full">
      <CardHeader>
        <div>
          <CardTitle>Member Growth</CardTitle>
          <CardDescription>Active Vs. Inactive Over Time</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            Loading members…
          </p>
        ) : !hasData ? (
          <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No membership activity yet.
          </p>
        ) : (
          <>
            <AreaChart data={data} xDataKey="date" aspectRatio="3 / 1">
              <Grid horizontal />
              {SERIES.map((s) => (
                <Area
                  key={s.key}
                  dataKey={s.key}
                  fill={s.color}
                  fillOpacity={0.12}
                  showLine
                  stroke={s.color}
                  strokeWidth={2}
                />
              ))}
              <XAxis />
              <ChartTooltip />
            </AreaChart>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              {SERIES.map((s) => (
                <span key={s.key} className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.label}
                </span>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
