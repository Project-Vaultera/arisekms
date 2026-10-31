import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Medal01Icon, TrophyIcon } from '@hugeicons/core-free-icons';

import { api } from '@/api/client.js';
import { PageHeader } from '@/components/PageHeader.jsx';
import { SendaiFrame } from '@/components/SendaiFrame.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { cn } from '@/lib/utils.js';
import { effectiveRole, getTokenRoles, ROLE } from '@/lib/rbac.js';

// shortcut: static fallback until the first verified certificate lands;
// the table below always prefers live GET /companies + /certificates data.
const FALLBACK_ROWS = [
  { companyName: 'Asia Pacific College', members: 3, d7: 0, d30: 1, total: 4 },
  { companyName: 'Revolutionizing Healthcare', members: 1, d7: 0, d30: 0, total: 3 },
  { companyName: '2Go Group, Inc', members: 1, d7: 0, d30: 0, total: 2 },
  { companyName: 'Asian Institute of Management Inc.', members: 1, d7: 0, d30: 0, total: 2 },
  { companyName: 'Innovative Solutions Group', members: 1, d7: 0, d30: 0, total: 2 },
  { companyName: 'NovaTech Solutions', members: 1, d7: 0, d30: 0, total: 2 },
  { companyName: 'Nexora Solutions', members: 1, d7: 0, d30: 0, total: 2 },
  { companyName: 'All Around Services and Merchandising Corporation', members: 1, d7: 0, d30: 0, total: 1 },
];

const RECORD_TABS = [
  { id: 'all', label: 'All Records' },
  { id: 'approved', label: 'Approved Only' },
];

const RANGE_TABS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'd7', label: 'Last 7 Days' },
  { id: 'd30', label: 'Last 30 Days' },
  { id: 'q', label: 'Last Quarter' },
];

const DAY = 86_400_000;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function inRange(dateIssued, range, today) {
  if (range === 'all') return true;
  const t = new Date(`${dateIssued}T00:00:00`).getTime();
  if (Number.isNaN(t)) return false;
  if (range === 'today') return t >= today;
  if (range === 'd7') return t >= today - 6 * DAY;
  if (range === 'd30') return t >= today - 29 * DAY;
  return t >= today - 89 * DAY; // Last Quarter = trailing 90 days
}

function initials(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-[10px] border border-border bg-muted/50 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            'rounded-[7px] px-3 py-1.5 text-xs font-medium whitespace-nowrap transition',
            value === o.id ? 'bg-[#0B4484] text-white shadow' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const PODIUM = {
  1: { bar: 'bg-[#0B4484]', badge: 'bg-[#0B4484]', trophy: 'text-[#0B4484]', cert: 'text-[#0B4484]' },
  2: { bar: 'bg-[var(--sendai-crimson)]', badge: 'bg-[var(--sendai-crimson)]', trophy: 'text-[var(--sendai-crimson)]', cert: 'text-[var(--sendai-crimson)]' },
  3: { bar: 'bg-[var(--sendai-plum)]', badge: 'bg-[var(--sendai-plum)]', trophy: 'text-[var(--sendai-plum)]', cert: 'text-[var(--sendai-plum)]' },
};

function PodiumCard({ row, rank, className, selected, onSelect }) {
  const a = PODIUM[rank];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.();
        }
      }}
      className={cn('relative flex cursor-pointer flex-col items-center rounded-xl border border-border bg-card px-6 pt-9 pb-6 text-center shadow-sm', selected && 'ring-2 ring-[#0B4484]', className)}
    >
      <span aria-hidden className={cn('absolute inset-x-0 top-0 h-1 rounded-t-xl', a.bar)} />
      <span className={cn('absolute -top-5 left-1/2 flex size-11 -translate-x-1/2 items-center justify-center rounded-full text-lg font-bold text-white shadow ring-4 ring-background', a.badge)}>
        {rank}
      </span>
      <HugeiconsIcon icon={TrophyIcon} size={26} strokeWidth={1.6} className={cn('absolute top-3 right-4', a.trophy)} />
      <span aria-hidden className="flex size-16 items-center justify-center rounded-full border border-border bg-muted text-lg font-bold text-[#0B4484]">
        {initials(row.companyName)}
      </span>
      <p className="mt-3 text-sm font-semibold">{row.companyName}</p>
      <div className="mt-4 grid w-full grid-cols-3 border-t border-border pt-3">
        <div>
          <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Members</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{row.members}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Rank</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">#{rank}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Certs</p>
          <p className={cn('mt-1 text-lg font-semibold tabular-nums', a.cert)}>{row.total}</p>
        </div>
      </div>
    </div>
  );
}

