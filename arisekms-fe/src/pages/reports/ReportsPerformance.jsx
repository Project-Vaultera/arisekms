import { useEffect, useMemo, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Award01Icon, File02Icon, Medal01Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { api } from '@/api/client.js';
import { PageHero } from '@/components/PageHero.jsx';
import metricsBg from '/metrics-arise.webp';
import { Bar } from '@/components/charts/bar';
import { BarChart } from '@/components/charts/bar-chart';
import { BarXAxis } from '@/components/charts/bar-x-axis';
import { Grid } from '@/components/charts/grid';
import { ChartTooltip } from '@/components/charts/tooltip';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { FilterSelect } from '@/components/ui/filter-select.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { ActivityForm, ACTIVITY_TYPE_OPTIONS } from '@/components/activities/ActivityForm.jsx';
import { DateRangeFilter, presetRange } from '@/components/reports/DateRangeFilter.jsx';
import { StatCard } from '@/components/reports/StatCard.jsx';
import { TablePager } from '@/components/reports/TablePager.jsx';
import { TARGET_AUDIENCES } from '@/lib/target-audiences.js';
import { getTokenRoles } from '@/lib/rbac.js';
import { cn } from '@/lib/utils.js';

const ACTIVITY_TYPES = [{ value: 'all', label: 'All activity' }, ...ACTIVITY_TYPE_OPTIONS];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

function inRange(raw, from, to) {
  if (!raw) return false;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return false;
  if (from && d < new Date(from)) return false;
  if (to && d > new Date(`${to}T23:59:59`)) return false;
  return true;
}

function effDate(a) {
  return a.happenedAt ?? a.createdAt;
}

function statusStyle(status) {
  if (status === 'approved') return 'bg-[var(--sendai-teal)]/10 text-[var(--sendai-teal)]';
  if (status === 'rejected') return 'bg-[var(--sendai-crimson)]/10 text-[var(--sendai-crimson)]';
  return 'bg-[var(--sendai-orange)]/10 text-[var(--sendai-orange)]';
}

export function ReportsPerformance() {
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [activity, setActivity] = useState('all');
  const [audience, setAudience] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [actingId, setActingId] = useState(null);

  const isAdmin = getTokenRoles().includes('ADMIN');

  function refreshActivities() {
    return api.get('/activities', { params: { limit: 100, offset: 0 } })
      .then((res) => setActivities(res.data.data ?? []))
      .catch(() => toast.error('Could not load activities'));
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get('/users', { params: { limit: 100, offset: 0 } }),
      api.get('/reports', { params: { limit: 100, offset: 0 } }),
      api.get('/certificates', { params: { limit: 100, offset: 0 } }),
      api.get('/activities', { params: { limit: 100, offset: 0 } }).catch(() => ({ data: { data: [] } })),
    ])
      .then(([u, r, c, a]) => {
        if (cancelled) return;
        setUsers(u.data.data ?? []);
        setReports(r.data.data ?? []);
        setCertificates(c.data.data ?? []);
        setActivities(a.data.data ?? []);
      })
      .catch(() => { if (!cancelled) toast.error('Could not load performance data'); })
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

  const audiences = useMemo(() => {
    const legacy = [...new Set(
      activities.map((a) => a.targetAudience).filter((t) => t && !TARGET_AUDIENCES.includes(t)),
    )].sort();
    return [{ value: 'all', label: 'All audiences' }, ...TARGET_AUDIENCES, ...legacy];
  }, [activities]);

  const filteredActivities = useMemo(() => activities.filter((a) => {
    if (activity !== 'all' && a.activityType !== activity) return false;
    if (audience !== 'all' && (a.targetAudience ?? '') !== audience) return false;
    if (status !== 'all' && (a.status ?? '') !== status) return false;
    if ((from || to) && !inRange(effDate(a), from, to)) return false;
    return true;
  }), [activities, activity, audience, status, from, to]);

  const filteredReports = useMemo(() => reports.filter((r) => {
    if ((from || to) && !inRange(r.createdAt, from, to)) return false;
    return true;
  }), [reports, from, to]);

  const approvedOnly = useMemo(() => filteredActivities.filter((a) => (a.status ?? 'submitted') === 'approved'), [filteredActivities]);

  const kpis = useMemo(() => {
    const countType = (t) => approvedOnly.filter((a) => a.activityType === t).length;
    const sum = (key) => approvedOnly.reduce((n, a) => n + (Number(a[key]) || 0), 0);
    return {
      international: approvedOnly.filter((a) => a.isInternational || a.activityType === 'international-response').length,
      youth: sum('youthCount'),
      technical: countType('technical-assistance'),
      f2f: sum('trainedCount'),
      collaborations: countType('collaboration'),
    };
  }, [approvedOnly]);

  const activeMembers = useMemo(
    () => users.filter((u) => !u.isAccountDisabled && (!from && !to ? true : inRange(u.createdAt, from, to))).length,
    [users, from, to],
  );
  const skillsbuild = useMemo(
    () => certificates.filter((c) => (!from && !to ? true : inRange(c.createdAt, from, to))).length,
    [certificates, from, to],
  );

  const byStatus = useMemo(() => {
    const order = ['submitted', 'approved', 'rejected'];
    return order.map((s) => ({
      label: s,
      count: filteredActivities.filter((a) => (a.status ?? 'submitted') === s).length,
    }));
  }, [filteredActivities]);

  // Approved-activity momentum: what the KPI cards are built from, per month.
  const approvedTrend = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString(undefined, { month: 'short' }), count: 0 };
    });
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const a of approvedOnly) {
      const d = new Date(effDate(a));
      if (Number.isNaN(d.getTime())) continue;
      const b = byKey.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (b) b.count += 1;
    }
    return buckets;
  }, [approvedOnly]);

  const approvedCount = approvedOnly.length;
  const decidedCount = filteredActivities.filter((a) => (a.status ?? 'submitted') !== 'submitted').length;
  const approvalShare = filteredActivities.length === 0 ? null
    : Math.round((approvedCount / filteredActivities.length) * 100);

  const pageCount = Math.max(1, Math.ceil(filteredActivities.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visible = [...filteredActivities]
    .sort((a, b) => new Date(effDate(b) ?? 0) - new Date(effDate(a) ?? 0))
    .slice(safePage * pageSize, safePage * pageSize + pageSize);

  async function decide(id, nextStatus) {
    setActingId(id);
    try {
      await api.patch(`/activities/${id}`, { status: nextStatus });
      toast.success(nextStatus === 'approved' ? 'Activity approved' : 'Activity rejected');
      await refreshActivities();
    } catch {
      toast.error('Action failed');
    } finally {
      setActingId(null);
    }
  }

  const val = (n) => (loading ? '—' : n.toLocaleString());

  return (
    <div className="flex flex-col gap-2.5 py-1.5 md:gap-3 md:py-2">
      <PageHero title="Performance and Metrics" subtitle="Manual activity entries feed the KPI cards; reports stay as proxies"
        bg={metricsBg} overlayClassName="bg-[var(--sendai-plum)]/70" />
      <div className="px-4 lg:px-6">
        <Card>
          <CardContent className="flex flex-col gap-2 pt-4 lg:flex-row lg:items-end">
            <DateRangeFilter preset={preset} onPreset={onPreset} from={from} to={to} onFrom={(v) => { setFrom(v); setPage(0); }} onTo={(v) => { setTo(v); setPage(0); }} />
            <FilterSelect label="Activity type" value={activity} onValueChange={(v) => { setActivity(v); setPage(0); }} className="lg:w-56" options={ACTIVITY_TYPES} />
            <FilterSelect label="Target audience" value={audience} onValueChange={(v) => { setAudience(v); setPage(0); }} className="lg:w-56"
              options={audiences} />
            <FilterSelect label="Status" value={status} onValueChange={(v) => { setStatus(v); setPage(0); }} className="lg:w-44" options={STATUS_OPTIONS} />
          </CardContent>
        </Card>
        <p className="mt-1 px-1 text-xs text-muted-foreground">KPI cards count approved activities only. Target audience is live from logged activities.</p>
      </div>
      <p className="px-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase lg:px-6">Key outcomes · approved activities only</p>
      <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:px-6 xl:grid-cols-5">
        <StatCard label="International responses" value={val(kpis.international)} hint="Approved only" icon={Medal01Icon} tint="text-[var(--sendai-teal)]/10" loading={loading} />
        <StatCard label="Youth reached" value={val(kpis.youth)} hint="Sum of youth counts" icon={UserGroupIcon} tint="text-[#00ada8]/10" loading={loading} />
        <StatCard label="Technical assistance" value={val(kpis.technical)} hint="Approved only" icon={File02Icon} tint="text-[var(--sendai-orange)]/10" loading={loading} />
        <StatCard label="Trained via F2F" value={val(kpis.f2f)} hint="Sum of trained counts" icon={Award01Icon} tint="text-[var(--sendai-plum)]/10" loading={loading} />
        <StatCard label="Collaborations" value={val(kpis.collaborations)} hint="Approved only" icon={Medal01Icon} tint="text-[var(--sendai-teal)]/10" loading={loading} />
      </div>
      <p className="px-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase lg:px-6">Context · not KPIs</p>
      <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:px-6 xl:grid-cols-4">
        <StatCard label="Active members" value={val(activeMembers)} hint="Users · live" icon={UserGroupIcon} tint="text-[#00ada8]/10" loading={loading} />
        <StatCard label="SkillsBuild proxy" value={val(skillsbuild)} hint="Certificates issued · proxy, not enrollment" icon={Award01Icon} tint="text-[var(--sendai-orange)]/10" loading={loading} />
        <StatCard label="Reports in date range" value={val(filteredReports.length)} hint="Reports matching dates" icon={File02Icon} tint="text-[var(--sendai-teal)]/10" loading={loading} />
        <StatCard label="Activities logged" value={val(filteredActivities.length)} hint="Matching date/type/audience/status" icon={Medal01Icon} tint="text-[var(--sendai-plum)]/10" loading={loading} />
      </div>
      <div className="grid grid-cols-1 gap-3 px-4 lg:px-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-0.5 pt-3"><CardTitle>Review pipeline</CardTitle><CardDescription>{approvalShare === null ? 'No activities in filter' : `${approvalShare}% approved · ${decidedCount} decided of ${filteredActivities.length}`}</CardDescription></CardHeader>
          <CardContent>
            {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p> : (
              <>
                <BarChart data={byStatus} xDataKey="label" aspectRatio="4 / 1" margin={{ top: 8, right: 16, bottom: 24, left: 16 }}>
                  <Grid horizontal /><Bar dataKey="count" fill="var(--chart-2)" /><BarXAxis maxLabels={3} /><ChartTooltip />
                </BarChart>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'var(--chart-2)' }} />Activities</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0.5 pt-3"><CardTitle>Approved momentum</CardTitle><CardDescription>Approved activities per month · last 6 months · feeds the KPIs above</CardDescription></CardHeader>
          <CardContent>
            {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p> : (
              <>
                <BarChart data={approvedTrend} xDataKey="label" aspectRatio="4 / 1" margin={{ top: 8, right: 16, bottom: 24, left: 16 }}>
                  <Grid horizontal /><Bar dataKey="count" fill="var(--chart-1)" /><BarXAxis maxLabels={6} /><ChartTooltip />
                </BarChart>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'var(--chart-1)' }} />Approved activities</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="pb-0.5 pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><CardTitle>Activity log</CardTitle><CardDescription>{filteredActivities.length} rows · newest first · approved feed the KPIs</CardDescription></div>
              <Button size="sm" onClick={() => setFormOpen(true)}>Log activity</Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
              : filteredActivities.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No activities yet — log the first one.</p> : (
              <>
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Title</TableHead><TableHead>Activity</TableHead><TableHead>Audience</TableHead><TableHead className="text-right">Youth</TableHead><TableHead className="text-right">Trained</TableHead><TableHead>Status</TableHead>{isAdmin && <TableHead className="text-right">Review</TableHead>}</TableRow></TableHeader>
                    <TableBody>
                      {visible.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="whitespace-nowrap text-muted-foreground">{effDate(a) ? new Date(effDate(a)).toLocaleDateString() : '—'}</TableCell>
                          <TableCell className="font-medium">{a.title}</TableCell>
                          <TableCell className="text-muted-foreground">{a.activityType}{a.isInternational ? ' · intl' : ''}</TableCell>
                          <TableCell className="text-muted-foreground">{a.targetAudience || '—'}</TableCell>
                          <TableCell className="text-right tabular-nums">{a.youthCount ?? '—'}</TableCell>
                          <TableCell className="text-right tabular-nums">{a.trainedCount ?? '—'}</TableCell>
                          <TableCell>
                            <Badge className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase', statusStyle(a.status))}>
                              {a.status}
                            </Badge>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              {(a.status ?? 'submitted') === 'submitted' ? (
                                <div className="flex justify-end gap-1">
                                  <Button size="sm" disabled={actingId === a.id} onClick={() => decide(a.id, 'approved')}>Approve</Button>
                                  <Button size="sm" variant="outline" className="text-[var(--sendai-crimson)]" disabled={actingId === a.id} onClick={() => decide(a.id, 'rejected')}>Reject</Button>
                                </div>
                              ) : <span className="text-xs text-muted-foreground">—</span>}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <TablePager page={safePage} pageCount={pageCount} pageSize={pageSize} onPageSize={setPageSize} total={filteredActivities.length}
                  fromIdx={safePage * pageSize + 1} toIdx={Math.min(filteredActivities.length, safePage * pageSize + visible.length)} onPage={setPage} />
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log activity</DialogTitle>
            <DialogDescription>Manual entry feeds the KPI cards after approval.</DialogDescription>
          </DialogHeader>
          <ActivityForm onSuccess={() => { setFormOpen(false); refreshActivities(); }} />
          <div className="mt-3">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
