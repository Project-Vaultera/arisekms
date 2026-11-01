import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { BookOpen01Icon, File02Icon, HelpCircleIcon, Home01Icon, InformationCircleIcon, Medal02Icon, Notification01Icon, Search01Icon, Shield01Icon, ZapIcon } from '@hugeicons/core-free-icons';

import { api } from '@/api/client.js';
import { WalkthroughModal } from '@/components/WalkthroughModal.jsx';
import { Button } from '@/components/ui/button.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { cn } from '@/lib/utils.js';
import { QUICKSTART_STEPS } from '@/lib/quickstart-steps.js';
import { quickstartSeenKey } from '@/lib/quickstart-done.js';
import { effectiveRole, getTokenRoles, getTokenUserId, isPrivilegedRoles, ROLE } from '@/lib/rbac.js';
import logoUrl from '/arise-ph_logo.png';
import apcLogo from '/apc_logo.png';
import jpcsApcLogo from '/jpcs-apc_logo.png';
import smPrimeLogo from '/sm-prime_logo.png';
import vaulteralabsLogo from '/vaulteralabs.png';

const PAGES = [
  { group: 'Pages', title: 'Admin Desk', sub: 'Dashboard', to: '/', icon: Home01Icon },
  { group: 'Pages', title: 'Submit Reports', sub: 'Quarterly, annual, good practices', to: '/submit-reports', icon: File02Icon },
  { group: 'Pages', title: 'Membership Form', sub: 'Apply or update membership', to: '/membership-form', icon: File02Icon },
  { group: 'Pages', title: 'Knowledge Products', sub: 'Manuals and guides', to: '/knowledge-products', icon: File02Icon },
  { group: 'Pages', title: 'SkillsBuild', sub: 'Training and certificates', to: '/activity', icon: File02Icon },
  { group: 'Pages', title: 'Privacy Policy', sub: 'Data protection', to: '/privacy-policy', icon: File02Icon },
  { group: 'Pages', title: 'User Manual', sub: 'How to use the platform', to: '/user-manual', icon: File02Icon },
  { group: 'Pages', title: 'Support', sub: 'Submit a ticket', to: '/support', icon: File02Icon },
];

function timeAgo(raw) {
  if (!raw) return '';
  const d = new Date(raw).getTime();
  if (Number.isNaN(d)) return '';
  const s = Math.max(1, Math.floor((Date.now() - d) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(raw).toLocaleDateString();
}

function bellClearedKey(uid) {
  return `arisekms_bell_cleared_${uid ?? 'anon'}`;
}

const BELL_TABS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'earlier', label: 'Earlier' },
];

