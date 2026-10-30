import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

import { AriseSidebar } from '@/components/AriseSidebar.jsx';
import { BrandBar } from '@/components/BrandBar.jsx';
import { PageHeader } from '@/components/PageHeader.jsx';
import { SectionCards } from '@/components/section-cards';
import { Card, CardContent } from '@/components/ui/card';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { useDashboardData } from '@/hooks/use-dashboard-data.js';
import { ADD_ACTIONS } from '@/lib/add-actions.js';
import { Approvals } from '@/pages/Approvals.jsx';
import { AdminOverview } from '@/pages/AdminOverview.jsx';
import { KnowledgeProducts } from '@/pages/KnowledgeProducts.jsx';
import { Leaderboards } from '@/pages/Leaderboards.jsx';
import { MemberDirectory } from '@/pages/MemberDirectory.jsx';
import { MembershipForm } from '@/pages/MembershipForm.jsx';
import { PrivacyPolicy } from '@/pages/PrivacyPolicy.jsx';
import { SkillsBuild } from '@/pages/SkillsBuild.jsx';
import { SubmitReports } from '@/pages/SubmitReports.jsx';
import { Support } from '@/pages/Support.jsx';
import { UserManual } from '@/pages/UserManual.jsx';

const ActivityChart = lazy(() =>
  import('@/components/dashboard/ActivityChart.jsx').then((m) => ({ default: m.ActivityChart })),
);
const MemberGrowthChart = lazy(() =>
  import('@/components/dashboard/MemberGrowthChart.jsx').then((m) => ({ default: m.MemberGrowthChart })),
);
const RecentActivity = lazy(() =>
  import('@/components/dashboard/RecentActivity.jsx').then((m) => ({ default: m.RecentActivity })),
);
const EventTimeline = lazy(() =>
  import('@/components/dashboard/EventTimeline.jsx').then((m) => ({ default: m.EventTimeline })),
);

function ChartFallback() {
  return (
    <Card>
      <CardContent className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Loading chart…
      </CardContent>
    </Card>
  );
}

function DashboardHome() {
  const dashboard = useDashboardData();

  return (
    <div className="flex flex-col gap-2.5 py-1.5 md:gap-3 md:py-2">
      <PageHeader
        title="Building Resilient Communities Together"
        subtitle="Empowering disaster risk reduction through training, collaboration, and knowledge sharing"
        actions={[ADD_ACTIONS.report, ADD_ACTIONS.product, ADD_ACTIONS.certificate]}
      />
      <SectionCards summary={dashboard} />
      <div className="grid grid-cols-1 gap-3 px-4 lg:px-6 xl:grid-cols-10">
        <div className="xl:col-span-7">
          <Suspense fallback={<ChartFallback />}>
            <MemberGrowthChart
              months={dashboard.membersByMonth}
              loading={dashboard.loading}
            />
          </Suspense>
        </div>
        <div className="xl:col-span-3">
          <Suspense fallback={<ChartFallback />}>
            <EventTimeline items={dashboard.recent} loading={dashboard.loading} />
          </Suspense>
        </div>
      </div>
      <div className="px-4 lg:px-6">
        <Suspense fallback={<ChartFallback />}>
          <ActivityChart weeks={dashboard.weeklySubmissions} loading={dashboard.loading} />
        </Suspense>
      </div>
      <div className="px-4 lg:px-6">
        <Suspense
          fallback={
            <div className="text-sm text-muted-foreground">
              Loading table…
            </div>
          }
        >
          <RecentActivity items={dashboard.recent} loading={dashboard.loading} />
        </Suspense>
      </div>
    </div>
  );
}

export function Dashboard() {
  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full flex-col">
        <BrandBar />
        <div className="flex flex-1">
          <AriseSidebar />
          <SidebarInset className="min-w-0 overflow-x-clip">
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="@container/main flex min-w-0 flex-1 flex-col gap-2">
                <Routes>
                  <Route index element={<DashboardHome />} />
                  <Route path="member-directory" element={<MemberDirectory />} />
                  <Route path="admin-overview" element={<AdminOverview />} />
                  <Route path="admin-approvals" element={<Approvals />} />
                  <Route path="submit-reports" element={<SubmitReports />} />
                  <Route path="membership-form" element={<MembershipForm />} />
                  <Route path="knowledge-products" element={<KnowledgeProducts />} />
                  <Route path="skillsbuild" element={<SkillsBuild />} />
                  <Route path="leaderboards" element={<Leaderboards />} />
                  <Route path="privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="user-manual" element={<UserManual />} />
                  <Route path="support" element={<Support />} />
                  <Route path="*" element={<DashboardHome />} />
                </Routes>
              </div>
            </div>
          </SidebarInset>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
