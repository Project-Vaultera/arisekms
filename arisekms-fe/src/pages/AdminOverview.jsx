import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Award01Icon, File02Icon, HelpCircleIcon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { api } from '@/api/client.js';
import { PageHeader } from '@/components/PageHeader.jsx';
import { SectionCards } from '@/components/section-cards';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.jsx';
import { useDashboardData } from '@/hooks/use-dashboard-data.js';
import { cn } from '@/lib/utils.js';

const RecentActivity = lazy(() =>
  import('@/components/dashboard/RecentActivity.jsx').then((m) => ({ default: m.RecentActivity })),
);

function authorIdOf(row) {
  return row.author?.id ?? row.submittedBy?.id ?? null;
}

export function AdminOverview() {
  const dashboard = useDashboardData();
  const [reports, setReports] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [companyPage, setCompanyPage] = useState(0);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/reports', { params: { limit: 100, offset: 0 } }).then((res) => setReports(res.data.data ?? [])),
      api.get('/certificates', { params: { limit: 100, offset: 0 } }).then((res) => setCertificates(res.data.data ?? [])),
      api.get('/support-tickets', { params: { limit: 100, offset: 0 } }).then((res) => setTickets(res.data.data ?? [])),
      api.get('/companies').then((res) => setCompanies(res.data.data ?? [])),
    ])
      .catch(() => toast.error('Could not load overview data'))
      .finally(() => setLoading(false));
  }, []);

  const pending = useMemo(() => ({
    reports: reports.filter((r) => (r.status || 'submitted') === 'submitted').length,
    certificates: certificates.filter((c) => (c.status || 'pending') === 'pending').length,
    tickets: tickets.filter((t) => (t.status || 'Open') === 'Open').length,
  }), [reports, certificates, tickets]);

  const companyRows = useMemo(() => {
    const memberCompany = {};
    for (const company of companies) {
      for (const member of company.members ?? []) {
        memberCompany[member.id] = company.id;
      }
    }
    const rows = new Map(companies.map((c) => [c.id, {
      id: c.id,
      name: c.name,
      members: (c.members ?? []).length,
      reports: 0,
      certificates: 0,
      tickets: 0,
    }]));
    for (const r of reports) {
      const row = rows.get(memberCompany[authorIdOf(r)]);
      if (row) row.reports += 1;
    }
    for (const c of certificates) {
      const row = rows.get(memberCompany[authorIdOf(c)]);
      if (row) row.certificates += 1;
    }
    for (const t of tickets) {
      const row = rows.get(memberCompany[authorIdOf(t)]);
      if (row && (t.status || 'Open') === 'Open') row.tickets += 1;
    }
    return [...rows.values()];
  }, [companies, reports, certificates, tickets]);

  const COMPANY_PAGE_SIZE = 10;
  const companyPageCount = Math.max(1, Math.ceil(companyRows.length / COMPANY_PAGE_SIZE));
  const safeCompanyPage = Math.min(companyPage, companyPageCount - 1);
  const visibleCompanyRows = companyRows.slice(
    safeCompanyPage * COMPANY_PAGE_SIZE,
    safeCompanyPage * COMPANY_PAGE_SIZE + COMPANY_PAGE_SIZE,
  );

  const queues = [
    { label: 'Pending reports', value: pending.reports, hint: 'Awaiting approval', icon: File02Icon, tint: 'text-[var(--sendai-teal)]/10', to: '/admin-approvals' },
    { label: 'Pending certificates', value: pending.certificates, hint: 'Awaiting verification', icon: Award01Icon, tint: 'text-[var(--sendai-orange)]/10', to: '/admin-approvals' },
    { label: 'Open tickets', value: pending.tickets, hint: 'Awaiting triage', icon: HelpCircleIcon, tint: 'text-[var(--sendai-plum)]/10', to: '/admin-approvals' },
  ];

  return (
    <div className="flex flex-col gap-2.5 py-1.5 md:gap-3 md:py-2">
      <PageHeader
        title="Admin Overview"
        subtitle="Monitor submissions, companies, and member activity in one place"
      />
      <SectionCards summary={dashboard} />
      <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-3 lg:px-6">
        {queues.map((card) => (
          <Card key={card.label} className="relative gap-4 overflow-hidden py-4">
            <HugeiconsIcon
              icon={card.icon}
              size={96}
              strokeWidth={1}
              className={cn('pointer-events-none absolute -right-4 -bottom-4 opacity-100', card.tint)}
            />
            <CardHeader className="relative flex flex-row items-center justify-between pb-0">
              <p className="editorial-label text-muted-foreground">{card.label}</p>
              <Link to={card.to} className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B4484]">
                Review
              </Link>
            </CardHeader>
            <CardContent className="relative">
              <p className="editorial-kpi">{loading ? '—' : card.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="px-4 lg:px-6">
        <Card className="h-full">
          <CardHeader className="pb-0.5 pt-3">
            <div className="space-y-0.5">
              <CardTitle>Output by company</CardTitle>
              <CardDescription>Submissions and open tickets per company</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-1 pb-3">
            {loading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Loading companies…</p>
            ) : companyRows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No companies yet — <Link to="/admin-companies" className="underline">create one</Link>.
              </p>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-right">Members</TableHead>
                      <TableHead className="text-right">Reports</TableHead>
                      <TableHead className="text-right">Certificates</TableHead>
                      <TableHead className="text-right">Open tickets</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleCompanyRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#0a1931] text-xs font-semibold text-white">
                              {(row.name ?? '?').charAt(0).toUpperCase()}
                            </span>
                            <span className="truncate">{row.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.members}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.reports}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.certificates}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.tickets}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {companyRows.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="text-xs text-muted-foreground">
                  Showing {safeCompanyPage * COMPANY_PAGE_SIZE + 1}–{Math.min(companyRows.length, safeCompanyPage * COMPANY_PAGE_SIZE + visibleCompanyRows.length)} of {companyRows.length}
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
          </CardContent>
        </Card>
      </div>
      <div className="px-4 lg:px-6">
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading activity…</p>}>
          <RecentActivity items={dashboard.recent} loading={dashboard.loading} />
        </Suspense>
      </div>
    </div>
  );
}
