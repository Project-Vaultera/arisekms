import { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Award01Icon, Certificate01Icon, Medal01Icon, TrophyIcon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { api } from '@/api/client.js';
import { PageHero } from '@/components/PageHero.jsx';
import { PageHeader } from '@/components/PageHeader.jsx';
import { SendaiFrame } from '@/components/SendaiFrame.jsx';
import { ADD_ACTIONS } from '@/lib/add-actions.js';
import skillsBg from '/ibmskillsbuild.png';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';

// shortcut: static fallback until the first verified certificate lands;
// the table below always prefers live GET /certificates/leaderboard data.
const FALLBACK_LEADERS = [
  { memberName: 'Maria Santos', points: 2450, certificates: 12 },
  { memberName: 'Jose Cruz', points: 1980, certificates: 9 },
  { memberName: 'Ana Reyes', points: 1740, certificates: 8 },
  { memberName: 'Mark Villanueva', points: 1520, certificates: 7 },
  { memberName: 'Jenny Lim', points: 1310, certificates: 6 },
];

const SKILLSBUILD_URL = 'https://skillsbuild.org/';

export function SkillsBuild() {
  const [view, setView] = useState('main');
  const [form, setForm] = useState({ name: '', course: '', issuer: 'IBM SkillsBuild', date: '', credentialId: '' });
  const [mine, setMine] = useState([]);
  const [leaders, setLeaders] = useState(FALLBACK_LEADERS);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function refreshMine() {
    return api
      .get('/certificates', { params: { limit: 100, offset: 0 } })
      .then((res) => setMine(res.data.data ?? []))
      .catch(() => {});
  }

  useEffect(() => {
    if (view === 'certificate') refreshMine();
    if (view === 'leaderboard') {
      api
        .get('/certificates/leaderboard')
        .then((res) => {
          const rows = res.data.data ?? [];
          if (rows.length > 0) setLeaders(rows);
        })
        .catch(() => {});
    }
  }, [view]);

  async function submitCertificate(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.course.trim() || !form.date) {
      toast.error('Missing fields', { description: 'Name, course, and date issued are required.' });
      return;
    }
    try {
      await api.post('/certificates', {
        memberName: form.name.trim(),
        course: form.course.trim(),
        issuer: form.issuer.trim() || undefined,
        dateIssued: form.date,
        credentialId: form.credentialId.trim() || undefined,
      });
      setForm({ name: '', course: '', issuer: 'IBM SkillsBuild', date: '', credentialId: '' });
      toast.success('Certificate recorded', { description: 'Pending verification by an admin.' });
      await refreshMine();
    } catch {
      toast.error('Could not record certificate');
    }
  }

  return (
    <div>
      <PageHeader />
      <PageHero
        title="Building Resilient Communities Together"
        subtitle="Empowering disaster risk reduction through training, collaboration, and knowledge sharing"
        bg={skillsBg}
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

      <div className="mx-auto max-w-4xl overflow-x-clip px-4 py-10 lg:px-6">
        {view === 'leaderboard' && (
          <SendaiFrame>
          <Card className="relative z-10 rounded-2xl">
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
                  {leaders.map((row, i) => (
                    <tr key={row.memberName} className="border-b last:border-0">
                      <td className="py-2.5 pr-4">
                        <Badge variant={i < 3 ? 'default' : 'secondary'}>#{i + 1}</Badge>
                      </td>
                      <td className="py-2.5 pr-4 font-medium">{row.memberName}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums">{row.points.toLocaleString()}</td>
                      <td className="py-2.5 text-right tabular-nums">{row.certificates}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          </SendaiFrame>
        )}

        {view === 'certificate' && (
          <SendaiFrame>
          <Card className="relative z-10 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-xl font-black">
                <HugeiconsIcon icon={Certificate01Icon} size={20} strokeWidth={1.8} className="text-[#0B4484]" />
                Add Certificate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitCertificate} className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="editorial-label" htmlFor="cert-name">Member Name</label>
                  <Input id="cert-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Juan Dela Cruz" />
                </div>
                <div className="space-y-1.5">
                  <label className="editorial-label" htmlFor="cert-course">Course</label>
                  <Input id="cert-course" value={form.course} onChange={(e) => set('course', e.target.value)} placeholder="Cybersecurity Fundamentals" />
                </div>
                <div className="space-y-1.5">
                  <label className="editorial-label" htmlFor="cert-date">Date Issued</label>
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
              {mine.length > 0 && (
                <div className="mt-6 space-y-2">
                  <p className="editorial-label text-muted-foreground">My Certificates</p>
                  {mine.map((c) => (
                    <div key={c.id} className="flex items-center gap-2 rounded-sm border border-border px-3 py-2 text-sm">
                      <HugeiconsIcon icon={Award01Icon} size={16} strokeWidth={1.8} className="text-[var(--sendai-orange)]" />
                      <span className="font-medium">{c.course}</span>
                      <span className="text-muted-foreground">— {c.memberName}</span>
                      <Badge variant={c.status === 'verified' ? 'default' : 'secondary'} className="ml-auto">
                        {c.status === 'verified' ? 'Verified' : 'Pending review'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </SendaiFrame>
        )}
      </div>
    </div>
  );
}
