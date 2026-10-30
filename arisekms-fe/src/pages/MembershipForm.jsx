import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';

import { api } from '@/api/client.js';
import { PageHero } from '@/components/PageHero.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';

// First-time onboarding entry: members without a company start their
// application here, everyone else is forwarded to the profile editor.
export function MembershipForm() {
  const [companies, setCompanies] = useState(null);
  const [applyName, setApplyName] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/companies')
      .then((res) => {
        if (!cancelled) setCompanies(res.data.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setCompanies([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function apply() {
    if (!applyName.trim()) {
      toast.error('Company name is required');
      return;
    }
    setApplying(true);
    try {
      await api.post('/companies/apply', { name: applyName.trim() });
      toast.success('Application started', { description: 'Complete each section, then submit for review.' });
      setCompanies(null);
      const res = await api.get('/companies');
      setCompanies(res.data.data ?? []);
    } catch (err) {
      toast.error('Could not start application', {
        description: err?.response?.data?.error?.message ?? err?.response?.data?.message,
      });
    } finally {
      setApplying(false);
    }
  }

  if (companies === null) {
    return (
      <div className="overflow-x-clip">
        <PageHero
          title="Membership Form"
          subtitle="Apply for or update your ARISE Philippines membership."
        />
        <div className="px-4 py-6 lg:px-6">
          <Card className="rounded-2xl">
            <CardContent className="space-y-2 p-4">
              <div className="h-12 animate-pulse rounded-lg bg-muted/60" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (companies.length > 0) {
    return <Navigate to="/profile#overview" replace />;
  }

  return (
    <div className="overflow-x-clip">
      <PageHero
        title="Membership Form"
        subtitle="Apply for or update your ARISE Philippines membership."
      />
      <div className="px-4 py-6 lg:px-6">
        <Card className="rounded-2xl">
          <CardContent className="space-y-3 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Start your membership application by entering your company name.
            </p>
            <div className="mx-auto flex max-w-md flex-col gap-2 sm:flex-row">
              <Input
                value={applyName}
                onChange={(e) => setApplyName(e.target.value)}
                placeholder="Company name…"
                className="flex-1"
              />
              <Button onClick={apply} disabled={applying}>
                {applying ? 'Starting…' : 'Start application'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
