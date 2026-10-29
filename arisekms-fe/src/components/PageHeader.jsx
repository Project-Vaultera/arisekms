import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { PlusSignIcon } from '@hugeicons/core-free-icons';

import { Button } from '@/components/ui/button.jsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { effectiveRole, getTokenRoles } from '@/lib/rbac.js';

// Page heading strip. Titles live in each page's PageHero — this row only
// carries an optional standalone title (dashboard home) and the "Add New"
// dropdown on actionable pages. Renders nothing when neither applies.
export function PageHeader({ title, subtitle, actions = [] }) {
  const navigate = useNavigate();
  const role = effectiveRole(getTokenRoles());
  const visible = actions.filter((a) => !a.adminOnly || role === 'ADMIN');

  if (!title && visible.length === 0) return null;

  return (
    <div className="flex w-full items-start justify-between gap-3 px-4 pt-3 lg:px-6">
      <div className="min-w-0">
        {title && (
          <h1 className="font-heading text-2xl font-normal tracking-tight text-[#1e3a5f]">{title}</h1>
        )}
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {visible.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <HugeiconsIcon icon={PlusSignIcon} size={17} strokeWidth={2} />
              Add New
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {visible.map((a) => (
              <DropdownMenuItem key={a.to} onSelect={() => navigate(a.to)}>
                <HugeiconsIcon icon={a.icon} size={16} strokeWidth={1.8} />
                {a.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
