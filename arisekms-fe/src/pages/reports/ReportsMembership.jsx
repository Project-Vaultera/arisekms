import { useEffect, useMemo, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Agreement01Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { api } from '@/api/client.js';
import { PageHero } from '@/components/PageHero.jsx';
import membershipBg from '/bg-memberships.webp';
import { Bar } from '@/components/charts/bar';
import { BarChart } from '@/components/charts/bar-chart';
import { BarXAxis } from '@/components/charts/bar-x-axis';
import { Grid } from '@/components/charts/grid';
import { ChartTooltip } from '@/components/charts/tooltip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { FilterSelect } from '@/components/ui/filter-select.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { DateRangeFilter, presetRange } from '@/components/reports/DateRangeFilter.jsx';
import { StatCard } from '@/components/reports/StatCard.jsx';
import { TablePager } from '@/components/reports/TablePager.jsx';
import { COMPANY_SECTORS, normalizeSector } from '@/lib/company-sectors.js';

const UNSPECIFIED = '__unspecified__';

function sectorOf(p) {
  const s = normalizeSector(p.sector);
  return s === '' ? null : s;
}

function regionOf(p) {
  return p.region || p.province || p.country || p.city || '—';
}

function monthBuckets(count = 6) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString(undefined, { month: 'short' }), count: 0 };
  });
}

