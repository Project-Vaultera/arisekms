import { Fragment, useState } from 'react';
import { matchPath, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Agreement01Icon,
  ArrowDown01Icon,
  Award01Icon,
  BarChartIcon,
  BookOpen01Icon,
  ChartUpIcon,
  CheckmarkCircle01Icon,
  ExternalLinkIcon,
  File02Icon,
  GridViewIcon,
  HelpCircleIcon,
  Home01Icon,
  Logout01Icon,
  Medal01Icon,
  Shield01Icon,
  TrophyIcon,
  Upload01Icon,
  UserAdd01Icon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';

import { ProfileMenu } from '@/components/ProfileMenu.jsx';
import { clearTokens } from '@/api/client.js';
import logoUrl from '/arise-ph_logo.png';
import { effectiveRole, getTokenRoles } from '@/lib/rbac.js';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx';
import { cn } from '@/lib/utils.js';

const ADMIN_CENTER = [
  { id: 'admin-overview', label: 'Admin Overview', icon: GridViewIcon, to: '/admin-overview' },
  { id: 'member-directory', label: 'Member Directory', icon: UserGroupIcon, to: '/member-directory' },
  { id: 'admin-approvals', label: 'Approvals', icon: CheckmarkCircle01Icon, to: '/admin-approvals' },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChartIcon,
    // TODO: replace with real report destinations.
    children: [
      { id: 'reports-membership', label: 'Membership', icon: Agreement01Icon },
      { id: 'reports-summary', label: 'Report Summary', icon: ChartUpIcon },
      { id: 'reports-performance', label: 'Performance and Metrics', icon: Medal01Icon },
    ],
  },
];

const MAIN = [
  { id: 'home', label: 'Home', icon: Home01Icon, to: '/' },
  { id: 'submit-reports', label: 'Submit Reports', icon: Upload01Icon, to: '/submit-reports' },
  { id: 'membership-form', label: 'Membership Form', icon: UserAdd01Icon, to: '/membership-form' },
  { id: 'knowledge-products', label: 'Knowledge Products', icon: BookOpen01Icon, to: '/knowledge-products' },
  { id: 'skillsbuild', label: 'SkillsBuild', icon: Award01Icon, to: '/skillsbuild' },
  { id: 'leaderboards', label: 'Leaderboards', icon: TrophyIcon, to: '/leaderboards' },
];

const HELP_CENTER = [
  { id: 'privacy', label: 'Privacy Policy', icon: Shield01Icon, to: '/privacy-policy' },
  { id: 'manual', label: 'User Manual', icon: File02Icon, to: '/user-manual' },
  { id: 'support', label: 'Support', icon: HelpCircleIcon, to: '/support' },
];

const LINK_BASE =
  'text-[#0c4585] hover:text-[#00ada8] group-data-[collapsible=icon]:justify-center';
const LINK_ACTIVE = 'bg-[var(--sendai-teal)] font-semibold text-white hover:text-white';

