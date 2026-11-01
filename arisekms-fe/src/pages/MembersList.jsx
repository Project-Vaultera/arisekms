import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Airplane01Icon,
  AntennaIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  BankIcon,
  Briefcase01Icon,
  Building01Icon,
  Certificate01Icon,
  ContainerTruck01Icon,
  CpuIcon,
  CraneIcon,
  CubeIcon,
  CustomerService01Icon,
  EnergyIcon,
  Factory01Icon,
  GridIcon,
  HardHatIcon,
  HeartHandshakeIcon,
  Hospital01Icon,
  Hotel01Icon,
  LayoutGridIcon,
  ListIcon,
  MusicNote01Icon,
  News01Icon,
  Package01Icon,
  Plug01Icon,
  School01Icon,
  Search01Icon,
  Shield01Icon,
  ShoppingCart01Icon,
  StethoscopeIcon,
  Store01Icon,
  TractorIcon,
  Wrench01Icon,
} from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { api } from '@/api/client.js';
import { PageHero } from '@/components/PageHero.jsx';
import { COMPANY_SECTORS } from '@/lib/company-sectors.js';
import { effectiveRole, getTokenRoles, ROLE } from '@/lib/rbac.js';
import helpBg from '/help-bg.jpg';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { FilterSelect } from '@/components/ui/filter-select.jsx';
import { Input } from '@/components/ui/input.jsx';
import { cn } from '@/lib/utils.js';

const SECTOR_ICONS = {
  'Administrative, Support, Waste Management & Remediation Service': CustomerService01Icon,
  Agriculture: TractorIcon,
  'Arts, Entertainment & Recreation': MusicNote01Icon,
  Construction: CraneIcon,
  'Consumer Goods': ShoppingCart01Icon,
  'Educational Services': School01Icon,
  Energy: EnergyIcon,
  Engineering: Wrench01Icon,
  Finance: BankIcon,
  Healthcare: Hospital01Icon,
  Hospitality: Hotel01Icon,
  'Information & Communication': AntennaIcon,
  'Insurance and Reinsurance': Shield01Icon,
  'Management of Companies & Enterprises': Briefcase01Icon,
  Manufacturing: Factory01Icon,
  Media: News01Icon,
  Mining: HardHatIcon,
  'Other Services (except public administration)': GridIcon,
  'Professional, Scientific & Technical Services (incl. consulting)': Certificate01Icon,
  'Real Estate, Rental and Leasing': Building01Icon,
  'Retail Trade': Store01Icon,
  'Social Assistance': HeartHandshakeIcon,
  Transportation: ContainerTruck01Icon,
  Tourism: Airplane01Icon,
  'Wholesale Trade': Package01Icon,
  Utilities: Plug01Icon,
  Health: StethoscopeIcon,
  Technology: CpuIcon,
};

const FALLBACK_ICON = CubeIcon;

function byRecentDesc(a, b) {
  return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
}

function byName(a, b) {
  return String(a.name ?? a.username ?? '').localeCompare(String(b.name ?? b.username ?? ''));
}