export function BrandBar() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [docs, setDocs] = useState([]);
  const [quickOpen, setQuickOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [bellTab, setBellTab] = useState('today');
  const [notes, setNotes] = useState({ reports: [], activities: [], tickets: [], documents: [] });
  const [clearedAt, setClearedAt] = useState(null);
  const wrapRef = useRef(null);
  const bellRef = useRef(null);
  const inputRef = useRef(null);
  const role = effectiveRole(getTokenRoles());
  const steps = QUICKSTART_STEPS[role] ?? QUICKSTART_STEPS[ROLE.MEMBER];
  const isPrivileged = isPrivilegedRoles(getTokenRoles());

  // First visit replays the quickstart once per user; the Zap icon replays it after.
  useEffect(() => {
    try {
      const key = quickstartSeenKey(getTokenUserId());
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '1');
        setQuickOpen(true);
      }
    } catch {
      /* storage unavailable — no auto-open */
    }
  }, []);

  useEffect(() => {
    try {
      setClearedAt(localStorage.getItem(bellClearedKey(getTokenUserId())));
    } catch {
      setClearedAt(null);
    }
  }, [bellOpen]);

  // shortcut: notification queues read live (cap 100 each); no push channel yet.
  // shortcut: read/unread is a per-browser clearedAt timestamp, not a server flag.
  function refreshNotes() {
    const uid = getTokenUserId();
    const isAdmin = isPrivilegedRoles(getTokenRoles());
    Promise.all([
      api.get('/reports', { params: { limit: 100, offset: 0 } }).catch(() => ({ data: { data: [] } })),
      api.get('/activities', { params: { limit: 100, offset: 0 } }).catch(() => ({ data: { data: [] } })),
      api.get('/support-tickets').catch(() => ({ data: { data: [] } })),
      api.get('/knowledge', { params: { limit: 100, offset: 0 } }).catch(() => ({ data: { data: [] } })),
    ]).then(([r, a, t, k]) => {
      const reports = (r.data.data ?? []).filter(
        (x) => (x.status ?? 'submitted') === 'submitted' && (isAdmin || x.author?.id === uid),
      );
      const activities = (a.data.data ?? []).filter(
        (x) => (x.status ?? 'submitted') === 'submitted' && (isAdmin || x.createdBy?.id === uid),
      );
      const tickets = (t.data.data ?? []).filter(
        (x) => (x.status || 'Open') === 'Open' && (isAdmin || x.author?.id === uid),
      );
      const documents = (k.data.data ?? []).filter(
        (x) => (x.status ?? 'submitted') === 'submitted' && (isAdmin || x.author?.id === uid),
      );
      setNotes({ reports, activities, tickets, documents });
    }).catch(() => {});
  }

  useEffect(() => {
    refreshNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-read the queues each time the bell opens, so a report submitted by a
  // member shows up for the secretariat without a full page reload.
  useEffect(() => {
    if (bellOpen) refreshNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bellOpen]);

  const items = useMemo(() => {
    const cleared = clearedAt ? new Date(clearedAt).getTime() : 0;
    const rows = [
      ...notes.reports.map((r) => ({
        key: `report-${r.id}`,
        kind: 'report',
        title: 'Report awaiting review',
        sub: r.originalName || `Report #${r.id}`,
        date: r.createdAt,
        to: isPrivileged ? '/admin-approvals' : '/submit-reports',
        icon: File02Icon,
      })),
      ...notes.activities.map((a) => ({
        key: `activity-${a.id}`,
        kind: 'activity',
        title: 'Activity awaiting review',
        sub: a.title || `Activity #${a.id}`,
        date: a.happenedAt ?? a.createdAt,
        to: '/reports-performance',
        icon: Medal02Icon,
      })),
      ...notes.tickets.map((t) => ({
        key: `ticket-${t.id}`,
        kind: 'ticket',
        title: 'Open support ticket',
        sub: t.title || `Ticket #${t.id}`,
        date: t.createdAt,
        to: '/support',
        icon: HelpCircleIcon,
      })),
      ...notes.documents.map((d) => ({
        key: `document-${d.id}`,
        kind: 'document',
        title: 'Document awaiting review',
        sub: d.title || d.originalName || `Document #${d.id}`,
        date: d.createdAt,
        to: isPrivileged ? '/admin-approvals' : '/knowledge-products',
        icon: File02Icon,
      })),
    ]
      .filter((it) => {
        if (!it.date) return true;
        const d = new Date(it.date).getTime();
        return Number.isNaN(d) || d > cleared;
      })
      .sort((a, b) => new Date(b.date ?? 0) - new Date(a.date ?? 0));
    const bucket = (it) => {
      const d = it.date ? new Date(it.date).getTime() : 0;
      if (Number.isNaN(d) || d === 0) return 'earlier';
      const age = Date.now() - d;
      if (age < 24 * 3600 * 1000) return 'today';
      if (age < 7 * 24 * 3600 * 1000) return 'week';
      return 'earlier';
    };
    return { all: rows, byTab: Object.fromEntries(BELL_TABS.map((t) => [t.id, rows.filter((r) => bucket(r) === t.id)])) };
  }, [notes, clearedAt, isPrivileged]);

  const bellTotal = items.all.length;
  const visible = items.byTab[bellTab] ?? [];

  function markAllRead() {
    try {
      const now = new Date().toISOString();
      localStorage.setItem(bellClearedKey(getTokenUserId()), now);
      setClearedAt(now);
    } catch {
      setClearedAt(new Date().toISOString());
    }
  }

  function seeAll() {
    setBellOpen(false);
    navigate(isPrivileged ? '/admin-approvals' : '/support');
  }

  // shortcut: knowledge list cached per session (cap 100); refreshes on reload.
  useEffect(() => {
    api
      .get('/knowledge', { params: { limit: 100, offset: 0 } })
      .then((res) => setDocs(res.data.data ?? []))
      .catch(() => setDocs([]));
  }, []);

  const hits = useMemo(() => {
    const query = q.trim().toLowerCase();
    const pages = PAGES.map((p) => ({ ...p, kind: 'page' }));
    const items = docs.map((d) => ({
      kind: 'doc',
      group: 'Knowledge',
      title: d.title,
      sub: `${d.category} · ${d.mimeType ?? ''}`,
      to: '/knowledge-products',
      icon: File02Icon,
    }));
    if (!query) return [...pages, ...items.slice(0, 5)];
    return [...pages, ...items].filter(
      (h) => h.title.toLowerCase().includes(query) || h.sub.toLowerCase().includes(query),
    ).slice(0, 10);
  }, [q, docs]);

  useEffect(() => setHighlight(0), [hits.length]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    function onClick(e) {
      if (!wrapRef.current?.contains(e.target)) {
        setOpen(false);
      }
      if (!bellRef.current?.contains(e.target)) {
        setBellOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function go(hit) {
    setQ('');
    setOpen(false);
    navigate(hit.to);
  }

  function onInputKey(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, hits.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && hits[highlight]) {
      go(hits[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  function goInfo(to) {
    setInfoOpen(false);
    navigate(to);
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full shrink-0 items-center gap-2 border-b border-border bg-white pl-2 pr-4">
      <img src={logoUrl} alt="ARISE Philippines" className="h-9 w-auto" />
      <div ref={wrapRef} className="relative mx-auto w-full max-w-xl">
        <HugeiconsIcon
          icon={Search01Icon}
          size={15}
          strokeWidth={2}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKey}
          placeholder="Search pages and documents…  ( / )"
          className="rounded-sm pl-9"
        />
        {open && hits.length > 0 && (
          <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-sm border border-border bg-card shadow-lg">
            {hits.map((hit, i) => (
              <button
                key={`${hit.kind}-${hit.title}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(hit)}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                  i === highlight ? 'bg-[#e9eff5] text-[#0B4484]' : 'text-foreground',
                )}
              >
                <HugeiconsIcon icon={hit.icon} size={17} strokeWidth={1.8} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{hit.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {hit.group} · {hit.sub}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => setQuickOpen(true)} aria-label="Guided tour" className="cursor-pointer">
          <HugeiconsIcon icon={ZapIcon} size={20} strokeWidth={1.8} />
        </Button>
        <div ref={bellRef} className="relative">
          <Button variant="ghost" size="icon" onClick={() => setBellOpen((v) => !v)} aria-label="Notifications" className="cursor-pointer">
            <HugeiconsIcon icon={Notification01Icon} size={20} strokeWidth={1.8} />
          </Button>
          {bellTotal > 0 && (
            <span className="absolute top-0.5 right-0.5 grid min-w-4 place-items-center rounded-full bg-[var(--sendai-crimson)] px-1 text-[10px] leading-4 font-semibold text-white">
              {bellTotal > 9 ? '9+' : bellTotal}
            </span>
          )}
          {bellOpen && (
            <div className="absolute top-full right-0 z-30 mt-2 max-h-[28rem] w-[24rem] overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
              <div className="flex items-center justify-between px-4 pt-3">
                <p className="font-heading text-base font-semibold text-[#1e3a5f]">Notification Center</p>
                <button type="button" onClick={seeAll} className="cursor-pointer rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted">
                  See All
                </button>
              </div>
              <div className="px-4 pt-2">
                <div className="flex items-center gap-1 rounded-full bg-muted/70 p-1">
                  {BELL_TABS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setBellTab(t.id)}
                      className={cn(
                        'flex-1 cursor-pointer rounded-full px-2 py-1 text-xs font-medium transition-colors',
                        bellTab === t.id ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={markAllRead}
                    title="Mark all as read"
                    className="flex-1 cursor-pointer rounded-full px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Mark as read
                  </button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto px-2 py-2">
                {visible.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
                ) : (
                  visible.map((it) => (
                    <button
                      key={it.key}
                      type="button"
                      onClick={() => { setBellOpen(false); navigate(it.to); }}
                      className="flex w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                        <HugeiconsIcon icon={it.icon} size={17} strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="size-1.5 shrink-0 rounded-full bg-[var(--sendai-crimson)]" aria-hidden />
                          <span className="truncate text-sm font-semibold text-foreground">{it.title}</span>
                          <span className="ml-auto shrink-0 text-xs text-muted-foreground">{timeAgo(it.date)}</span>
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-sm text-muted-foreground">{it.sub}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setInfoOpen(true)} aria-label="About this system" className="cursor-pointer">
          <HugeiconsIcon icon={InformationCircleIcon} size={20} strokeWidth={1.8} />
        </Button>
      </div>
      <WalkthroughModal open={quickOpen} onOpenChange={setQuickOpen} steps={steps} />
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading text-xl font-normal">
              <HugeiconsIcon icon={InformationCircleIcon} size={20} strokeWidth={1.8} className="text-[#0c4585]" />
              About ARISE KMS
            </DialogTitle>
            <DialogDescription>Knowledge management for ARISE Philippines members.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p className="text-justify leading-relaxed">
              ARISE KMS is the shared workspace of ARISE Philippines where member companies submit reports,
              log performance activities, track SkillsBuild certifications, and explore membership analytics.
              Reviews, approvals, and support run in one place so reporting stays consistent and verifiable.
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => goInfo('/user-manual')} aria-label="User Manual" title="User Manual" className="cursor-pointer">
                <HugeiconsIcon icon={BookOpen01Icon} size={17} strokeWidth={1.8} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => goInfo('/support')} aria-label="Support" title="Support" className="cursor-pointer">
                <HugeiconsIcon icon={HelpCircleIcon} size={17} strokeWidth={1.8} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => goInfo('/privacy-policy')} aria-label="Privacy Policy" title="Privacy Policy" className="cursor-pointer">
                <HugeiconsIcon icon={Shield01Icon} size={17} strokeWidth={1.8} />
              </Button>
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold tracking-wide uppercase">Powered by</p>
              <div className="mt-2 grid grid-cols-4 items-stretch gap-2">
                {[
                  { src: apcLogo, alt: 'APC' },
                  { src: smPrimeLogo, alt: 'SM Prime' },
                  { src: jpcsApcLogo, alt: 'JPCS APC' },
                  { src: vaulteralabsLogo, alt: 'Vaultera Labs' },
                ].map((logo) => (
                  <div key={logo.alt} className="flex h-14 items-center justify-center rounded-md bg-white px-2">
                    <img src={logo.src} alt={logo.alt} title={logo.alt} className="max-h-10 w-auto max-w-full object-contain" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
