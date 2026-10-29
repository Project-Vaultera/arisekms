import { PageHero } from '@/components/PageHero.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';

// TODO: build the Membership Form page once the design + member-profile
// contract land (GET/POST /api/v1/membership).
export function MembershipForm() {
  return (
    <div>
      <PageHero
        title="Membership Form"
        subtitle="Apply for or update your ARISE Philippines membership."
      />
      <div className="mx-auto max-w-2xl px-4 py-10 lg:px-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="font-heading text-lg font-bold text-[#1e3a5f]">Coming Soon</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The membership application form will live here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
