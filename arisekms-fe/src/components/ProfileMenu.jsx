import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { SidebarLeftIcon, SidebarRightIcon } from '@hugeicons/core-free-icons';

import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils.js';

function Avatar({ size, className }) {
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
        IA
      </span>
    </span>
  );
}

export function ProfileMenu() {
  const navigate = useNavigate();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';

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
          onClick={() => navigate('/membership-form')}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-sm px-1 py-1 text-left transition-colors hover:bg-[#e9eff5] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <Avatar size={40} className="relative" />
          <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-sm font-semibold text-[#1e3a5f]">Juan Dela Cruz</span>
            <span className="block truncate text-xs text-muted-foreground">ARISE Philippines</span>
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
