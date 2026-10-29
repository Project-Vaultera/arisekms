import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowUp01Icon,
  BookOpen01Icon,
  Logout01Icon,
  Moon01Icon,
  Sun01Icon,
  UserCircle02Icon,
} from '@hugeicons/core-free-icons';
import { useTheme } from 'next-themes';

import { clearTokens } from '@/api/client.js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils.js';

function Avatar({ size, className }) {
  const px = { width: size, height: size };
  return (
    <span
      style={px}
      className={cn(
        'grid shrink-0 place-items-center rounded-sm bg-[#15803d] font-heading text-xs font-black text-white',
        className,
      )}
    >
      IA
    </span>
  );
}

export function ProfileMenu() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const NextIcon = theme === 'dark' ? Sun01Icon : Moon01Icon;

  function logout() {
    clearTokens();
    navigate('/login', { replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="it-admin"
          className="group flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left transition-colors hover:bg-[#e9f7ef] data-[state=open]:bg-[#e9f7ef] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <Avatar
            size={28}
            className="transition-transform duration-200 group-hover:scale-110 group-data-[state=open]:ring-2 group-data-[state=open]:ring-[#15803d]/50"
          />
          <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-[13px] font-semibold text-[#1e3a5f]">it-admin</span>
            <span className="block truncate text-[11px] text-muted-foreground">ADMINISTRATOR</span>
          </span>
          <HugeiconsIcon
            icon={ArrowUp01Icon}
            size={14}
            strokeWidth={2}
            className="shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" sideOffset={8} align="start" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-2.5 font-normal">
          <Avatar size={34} />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold">it-admin</span>
            {/* TODO: show the real email from GET /users/me. */}
            <span className="block truncate text-[11px] text-muted-foreground">it-admin@example.com</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* TODO: point at the real account page when the route lands. */}
        <DropdownMenuItem onSelect={() => navigate('/')}>
          <HugeiconsIcon icon={UserCircle02Icon} size={15} strokeWidth={1.8} className="mr-2 text-muted-foreground" />
          My Account
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme(nextTheme)}>
          <HugeiconsIcon icon={NextIcon} size={15} strokeWidth={1.8} className="mr-2 text-muted-foreground" />
          {nextTheme === 'dark' ? 'Dark' : 'Light'}
        </DropdownMenuItem>
        {/* TODO: point at the real user manual when it lands. */}
        <DropdownMenuItem onSelect={() => navigate('/')}>
          <HugeiconsIcon icon={BookOpen01Icon} size={15} strokeWidth={1.8} className="mr-2 text-muted-foreground" />
          User Manual
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout} className="text-red-600 focus:text-red-700">
          <HugeiconsIcon icon={Logout01Icon} size={15} strokeWidth={1.8} className="mr-2" />
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
