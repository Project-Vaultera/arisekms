import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Certificate01Icon, ExternalLinkIcon, Medal01Icon, TrophyIcon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { api } from '@/api/client.js';
import { PageHero } from '@/components/PageHero.jsx';
import { SendaiFrame } from '@/components/SendaiFrame.jsx';
import { SendaiHoverButton } from '@/components/SendaiHoverButton.jsx';
import { ActivityForm } from '@/components/activities/ActivityForm.jsx';
import { ADD_ACTIONS } from '@/lib/add-actions.js';
import skillsBg from '/ibmskillsbuild.png';
import { Button } from '@/components/ui/button.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';

const SKILLSBUILD_URL = 'https://skillsbuild.org/';

export function SkillsBuild() {
  const navigate = useNavigate();
  const [certOpen, setCertOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [form, setForm] = useState({ name: '', course: '', issuer: 'IBM SkillsBuild', date: '', credentialId: '' });

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

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
    } catch (err) {
      const message = err?.response?.data?.error?.message;
      if (err?.response?.status === 403) {
        toast.error('Membership approval required', { description: message });
      } else {
        toast.error('Could not record certificate');
      }
    }
  }

  function goToLeaderboard() {
    setCertOpen(false);
    navigate('/leaderboards');
  }

  return (
    <div>
      <PageHero
        title="Building Resilient Communities Together"
        subtitle="Empowering disaster risk reduction through training, collaboration, and knowledge sharing"
        bg={skillsBg}
        overlayClassName="bg-gradient-to-b from-[#0a1931]/70 via-[#0a1931]/55 to-[#0a1931]/65"
        className="flex min-h-[calc(100svh-3.5rem-1px)] w-full max-w-none items-center justify-center rounded-none px-4 py-24 lg:px-8"
        contentClassName="max-w-3xl"
        titleClassName="text-4xl leading-tight font-extrabold sm:text-5xl lg:text-6xl"
        subtitleClassName="text-base text-white/80"
      >
        <div className="flex w-full max-w-full flex-row flex-wrap items-center justify-center gap-2">
          <SendaiHoverButton asChild className="h-10 rounded-[10px] border border-white/60 bg-[#0B4484]/90 px-5 text-sm whitespace-nowrap text-white hover:bg-[#0B4484] hover:text-white">
            <a href={SKILLSBUILD_URL} target="_blank" rel="noreferrer">
              <HugeiconsIcon icon={ExternalLinkIcon} size={18} strokeWidth={2} />
              Access IBM SkillsBuild
            </a>
          </SendaiHoverButton>
          <SendaiHoverButton className="h-10 rounded-[10px] border border-white/60 bg-[#0B4484]/90 px-5 text-sm whitespace-nowrap text-white hover:bg-[#0B4484] hover:text-white" onClick={() => navigate('/leaderboards')}>
            <HugeiconsIcon icon={TrophyIcon} size={18} strokeWidth={2} />
            Leaderboards
          </SendaiHoverButton>
          <SendaiHoverButton className="h-10 rounded-[10px] border border-white/60 bg-[#0B4484]/90 px-5 text-sm whitespace-nowrap text-white hover:bg-[#0B4484] hover:text-white" onClick={() => setCertOpen(true)}>
            <HugeiconsIcon icon={Certificate01Icon} size={18} strokeWidth={2} />
            Add Certificate
          </SendaiHoverButton>
          <SendaiHoverButton className="h-10 rounded-[10px] border border-white/60 bg-[#0B4484]/90 px-5 text-sm whitespace-nowrap text-white hover:bg-[#0B4484] hover:text-white" onClick={() => setActivityOpen(true)}>
            <HugeiconsIcon icon={Medal01Icon} size={18} strokeWidth={2} />
            Add Activity
          </SendaiHoverButton>
        </div>
      </PageHero>

      <Dialog open={certOpen} onOpenChange={setCertOpen}>
        <DialogContent showCloseButton={false} className="border-0 bg-transparent p-0 shadow-none">
          <SendaiFrame>
            <div className="relative z-10 max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-heading text-xl font-normal">
                  <HugeiconsIcon icon={Certificate01Icon} size={20} strokeWidth={1.8} className="text-[#0B4484]" />
                  Add Certificate
                </DialogTitle>
                <DialogDescription>Record a completed IBM SkillsBuild course for verification.</DialogDescription>
              </DialogHeader>
              <form onSubmit={submitCertificate} className="mt-4 grid gap-4 sm:grid-cols-2">
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
              <div className="mt-6">
                <button type="button" onClick={goToLeaderboard} className="editorial-label text-[#0B4484] underline-offset-4 hover:underline">
                  View my certificates
                </button>
              </div>
            </div>
          </SendaiFrame>
        </DialogContent>
      </Dialog>
      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent showCloseButton={false} className="border-0 bg-transparent p-0 shadow-none">
          <SendaiFrame>
            <div className="relative z-10 max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-heading text-xl font-normal">
                  <HugeiconsIcon icon={Medal01Icon} size={20} strokeWidth={1.8} className="text-[#0B4484]" />
                  Add Activity
                </DialogTitle>
                <DialogDescription>Log a performance activity for review.</DialogDescription>
              </DialogHeader>
              <ActivityForm onSuccess={() => setActivityOpen(false)} />
            </div>
          </SendaiFrame>
        </DialogContent>
      </Dialog>
    </div>
  );
}