export function MembersList() {
  const role = effectiveRole(getTokenRoles());
  const isStaff = role === ROLE.IT_ADMIN || role === ROLE.SECRETARIAT;
  const railRef = useRef(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [industry, setIndustry] = useState('all');
  const [region, setRegion] = useState('all');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('recent');
  const [view, setView] = useState('gallery');

  useEffect(() => {
    api
      .get('/companies')
      .then((res) => setCompanies(res.data.data ?? []))
      .catch(() => toast.error('Could not load members'))
      .finally(() => setLoading(false));
  }, []);

  const industries = useMemo(() => {
    const present = new Set(companies.map((c) => String(c.sector ?? '').trim()).filter(Boolean));
    return COMPANY_SECTORS.filter((s) => present.has(s));
  }, [companies]);

  const regions = useMemo(() => {
    const present = new Set(companies.map((c) => String(c.region ?? '').trim()).filter(Boolean));
    return [...present].sort((a, b) => a.localeCompare(b));
  }, [companies]);

  const industryStats = useMemo(() => industries.map((sector) => {
    const rows = companies.filter((c) => String(c.sector ?? '').trim() === sector);
    return {
      sector,
      companies: rows.length,
      members: rows.reduce((n, c) => n + (c.members ?? []).length, 0),
    };
  }).sort((a, b) => b.members - a.members), [companies, industries]);

  const railIndustries = industryStats;

  const sorter = sort === 'name' ? byName : byRecentDesc;

  const people = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = [];
    for (const company of companies) {
      const sector = String(company.sector ?? '').trim();
      const companyRegion = String(company.region ?? '').trim();
      if (industry !== 'all' && sector !== industry) continue;
      if (region !== 'all' && companyRegion !== region) continue;
      for (const m of company.members ?? []) {
        if (status === 'active' && m.isAccountDisabled) continue;
        if (status === 'inactive' && !m.isAccountDisabled) continue;
        if (
          needle &&
          !`${m.name ?? ''} ${m.username ?? ''} ${m.email ?? ''} ${company.name ?? ''}`
            .toLowerCase()
            .includes(needle)
        ) continue;
        rows.push({ ...m, companyName: company.name, sector });
      }
    }
    return rows.sort(sorter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, query, industry, region, status, sort]);

  const visibleCompanies = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return companies
      .filter((c) => (industry === 'all' || String(c.sector ?? '').trim() === industry))
      .filter((c) => (region === 'all' || String(c.region ?? '').trim() === region))
      .filter((c) => {
        if (status === 'active') return c.status === 'approved';
        if (status === 'inactive') return c.status !== 'approved';
        return true;
      })
      .filter((c) => !needle || (c.name ?? '').toLowerCase().includes(needle))
      .sort(sorter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, query, industry, region, status, sort]);

  const totalResults = people.length + visibleCompanies.length;

  return (
    <div>
      <PageHero
        title="Members List"
        subtitle="Find fellow members and companies across our community."
        bg={helpBg}
        overlayClassName="bg-[#0a1931]/60"
      >
        <div className="mx-auto w-full max-w-3xl">
          <div className="relative">
            <HugeiconsIcon icon={Search01Icon} size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search members or companies…"
              className="h-12 bg-white pl-10 text-base"
            />
          </div>
        </div>
      </PageHero>

      <div className="mx-auto max-w-6xl px-4 pt-6 lg:px-6">
        <p className="editorial-label mb-3 text-[#1e3a5f]">Browse by industry</p>
        {loading ? (
          <div className="flex gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex w-24 flex-col items-center gap-2">
                <div className="size-16 animate-pulse rounded-full bg-muted/60" />
                <div className="h-3 w-16 animate-pulse rounded bg-muted/60" />
              </div>
            ))}
          </div>
        ) : industryStats.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            No companies to browse yet.{' '}
            <Link to="/membership-form" className="font-semibold text-[#0B4484] hover:text-[var(--sendai-teal)]">
              Complete your membership
            </Link>{' '}
            to join the directory.
          </p>
        ) : (
          <div className="relative">
            <button
              type="button"
              aria-label="Scroll industries left"
              onClick={() => railRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
              className="absolute top-4 -left-1 z-10 grid size-8 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-[#0B4484]"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} />
            </button>
            <div
              ref={railRef}
              className="flex gap-4 overflow-x-auto px-10 pt-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ scrollSnapType: 'x mandatory' }}
            >
              <button
                type="button"
                onClick={() => setIndustry('all')}
                aria-pressed={industry === 'all'}
                style={{ scrollSnapAlign: 'start' }}
                className="flex w-24 shrink-0 flex-col items-center gap-1.5 rounded-xl py-1"
              >
                <span className={cn(
                  'grid size-16 place-items-center rounded-full transition-colors',
                  industry === 'all' ? 'bg-[#0a1931] text-white' : 'bg-muted text-[#1e3a5f] hover:bg-[#0B4484]/10',
                )}>
                  <HugeiconsIcon icon={GridIcon} size={26} strokeWidth={1.8} />
                </span>
                <span className="text-center text-xs leading-tight font-semibold text-[#1e3a5f]">All</span>
                <span className="text-[11px] text-muted-foreground">{totalResults.toLocaleString()}</span>
              </button>
              {railIndustries.map((s) => {
                const active = industry === s.sector;
                const Icon = SECTOR_ICONS[s.sector] ?? FALLBACK_ICON;
                return (
                  <button
                    key={s.sector}
                    type="button"
                    onClick={() => setIndustry((prev) => (prev === s.sector ? 'all' : s.sector))}
                    aria-pressed={active}
                    title={s.sector}
                    style={{ scrollSnapAlign: 'start' }}
                    className="flex w-24 shrink-0 flex-col items-center gap-1.5 rounded-xl py-1"
                  >
                    <span className={cn(
                      'grid size-16 place-items-center rounded-full transition-colors',
                      active ? 'bg-[#0a1931] text-white' : 'bg-muted text-[#1e3a5f] hover:bg-[#0B4484]/10',
                    )}>
                      <HugeiconsIcon icon={Icon} size={26} strokeWidth={1.8} />
                    </span>
                    <span className="line-clamp-2 min-h-8 text-center text-xs leading-tight font-semibold text-[#1e3a5f]">{s.sector}</span>
                    <span className="text-[11px] text-muted-foreground">{s.members.toLocaleString()}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              aria-label="Scroll industries right"
              onClick={() => railRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
              className="absolute top-4 -right-1 z-10 grid size-8 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-[#0B4484]"
            >
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
        <div className="mb-3 flex flex-col gap-2">
          <p className="editorial-label text-[#1e3a5f]">
            Results · {loading ? '…' : totalResults.toLocaleString()}
          </p>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className={cn('grid flex-1 grid-cols-2 gap-2', isStaff ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
              <FilterSelect
                label="Sector"
                hideLabel
                value={industry}
                onValueChange={setIndustry}
                options={[{ value: 'all', label: 'All sectors' }, ...industries]}
              />
              <FilterSelect
                label="Region"
                hideLabel
                value={region}
                onValueChange={setRegion}
                options={[{ value: 'all', label: 'All regions' }, ...regions]}
              />
              {isStaff && (
                <FilterSelect
                  label="Status"
                  hideLabel
                  value={status}
                  onValueChange={setStatus}
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                />
              )}
              <FilterSelect
                label="Sort"
                hideLabel
                value={sort}
                onValueChange={setSort}
                options={[
                  { value: 'recent', label: 'Recently joined' },
                  { value: 'name', label: 'Name A–Z' },
                ]}
              />
            </div>
          <div className="flex items-center gap-1 self-end rounded-lg border p-1 lg:self-auto">
            <Button
              size="sm"
              variant={view === 'gallery' ? 'default' : 'ghost'}
              onClick={() => setView('gallery')}
              aria-pressed={view === 'gallery'}
              aria-label="Gallery view"
            >
              <HugeiconsIcon icon={LayoutGridIcon} size={15} strokeWidth={2} />
            </Button>
            <Button
              size="sm"
              variant={view === 'list' ? 'default' : 'ghost'}
              onClick={() => setView('list')}
              aria-pressed={view === 'list'}
              aria-label="List view"
            >
              <HugeiconsIcon icon={ListIcon} size={15} strokeWidth={2} />
            </Button>
          </div>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg bg-muted/60" />
            ))}
          </div>
        ) : totalResults === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No people or companies match your search.</p>
        ) : view === 'gallery' ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {people.map((p) => (
              <Card key={`person-${p.companyName}-${p.id}`}>
                <CardContent className="flex items-start gap-3 p-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#0a1931] text-sm font-semibold text-white">
                    {(p.name ?? p.username ?? '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.name ?? p.username}</span>
                    <span className="block truncate text-xs text-muted-foreground">@{p.username}</span>
                    <span className="block truncate text-xs text-muted-foreground">{p.email}</span>
                    <span className="mt-1.5 flex flex-wrap gap-1">
                      <Badge variant="secondary" className="rounded-full">{p.companyName}</Badge>
                      {p.sector && <Badge variant="outline" className="rounded-full">{p.sector}</Badge>}
                    </span>
                  </span>
                </CardContent>
              </Card>
            ))}
            {visibleCompanies.map((c) => (
              <Card key={`company-${c.id}`}>
                <CardContent className="flex items-start gap-3 p-4">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#0a1931] text-sm font-semibold text-white">
                    {(c.name ?? '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.name}</span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      <Badge className="rounded-full bg-[var(--sendai-teal)]/10 text-[var(--sendai-teal)]">Company</Badge>
                      {c.sector && <Badge variant="outline" className="rounded-full">{c.sector}</Badge>}
                      <Badge variant="secondary" className="rounded-full">
                        {(c.members ?? []).length} {(c.members ?? []).length === 1 ? 'member' : 'members'}
                      </Badge>
                    </span>
                    {(c.members ?? []).length > 0 && (
                      <span className="mt-2 block truncate text-xs text-muted-foreground">
                        {(c.members ?? []).slice(0, 3).map((m) => m.name ?? m.username).join(', ')}
                        {(c.members ?? []).length > 3 && ` +${(c.members ?? []).length - 3} more`}
                      </span>
                    )}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            {people.map((p) => (
              <div key={`person-${p.companyName}-${p.id}`} className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#0a1931] text-xs font-semibold text-white">
                  {(p.name ?? p.username ?? '?').charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.name ?? p.username}</span>
                  <span className="block truncate text-xs text-muted-foreground">@{p.username} · {p.email}</span>
                </span>
                <span className="hidden shrink-0 items-center gap-1 sm:flex">
                  <Badge variant="outline" className="rounded-full">Person</Badge>
                  <Badge variant="secondary" className="rounded-full">{p.companyName}</Badge>
                </span>
              </div>
            ))}
            {visibleCompanies.map((c) => (
              <div key={`company-${c.id}`} className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#0a1931] text-xs font-semibold text-white">
                  {(c.name ?? '?').charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{c.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[c.sector, `${(c.members ?? []).length} ${(c.members ?? []).length === 1 ? 'member' : 'members'}`].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className="hidden shrink-0 items-center gap-1 sm:flex">
                  <Badge variant="outline" className="rounded-full">Company</Badge>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
