import { Bar } from '@/components/charts/bar';
import { BarChart } from '@/components/charts/bar-chart';
import { BarXAxis } from '@/components/charts/bar-x-axis';
import { Grid } from '@/components/charts/grid';
import { ChartTooltip } from '@/components/charts/tooltip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';

const SERIES = [
  { key: 'quarterly', fill: 'var(--chart-1)' },
  { key: 'annual', fill: 'var(--chart-2)' },
  { key: 'goodPractices', fill: 'var(--chart-4)' },
  { key: 'successStories', fill: 'var(--chart-3)' },
];

// Weekly stacked bars of live report submissions, split by category.
export function ActivityChart({ weeks = [], loading = false }) {
  const hasData = weeks.some((w) => SERIES.some((s) => (w[s.key] ?? 0) > 0));

  return (
    <Card>
      <CardHeader className="pb-0.5 pt-3">
        <div className="space-y-0.5">
          <CardTitle>Submitted Reports</CardTitle>
          <CardDescription>Weekly Submissions By Category · Last 26 Weeks</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        {loading ? (
          <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            Loading submissions…
          </p>
        ) : !hasData ? (
          <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No submissions yet.
          </p>
        ) : (
          <BarChart data={weeks} xDataKey="label" aspectRatio="3 / 1" stacked margin={{ top: 8, right: 16, bottom: 24, left: 16 }}>
            <Grid horizontal />
            {SERIES.map((s) => (
              <Bar key={s.key} dataKey={s.key} fill={s.fill} />
            ))}
            <BarXAxis maxLabels={8} />
            <ChartTooltip />
          </BarChart>
        )}
      </CardContent>
    </Card>
  );
}
