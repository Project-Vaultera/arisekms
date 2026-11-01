import { Fragment, useState } from 'react';
import { matchPath, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Agreement01Icon,
  ArrowDown01Icon,
  BarChartIcon,
  BookOpen01Icon,
  ChartUpIcon,
  CheckmarkCircle01Icon,
  ExternalLinkIcon,
  File02Icon,
  HelpCircleIcon,
  Home01Icon,
  Logout01Icon,
  Medal01Icon,
  Medal02Icon,
  Shield01Icon,
  TrophyIcon,
  Upload01Icon,
  UserAdd01Icon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';

import { ProfileMenu } from '@/components/ProfileMenu.jsx';
import { clearTokens } from '@/api/client.js';
import logoUrl from '/arise-ph_logo.png';
import { effectiveRole, getTokenRoles, ROLE } from '@/lib/rbac.js';
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

const REPORTS_LINKS = [
  { id: 'reports-membership', label: 'Membership', icon: Agreement01Icon, to: '/reports-membership' },
  { id: 'reports-summary', label: 'Report Summary', icon: ChartUpIcon, to: '/reports-summary' },
  { id: 'reports-performance', label: 'Performance and Metrics', icon: Medal01Icon, to: '/reports-performance' },
];

const SECRETARIAT_OVERVIEW = [
  { id: 'member-directory', label: 'Member Directory', icon: UserGroupIcon, to: '/member-directory' },
  { id: 'admin-approvals', label: 'Approvals', icon: CheckmarkCircle01Icon, to: '/admin-approvals' },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChartIcon,
    // TODO: replace with real report destinations.
    children: REPORTS_LINKS,
  },
];

// IT-admin-only system section: accounts + troubleshooting (support queue).
const GOVERNANCE = [
  { id: 'governance-audit', label: 'Audit Logs', icon: File02Icon, to: '/governance-audit' },
  { id: 'governance-users', label: 'User Directory', icon: Shield01Icon, to: '/governance-users' },
  { id: 'governance-support', label: 'Support Monitoring', icon: HelpCircleIcon, to: '/governance-support' },
];

const MAIN = [
  { id: 'home', label: 'Home', icon: Home01Icon, to: '/' },
  { id: 'members-list', label: 'Members List', icon: UserGroupIcon, to: '/members-list' },
  { id: 'submit-reports', label: 'Submit Reports', icon: Upload01Icon, to: '/submit-reports' },
  { id: 'membership-form', label: 'Membership Form', icon: UserAdd01Icon, to: '/membership-form' },
  { id: 'knowledge-products', label: 'Knowledge Products', icon: BookOpen01Icon, to: '/knowledge-products' },
  { id: 'skillsbuild', label: 'Activity', icon: Medal02Icon, to: '/activity' },
  { id: 'leaderboards', label: 'Leaderboards', icon: TrophyIcon, to: '/leaderboards' },
];

const HELP_CENTER = [
  { id: 'privacy', label: 'Privacy Policy', icon: Shield01Icon, to: '/privacy-policy' },
  { id: 'manual', label: 'User Manual', icon: File02Icon, to: '/user-manual' },
  { id: 'support', label: 'Support', icon: HelpCircleIcon, to: '/support' },
];