function Count({ value }) {  if (!value) {
    return (
      <span className="inline-flex min-w-9 items-center justify-center rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
        –
      </span>
    );
  }
  return <span className="tabular-nums">{value}</span>;
}

function Sparkline({ certs }) {
  const today = startOfToday();
  const buckets = Array.from({ length: 30 }, (_, i) => ({ key: today - (29 - i) * DAY, count: 0 }));
  for (const c of certs) {
    const t = new Date(`${c.dateIssued ?? ''}T00:00:00`).getTime();
    if (Number.isNaN(t)) continue;
    const idx = Math.round((t - (today - 29 * DAY)) / DAY);
    if (idx >= 0 && idx < 30) buckets[idx].count += 1;
  }
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const total = buckets.reduce((n, b) => n + b.count, 0);
  return (
    <div>
      <div className="mt-2 flex h-16 items-end gap-[3px]">
        {buckets.map((b) => (
          <div
            key={b.key}
            className={cn('min-w-0 flex-1 rounded-sm', b.count > 0 ? 'bg-[var(--sendai-teal)]/80' : 'bg-muted')}
            style={{ height: `${Math.max(4, (b.count / max) * 56)}px` }}
            title={`${new Date(b.key).toLocaleDateString()}: ${b.count}`}
          />
        ))}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{total} in the last 30 days</p>
    </div>
  );
}

