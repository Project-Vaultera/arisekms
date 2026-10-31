import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle01Icon, File02Icon, HelpCircleIcon, Medal01Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { api } from '@/api/client.js';
import { Bar } from '@/components/charts/bar';
import { BarChart } from '@/components/charts/bar-chart';
import { BarXAxis } from '@/components/charts/bar-x-axis';
import { Grid } from '@/components/charts/grid';
import { ChartTooltip } from '@/components/charts/tooltip';
import { PageHeader } from '@/components/PageHeader.jsx';
import { StatCard } from '@/components/reports/StatCard.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.jsx';

const DAY_MS = 86_400_000;
// Minimum resolved sample before the average means anything.
const MIN_RESOLVED_SAMPLE = 5;

function ageDays(raw) {
  const d = new Date(raw).getTime();
  if (Number.isNaN(d)) return '—';
  return `${Math.max(0, Math.floor((Date.now() - d) / DAY_MS))}d`;
}

export function SupportMonitoring() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/support-tickets', { params: { limit: 100, offset: 0 } })
      .then((res) => setTickets(res.data.data ?? []))
      .catch(() => toast.error('Could not load tickets'))
      .finally(() => setLoading(false));
  }, []);

  const open = useMemo(() => tickets.filter((t) => (t.status || 'Open') === 'Open'), [tickets]);
  const inProgress = useMemo(() => tickets.filter((t) => t.status === 'In progress'), [tickets]);
  const resolved = useMemo(() => tickets.filter((t) => t.status === 'Resolved'), [tickets]);

  const avgResolveDays = useMemo(() => {
    if (resolved.length < MIN_RESOLVED_SAMPLE) return null;
    const total = resolved.reduce((n, t) => {
      const c = new Date(t.createdAt).getTime();
      const u = new Date(t.updatedAt ?? t.createdAt).getTime();
      if (Number.isNaN(c) || Number.isNaN(u)) return n;
      return n + Math.max(0, (u - c) / DAY_MS);
    }, 0);
    return (total / resolved.length).toFixed(1);
  }, [resolved]);

  const byCategory = useMemo(() => {
    const map = {};
    for (const t of tickets) map[t.category || 'Other'] = (map[t.category || 'Other'] ?? 0) + 1;
    return Object.entries(map)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [tickets]);

  const byPriority = useMemo(() => {
    const order = ['Low', 'Medium', 'High'];
    return order.map((label) => ({
      label,
      count: tickets.filter((t) => (t.priority || 'Medium') === label).length,
    }));
  }, [tickets]);

  const backlog = useMemo(
    () =>
      tickets
        .filter((t) => (t.status || 'Open') !== 'Resolved')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [tickets],
  );

  return (
    <div className="flex flex-col gap-3 py-1.5">
      <PageHeader
        title="Support Monitoring"
        subtitle="Ticket load, backlog age, and resolution pace across the system"
      />
      <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 lg:px-6 xl:grid-cols-4">
        <StatCard label="Open" value={open.length} hint="Awaiting triage" icon={HelpCircleIcon} tint="text-[var(--sendai-crimson)]/10" loading={loading} />
        <StatCard label="In progress" value={inProgress.length} hint="Being investigated" icon={File02Icon} tint="text-[var(--sendai-orange)]/10" loading={loading} />
        <StatCard label="Resolved" value={resolved.length} hint="Closed tickets" icon={CheckmarkCircle01Icon} tint="text-[var(--sendai-teal)]/10" loading={loading} />
        <StatCard
          label="Avg days to resolve"
          value={avgResolveDays ?? '—'}
          hint={avgResolveDays === null ? `Needs ≥${MIN_RESOLVED_SAMPLE} resolved tickets` : 'Resolved tickets only'}
          icon={Medal01Icon}
          tint="text-[#0B4484]/10"
          loading={loading}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 px-4 lg:px-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-0.5 pt-3">
            <CardTitle>Tickets by category</CardTitle>
            <CardDescription>All statuses · snapshot</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            {loading ? (
              <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">Loading…</p>
            ) : byCategory.length === 0 ? (
              <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">No tickets yet.</p>
            ) : (
              <>
              <BarChart data={byCategory} xDataKey="label" aspectRatio="3 / 1" margin={{ top: 8, right: 16, bottom: 24, left: 16 }}>
                <Grid horizontal />
                <Bar dataKey="count" fill="var(--chart-1)" />
                <BarXAxis maxLabels={8} />
                <ChartTooltip />
              </BarChart>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'var(--chart-1)' }} />
                  Tickets
                </span>
              </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0.5 pt-3">
            <CardTitle>Tickets by priority</CardTitle>
            <CardDescription>All statuses · snapshot</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            {loading ? (
              <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">Loading…</p>
            ) : (
              <>
              <BarChart data={byPriority} xDataKey="label" aspectRatio="3 / 1" margin={{ top: 8, right: 16, bottom: 24, left: 16 }}>
                <Grid horizontal />
                <Bar dataKey="count" fill="var(--chart-2)" />
                <BarXAxis maxLabels={8} />
                <ChartTooltip />
              </BarChart>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'var(--chart-2)' }} />
                  Tickets
                </span>
              </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="mx-4 lg:mx-6">
        <CardHeader>
          <CardTitle>Open backlog ({backlog.length})</CardTitle>
          <CardDescription>Oldest first — triage on the Support page.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Age</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {backlog.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.subject}</TableCell>
                  <TableCell>{t.category}</TableCell>
                  <TableCell>{t.priority}</TableCell>
                  <TableCell><Badge variant="secondary">{t.status}</Badge></TableCell>
                  <TableCell>{ageDays(t.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Link to="/support" className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B4484]">
                      Triage <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} strokeWidth={2} />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && backlog.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Queue is clear.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
