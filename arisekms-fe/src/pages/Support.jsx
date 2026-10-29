import { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { SentIcon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { api } from '@/api/client.js';
import { PageHero } from '@/components/PageHero.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { cn } from '@/lib/utils.js';

const CATEGORIES = ['Report submission', 'Knowledge Products', 'Membership', 'SkillsBuild', 'Account access', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High'];

const STATUS_STYLE = {
  Open: 'text-[var(--sendai-crimson)]',
  'In progress': 'text-[var(--sendai-orange)]',
  Resolved: 'text-[#15803d]',
};

export function Support() {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('All');
  const [form, setForm] = useState({ subject: '', category: CATEGORIES[0], priority: 'Medium', description: '' });

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function refresh() {
    return api
      .get('/support-tickets', { params: { limit: 100, offset: 0 } })
      .then((res) => setTickets(res.data.data ?? []))
      .catch(() => toast.error('Could not load tickets'));
  }

  useEffect(() => {
    refresh();
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      toast.error('Missing fields', { description: 'Subject and description are required.' });
      return;
    }
    try {
      await api.post('/support-tickets', {
        subject: form.subject.trim(),
        category: form.category,
        priority: form.priority,
        description: form.description.trim(),
      });
      setForm({ subject: '', category: CATEGORIES[0], priority: 'Medium', description: '' });
      toast.success('Ticket submitted', { description: 'Our team will get back to you soon.' });
      await refresh();
    } catch {
      toast.error('Could not submit ticket');
    }
  }

  const visible = tickets.filter((t) => filter === 'All' || t.status === filter);

  return (
    <div>
      <PageHero
        title="Support"
        subtitle="Submit an issue or request — our team will get back to you."
      />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-2 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl font-black">Open a ticket</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="editorial-label" htmlFor="ticket-subject">Subject</label>
                <Input id="ticket-subject" value={form.subject} onChange={(e) => set('subject', e.target.value)} placeholder="Brief summary of the issue" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="editorial-label" htmlFor="ticket-category">Category</label>
                  <select id="ticket-category" value={form.category} onChange={(e) => set('category', e.target.value)} className="h-9 w-full rounded-sm border border-input bg-card px-3 text-sm">
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="editorial-label" htmlFor="ticket-priority">Priority</label>
                  <select id="ticket-priority" value={form.priority} onChange={(e) => set('priority', e.target.value)} className="h-9 w-full rounded-sm border border-input bg-card px-3 text-sm">
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="editorial-label" htmlFor="ticket-desc">Description</label>
                <textarea
                  id="ticket-desc"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Steps to reproduce, what you expected, screenshots welcome…"
                  rows={5}
                  className="w-full rounded-sm border border-input bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <Button type="submit">
                <HugeiconsIcon icon={SentIcon} size={16} strokeWidth={1.8} />
                Submit ticket
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading text-xl font-black">My tickets</CardTitle>
            <div className="flex gap-1 text-xs">
              {['All', 'Open', 'In progress', 'Resolved'].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={cn(
                    'rounded-sm px-2 py-1 font-medium transition-colors',
                    filter === s ? 'bg-[#e9f7ef] text-[#15803d]' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {visible.map((t) => (
              <div key={t.id} className="rounded-sm border border-border p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs tabular-nums text-muted-foreground">SUP-{1000 + t.id}</span>
                  <Badge variant="outline" className={cn('ml-auto', STATUS_STYLE[t.status])}>{t.status}</Badge>
                </div>
                <p className="mt-1 text-sm font-medium">{t.subject}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t.category} · {t.priority} priority · {new Date(t.updatedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
            {visible.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No tickets here yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
