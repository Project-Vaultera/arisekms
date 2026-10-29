import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Award01Icon, Certificate01Icon, Medal01Icon, TrophyIcon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { PageHero } from '@/components/PageHero.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';

// TODO: replace with GET /api/v1/skillsbuild/leaderboard.
const LEADERS = [
  { rank: 1, name: 'Maria Santos', points: 2450, certificates: 12 },
  { rank: 2, name: 'Jose Cruz', points: 1980, certificates: 9 },
  { rank: 3, name: 'Ana Reyes', points: 1740, certificates: 8 },
  { rank: 4, name: 'Mark Villanueva', points: 1520, certificates: 7 },
  { rank: 5, name: 'Jenny Lim', points: 1310, certificates: 6 },
];

const SKILLSBUILD_URL = 'https://skillsbuild.org/';

export function SkillsBuild() {
  const [view, setView] = useState('main');
  const [form, setForm] = useState({ name: '', course: '', issuer: 'IBM SkillsBuild', date: '', credentialId: '' });
  const [submitted, setSubmitted] = useState([]);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function submitCertificate(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.course.trim() || !form.date) {
      toast.error('Missing fields', { description: 'Name, course, and date issued are required.' });
      return;
    }
    // TODO: POST /api/v1/skillsbuild/certificates.
    setSubmitted((prev) => [{ ...form, id: Date.now() }, ...prev]);
    setForm({ name: '', course: '', issuer: 'IBM SkillsBuild', date: '', credentialId: '' });
    toast.success('Certificate recorded', { description: 'Pending verification by an admin.' });
  }

  return (
    <div>
      <PageHero
        title="Building Resilient Communities Together"
        subtitle="Empowering disaster risk reduction through training, collaboration, and knowledge sharing"
      >
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="rounded-full">
            <a href={SKILLSBUILD_URL} target="_blank" rel="noreferrer">
              Access IBM SkillsBuild
            </a>
          </Button>
          <Button size="lg" variant={view === 'leaderboard' ? 'default' : 'outline'} className="rounded-full" onClick={() => setView(view === 'leaderboard' ? 'main' : 'leaderboard')}>
            Leaderboards
          </Button>
          <Button size="lg" variant={view === 'certificate' ? 'default' : 'outline'} className="rounded-full" onClick={() => setView(view === 'certificate' ? 'main' : 'certificate')}>
            Add Certificate
          </Button>
        </div>
      </PageHero>

      <div className="mx-auto max-w-4xl px-4 py-10 lg:px-6">
        {view === 'leaderboard' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-xl font-black">
                <HugeiconsIcon icon={TrophyIcon} size={20} strokeWidth={1.8} className="text-[var(--sendai-orange)]" />
                Leaderboards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Rank</th>
                    <th className="pb-2 pr-4 font-medium">Member</th>
                    <th className="pb-2 pr-4 text-right font-medium">Points</th>
                    <th className="pb-2 text-right font-medium">Certificates</th>
                  </tr>
                </thead>
                <tbody>
                  {LEADERS.map((row) => (
                    <tr key={row.rank} className="border-b last:border-0">
                      <td className="py-2.5 pr-4">
                        <Badge variant={row.rank <= 3 ? 'default' : 'secondary'}>#{row.rank}</Badge>
                      </td>
                      <td className="py-2.5 pr-4 font-medium">{row.name}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{row.points.toLocaleString()}</td>
                      <td className="py-2.5 text-right tabular-nums">{row.certificates}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {view === 'certificate' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-xl font-black">
                <HugeiconsIcon icon={Certificate01Icon} size={20} strokeWidth={1.8} className="text-[#15803d]" />
                Add Certificate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitCertificate} className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="editorial-label" htmlFor="cert-name">Member name</label>
                  <Input id="cert-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Juan Dela Cruz" />
                </div>
                <div className="space-y-1.5">
                  <label className="editorial-label" htmlFor="cert-course">Course</label>
                  <Input id="cert-course" value={form.course} onChange={(e) => set('course', e.target.value)} placeholder="Cybersecurity Fundamentals" />
                </div>
                <div className="space-y-1.5">
                  <label className="editorial-label" htmlFor="cert-date">Date issued</label>
                  <Input id="cert-date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="editorial-label" htmlFor="cert-id">Credential ID (optional)</label>
                  <Input id="cert-id" value={form.credentialId} onChange={(e) => set('credentialId', e.target.value)} placeholder="SB-000123" />
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit">
                    <HugeiconsIcon icon={Medal01Icon} size={16} strokeWidth={1.8} />
                    Record certificate
                  </Button>
                </div>
              </form>
              {submitted.length > 0 && (
                <div className="mt-6 space-y-2">
                  <p className="editorial-label text-muted-foreground">Submitted this session</p>
                  {submitted.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 rounded-sm border border-border px-3 py-2 text-sm">
                      <HugeiconsIcon icon={Award01Icon} size={16} strokeWidth={1.8} className="text-[var(--sendai-orange)]" />
                      <span className="font-medium">{c.course}</span>
                      <span className="text-muted-foreground">— {c.name}</span>
                      <Badge variant="secondary" className="ml-auto">Pending review</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
