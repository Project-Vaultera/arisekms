import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { File02Icon, Home01Icon, InformationCircleIcon, Notification01Icon, Search01Icon, ZapIcon } from '@hugeicons/core-free-icons';

import { api } from '@/api/client.js';
import { QuickstartPanel } from '@/components/QuickstartPanel.jsx';
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
import { effectiveRole, getTokenRoles, getTokenUserId, ROLE } from '@/lib/rbac.js';
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

export function BrandBar() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [docs, setDocs] = useState([]);
  const [quickOpen, setQuickOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notes, setNotes] = useState({ reports: [], activities: [], tickets: [] });
  const wrapRef = useRef(null);
  const bellRef = useRef(null);
  const inputRef = useRef(null);
  const role = effectiveRole(getTokenRoles());
  const steps = QUICKSTART_STEPS[role] ?? QUICKSTART_STEPS[ROLE.MEMBER];
  const bellTotal = notes.reports.length + notes.activities.length + notes.tickets.length;

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

  // shortcut: notification queues read live (cap 100 each); no push channel yet.
  useEffect(() => {
    const uid = getTokenUserId();
    const isAdmin = effectiveRole(getTokenRoles()) === ROLE.IT_ADMIN;
    Promise.all([
      api.get('/reports', { params: { limit: 100, offset: 0 } }).catch(() => ({ data: { data: [] } })),
      api.get('/activities', { params: { limit: 100, offset: 0 } }).catch(() => ({ data: { data: [] } })),
      api.get('/support-tickets').catch(() => ({ data: { data: [] } })),
    ]).then(([r, a, t]) => {
      const reports = (r.data.data ?? []).filter(
        (x) => (x.status ?? 'submitted') === 'submitted' && (isAdmin || x.author?.id === uid),
      );
      const activities = (a.data.data ?? []).filter(
        (x) => (x.status ?? 'submitted') === 'submitted' && (isAdmin || x.createdBy?.id === uid),
      );
      const tickets = (t.data.data ?? []).filter(
        (x) => (x.status || 'Open') === 'Open' && (isAdmin || x.author?.id === uid),
      );
      setNotes({ reports, activities, tickets });
    }).catch(() => {});
  }, []);

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
        <Button variant="ghost" size="icon" onClick={() => setQuickOpen(true)} aria-label="Quickstart guide">
          <HugeiconsIcon icon={ZapIcon} size={20} strokeWidth={1.8} />
        </Button>
        <div ref={bellRef} className="relative">
          <Button variant="ghost" size="icon" onClick={() => setBellOpen((v) => !v)} aria-label="Notifications">
            <HugeiconsIcon icon={Notification01Icon} size={20} strokeWidth={1.8} />
          </Button>
          {bellTotal > 0 && (
            <span className="absolute top-0.5 right-0.5 grid min-w-4 place-items-center rounded-full bg-[var(--sendai-crimson)] px-1 text-[10px] leading-4 font-semibold text-white">
              {bellTotal > 9 ? '9+' : bellTotal}
            </span>
          )}
          {bellOpen && (
            <div className="absolute top-full right-0 z-30 mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
              <p className="border-b border-border px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Notifications
              </p>
              <div className="py-1">
                <BellSection title="Reports awaiting review" items={notes.reports} to="/submit-reports"
                  label={(r) => r.originalName || `Report #${r.id}`} onGo={() => setBellOpen(false)} navigate={navigate} />
                <BellSection title="Activities awaiting review" items={notes.activities} to="/reports-performance"
                  label={(a) => a.title} onGo={() => setBellOpen(false)} navigate={navigate} />
                <BellSection title="Open support tickets" items={notes.tickets} to="/support"
                  label={(t) => t.title || `Ticket #${t.id}`} onGo={() => setBellOpen(false)} navigate={navigate} />
                {bellTotal === 0 && (
                  <p className="px-3 py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
                )}
              </div>
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setInfoOpen(true)} aria-label="About this system">
          <HugeiconsIcon icon={InformationCircleIcon} size={20} strokeWidth={1.8} />
        </Button>
      </div>
      <QuickstartPanel open={quickOpen} onOpenChange={setQuickOpen} steps={steps} />
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-normal">About ARISE KMS</DialogTitle>
            <DialogDescription>Knowledge management for ARISE Philippines members.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Submit reports, log performance activities, track certifications, and explore membership analytics from the sidebar.</p>
            <p>Signed in as <span className="font-medium text-foreground">{role}</span>.</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setInfoOpen(false); navigate('/user-manual'); }}>
                User Manual
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setInfoOpen(false); navigate('/support'); }}>
                Support
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
                  <div key={logo.alt} className="flex h-14 items-center justify-center rounded-md border border-border bg-white px-2">
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

function BellSection({ title, items, to, label, onGo, navigate }) {
  if (items.length === 0) return null;
  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => { onGo(); navigate(to); }}
        className="flex w-full items-center justify-between px-3 pt-2 text-xs font-semibold text-[#0B4484] hover:underline"
      >
        {title} · {items.length}
      </button>
      <div className="pb-1">
        {items.slice(0, 4).map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => { onGo(); navigate(to); }}
            className="block w-full truncate px-3 py-1.5 text-left text-sm hover:bg-muted/60"
          >
            {label(it)}
          </button>
        ))}
      </div>
    </div>
  );
}