function Item({ item }) {
  const { pathname } = useLocation();
  // Single source of truth for active state: the same resolved class string
  // goes on both the button and the link, so no conflicting text colors merge.
  const isActive = item.to
    ? Boolean(matchPath({ path: item.to, end: item.to === '/' }, pathname))
    : false;
  const cls = cn(LINK_BASE, isActive && LINK_ACTIVE);
  const content = (
    <>
      <HugeiconsIcon icon={item.icon} size={18} strokeWidth={1.8} />
      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
      {item.external && (
        <HugeiconsIcon icon={ExternalLinkIcon} size={13} strokeWidth={2} className="ml-auto opacity-50" />
      )}
    </>
  );
  if (item.external) {
    // TODO: point at the real guide URL.
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={item.label} className={LINK_BASE}>
          <a href="#" target="_blank" rel="noreferrer">
            {content}
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }
  if (!item.to) {
    // No destination yet: visible but disabled placeholder.
    // TODO: point at the real guide URL once it lands.
    return (
      <SidebarMenuItem>
        <SidebarMenuButton tooltip={item.label} disabled className="group-data-[collapsible=icon]:justify-center">
          <HugeiconsIcon icon={item.icon} size={18} strokeWidth={1.8} />
          <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={item.label} className={cls}>
        <NavLink to={item.to} end={item.to === '/'} className={cls}>
          {content}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

// Icon-collapsed mode: Reports children open in a click-to-open flyout card.
function CollapsedReportsMenu({ item, activeId, onSelect }) {
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            tooltip={item.label}
            className="text-[#0c4585] hover:text-[#00ada8] group-data-[collapsible=icon]:justify-center"
          >
            <HugeiconsIcon icon={item.icon} size={18} strokeWidth={1.8} />
            <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={12} className="min-w-56 rounded-xl p-2">
          {item.children.map((child) => (
            <DropdownMenuItem
              key={child.id}
              onSelect={() => onSelect(child.id)}
              className={cn(
                'cursor-pointer gap-2 rounded-lg px-3 py-2.5 text-sm text-[#0c4585] focus:bg-sidebar-accent focus:text-[#0c4585]',
                activeId === child.id &&
                  'bg-[var(--sendai-teal)] font-semibold text-white focus:bg-[var(--sendai-teal)] focus:text-white',
              )}
            >
              <HugeiconsIcon icon={child.icon} size={16} strokeWidth={1.8} />
              <span>{child.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

export function AriseSidebar() {
  const [reportsOpen, setReportsOpen] = useState(false);
  const [placeholderActive, setPlaceholderActive] = useState(null);
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const role = effectiveRole(getTokenRoles());
  const navigate = useNavigate();

  function logout() {
    clearTokens();
    navigate('/login', { replace: true });
  }

  return (
    <Sidebar collapsible="icon" className="sticky top-14 h-[calc(100svh-3.5rem)] shrink-0 border-r border-sidebar-border bg-white transition-[width] duration-300 ease-out">
      <SidebarContent className="scroll-smooth bg-white [scrollbar-width:thin] [scrollbar-color:var(--sidebar-border)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-sidebar-border [&::-webkit-scrollbar-track]:bg-transparent" style={{ overflowX: 'hidden' }}>
        <div className="px-2 pt-3 pb-1">
          <ProfileMenu />
        </div>
        <SidebarSeparator className="mx-2" />

        {role === 'ADMIN' && (
          <SidebarGroup>
            <SidebarGroupLabel className="uppercase tracking-wider group-data-[collapsible=icon]:hidden">Admin Center</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {ADMIN_CENTER.map((item) =>
                  item.children ? (
                    collapsed ? (
                      <CollapsedReportsMenu
                        key={item.id}
                        item={item}
                        activeId={placeholderActive}
                        onSelect={setPlaceholderActive}
                      />
                    ) : (
                      <Fragment key={item.id}>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            tooltip={item.label}
                            onClick={() => setReportsOpen((v) => !v)}
                            className="text-[#0c4585] hover:text-[#00ada8] group-data-[collapsible=icon]:justify-center"
                          >
                            <HugeiconsIcon icon={item.icon} size={18} strokeWidth={1.8} />
                            <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                            <HugeiconsIcon
                              icon={ArrowDown01Icon}
                              size={15}
                              strokeWidth={2}
                              className={cn('ml-auto transition-transform group-data-[collapsible=icon]:hidden', reportsOpen && 'rotate-180')}
                            />
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        {reportsOpen &&
                          item.children.map((child) => (
                            <SidebarMenuItem key={child.id}>
                              <SidebarMenuButton
                                tooltip={child.label}
                                onClick={() => setPlaceholderActive(child.id)}
                                className={cn(
                                  'text-[#0c4585] hover:text-[#00ada8] group-data-[collapsible=icon]:justify-center',
                                  placeholderActive === child.id && 'bg-[var(--sendai-teal)] font-semibold text-white hover:text-white',
                                )}
                              >
                                <HugeiconsIcon icon={child.icon} size={18} strokeWidth={1.8} />
                                <span className="group-data-[collapsible=icon]:hidden truncate">{child.label}</span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                      </Fragment>
                    )
                  ) : (
                    <Item key={item.id} item={item} />
                  ),
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        <SidebarSeparator className="mx-3" />

        <SidebarGroup>
          <SidebarGroupLabel className="uppercase tracking-wider group-data-[collapsible=icon]:hidden">Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {MAIN.map((item) => (
                <Item key={item.id} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator className="mx-3" />

        <SidebarGroup>
          <SidebarGroupLabel className="uppercase tracking-wider group-data-[collapsible=icon]:hidden">Help Center</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {HELP_CENTER.map((item) => (
                <Item key={item.id} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border px-2 py-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={logout}
              tooltip="Log out"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <HugeiconsIcon icon={Logout01Icon} size={18} strokeWidth={1.8} />
              <span className="group-data-[collapsible=icon]:hidden">Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
