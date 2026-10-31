import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { api } from '@/api/client.js';
import { Area } from '@/components/charts/area';
import { AreaChart } from '@/components/charts/area-chart';
import { XAxis } from '@/components/charts/x-axis';
import { Bar } from '@/components/charts/bar';
import { BarChart } from '@/components/charts/bar-chart';
import { BarXAxis } from '@/components/charts/bar-x-axis';
import { Grid } from '@/components/charts/grid';
import { ChartTooltip } from '@/components/charts/tooltip';
import { PageHeader } from '@/components/PageHeader.jsx';
import { StatCard } from '@/components/reports/StatCard.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx';
import { FilterSelect } from '@/components/ui/filter-select.jsx';
import { Input } from '@/components/ui/input.jsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.jsx';

function fmtDate(raw) {
  if (!raw) return '—';
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function dayKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function rankBy(logs, pick, limit = 8) {
  const map = {};
  for (const l of logs) {
    const k = pick(l) || '—';
    map[k] = (map[k] ?? 0) + 1;
  }
  return Object.entries(map)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function Legend({ items }) {
  return (
    <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
      {items.map((s) => (
        <span key={s.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: s.color }}
          />
          {s.label}
        </span>
      ))}
    </div>
  );
}

function OutcomeDonut({ success, errors, size = 168, thickness = 28, hover, selected, onHover, onSelect }) {
  const total = success + errors;
  // -4 headroom: hover thickens the stroke, which must stay inside the viewBox.
  const r = (size - thickness) / 2 - 4;
  const c = size / 2;
  const errFrac = total === 0 ? 0 : errors / total;
  const shown = hover ?? selected;
  const centerValue = shown === 'error' ? errors : shown === 'success' ? success : total;
  const centerLabel = shown === 'error' ? 'Errors' : shown === 'success' ? 'Success' : 'Writes';
  const dim = (kind) => {
    const active = hover ?? selected;
    return active !== null && active !== undefined && active !== kind;
  };
  const slice = (kind, color, frac, offset) => (
    <g
      key={kind}
      tabIndex={0}
      role="button"
      aria-label={`Filter trail: ${kind}`}
      style={{ cursor: 'pointer', outline: 'none' }}
      opacity={dim(kind) ? 0.35 : 1}
      onMouseEnter={() => onHover(kind)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(kind)}
      onBlur={() => onHover(null)}
      onClick={() => onSelect(kind)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(kind);
        }
      }}
    >
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={thickness + (hover === kind ? 6 : 0)}
        pathLength={100}
        strokeDasharray={`${frac * 100} 100`}
        strokeDashoffset={-offset * 100}
        transform={`rotate(-90 ${c} ${c})`}
      />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${success} success, ${errors} errors`}>
      {slice('success', 'var(--sendai-teal)', 1 - errFrac, 0)}
      {errors > 0 && slice('error', 'var(--sendai-crimson)', errFrac, 1 - errFrac)}
      <text x={c} y={c - 2} textAnchor="middle" dominantBaseline="central" fontSize={20} fontWeight={700} fill="currentColor" pointerEvents="none">
        {centerValue}
      </text>
      <text x={c} y={c + 16} textAnchor="middle" dominantBaseline="central" fontSize={10} fill="var(--muted-foreground)" pointerEvents="none">
        {centerLabel}
      </text>
    </svg>
  );
}

function RankedList({ items }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-2 text-sm">
          <span className="w-40 truncate font-mono text-xs">{i.label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-[var(--sendai-teal)]" style={{ width: `${(i.count / max) * 100}%` }} />
          </div>
          <span className="w-10 text-right text-xs text-muted-foreground">{i.count}</span>
        </div>
      ))}
      {items.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">No rows yet.</p>
      )}
    </div>
  );
}

export function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [action, setAction] = useState('all');
  const [entity, setEntity] = useState('all');
  const [outcome, setOutcome] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);

  const [debouncedQ, setDebouncedQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setLoading(true);
    const params = { limit: pageSize, offset: page * pageSize };
    if (action !== 'all') params.action = action;
    if (entity !== 'all') params.entityType = entity;
    if (outcome !== 'all') params.outcome = outcome;
    if (debouncedQ) params.search = debouncedQ;
    api
      .get('/audit-logs', { params })
      .then((res) => {
        setLogs(res.data.data ?? []);
        setTotal(res.data.meta?.count ?? 0);
      })
      .catch(() => toast.error('Could not load audit logs'))
      .finally(() => setLoading(false));
  }, [action, entity, outcome, debouncedQ, page, pageSize]);

  // Distinct values come from the loaded page; pick All to clear a filter
  // that no longer appears on this page.
  const actions = useMemo(() => [...new Set(logs.map((l) => l.action).filter(Boolean))].sort(), [logs]);
  const entities = useMemo(() => [...new Set(logs.map((l) => l.entityType).filter(Boolean))].sort(), [logs]);

  const rows = logs;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visible = rows;

  function updateFilter(setter, value) {
    setter(value);
    setPage(0);
  }

  // Charts aggregate the current page only; use BE aggregates when the trail grows.
  const errors = useMemo(() => logs.filter((l) => l.outcome === 'error').length, [logs]);
  const errorRate = useMemo(
    () => (logs.length === 0 ? '—' : `${((errors / logs.length) * 100).toFixed(1)}%`),
    [logs, errors],
  );
  const distinctActors = useMemo(
    () => new Set(logs.map((l) => l.actorId).filter((a) => a !== null && a !== undefined)).size,
    [logs],
  );
  const perDay = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ key: dayKey(d), label: `${d.getMonth() + 1}/${d.getDate()}`, count: 0, errors: 0 });
    }
    const byKey = Object.fromEntries(days.map((d) => [d.key, d]));
    for (const l of logs) {
      const t = new Date(l.createdAt);
      if (Number.isNaN(t.getTime())) continue;
      const bucket = byKey[dayKey(t)];
      if (!bucket) continue;
      bucket.count += 1;
      if (l.outcome === 'error') bucket.errors += 1;
    }
    return days;
  }, [logs]);
  const topActions = useMemo(() => rankBy(logs, (l) => l.action), [logs]);
  const topEntities = useMemo(() => rankBy(logs, (l) => l.entityType), [logs]);
  // Cumulative growth curve: running totals, distinct from the daily bars.
  const cumulative = useMemo(() => {
    let total = 0;
    let errs = 0;
    return perDay.map((d) => {
      total += d.count;
      errs += d.errors;
      return { ...d, total, errs };
    });
  }, [perDay]);
  const [donutHover, setDonutHover] = useState(null);
  // Selected slice mirrors the trail outcome filter (single source of truth).
  const donutSelected = outcome === 'all' ? null : outcome;

  function toggleDonutOutcome(kind) {
    // kind: 'success' | 'error'
    updateFilter(setOutcome, donutSelected === kind ? 'all' : kind);
  }
  const recentLogins = useMemo(
    () =>
      logs
        .filter((l) => (l.entityType || '').endsWith('auth/login'))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8),
    [logs],
  );
  const notableEvents = useMemo(() => {
    const interesting = (l) =>
      l.action === 'USER_ROLE_CHANGED' ||
      l.action === 'USER_ACCESS_TOGGLED' ||
      (l.action || '').startsWith('MEMBERSHIP_');
    return logs
      .filter(interesting)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [logs]);

  return (
    <div className="flex flex-col gap-3 py-1.5">
      <PageHeader
        title="Audit Logs"
        subtitle="Mutating requests and sensitive admin actions across the system"
      />
      <div className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 lg:px-6 xl:grid-cols-4">
        <StatCard label="Rows (total)" value={total} hint="All matching writes" loading={loading} />
        <StatCard label="Errors (page)" value={errors} hint="Outcome = error · current page" tint="text-[var(--sendai-crimson)]/10" loading={loading} />
        <StatCard label="Error rate (page)" value={errorRate} hint="Errors ÷ page rows" tint="text-[var(--sendai-orange)]/10" loading={loading} />
        <StatCard label="Distinct actors (page)" value={distinctActors} hint="Non-null actor ids · current page" tint="text-[#0B4484]/10" loading={loading} />
      </div>
      <div className="grid grid-cols-1 gap-3 px-4 lg:px-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-0.5 pt-3">
            <CardTitle>Cumulative growth</CardTitle>
            <CardDescription>Running total · last 14 days</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col pt-0 pb-3">
            {loading ? (
              <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">Loading…</p>
            ) : (
              <>
              <AreaChart data={cumulative} xDataKey="label" aspectRatio="3 / 1" margin={{ top: 8, right: 16, bottom: 24, left: 16 }}>
                <Grid horizontal />
                <Area dataKey="total" fill="var(--chart-1)" fillOpacity={0.12} showLine stroke="var(--chart-1)" strokeWidth={2} />
                <Area dataKey="errs" fill="var(--sendai-crimson)" fillOpacity={0.12} showLine stroke="var(--sendai-crimson)" strokeWidth={2} />
                <XAxis />
                <ChartTooltip />
              </AreaChart>
              <div className="mt-auto pt-2">
              <Legend
                items={[
                  { label: 'Total writes', color: 'var(--chart-1)' },
                  { label: 'Errors', color: 'var(--sendai-crimson)' },
                ]}
              />
              </div>
            </>
            )}
          </CardContent>
        </Card>
        <Card className="flex flex-col">
          <CardHeader className="pb-0.5 pt-3">
            <CardTitle>Outcome split</CardTitle>
            <CardDescription>Success vs error · snapshot</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col pt-0 pb-3">
            {loading ? (
              <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">Loading…</p>
            ) : logs.length === 0 ? (
              <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">No rows yet.</p>
            ) : (
              <>
              <div className="flex flex-1 flex-col items-center justify-center">
                <OutcomeDonut
                  success={logs.length - errors}
                  errors={errors}
                  size={168}
                  thickness={28}
                  hover={donutHover}
                  selected={donutSelected}
                  onHover={setDonutHover}
                  onSelect={toggleDonutOutcome}
                />
              </div>
              <div className="mt-auto pt-2">
              <Legend
                items={[
                  { label: 'Success', color: 'var(--sendai-teal)' },
                  { label: 'Error', color: 'var(--sendai-crimson)' },
                ]}
              />
              </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="mx-4 lg:mx-6">
        <CardHeader className="pb-0.5 pt-3">
          <CardTitle>Writes per day</CardTitle>
          <CardDescription>Daily volume · last 14 days · errors stacked</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          {loading ? (
            <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
            <BarChart data={perDay} xDataKey="label" aspectRatio="4 / 1" stacked margin={{ top: 8, right: 16, bottom: 24, left: 16 }}>
              <Grid horizontal />
              <Bar dataKey="count" fill="var(--chart-1)" />
              <Bar dataKey="errors" fill="var(--chart-5)" />
              <BarXAxis maxLabels={14} />
              <ChartTooltip />
            </BarChart>
            <Legend
              items={[
                { label: 'Total writes', color: 'var(--chart-1)' },
                { label: 'Errors', color: 'var(--chart-5)' },
              ]}
            />
            </>
          )}
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-3 px-4 lg:px-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-0.5 pt-3">
            <CardTitle>Top actions</CardTitle>
            <CardDescription>By row count</CardDescription>
          </CardHeader>
          <CardContent><RankedList items={topActions} /></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0.5 pt-3">
            <CardTitle>Top entities</CardTitle>
            <CardDescription>By row count</CardDescription>
          </CardHeader>
          <CardContent><RankedList items={topEntities} /></CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-3 px-4 lg:px-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-0.5 pt-3">
            <CardTitle>Recent logins</CardTitle>
            <CardDescription>Latest attempts · errors are failed logins</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentLogins.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-medium">{l.metadata?.owner ?? l.entityId ?? '—'}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge variant={l.outcome === 'error' ? 'destructive' : 'default'}>
                      {l.outcome === 'error' ? 'Failed' : 'OK'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{fmtDate(l.createdAt)}</span>
                  </span>
                </div>
              ))}
              {!loading && recentLogins.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">No logins recorded yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0.5 pt-3">
            <CardTitle>Notable events</CardTitle>
            <CardDescription>Role changes, access toggles, membership decisions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {notableEvents.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate"><Badge variant="secondary">{l.action}</Badge></span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {l.entityType}{l.entityId ? ` · ${l.entityId}` : ''}
                  </span>
                </div>
              ))}
              {!loading && notableEvents.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">No notable events yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="mx-4 lg:mx-6">
        <CardHeader>
          <CardTitle>Trail ({total} rows)</CardTitle>
          <CardDescription>
            Governance is IT-admin only. Reads are never audited; writes are.
            {donutSelected !== null && ` Filtered by chart: ${donutSelected} only — click the slice again to clear.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search action, entity, actor…"
              value={q}
              onChange={(e) => updateFilter(setQ, e.target.value)}
              className="max-w-xs"
            />
            <FilterSelect
              value={action}
              onValueChange={(v) => updateFilter(setAction, v)}
              placeholder="Action"
              className="lg:w-44"
              options={[{ value: 'all', label: 'All' }, ...actions.map((a) => ({ value: a, label: a }))]}
            />
            <FilterSelect
              value={entity}
              onValueChange={(v) => updateFilter(setEntity, v)}
              placeholder="Entity"
              className="lg:w-52"
              options={[{ value: 'all', label: 'All' }, ...entities.map((e) => ({ value: e, label: e }))]}
            />
            <FilterSelect
              value={outcome}
              onValueChange={(v) => updateFilter(setOutcome, v)}
              placeholder="Outcome"
              className="lg:w-36"
              options={[
                { value: 'all', label: 'All' },
                { value: 'success', label: 'Success' },
                { value: 'error', label: 'Error' },
              ]}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(l.createdAt)}</TableCell>
                  <TableCell><Badge variant="secondary">{l.action}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{l.entityType}{l.entityId ? ` · ${l.entityId}` : ''}</TableCell>
                  <TableCell>{l.actorId ?? '—'}</TableCell>
                  <TableCell>
                    {l.outcome ? (
                      <Badge variant={l.outcome === 'error' ? 'destructive' : 'default'}>{l.outcome}</Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setViewing(l)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No audit rows match.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {total > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-3">
                <FilterSelect
                  value={String(pageSize)}
                  onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}
                  placeholder="10"
                  className="w-24"
                  options={['10', '25', '50', '100']}
                />
                <p className="text-xs text-muted-foreground">
                  Showing {total === 0 ? 0 : safePage * pageSize + 1}–{Math.min(total, safePage * pageSize + visible.length)} of {total}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
                  Previous
                </Button>
                <span className="px-1 text-xs text-muted-foreground">Page {safePage + 1} of {pageCount}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= pageCount - 1}
                  onClick={() => setPage(safePage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit detail</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="grid gap-3 text-sm">
              <p>{viewing.action} · <span className="font-mono">{viewing.entityType}{viewing.entityId ? ` · ${viewing.entityId}` : ''}</span></p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><span className="text-muted-foreground">Actor: </span>{viewing.actorId ?? '—'}</div>
                <div><span className="text-muted-foreground">Outcome: </span>{viewing.outcome ?? '—'}{viewing.statusCode ? ` (${viewing.statusCode})` : ''}</div>
                <div className="sm:col-span-2"><span className="text-muted-foreground">Time: </span>{fmtDate(viewing.createdAt)}</div>
              </div>
              <details>
                <summary className="cursor-pointer text-sm text-muted-foreground">Raw metadata</summary>
                <pre className="max-h-80 overflow-auto rounded-lg bg-muted/40 p-3 font-mono text-xs whitespace-pre-wrap">
                  {viewing.metadata ? JSON.stringify(viewing.metadata, null, 2) : 'No metadata recorded.'}
                </pre>
              </details>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