const LINK_BASE =
  'text-base text-[#0c4585] hover:text-[#00ada8] group-data-[collapsible=icon]:justify-center';
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
      <HugeiconsIcon icon={item.icon} size={20} strokeWidth={1.8} />
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
          <HugeiconsIcon icon={item.icon} size={20} strokeWidth={1.8} />
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
            <HugeiconsIcon icon={item.icon} size={20} strokeWidth={1.8} />
            <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={12} className="min-w-56 rounded-xl p-2">
          {item.children.map((child) => (
            <DropdownMenuItem
              key={child.id}
              onSelect={() => onSelect(child)}
              className={cn(
                'cursor-pointer gap-2 rounded-lg px-3 py-2.5 text-base text-[#0c4585] focus:bg-sidebar-accent focus:text-[#0c4585]',
                activeId === child.id &&
                  'bg-[var(--sendai-teal)] font-semibold text-white focus:bg-[var(--sendai-teal)] focus:text-white',
              )}
            >
              <HugeiconsIcon icon={child.icon} size={20} strokeWidth={1.8} />
              <span>{child.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

export function AriseSidebar({ locked = false }) {
  const [reportsOpen, setReportsOpen] = useState(false);
  const { pathname } = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const role = effectiveRole(getTokenRoles());
  const navigate = useNavigate();
  const isStaff = role === ROLE.IT_ADMIN || role === ROLE.SECRETARIAT;
  const isAnalyst = role === ROLE.DATA_ANALYST;
  const isMember = role === ROLE.MEMBER;
  // Only members answer the membership application; staff get a simple profile.
  // Members List is visible to members + secretariat/admins, not analysts.
  const main = (locked ? MAIN.filter((item) => item.id === 'membership-form') : MAIN).filter(
    (item) =>
      (item.id !== 'membership-form' || isMember) &&
      (item.id !== 'members-list' || !isAnalyst),
  );

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
        {isStaff && <SidebarSeparator className="mx-2" />}
        {isAnalyst && <SidebarSeparator className="mx-2" />}

        {role === ROLE.IT_ADMIN && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sm uppercase tracking-wider group-data-[collapsible=icon]:hidden">Governance</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {GOVERNANCE.map((item) => (
                  <Item key={item.id} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isAnalyst && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sm uppercase tracking-wider group-data-[collapsible=icon]:hidden">Reports</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {REPORTS_LINKS.filter((item) => item.id !== 'reports-membership').map((item) => (
                  <Item key={item.id} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isStaff && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sm uppercase tracking-wider group-data-[collapsible=icon]:hidden">Secretariat Overview</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {SECRETARIAT_OVERVIEW.map((item) =>
                  item.children ? (
                    collapsed ? (
                      <CollapsedReportsMenu
                        key={item.id}
                        item={item}
                        activeId={item.children.find((c) => c.to === pathname)?.id}
                        onSelect={(child) => { if (child.to) navigate(child.to); }}
                      />
                    ) : (
                      <Fragment key={item.id}>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            tooltip={item.label}
                            onClick={() => setReportsOpen((v) => !v)}
                            className="text-[#0c4585] hover:text-[#00ada8] group-data-[collapsible=icon]:justify-center"
                          >
                            <HugeiconsIcon icon={item.icon} size={20} strokeWidth={1.8} />
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
                          item.children.map((child) => {
                            const isActive = pathname === child.to;
                            return (
                            <SidebarMenuItem key={child.id}>
                              <SidebarMenuButton
                                asChild
                                tooltip={child.label}
                                className={cn(
                                  'text-[#0c4585] hover:text-[#00ada8] group-data-[collapsible=icon]:justify-center',
                                  isActive && 'bg-[var(--sendai-teal)] font-semibold text-white hover:text-white',
                                )}
                              >
                                <NavLink to={child.to}>
                                  <HugeiconsIcon icon={child.icon} size={20} strokeWidth={1.8} />
                                  <span className="group-data-[collapsible=icon]:hidden truncate">{child.label}</span>
                                </NavLink>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                            );
                          })}
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
          <SidebarGroupLabel className="text-sm uppercase tracking-wider group-data-[collapsible=icon]:hidden">Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((item) => (
                <Item key={item.id} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator className="mx-3" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-sm uppercase tracking-wider group-data-[collapsible=icon]:hidden">Help Center</SidebarGroupLabel>
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
              <HugeiconsIcon icon={Logout01Icon} size={20} strokeWidth={1.8} />
              <span className="group-data-[collapsible=icon]:hidden">Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