function ChartLegend({ items }) {
  return (
    <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
      {items.map((s) => (
        <span key={s.label} className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

export function ReportsMembership() {
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sector, setSector] = useState('all');
  const [region, setRegion] = useState('all');
  const [preset, setPreset] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [usersRes, companiesRes] = await Promise.all([
          api.get('/users', { params: { limit: 100, offset: 0 } }),
          api.get('/companies'),
        ]);
        if (cancelled) return;
        setUsers(usersRes.data.data ?? []);
        const companies = companiesRes.data.data ?? [];
        // Company list now carries sector/region/legalRep — use it directly,
        // fall back to per-profile fetch only when those fields are missing.
        const needsProfile = companies.some((c) => c.sector === undefined);
        if (!needsProfile) {
          setProfiles(companies.map((c) => ({
            id: c.id, name: c.name, sector: c.sector ?? null, region: c.region ?? null,
            legalRepName: c.legalRepName ?? null, province: null, country: null, city: null,
            createdAt: c.createdAt,
          })));
        } else {
          const rows = await Promise.all(
            companies.map((c) =>
              api.get(`/companies/${c.id}/profile`).then((r) => r.data.data).catch(() => null),
            ),
          );
          if (cancelled) return;
          setProfiles(rows.filter(Boolean));
        }
      } catch {
        if (!cancelled) toast.error('Could not load membership analytics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
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

  // Dropdown options come from the canonical taxonomy (not raw free text):
  // canonical sectors present in the data, in taxonomy order, then any legacy
  // values still in the DB, then Unspecified when rows lack a sector.
  const sectorOptions = useMemo(() => {
    const present = new Set(profiles.map((p) => sectorOf(p)).filter(Boolean));
    const canonical = COMPANY_SECTORS.filter((s) => present.has(s)).map((s) => ({ value: s, label: s }));
    const legacy = [...present].filter((s) => !COMPANY_SECTORS.includes(s)).sort()
      .map((s) => ({ value: s, label: `${s} (legacy)` }));
    const opts = [{ value: 'all', label: 'All sectors' }, ...canonical, ...legacy];
    if (profiles.some((p) => sectorOf(p) === null)) opts.push({ value: UNSPECIFIED, label: 'Unspecified' });
    return opts;
  }, [profiles]);
  const regions = useMemo(() => [...new Set(profiles.map(regionOf).filter((r) => r !== '—'))].sort(), [profiles]);

  const filtered = useMemo(() => profiles.filter((p) => {
    if (sector !== 'all') {
      if (sector === UNSPECIFIED) { if (sectorOf(p) !== null) return false; }
      else if ((sectorOf(p) ?? '') !== sector) return false;
    }
    if (region !== 'all' && regionOf(p) !== region) return false;
    if (from && new Date(p.createdAt) < new Date(from)) return false;
    if (to && new Date(p.createdAt) > new Date(`${to}T23:59:59`)) return false;
    return true;
  }), [profiles, sector, region, from, to]);

  const filteredUsers = useMemo(() => users.filter((u) => {
    if (from && new Date(u.createdAt) < new Date(from)) return false;
    if (to && new Date(u.createdAt) > new Date(`${to}T23:59:59`)) return false;
    return true;
  }), [users, from, to]);

  const growth = useMemo(() => {
    const buckets = monthBuckets();
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    for (const p of filtered) {
      const d = new Date(p.createdAt);
      if (Number.isNaN(d.getTime())) continue;
      const b = byKey.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (b) b.count += 1;
    }
    return buckets;
  }, [filtered]);

  const perSector = useMemo(() => {
    const map = new Map();
    for (const p of filtered) {
      const key = sectorOf(p) ?? 'Unspecified';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const total = filtered.length || 1;
    return [...map.entries()]
      .map(([label, count]) => ({ label, count, share: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filtered]);

  const perRegion = useMemo(() => {
    const map = new Map();
    for (const p of filtered) {
      const r = regionOf(p);
      map.set(r, (map.get(r) ?? 0) + 1);
    }
    return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filtered]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [filtered]);
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visible = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const topSector = perSector[0] ?? null;
  const resultSummary = loading ? '' : `${filtered.length} of ${profiles.length} companies`;

  return (
    <div className="flex flex-col gap-2.5 pb-2 md:gap-3 md:pb-3">
      <PageHero title="Membership Reports" subtitle="Totals, growth, and breakdowns linked to live company profiles"
        bg={membershipBg} overlayClassName="bg-[var(--sendai-orange)]/70" className="rounded-none" />
      <div className="px-4 lg:px-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
          <FilterSelect label="Industry Sector" value={sector} onValueChange={(v) => { setSector(v); setPage(0); }} className="lg:w-64" hideLabel
            options={sectorOptions} />
          <FilterSelect label="Region" value={region} onValueChange={(v) => { setRegion(v); setPage(0); }} className="lg:w-56" hideLabel
            options={[{ value: 'all', label: 'All regions' }, ...regions]} />
          <DateRangeFilter preset={preset} onPreset={onPreset} from={from} to={to} onFrom={(v) => { setFrom(v); setPage(0); }} onTo={(v) => { setTo(v); setPage(0); }} hideLabel />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:px-6 xl:grid-cols-3">
        <StatCard label="Total members" value={filteredUsers.length.toLocaleString()} hint="User accounts in the selected dates" icon={UserGroupIcon} tint="text-[#00ada8]/10" to="/member-directory" linkLabel="View Members" loading={loading} />
        <StatCard label="Total companies" value={filtered.length.toLocaleString()} hint={loading ? undefined : `${resultSummary} match the filters`} icon={Agreement01Icon} tint="text-[var(--sendai-teal)]/10" to="/member-directory?tab=companies" linkLabel="View Companies" loading={loading} />
        <StatCard label="Top sector" value={topSector ? `${topSector.share}% ${topSector.label}` : '—'}
          hint={topSector ? `${topSector.count} of ${filtered.length} companies` : 'No sector data in filter'} icon={Agreement01Icon} tint="text-[var(--sendai-orange)]/10" loading={loading} />
      </div>
      <div className="grid grid-cols-1 gap-3 px-4 lg:px-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-0.5 pt-3"><CardTitle>Membership growth</CardTitle><CardDescription>New companies per month · last 6 months · {resultSummary}</CardDescription></CardHeader>
          <CardContent>
            {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p> : (
              <>
                <BarChart data={growth} xDataKey="label" aspectRatio="3 / 1" margin={{ top: 8, right: 16, bottom: 24, left: 16 }}>
                  <Grid horizontal /><Bar dataKey="count" fill="var(--chart-1)" /><BarXAxis maxLabels={6} /><ChartTooltip />
                </BarChart>
                <ChartLegend items={[{ label: 'New companies', color: 'var(--chart-1)' }]} />
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0.5 pt-3"><CardTitle>Companies per sector</CardTitle><CardDescription>{topSector ? `${topSector.label} leads with ${topSector.share}% (${topSector.count} of ${filtered.length})` : 'Share of filtered companies by sector'}</CardDescription></CardHeader>
          <CardContent>
            {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
              : perSector.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No companies match the current filters. Widen the dates or clear the sector.</p> : (
              <>
                <BarChart data={perSector} xDataKey="label" aspectRatio="3 / 1" margin={{ top: 8, right: 16, bottom: 24, left: 16 }}>
                  <Grid horizontal /><Bar dataKey="count" fill="var(--chart-2)" /><BarXAxis maxLabels={6} /><ChartTooltip />
                </BarChart>
                <ChartLegend items={[{ label: 'Companies', color: 'var(--chart-2)' }]} />
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="pb-0.5 pt-3"><CardTitle>Companies per region</CardTitle><CardDescription>Region column with address fallback · {resultSummary}</CardDescription></CardHeader>
          <CardContent>
            {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
              : perRegion.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No companies match the current filters. Widen the dates or clear the region.</p> : (
              <>
                <BarChart data={perRegion} xDataKey="label" aspectRatio="3 / 1" margin={{ top: 8, right: 16, bottom: 24, left: 16 }}>
                  <Grid horizontal /><Bar dataKey="count" fill="var(--chart-4)" /><BarXAxis maxLabels={6} /><ChartTooltip />
                </BarChart>
                <ChartLegend items={[{ label: 'Companies', color: 'var(--chart-4)' }]} />
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader className="pb-0.5 pt-3"><CardTitle>Companies table</CardTitle><CardDescription>{loading ? 'Loading…' : `${resultSummary} · newest first`}</CardDescription></CardHeader>
          <CardContent>
            {loading ? <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
              : filtered.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No companies match the current filters. Clear the sector or widen the dates.</p> : (
              <>
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Company name</TableHead><TableHead>Legal representative</TableHead><TableHead>Region</TableHead><TableHead>Industry sector</TableHead><TableHead>Joined</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {visible.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>{p.legalRepName || '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{regionOf(p)}</TableCell>
                          <TableCell className="text-muted-foreground">{sectorOf(p) || '—'}</TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <TablePager page={safePage} pageCount={pageCount} pageSize={pageSize} onPageSize={setPageSize} total={filtered.length}
                  fromIdx={safePage * pageSize + 1} toIdx={Math.min(filtered.length, safePage * pageSize + visible.length)} onPage={setPage} />
              </>
            )}
            <p className="mt-2 text-xs text-muted-foreground">Region = region column, falling back to province/country/city for legacy rows.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
