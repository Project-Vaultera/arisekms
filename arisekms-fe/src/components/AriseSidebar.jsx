import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowDown01Icon,
  Award01Icon,
  BarChartIcon,
  BookOpen01Icon,
  ExternalLinkIcon,
  File02Icon,
  GiftIcon,
  GridViewIcon,
  HelpCircleIcon,
  Home01Icon,
  Shield01Icon,
  SidebarLeftIcon,
  Upload01Icon,
  UserAdd01Icon,
} from '@hugeicons/core-free-icons';

import { ProfileMenu } from '@/components/ProfileMenu.jsx';
import { CompanyLogo } from '@/components/CompanyLogo.jsx';
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
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils.js';

const ADMIN_CENTER = [
  { id: 'admin-desk', label: 'Admin Desk', icon: GridViewIcon, to: '/' },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChartIcon,
    // TODO: replace with real report destinations.
    children: [{ id: 'reports-monthly', label: 'Monthly summary' }, { id: 'reports-activity', label: 'Member activity' }],
  },
];

const MAIN = [
  { id: 'home', label: 'Home', icon: Home01Icon, to: '/' },
  { id: 'submit-reports', label: 'Submit Reports', icon: Upload01Icon, to: '/submit-reports' },
  { id: 'membership-form', label: 'Membership Form', icon: UserAdd01Icon, to: '/membership-form' },
  { id: 'knowledge-products', label: 'Knowledge Products', icon: BookOpen01Icon, to: '/knowledge-products' },
  { id: 'skillsbuild', label: 'SkillsBuild', icon: Award01Icon, to: '/skillsbuild' },
];

const HELP_CENTER = [
  { id: 'privacy', label: 'Privacy Policy', icon: Shield01Icon, to: '/privacy-policy' },
  { id: 'benefits', label: 'Benefits of Joining', icon: GiftIcon, to: '/benefits' },
  { id: 'manual', label: 'System Guide Manual', icon: File02Icon, external: true },
  { id: 'support', label: 'Support', icon: HelpCircleIcon, to: '/support' },
];

const linkCls = ({ isActive }) =>
  cn(
    'text-sidebar-foreground hover:bg-[#e9f7ef] hover:text-[#15803d] group-data-[collapsible=icon]:justify-center',
    isActive && 'bg-[#e9f7ef] font-semibold text-[#15803d]',
  );

function Item({ item, depth }) {
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
        <SidebarMenuButton asChild tooltip={item.label} className={cn(linkCls({ isActive: false }), depth > 0 && 'pl-11')}>
          <a href="#" target="_blank" rel="noreferrer">
            {content}
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }
  if (!item.to) {
    return null;
  }
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={item.label} className={cn(linkCls({ isActive: false }), depth > 0 && 'pl-11')}>
        <NavLink to={item.to} end={item.to === '/'} className={linkCls}>
          {content}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AriseSidebar() {
  const [reportsOpen, setReportsOpen] = useState(false);
  const [placeholderActive, setPlaceholderActive] = useState(null);
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';
  const role = effectiveRole(getTokenRoles());

  return (
    <Sidebar collapsible="icon" className="sticky top-14 h-[calc(100svh-3.5rem)] border-r border-sidebar-border bg-white transition-[width] duration-300 ease-out">
      <SidebarContent className="bg-white">
        <div className="flex items-center gap-3 px-4 pt-4 pb-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2 group-data-[collapsible=icon]:px-0">
          <CompanyLogo size={40} />
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground">
              My Workspace
            </p>
            <p className="truncate text-sm font-semibold text-[#1e3a5f]">Arise KMS</p>
          </div>
          <button
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="shrink-0 rounded-sm p-1.5 text-[#1e3a5f] transition-colors hover:bg-[#e9f7ef] hover:text-[#15803d]"
          >
            <HugeiconsIcon icon={SidebarLeftIcon} size={19} strokeWidth={1.8} />
          </button>
        </div>

        {role === 'ADMIN' && (
          <SidebarGroup>
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Admin Center</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <Item item={ADMIN_CENTER[0]} depth={0} />
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Reports"
                    onClick={() => setReportsOpen((v) => !v)}
                    className="text-sidebar-foreground hover:bg-[#e9f7ef] hover:text-[#15803d] group-data-[collapsible=icon]:justify-center"
                  >
                    <HugeiconsIcon icon={BarChartIcon} size={18} strokeWidth={1.8} />
                    <span className="group-data-[collapsible=icon]:hidden">Reports</span>
                    <HugeiconsIcon
                      icon={ArrowDown01Icon}
                      size={15}
                      strokeWidth={2}
                      className={cn('ml-auto transition-transform group-data-[collapsible=icon]:hidden', reportsOpen && 'rotate-180')}
                    />
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {reportsOpen && !collapsed &&
                  ADMIN_CENTER[1].children.map((child) => (
                    <SidebarMenuItem key={child.id}>
                      <SidebarMenuButton
                        tooltip={child.label}
                        onClick={() => setPlaceholderActive(child.id)}
                        className={cn(
                          'text-sidebar-foreground hover:bg-[#e9f7ef] hover:text-[#15803d] group-data-[collapsible=icon]:justify-center',
                          placeholderActive === child.id && 'bg-[#e9f7ef] font-semibold text-[#15803d]',
                          'pl-11',
                        )}
                      >
                        <HugeiconsIcon icon={BarChartIcon} size={18} strokeWidth={1.8} />
                        <span className="group-data-[collapsible=icon]:hidden">{child.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {MAIN.map((item) => (
                <Item key={item.id} item={item} depth={0} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Help Center</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {HELP_CENTER.map((item) => (
                <Item key={item.id} item={item} depth={0} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarFooter className="mt-auto border-t border-sidebar-border px-3 py-3">
          <ProfileMenu />
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}
