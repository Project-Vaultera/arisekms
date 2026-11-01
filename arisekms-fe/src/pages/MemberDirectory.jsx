import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Search01Icon, Tick01Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { api } from '@/api/client.js';
import { PageHero } from '@/components/PageHero.jsx';
import helpBg from '/help-bg.jpg';
import { SendaiFrame } from '@/components/SendaiFrame.jsx';
import { COMPANY_SECTORS } from '@/lib/company-sectors.js';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
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
import { cn } from '@/lib/utils.js';

function fmtDate(raw) {
  if (!raw) return '—';
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function statusStyle(status) {
  if (status === 'approved' || status === 'verified') return 'bg-[var(--sendai-teal)]/10 text-[var(--sendai-teal)]';
  if (status === 'rejected') return 'bg-[var(--sendai-crimson)]/10 text-[var(--sendai-crimson)]';
  if (status === 'submitted' || status === 'pending') return 'bg-[var(--sendai-orange)]/10 text-[var(--sendai-orange)]';
  return 'bg-[var(--sendai-plum)]/10 text-[var(--sendai-plum)]';
}

export function MemberDirectory() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') === 'members' ? 'members' : 'companies');

  // Members state
  const [members, setMembers] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [membersLoading, setMembersLoading] = useState(true);

  // Companies state
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companyPage, setCompanyPage] = useState(0);
  const [companyQ, setCompanyQ] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('all');
  const [companyStatus, setCompanyStatus] = useState('all');
  const companyPageSize = 10;
  const [selectedId, setSelectedId] = useState(() => {
    const id = Number(params.get('company'));
    return Number.isInteger(id) && id > 0 ? id : null;
  });
  const [username, setUsername] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [submissions, setSubmissions] = useState({ reports: [], certificates: [], tickets: [] });

  function refreshMembers() {
    setMembersLoading(true);
    return api
      .get('/users', { params: { limit: 100, offset: 0 } })
      .then((res) => {
        setMembers(res.data.data ?? []);
        setTotal(res.data.meta?.count ?? (res.data.data ?? []).length);
      })
      .catch(() => toast.error('Could not load members'))
      .finally(() => setMembersLoading(false));
  }

  function refreshCompanies() {
    setCompaniesLoading(true);
    return api
      .get('/companies')
      .then((res) => {
        const rows = res.data.data ?? [];
        setCompanies(rows);
        if (rows.length > 0 && !rows.some((c) => c.id === selectedId)) {
          setSelectedId(rows[0].id);
        }
      })
      .catch(() => toast.error('Could not load companies'))
      .finally(() => setCompaniesLoading(false));
  }

  useEffect(() => {
    refreshMembers();
    refreshCompanies();
    Promise.all([
      api.get('/reports', { params: { limit: 100, offset: 0 } }),
      api.get('/certificates', { params: { limit: 100, offset: 0 } }),
      api.get('/support-tickets', { params: { limit: 100, offset: 0 } }),
    ])
      .then(([reportsRes, certsRes, ticketsRes]) => {
        setSubmissions({
          reports: reportsRes.data.data ?? [],
          certificates: certsRes.data.data ?? [],
          tickets: ticketsRes.data.data ?? [],
        });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const memberCompanies = useMemo(() => {
    const map = {};
    for (const company of companies) {
      for (const member of company.members ?? []) {
        (map[member.id] ??= []).push(company.name);
      }
    }
    return map;
  }, [companies]);

  const userCompanyIds = useMemo(() => {
    const map = {};
    for (const company of companies) {
      for (const member of company.members ?? []) {
        (map[member.id] ??= []).push(company.id);
      }
    }
    return map;
  }, [companies]);

  const companyStats = useMemo(() => {
    const stats = {};
    const bump = (userId, key) => {
      for (const companyId of userCompanyIds[userId] ?? []) {
        stats[companyId] ??= { reports: 0, certificates: 0, tickets: 0 };
        stats[companyId][key] += 1;
      }
    };
    for (const r of submissions.reports) bump(r.author?.id, 'reports');
    for (const c of submissions.certificates) bump(c.submittedBy?.id, 'certificates');
    for (const t of submissions.tickets) {
      if ((t.status || 'Open') === 'Open') bump(t.author?.id, 'tickets');
    }
    return stats;
  }, [submissions, userCompanyIds]);

  const filteredMembers = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return members.filter((m) => {
      const matchesStatus =
        status === 'all' ||
        (status === 'active' && !m.isAccountDisabled) ||
        (status === 'inactive' && m.isAccountDisabled);
      const matchesQ =
        !needle ||
        m.name?.toLowerCase().includes(needle) ||
        m.email?.toLowerCase().includes(needle) ||
        m.username?.toLowerCase().includes(needle);
      return matchesStatus && matchesQ;
    });
  }, [members, q, status]);

  const pageCount = Math.max(1, Math.ceil(filteredMembers.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visibleMembers = filteredMembers.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function updateMemberFilter(setter, value) {
    setter(value);
    setPage(0);
  }

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === selectedId) ?? null,
    [companies, selectedId],
  );

  // Active = approved membership status; everything else reads as inactive.
  // No extra endpoint: status + sector already ride on GET /companies rows.
  const companyIndustries = useMemo(() => {
    const present = new Set(companies.map((c) => String(c.sector ?? '').trim()).filter(Boolean));
    return COMPANY_SECTORS.filter((s) => present.has(s));
  }, [companies]);

  // Industry tiles: per-sector company + member counts for the help-center grid.
  const industryStats = useMemo(() => companyIndustries.map((sector) => {
    const rows = companies.filter((c) => String(c.sector ?? '').trim() === sector);
    return {
      sector,
      companies: rows.length,
      members: rows.reduce((n, c) => n + (c.members ?? []).length, 0),
    };
  }), [companies, companyIndustries]);

  // Unified hero search drives the active tab (help-center pattern).
  const heroQ = tab === 'members' ? q : companyQ;
  function onHeroSearch(value) {
    if (tab === 'members') {
      setQ(value);
      setPage(0);
    } else {
      setCompanyQ(value);
      setCompanyPage(0);
    }
  }
  function selectIndustry(sector) {
    setTab('companies');
    setCompanyIndustry((prev) => (prev === sector ? 'all' : sector));
    setCompanyPage(0);
  }

  const filteredCompanies = useMemo(() => {
    const needle = companyQ.trim().toLowerCase();
    return companies.filter((c) => {
      if (needle && !(c.name ?? '').toLowerCase().includes(needle)) return false;
      if (companyIndustry !== 'all' && String(c.sector ?? '').trim() !== companyIndustry) return false;
      if (companyStatus === 'active' && c.status !== 'approved') return false;
      if (companyStatus === 'inactive' && c.status === 'approved') return false;
      return true;
    });
  }, [companies, companyQ, companyIndustry, companyStatus]);

  const companyPageCount = Math.max(1, Math.ceil(filteredCompanies.length / companyPageSize));
  const safeCompanyPage = Math.min(companyPage, companyPageCount - 1);
  const visibleCompanies = filteredCompanies.slice(safeCompanyPage * companyPageSize, safeCompanyPage * companyPageSize + companyPageSize);

  const selectedMemberIds = useMemo(
    () => new Set((selectedCompany?.members ?? []).map((m) => m.id)),
    [selectedCompany],
  );

  const selectedBreakdown = useMemo(() => {
    const reports = { submitted: 0, approved: 0, rejected: 0 };
    const certificates = { pending: 0, verified: 0, rejected: 0 };
    for (const r of submissions.reports) {
      if (selectedMemberIds.has(r.author?.id)) {
        const s = r.status || 'submitted';
        if (s in reports) reports[s] += 1;
      }
    }
    for (const c of submissions.certificates) {
      if (selectedMemberIds.has(c.submittedBy?.id)) {
        const s = c.status || 'pending';
        if (s in certificates) certificates[s] += 1;
      }
    }
    return { reports, certificates };
  }, [submissions, selectedMemberIds]);

  const selectedActivity = useMemo(() => {
    const rows = [
      ...(submissions.reports ?? [])
        .filter((r) => selectedMemberIds.has(r.author?.id))
        .map((r) => ({
          id: `report-${r.id}`,
          title: r.originalName || `Report #${r.id}`,
          status: r.status || 'submitted',
          date: r.createdAt,
        })),
      ...(submissions.certificates ?? [])
        .filter((c) => selectedMemberIds.has(c.submittedBy?.id))
        .map((c) => ({
          id: `certificate-${c.id}`,
          title: c.course || `Certificate #${c.id}`,
          status: c.status || 'pending',
          date: c.createdAt,
        })),
    ];
    return rows
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [submissions, selectedMemberIds]);

  const selectedTrend = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString(undefined, { month: 'short' }),
        count: 0,
      };
    });
    const byKey = new Map(months.map((m) => [m.key, m]));
    const bump = (raw) => {
      if (!raw) return;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return;
      const b = byKey.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (b) b.count += 1;
    };
    for (const r of submissions.reports) {
      if (selectedMemberIds.has(r.author?.id)) bump(r.createdAt);
    }
    for (const c of submissions.certificates) {
      if (selectedMemberIds.has(c.submittedBy?.id)) bump(c.createdAt);
    }
    return months;
  }, [submissions, selectedMemberIds]);

  function BreakdownBar({ segments }) {
    const total = segments.reduce((n, s) => n + s.value, 0);
    if (total === 0) {
      return <p className="text-xs text-muted-foreground">No submissions yet.</p>;
    }
    return (
      <div className="space-y-1.5">
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
          {segments.map((s) => (
            <div
              key={s.label}
              className={s.bar}
              style={{ width: `${(s.value / total) * 100}%` }}
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

  async function assignMember(e) {
    e?.preventDefault();
    if (!selectedCompany || !username.trim()) {
      toast.error('Username is required');
      return;
    }
    const user = members.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase(),
    );
    if (!user) {
      toast.error('User not found', { description: 'Check the username and try again.' });
      return;
    }
    setAssigning(true);
    try {
      await api.post(`/companies/${selectedCompany.id}/members`, { userId: user.id });
      setUsername('');
      toast.success(`${user.username} added to ${selectedCompany.name}`);
      await refreshCompanies();
    } catch {
      toast.error('Could not add member');
    } finally {
      setAssigning(false);
    }
  }

  async function removeMember(userId, memberName) {
    if (!selectedCompany) return;
    try {
      await api.delete(`/companies/${selectedCompany.id}/members/${userId}`);
      toast.success(`${memberName} removed from ${selectedCompany.name}`);
      await refreshCompanies();
    } catch {
      toast.error('Could not remove member');
    }
  }

  async function toggleAccount(m) {
    setTogglingId(m.id);
    try {
      await api.patch(`/users/${m.id}`, { isAccountDisabled: !m.isAccountDisabled });
      toast.success(m.isAccountDisabled ? `${m.username} enabled` : `${m.username} disabled`);
      await refreshMembers();
    } catch (err) {
      const message = err?.response?.data?.message;
      toast.error('Could not update account', {
        description: typeof message === 'string' ? message : undefined,
      });
    } finally {
      setTogglingId(null);
    }
  }

  const tabs = [
    { id: 'members', label: 'Members', count: total },
    { id: 'companies', label: 'Companies', count: companies.length },
  ];

  return (
    <div>
      <PageHero
        title="Member Directory"
        subtitle={`Browse ${total.toLocaleString()} registered members and ${companies.length.toLocaleString()} companies by industry.`}
        bg={helpBg}
        overlayClassName="bg-[#0a1931]/60"
      >
        <div className="flex flex-col gap-2 rounded-lg bg-white p-3 shadow-lg sm:flex-row">
          <div className="relative flex-1">
            <HugeiconsIcon icon={Search01Icon} size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={heroQ}
              onChange={(e) => onHeroSearch(e.target.value)}
              placeholder={tab === 'members' ? 'Search by name, email, or username' : 'Search companies by name…'}
              className="h-12 pl-10 text-base"
            />
          </div>
        </div>
      </PageHero>
      <div className="mx-auto max-w-6xl px-4 pt-6 lg:px-6">
        <p className="editorial-label mb-3 text-[#1e3a5f]">Browse by industry</p>
        {companiesLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-muted/60" />
            ))}
          </div>
        ) : industryStats.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">No industries yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {industryStats.map((s) => {
              const active = companyIndustry === s.sector;
              return (
                <button
                  key={s.sector}
                  type="button"
                  onClick={() => selectIndustry(s.sector)}
                  aria-pressed={active}
                  className={cn(
                    'rounded-lg border p-3 text-left transition-colors',
                    active
                      ? 'border-[#0B4484] bg-[#0a1931] text-white'
                      : 'border-border bg-card text-[#1e3a5f] hover:border-[#0B4484]/40',
                  )}
                >
                  <span className="line-clamp-2 min-h-10 text-sm font-semibold">{s.sector}</span>
                  <span className={cn('mt-1 block text-xs', active ? 'text-white/70' : 'text-muted-foreground')}>
                    {s.companies.toLocaleString()} {s.companies === 1 ? 'company' : 'companies'} · {s.members.toLocaleString()} {s.members === 1 ? 'member' : 'members'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2.5 overflow-x-clip py-1.5 md:gap-3 md:py-2">
      <div className="px-4 lg:px-6">
        <SendaiFrame>
          <Card className="relative z-10 rounded-2xl">
            <CardHeader className="pb-0.5 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="font-heading text-2xl font-normal tracking-tight text-[#1e3a5f]">Member Directory</h1>
                  <p className="mt-1 text-sm text-muted-foreground">{`${total.toLocaleString()} registered members`}</p>
                </div>
                <div className="flex items-center gap-1 rounded-lg border p-1">
                  {tabs.map((t) => (
                    <Button
                      key={t.id}
                      size="sm"
                      variant={tab === t.id ? 'default' : 'ghost'}
                      onClick={() => setTab(t.id)}
                    >
                      {t.label}
                      <Badge variant={tab === t.id ? 'secondary' : 'default'} className="ml-1">
                        {typeof t.count === 'number' ? t.count.toLocaleString() : t.count}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2 pb-3">
              {tab === 'members' ? (
                <>
                  <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-end">
                    <p className="flex-1 text-xs text-muted-foreground">
                      {tab === 'members' && q.trim() ? (
                        <>Filtering members by “{q.trim()}” — edit the search above to change it.</>
                      ) : null}
                    </p>
                    <FilterSelect
                      label="Status"
                      value={status}
                      onValueChange={(v) => updateMemberFilter(setStatus, v)}
                      className="lg:w-44"
                      options={[
                        { value: 'all', label: 'All' },
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                      ]}
                    />
                    <FilterSelect
                      label="Show"
                      value={String(pageSize)}
                      onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}
                      placeholder="10"
                      className="lg:w-32"
                      options={['10', '25', '50', '100']}
                    />
                  </div>
                  {membersLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/60" />
                      ))}
                    </div>
                  ) : visibleMembers.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No members match your filters.</p>
                  ) : (
                    <div className="overflow-hidden rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Company</TableHead>
                            <TableHead>Member</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visibleMembers.map((m) => (
                            <TableRow key={m.id}>
                              <TableCell className="max-w-56 py-1.5">
                                {(memberCompanies[m.id] ?? []).length > 0 ? (
                                  <div className="flex min-w-0 items-center gap-2">
                                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#0a1931] text-xs font-semibold text-white">
                                      {(memberCompanies[m.id][0] ?? '?').charAt(0).toUpperCase()}
                                    </span>
                                    <span className="truncate text-sm font-medium text-[#1e3a5f]" title={(memberCompanies[m.id] ?? []).join(', ')}>
                                      {(memberCompanies[m.id] ?? []).join(', ')}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="py-1.5">
                                <div className="flex min-w-0 items-center gap-2.5">
                                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                                    {(m.name ?? m.username ?? '?').charAt(0).toUpperCase()}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block max-w-56 truncate font-medium">{m.name ?? m.username}</span>
                                    <span className="block truncate text-xs text-muted-foreground">@{m.username} · {m.email}</span>
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-1.5">
                                <Badge className={cn(
                                  'rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase',
                                  m.isAccountDisabled
                                    ? 'bg-[var(--sendai-crimson)]/10 text-[var(--sendai-crimson)]'
                                    : 'bg-[var(--sendai-teal)]/10 text-[var(--sendai-teal)]',
                                )}>
                                  {m.isAccountDisabled ? 'Inactive' : 'Active'}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-1.5 text-right whitespace-nowrap text-muted-foreground">
                                {fmtDate(m.createdAt)}
                              </TableCell>
                              <TableCell className="py-1.5 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={m.isAccountDisabled ? '' : 'text-[var(--sendai-crimson)]'}
                                  disabled={togglingId === m.id}
                                  onClick={() => toggleAccount(m)}
                                >
                                  {togglingId === m.id
                                    ? '…'
                                    : m.isAccountDisabled
                                      ? 'Enable'
                                      : 'Disable'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {filteredMembers.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                      <p className="text-xs text-muted-foreground">
                        Showing {safePage * pageSize + 1}–{Math.min(filteredMembers.length, safePage * pageSize + visibleMembers.length)} of {filteredMembers.length}
                      </p>
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
                </>
              ) : (
                <>
                  <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-end">
                    <p className="flex-1 text-xs text-muted-foreground">
                      {companyIndustry !== 'all' ? (
                        <>Industry: {companyIndustry} — click the tile again or pick All industries to clear.</>
                      ) : companyQ.trim() ? (
                        <>Filtering companies by “{companyQ.trim()}” — edit the search above to change it.</>
                      ) : (
                        <>Pick an industry tile above or use the search to narrow companies.</>
                      )}
                    </p>
                    <FilterSelect
                      label="Industry"
                      value={companyIndustry}
                      onValueChange={(v) => { setCompanyIndustry(v); setCompanyPage(0); }}
                      className="lg:w-64"
                      options={[{ value: 'all', label: 'All industries' }, ...companyIndustries]} />
                    <FilterSelect
                      label="Status"
                      value={companyStatus}
                      onValueChange={(v) => { setCompanyStatus(v); setCompanyPage(0); }}
                      className="lg:w-44"
                      options={[
                        { value: 'all', label: 'All' },
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                      ]} />
                  </div>
                  {companiesLoading ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/60" />
                      ))}
                    </div>
                  ) : filteredCompanies.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No companies match your filters.</p>
                  ) : (
                    <div className="grid gap-4 lg:grid-cols-3">
                      <div className="space-y-1">
                        {visibleCompanies.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedId(c.id)}
                            className={
                              c.id === selectedId
                                ? 'flex w-full items-center justify-between rounded-sm bg-[#0a1931] px-3 py-2 text-sm font-semibold text-white'
                                : 'flex w-full items-center justify-between rounded-sm px-3 py-2 text-sm text-[#1e3a5f] hover:text-[#0B4484]'
                            }
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#0a1931] text-xs font-semibold text-white">
                                {(c.name ?? '?').charAt(0).toUpperCase()}
                              </span>
                              <span className="truncate">{c.name}</span>
                            </span>
                            <Badge variant={c.id === selectedId ? 'default' : 'secondary'}>
                              {(c.members ?? []).length}
                            </Badge>
                          </button>
                        ))}
                        {filteredCompanies.length > companyPageSize && (
                          <div className="flex items-center justify-between gap-2 pt-2 text-sm">
                            <p className="text-xs text-muted-foreground">
                              Showing {safeCompanyPage * companyPageSize + 1}–{Math.min(filteredCompanies.length, safeCompanyPage * companyPageSize + visibleCompanies.length)} of {filteredCompanies.length}
                            </p>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" disabled={safeCompanyPage === 0} onClick={() => setCompanyPage(safeCompanyPage - 1)}>
                                Previous
                              </Button>
                              <span className="px-1 text-xs text-muted-foreground">Page {safeCompanyPage + 1} of {companyPageCount}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={safeCompanyPage >= companyPageCount - 1}
                                onClick={() => setCompanyPage(safeCompanyPage + 1)}
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="lg:col-span-2">
                        {selectedCompany ? (
                          <Card className="h-full">
                            <CardHeader className="pb-0.5 pt-3">
                              <div className="flex items-center gap-3">
                                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#0a1931] text-sm font-semibold text-white">
                                  {(selectedCompany.name ?? '?').charAt(0).toUpperCase()}
                                </span>
                                <div className="space-y-0.5">
                                  <CardTitle>{selectedCompany.name}</CardTitle>
                                  <CardDescription>
                                    {(selectedCompany.members ?? []).length} member(s)
                                    {selectedCompany.createdAt ? ` · since ${fmtDate(selectedCompany.createdAt)}` : ''}
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <Badge variant="secondary" className="rounded-full">
                                  {companyStats[selectedCompany.id]?.reports ?? 0} reports
                                </Badge>
                                <Badge variant="secondary" className="rounded-full">
                                  {companyStats[selectedCompany.id]?.certificates ?? 0} certificates
                                </Badge>
                                <Badge variant="secondary" className="rounded-full">
                                  {companyStats[selectedCompany.id]?.tickets ?? 0} open tickets
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-2 pb-3">
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                  <p className="editorial-label text-muted-foreground">Reports by status</p>
                                  <BreakdownBar
                                    segments={[
                                      { label: 'Awaiting', value: selectedBreakdown.reports.submitted, bar: 'bg-[var(--sendai-orange)]', dot: 'bg-[var(--sendai-orange)]' },
                                      { label: 'Approved', value: selectedBreakdown.reports.approved, bar: 'bg-[var(--sendai-teal)]', dot: 'bg-[var(--sendai-teal)]' },
                                      { label: 'Rejected', value: selectedBreakdown.reports.rejected, bar: 'bg-[var(--sendai-crimson)]', dot: 'bg-[var(--sendai-crimson)]' },
                                    ]}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <p className="editorial-label text-muted-foreground">Certificates by status</p>
                                  <BreakdownBar
                                    segments={[
                                      { label: 'Pending', value: selectedBreakdown.certificates.pending, bar: 'bg-[var(--sendai-orange)]', dot: 'bg-[var(--sendai-orange)]' },
                                      { label: 'Verified', value: selectedBreakdown.certificates.verified, bar: 'bg-[var(--sendai-teal)]', dot: 'bg-[var(--sendai-teal)]' },
                                      { label: 'Rejected', value: selectedBreakdown.certificates.rejected, bar: 'bg-[var(--sendai-crimson)]', dot: 'bg-[var(--sendai-crimson)]' },
                                    ]}
                                  />
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <p className="editorial-label text-muted-foreground">Submissions · last 6 months</p>
                                <div className="flex h-20 items-end gap-1.5">
                                  {selectedTrend.map((m) => {
                                    const max = Math.max(1, ...selectedTrend.map((x) => x.count));
                                    return (
                                      <div key={m.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                                        <span className="text-[10px] tabular-nums text-muted-foreground">{m.count}</span>
                                        <div
                                          className="w-full rounded-sm bg-[var(--sendai-teal)]/70"
                                          style={{ height: `${Math.max(4, (m.count / max) * 56)}px` }}
                                          title={`${m.label}: ${m.count}`}
                                        />
                                        <span className="text-[10px] text-muted-foreground">{m.label}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              <form onSubmit={assignMember} className="flex flex-col gap-2 sm:flex-row">
                                <Input
                                  value={username}
                                  onChange={(e) => setUsername(e.target.value)}
                                  placeholder="Username to add…"
                                  className="flex-1"
                                />
                                <Button type="submit" variant="outline" disabled={assigning}>
                                  {assigning ? 'Adding…' : 'Add member'}
                                </Button>
                              </form>
                              {(selectedCompany.members ?? []).length === 0 ? (
                                <p className="py-4 text-center text-sm text-muted-foreground">
                                  No members yet.
                                </p>
                              ) : (
                                <div className="space-y-1.5">
                                  {selectedCompany.members.map((m) => (
                                    <div
                                      key={m.id}
                                      className="flex items-center gap-2 rounded-sm border border-border px-3 py-2 text-sm"
                                    >
                                      <HugeiconsIcon icon={Tick01Icon} size={15} strokeWidth={2} className="text-[var(--sendai-teal)]" />
                                      <span className="font-medium">{m.name}</span>
                                      <span className="truncate text-muted-foreground">@{m.username}</span>
                                      <button
                                        type="button"
                                        aria-label={`Remove ${m.username}`}
                                        onClick={() => removeMember(m.id, m.username)}
                                        className="ml-auto rounded-sm p-1 text-muted-foreground hover:text-[var(--sendai-crimson)]"
                                      >
                                        <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="space-y-1.5">
                                <p className="editorial-label text-muted-foreground">Recent activity</p>
                                {selectedActivity.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">No recent submissions from this company.</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {selectedActivity.map((a) => (
                                      <div
                                        key={a.id}
                                        className="flex items-center gap-2 rounded-sm border border-border px-3 py-1.5 text-sm"
                                      >
                                        <span className="min-w-0 flex-1 truncate font-medium">{a.title}</span>
                                        <Badge className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase', statusStyle(a.status))}>
                                          {a.status}
                                        </Badge>
                                        <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(a.date)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ) : (
                          <p className="py-6 text-center text-sm text-muted-foreground">
                            Select a company.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </SendaiFrame>
      </div>
      </div>
    </div>
  );
}
