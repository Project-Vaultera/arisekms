import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { File02Icon, Home01Icon, Search01Icon } from '@hugeicons/core-free-icons';

import dashboardData from '@/app/dashboard/data.json';
import { Input } from '@/components/ui/input.jsx';
import { cn } from '@/lib/utils.js';

import logoUrl from '../arise-ph_logo.png';

const PAGES = [
  { group: 'Pages', title: 'Admin Desk', sub: 'Dashboard', to: '/', icon: Home01Icon },
  { group: 'Pages', title: 'Submit Reports', sub: 'Quarterly, annual, good practices', to: '/submit-reports', icon: File02Icon },
  { group: 'Pages', title: 'Membership Form', sub: 'Apply or update membership', to: '/membership-form', icon: File02Icon },
  { group: 'Pages', title: 'Knowledge Products', sub: 'Manuals and guides', to: '/knowledge-products', icon: File02Icon },
  { group: 'Pages', title: 'SkillsBuild', sub: 'Training and certificates', to: '/skillsbuild', icon: File02Icon },
  { group: 'Pages', title: 'Privacy Policy', sub: 'Data protection', to: '/privacy-policy', icon: File02Icon },
  { group: 'Pages', title: 'Benefits of Joining', sub: 'Why become a member', to: '/benefits', icon: File02Icon },
  { group: 'Pages', title: 'Support', sub: 'Submit a ticket', to: '/support', icon: File02Icon },
];

export function BrandBar({ onSelectDoc }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [activityOpen, setActivityOpen] = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const hits = useMemo(() => {
    const query = q.trim().toLowerCase();
    const pages = PAGES.map((p) => ({ ...p, kind: 'page' }));
    const docs = dashboardData.map((d) => ({
      kind: 'doc',
      group: 'Documents',
      title: d.header,
      sub: `${d.type} · ${d.status}`,
      to: '/',
      icon: File02Icon,
    }));
    if (!query) return [...pages, ...docs.slice(0, 5)];
    return [...pages, ...docs].filter(
      (h) => h.title.toLowerCase().includes(query) || h.sub.toLowerCase().includes(query),
    ).slice(0, 10);
  }, [q]);

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
        setActivityOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function go(hit) {
    setQ('');
    setOpen(false);
    if (hit.kind === 'doc') onSelectDoc?.(hit.title);
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

  const recent = [...dashboardData]
    .sort((a, b) => b.id - a.id)
    .slice(0, 3);

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-white px-4">
      <img src={logoUrl} alt="ARISE Philippines" className="h-8 w-auto" />
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
                  i === highlight ? 'bg-[#e9f7ef] text-[#15803d]' : 'text-foreground',
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
      <div className="relative ml-auto">
        <button
          aria-label="Recent activity"
          title="Recent activity"
          onClick={() => setActivityOpen((v) => !v)}
          className="relative rounded-sm p-1.5 text-[#1e3a5f] transition-colors hover:bg-[#e9f7ef] hover:text-[#15803d]"
        >
          <span className="relative">
            <HugeiconsIcon icon={File02Icon} size={19} strokeWidth={1.8} />
            <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-[#15803d]" />
          </span>
        </button>
        {activityOpen && (
          <div className="absolute right-0 top-full z-30 mt-1 w-72 overflow-hidden rounded-sm border border-border bg-card shadow-lg">
            <p className="editorial-eyebrow px-3 pb-1 pt-3 text-muted-foreground">Recent activity</p>
            {recent.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  setActivityOpen(false);
                  onSelectDoc?.(d.header);
                  navigate('/');
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[#e9f7ef] hover:text-[#15803d]"
              >
                <HugeiconsIcon icon={File02Icon} size={16} strokeWidth={1.8} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{d.header}</span>
                  <span className="block truncate text-xs text-muted-foreground">{d.status}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-[#15803d] text-xs font-semibold text-white">
        IA
      </span>
    </header>
  );
}
