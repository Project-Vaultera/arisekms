import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  Logout01Icon,
  Shield01Icon,
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
import { cn } from '@/lib/utils.js';

const ADMIN_CENTER = [
  { id: 'admin-desk', label: 'Admin Desk', icon: GridViewIcon, to: '/' },
  { id: 'member-directory', label: 'Member Directory', icon: UserGroupIcon, to: '/member-directory' },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChartIcon,
    // TODO: replace with real report destinations.
    children: [{ id: 'reports-monthly', label: 'Monthly Summary' }, { id: 'reports-activity', label: 'Member Activity' }],
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
  { id: 'manual', label: 'User Manual', icon: File02Icon },
  { id: 'support', label: 'Support', icon: HelpCircleIcon, to: '/support' },
];

const linkCls = ({ isActive }) =>
  cn(
    'text-[#0c4585] hover:text-[#00ada8] group-data-[collapsible=icon]:justify-center',
    isActive && 'bg-[#e9eff5] font-semibold text-[#00ada8]',
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
    // No destination yet (e.g. User Manual): visible but disabled placeholder.
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
      <SidebarContent className="bg-white" style={{ overflowX: 'hidden' }}>
        <div className="px-2 pt-3 pb-1">
          <ProfileMenu />
        </div>
        <SidebarSeparator className="mx-2" />

        {role === 'ADMIN' && (
          <SidebarGroup>
            <SidebarGroupLabel className="uppercase tracking-wider group-data-[collapsible=icon]:hidden">Admin Center</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <Item item={ADMIN_CENTER[0]} depth={0} />
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Reports"
                    onClick={() => setReportsOpen((v) => !v)}
                    className="text-[#0c4585] hover:text-[#00ada8] group-data-[collapsible=icon]:justify-center"
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
                          'text-[#0c4585] hover:text-[#00ada8] group-data-[collapsible=icon]:justify-center',
                          placeholderActive === child.id && 'bg-[#e9eff5] font-semibold text-[#00ada8]',
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
        <SidebarSeparator className="mx-3" />

        <SidebarGroup>
          <SidebarGroupLabel className="uppercase tracking-wider group-data-[collapsible=icon]:hidden">Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {MAIN.map((item) => (
                <Item key={item.id} item={item} depth={0} />
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
                <Item key={item.id} item={item} depth={0} />
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
