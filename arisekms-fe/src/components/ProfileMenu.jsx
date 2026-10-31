import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { SidebarLeftIcon, SidebarRightIcon } from '@hugeicons/core-free-icons';

import { api } from '@/api/client.js';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils.js';

function initialsOf(name) {
  return (name ?? '?')
    .split(' ')
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function Avatar({ size, className, label }) {
  const px = { width: size, height: size };
  const innerSize = size - 6;
  const fontSize = Math.max(10, Math.round(size * 0.28));
  return (
    <span
      style={px}
      className={cn('relative grid shrink-0 place-items-center rounded-full', className)}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'conic-gradient(var(--sendai-crimson) 0deg 90deg, var(--sendai-plum) 90deg 180deg, var(--sendai-orange) 180deg 270deg, var(--sendai-teal) 270deg 360deg)',
        }}
      />
      <span
        style={{ width: innerSize, height: innerSize, fontSize }}
        className="relative grid place-items-center rounded-full bg-[#0B4484] font-heading font-black text-white"
      >
        {label ?? 'IA'}
      </span>
    </span>
  );
}

export function ProfileMenu() {
  const navigate = useNavigate();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';
  const [me, setMe] = useState(null);
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get('/users/me').then((res) => res.data.data).catch(() => null),
      api.get('/companies').then((res) => res.data.data ?? []).catch(() => []),
    ]).then(([user, companies]) => {
      if (cancelled) return;
      setMe(user);
      setCompanyName(companies[0]?.name ?? '');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex w-full flex-col items-center gap-2 rounded-sm px-1 py-1">
      <button
        onClick={toggleSidebar}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={cn(
          'hidden shrink-0 rounded-sm p-1.5 text-[#0c4585] transition-colors hover:text-[#00ada8]',
          collapsed && 'flex',
        )}
      >
        <HugeiconsIcon icon={collapsed ? SidebarRightIcon : SidebarLeftIcon} size={18} strokeWidth={1.8} />
      </button>
      <div className="flex w-full items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="group flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-sm px-1 py-1 text-left group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <Avatar size={40} className="relative" label={initialsOf(me?.name)} />
          <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-base font-semibold text-[#1e3a5f]">{me?.name ?? '…'}</span>
            <span className="block truncate text-sm text-muted-foreground">{companyName || 'ARISE Philippines'}</span>
          </span>
        </button>
        <button
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn('shrink-0 rounded-sm p-1.5 text-[#0c4585] transition-colors hover:text-[#00ada8]', collapsed && 'hidden')}
        >
          <HugeiconsIcon icon={collapsed ? SidebarRightIcon : SidebarLeftIcon} size={18} strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}
