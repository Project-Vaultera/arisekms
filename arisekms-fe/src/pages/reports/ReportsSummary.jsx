import { useEffect, useMemo, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { File02Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { api } from '@/api/client.js';
import { PageHero } from '@/components/PageHero.jsx';
import stocksBg from '/stocks-arise.jpg';
import { Bar } from '@/components/charts/bar';
import { BarChart } from '@/components/charts/bar-chart';
import { BarXAxis } from '@/components/charts/bar-x-axis';
import { Grid } from '@/components/charts/grid';
import { ChartTooltip } from '@/components/charts/tooltip';
import { Badge } from '@/components/ui/badge.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { FilterSelect } from '@/components/ui/filter-select.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { DateRangeFilter, presetRange } from '@/components/reports/DateRangeFilter.jsx';
import { StatCard } from '@/components/reports/StatCard.jsx';
import { TablePager } from '@/components/reports/TablePager.jsx';
import { cn } from '@/lib/utils.js';

const TYPES = [
  { value: 'all', label: 'All types' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual' },
  { value: 'good-practices', label: 'Good Practices' },
  { value: 'success-stories', label: 'Success Stories' },
];

const GENDERS = [
  { value: 'all', label: 'All genders' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
  { value: 'unspecified', label: 'Unspecified' },
];

const TYPE_LABEL = { quarterly: 'Quarterly', annual: 'Annual', 'good-practices': 'Good Practices', 'success-stories': 'Success Stories' };
const TYPE_FILL = { quarterly: 'var(--chart-1)', annual: 'var(--chart-2)', 'good-practices': 'var(--chart-4)', 'success-stories': 'var(--chart-3)' };

function fmtDate(raw) {
  if (!raw) return '—';
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function statusStyle(status) {
  if (status === 'approved') return 'bg-[var(--sendai-teal)]/10 text-[var(--sendai-teal)]';
  if (status === 'rejected') return 'bg-[var(--sendai-crimson)]/10 text-[var(--sendai-crimson)]';
  return 'bg-[var(--sendai-orange)]/10 text-[var(--sendai-orange)]';
}

export function ReportsSummary() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('all');
  const [gender, setGender] = useState('all');
  const [preset, setPreset] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/reports', { params: { limit: 100, offset: 0 } })
      .then((res) => { if (!cancelled) setReports(res.data.data ?? []); })
      .catch(() => { if (!cancelled) toast.error('Could not load reports'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function onPreset(v) {
    setPreset(v);
    setPage(0);
    if (v === 'custom') return;
    const r = presetRange(v);
    setFrom(r.from);
    setTo(r.to);
  }

  const filtered = useMemo(() => reports.filter((r) => {
    if (type !== 'all' && r.category !== type) return false;
    if (gender !== 'all') {
      const g = r.author?.gender ?? 'unspecified';
      if (g !== gender) return false;
    }
    if (from && new Date(r.createdAt) < new Date(from)) return false;
    if (to && new Date(r.createdAt) > new Date(`${to}T23:59:59`)) return false;
    return true;
  }), [reports, type, gender, from, to]);

  const trend = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        date: new Date(d.getFullYear(), d.getMonth(), 1),
        label: d.toLocaleDateString(undefined, { month: 'short' }),
        count: 0, quarterly: 0, annual: 0, goodPractices: 0, successStories: 0,
      };
    });
    const byKey = new Map(buckets.map((b) => [`${b.date.getFullYear()}-${b.date.getMonth()}`, b]));
    for (const r of filtered) {
      const d = new Date(r.createdAt);
      if (Number.isNaN(d.getTime())) continue;
      const b = byKey.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (!b) continue;
      b.count += 1;
      if (r.category === 'quarterly') b.quarterly += 1;
      else if (r.category === 'annual') b.annual += 1;
      else if (r.category === 'good-practices') b.goodPractices += 1;
      else if (r.category === 'success-stories') b.successStories += 1;
    }
    return buckets;
  }, [filtered]);

  const byType = useMemo(() => {
    const map = new Map();
    for (const r of filtered) map.set(r.category || 'unknown', (map.get(r.category || 'unknown') ?? 0) + 1);
    return [...map.entries()].map(([key, count]) => ({ key, label: TYPE_LABEL[key] ?? key, count, fill: TYPE_FILL[key] ?? 'var(--chart-1)' }));
  }, [filtered]);

  // Review pipeline replaces the old duplicate line chart: submitted → decided.
  const byStatus = useMemo(() => {
    const order = ['submitted', 'approved', 'rejected'];
    return order.map((s) => ({
      label: s,
      count: filtered.filter((r) => (r.status ?? 'submitted') === s).length,
    }));
  }, [filtered]);

  const total = filtered.length;
  const approved = byStatus.find((b) => b.label === 'approved')?.count ?? 0;
  const pending = byStatus.find((b) => b.label === 'submitted')?.count ?? 0;
  const approvalRate = total === 0 ? null : Math.round((approved / total) * 100);
  const topType = useMemo(() => {
    if (byType.length === 0) return null;
    const top = [...byType].sort((a, b) => b.count - a.count)[0];
    return { ...top, share: total === 0 ? 0 : Math.round((top.count / total) * 100) };
  }, [byType, total]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visible = [...filtered]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(safePage * pageSize, safePage * pageSize + pageSize);

  return (
    <div className="flex flex-col gap-2.5 pb-2 md:gap-3 md:pb-3">
      <PageHero title="Report Summary" subtitle="Creation trends and breakdowns from live submissions"
        bg={stocksBg} overlayClassName="bg-[var(--sendai-teal)]/70" className="rounded-none" />
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
          <FilterSelect label="Report type" value={type} onValueChange={(v) => { setType(v); setPage(0); }} className="lg:w-56" options={TYPES} hideLabel />
          <FilterSelect label="Gender" value={gender} onValueChange={(v) => { setGender(v); setPage(0); }} className="lg:w-56" options={GENDERS} hideLabel />
          <DateRangeFilter preset={preset} onPreset={onPreset} from={from} to={to} onFrom={(v) => { setFrom(v); setPage(0); }} onTo={(v) => { setTo(v); setPage(0); }} hideLabel />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-3 lg:px-6">
        <StatCard label="Total reports" value={total.toLocaleString()} hint="Reports matching filters" icon={File02Icon} tint="text-[var(--sendai-teal)]/10" to="/submit-reports" linkLabel="View Reports" loading={loading} />
        <StatCard label="Approval rate" value={approvalRate === null ? '—' : `${approvalRate}%`} hint={loading ? undefined : `${approved} approved of ${total} in filter`} icon={File02Icon} tint="text-[#00ada8]/10" loading={loading} />
        <StatCard label="Pending review" value={pending.toLocaleString()} hint="Submitted, awaiting decision" icon={File02Icon} tint="text-[var(--sendai-orange)]/10" to="/submit-reports" linkLabel="Review" loading={loading} />
      </div>
      <div className="grid grid-cols-1 gap-3 px-4 lg:px-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-0.5 pt-3"><CardTitle>Report creation trend</CardTitle><CardDescription>New reports per month · last 6 months · stacked by type</CardDescription></CardHeader>
          <CardContent>
            {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p> : (
              <>
                <BarChart data={trend} xDataKey="label" aspectRatio="3 / 1" stacked margin={{ top: 8, right: 16, bottom: 24, left: 16 }}>
                  <Grid horizontal />
                  <Bar dataKey="quarterly" fill={TYPE_FILL.quarterly} />
                  <Bar dataKey="annual" fill={TYPE_FILL.annual} />
                  <Bar dataKey="goodPractices" fill={TYPE_FILL['good-practices']} />
                  <Bar dataKey="successStories" fill={TYPE_FILL['success-stories']} />
                  <BarXAxis maxLabels={6} /><ChartTooltip />
                </BarChart>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
                  {Object.entries(TYPE_LABEL).map(([k, label]) => (
                    <span key={k} className="flex items-center gap-1.5">
                      <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: TYPE_FILL[k] }} />
                      {label}
                    </span>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0.5 pt-3"><CardTitle>Reports by type</CardTitle><CardDescription>{topType ? `${topType.label} is the largest share at ${topType.share}% (${topType.count} of ${total})` : 'Count per report type in filter'}</CardDescription></CardHeader>
          <CardContent>
            {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
              : byType.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No data.</p> : (
              <>
                <BarChart data={byType} xDataKey="label" aspectRatio="3 / 1" margin={{ top: 8, right: 16, bottom: 24, left: 16 }}>
                  <Grid horizontal /><Bar dataKey="count" fill="var(--chart-1)" /><BarXAxis maxLabels={6} /><ChartTooltip />
                </BarChart>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'var(--chart-1)' }} />
                    Reports
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-3 px-4 lg:px-6">
        <Card>
          <CardHeader className="pb-0.5 pt-3"><CardTitle>Review pipeline</CardTitle><CardDescription>{approvalRate === null ? 'No reports in filter' : `${approvalRate}% approved · ${pending} awaiting decision`}</CardDescription></CardHeader>
          <CardContent>
            {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p> : (
              <>
                <BarChart data={byStatus} xDataKey="label" aspectRatio="3 / 1" margin={{ top: 8, right: 16, bottom: 24, left: 16 }}>
                  <Grid horizontal /><Bar dataKey="count" fill="var(--chart-2)" /><BarXAxis maxLabels={6} /><ChartTooltip />
                </BarChart>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'var(--chart-2)' }} />
                    Reports by review status
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0.5 pt-3"><CardTitle>Reports table</CardTitle><CardDescription>{total} reports · newest first</CardDescription></CardHeader>
          <CardContent>
            {loading ? <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
              : filtered.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No reports match the current filters. Clear the type or widen the dates.</p> : (
              <>
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Created</TableHead><TableHead>Report title</TableHead><TableHead>Report type</TableHead><TableHead>Author</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {visible.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(r.createdAt)}</TableCell>
                          <TableCell className="font-medium">
                            <span className="flex min-w-0 items-center gap-2">
                              <HugeiconsIcon icon={File02Icon} size={14} className="shrink-0 text-muted-foreground" />
                              <span className="block max-w-64 truncate">{r.originalName || `Report #${r.id}`}</span>
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{TYPE_LABEL[r.category] || r.category || '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{r.author?.name || '—'}</TableCell>
                          <TableCell>
                            <Badge className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase', statusStyle(r.status || 'submitted'))}>
                              {r.status || 'submitted'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <TablePager page={safePage} pageCount={pageCount} pageSize={pageSize} onPageSize={setPageSize} total={filtered.length}
                  fromIdx={safePage * pageSize + 1} toIdx={Math.min(filtered.length, safePage * pageSize + visible.length)} onPage={setPage} />
              </>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Sample caps at 100 rows (see `useDashboardData` shortcut). Use the analytics endpoint once paging grows.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