function SplitBar({ certs }) {
  if (certs.length === 0) return <p className="mt-2 text-xs text-muted-foreground">No certificates in this view.</p>;
  const verified = certs.filter((c) => c.status === 'verified').length;
  const segments = [
    { label: 'Verified', value: verified, bar: 'bg-[var(--sendai-teal)]', dot: 'bg-[var(--sendai-teal)]' },
    { label: 'Pending', value: certs.length - verified, bar: 'bg-[var(--sendai-orange)]', dot: 'bg-[var(--sendai-orange)]' },
  ];
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        {segments.map((s) => (
          <div
            key={s.label}
            className={s.bar}
            style={{ width: `${(s.value / certs.length) * 100}%` }}
            title={`${s.label}: ${s.value}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className={cn('size-2 rounded-full', s.dot)} />
            {s.label} · {s.value}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Leaderboards() {
  const [record, setRecord] = useState('all');
  const [range, setRange] = useState('all');
  const [companies, setCompanies] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [coRes, certRes] = await Promise.all([
          api.get('/companies'),
          (async () => {
            const all = [];
            let offset = 0;
            for (let i = 0; i < 20; i++) {
              const res = await api.get('/certificates', { params: { limit: 100, offset } });
              const batch = res.data.data ?? [];
              all.push(...batch);
              if (batch.length < 100) break;
              offset += 100;
            }
            return all;
          })(),
        ]);
        if (cancelled) return;
        setCompanies(coRes.data.data ?? []);
        setCertificates(certRes);
      } catch {
        // fall back to static rows below
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const board = useMemo(() => {
    const today = startOfToday();
    const approvedOnly = record === 'approved';
    // shortcut: a member in several companies counts toward the first one found.
    const memberCompany = new Map();
    for (const c of companies) {
      for (const m of c.members ?? []) {
        if (!memberCompany.has(m.id)) memberCompany.set(m.id, c.id);
      }
    }
    const idToName = new Map(companies.map((c) => [c.id, c.name]));
    const byCompany = new Map();
    const totals = new Map();
    for (const c of companies) totals.set(c.id, { total: 0, d7: 0, d30: 0 });
    for (const cert of certificates) {
      if (approvedOnly && cert.status !== 'verified') continue;
      const cid = memberCompany.get(cert.submittedBy?.id);
      const acc = totals.get(cid);
      if (!acc) continue;
      if (inRange(cert.dateIssued, range, today)) acc.total += 1;
      if (inRange(cert.dateIssued, 'd7', today)) acc.d7 += 1;
      if (inRange(cert.dateIssued, 'd30', today)) acc.d30 += 1;
      const cname = idToName.get(cid);
      if (cname) {
        if (!byCompany.has(cname)) byCompany.set(cname, []);
        byCompany.get(cname).push(cert);
      }
    }
    const list = companies
      .map((c) => ({
        companyId: c.id,
        companyName: c.name,
        members: c.members?.length ?? 0,
        ...(totals.get(c.id) ?? { total: 0, d7: 0, d30: 0 }),
      }))
      .sort((a, b) => b.total - a.total || a.companyName.localeCompare(b.companyName));
    for (const arr of byCompany.values()) {
      arr.sort((a, b) => String(b.dateIssued ?? '').localeCompare(String(a.dateIssued ?? '')));
    }
    return { rows: list, certsByCompany: byCompany };
  }, [companies, certificates, record, range]);

  const display = board.rows.length > 0 ? board.rows : FALLBACK_ROWS;
  const [selectedName, setSelectedName] = useState(null);
  const selected = display.find((r) => r.companyName === selectedName) ?? display[0] ?? null;
  const selectedCerts = (selected && board.certsByCompany.get(selected.companyName)) ?? [];
  const isAdmin = effectiveRole(getTokenRoles()) === ROLE.IT_ADMIN;
  const selectedMembers = (selected?.companyId && companies.find((c) => c.id === selected.companyId)?.members) ?? [];
  const [first, second, third] = display;
  const rest = display.slice(3);

  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;
  useEffect(() => {
    setPage(0);
  }, [record, range]);
  const pageCount = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visibleRest = rest.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <PageHeader
        title="Leaderboards"
        subtitle="Top companies by verified SkillsBuild certificates"
      />
      <div className="px-4 py-8 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Segmented options={RECORD_TABS} value={record} onChange={setRecord} />
          <Segmented options={RANGE_TABS} value={range} onChange={setRange} />
        </div>

        {loading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Loading leaderboards…</p>
        ) : (
          <div className="mt-8 flex flex-col gap-6 lg:flex-row">
            <div className="min-w-0 flex-1">
            {display.length >= 2 && (
              <div className="mt-5 grid gap-6 pt-5 lg:grid-cols-3 lg:gap-5">
                {second && <PodiumCard row={second} rank={2} selected={selected === second} onSelect={() => setSelectedName(second.companyName)} className="order-2 lg:order-1" />}
                {first && <PodiumCard row={first} rank={1} selected={selected === first} onSelect={() => setSelectedName(first.companyName)} className="order-1 lg:order-2 lg:-mt-8 lg:shadow-xl" />}
                {third && <PodiumCard row={third} rank={3} selected={selected === third} onSelect={() => setSelectedName(third.companyName)} className="order-3" />}
              </div>
            )}

            <div className="mt-8 overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    <th className="px-4 py-3 font-semibold">Rank</th>
                    <th className="px-4 py-3 font-semibold">Company</th>
                    <th className="px-4 py-3 text-center font-semibold">Members</th>
                    <th className="px-4 py-3 text-center font-semibold">7 Days</th>
                    <th className="px-4 py-3 text-center font-semibold">30 Days</th>
                    <th className="px-4 py-3 text-right font-semibold">Total Certs</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRest.map((row, i) => (
                    <tr key={row.companyName} onClick={() => setSelectedName(row.companyName)} className={cn('cursor-pointer border-b last:border-0', selected === row && 'bg-[#e9eff5]/60')}>
                      <td className="px-4 py-3 text-muted-foreground">#{safePage * PAGE_SIZE + i + 4}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2.5 font-medium">
                          <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[11px] font-bold text-[#0B4484]">
                            {initials(row.companyName)}
                          </span>
                          {row.companyName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Count value={row.members} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Count value={row.d7} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Count value={row.d30} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1.5 font-semibold">
                          <HugeiconsIcon icon={Medal01Icon} size={15} strokeWidth={1.8} className="text-muted-foreground" />
                          <span className="tabular-nums">{row.total}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                  {rest.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No further companies in this view.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {rest.length > PAGE_SIZE && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="text-xs text-muted-foreground">
                  Showing {safePage * PAGE_SIZE + 1}–{Math.min(rest.length, safePage * PAGE_SIZE + visibleRest.length)} of {rest.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
                    Previous
                  </Button>
                  <span className="px-1 text-xs text-muted-foreground">Page {safePage + 1} of {pageCount}</span>
                  <Button variant="outline" size="sm" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
            </div>
            <aside className="w-full shrink-0 lg:w-80">
              <SendaiFrame slim>
              <div className="relative z-10 rounded-xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-[4.5rem]">
                {selected ? (
                  <>
                    <div className="flex items-center gap-3">
                      <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-sm font-bold text-[#0B4484]">
                        {initials(selected.companyName)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{selected.companyName}</p>
                        <p className="text-xs text-muted-foreground">Rank #{display.indexOf(selected) + 1}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-2 border-t border-border pt-4 text-center">
                      <div>
                        <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Members</p>
                        <p className="mt-1 font-semibold tabular-nums">{selected.members}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Total</p>
                        <p className="mt-1 font-semibold tabular-nums">{selected.total}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">7 Days</p>
                        <p className="mt-1 font-semibold tabular-nums">{selected.d7}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">30 Days</p>
                        <p className="mt-1 font-semibold tabular-nums">{selected.d30}</p>
                      </div>
                    </div>
                    <div className="mt-4 border-t border-border pt-4">
                      <p className="editorial-label text-muted-foreground">Certificates · last 30 days</p>
                      <Sparkline certs={selectedCerts} />
                    </div>
                    <div className="mt-4">
                      <p className="editorial-label text-muted-foreground">By status</p>
                      <SplitBar certs={selectedCerts} />
                    </div>
                    <div className="mt-4">
                      <p className="editorial-label text-muted-foreground">Members ({selectedMembers.length})</p>
                      {selectedMembers.length === 0 ? (
                        <p className="mt-2 text-xs text-muted-foreground">No member details available.</p>
                      ) : (
                        <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
                          {selectedMembers.map((m) => {
                            const inner = (
                              <>
                                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-bold text-[#0B4484]">
                                  {(m.name ?? m.username ?? '?').charAt(0).toUpperCase()}
                                </span>
                                <span className="min-w-0 flex-1 truncate font-medium">{m.name ?? m.username}</span>
                                <span className="shrink-0 truncate text-muted-foreground">@{m.username}</span>
                              </>
                            );
                            return isAdmin && selected.companyId ? (
                              <Link
                                key={m.id}
                                to={`/member-directory?tab=companies&company=${selected.companyId}`}
                                className="flex items-center gap-2 rounded-sm border border-border px-2.5 py-1.5 text-xs hover:border-[#0B4484] hover:text-[#0B4484]"
                              >
                                {inner}
                              </Link>
                            ) : (
                              <div key={m.id} className="flex items-center gap-2 rounded-sm border border-border px-2.5 py-1.5 text-xs">
                                {inner}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <p className="editorial-label mt-4 text-muted-foreground">Recent certificates</p>
                    <div className="mt-2 space-y-2">
                      {selectedCerts.slice(0, 4).map((c) => (
                        <div key={c.id} className="rounded-sm border border-border px-3 py-2 text-xs">
                          <p className="font-medium">{c.course}</p>
                          <p className="mt-0.5 text-muted-foreground">{c.memberName} · {String(c.dateIssued ?? '').slice(0, 10)}</p>
                          <Badge variant={c.status === 'verified' ? 'default' : 'secondary'} className="mt-1.5">
                            {c.status === 'verified' ? 'Verified' : 'Pending review'}
                          </Badge>
                        </div>
                      ))}
                      {selectedCerts.length === 0 && (
                        <p className="text-xs text-muted-foreground">No certificates in this view.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a company to see details.</p>
                )}
              </div>
              </SendaiFrame>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
