import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

import dashboardData from '@/app/dashboard/data.json';
import { AriseSidebar } from '@/components/AriseSidebar.jsx';
import { BrandBar } from '@/components/BrandBar.jsx';
import { SectionCards } from '@/components/section-cards';
import { Card, CardContent } from '@/components/ui/card';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { Benefits } from '@/pages/Benefits.jsx';
import { KnowledgeProducts } from '@/pages/KnowledgeProducts.jsx';
import { MembershipForm } from '@/pages/MembershipForm.jsx';
import { PrivacyPolicy } from '@/pages/PrivacyPolicy.jsx';
import { SkillsBuild } from '@/pages/SkillsBuild.jsx';
import { SubmitReports } from '@/pages/SubmitReports.jsx';
import { Support } from '@/pages/Support.jsx';

const ActivityChart = lazy(() =>
  import('@/components/dashboard/ActivityChart.jsx').then((m) => ({ default: m.ActivityChart })),
);
const DataTableLazy = lazy(() =>
  import('@/components/data-table.jsx').then((m) => ({ default: m.DataTable })),
);

function DashboardHome() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <SectionCards />
      <div className="px-4 lg:px-6">
        <Suspense
          fallback={
            <Card>
              <CardContent className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                Loading chart…
              </CardContent>
            </Card>
          }
        >
          <ActivityChart />
        </Suspense>
      </div>
      <Suspense
        fallback={
          <div className="px-4 text-sm text-muted-foreground lg:px-6">
            Loading table…
          </div>
        }
      >
        <DataTableLazy data={dashboardData} />
      </Suspense>
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
          <SidebarInset>
            <div className="flex flex-1 flex-col">
              <div className="@container/main flex flex-1 flex-col gap-2">
                <Routes>
                  <Route index element={<DashboardHome />} />
                  <Route path="submit-reports" element={<SubmitReports />} />
                  <Route path="membership-form" element={<MembershipForm />} />
                  <Route path="knowledge-products" element={<KnowledgeProducts />} />
                  <Route path="skillsbuild" element={<SkillsBuild />} />
                  <Route path="privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="benefits" element={<Benefits />} />
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
