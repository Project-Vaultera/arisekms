import { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, SentIcon } from '@hugeicons/core-free-icons';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { api } from '@/api/client.js';
import { PageHero } from '@/components/PageHero.jsx';
import helpBg from '/help-bg.jpg';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { FilterSelect } from '@/components/ui/filter-select.jsx';
import { effectiveRole, getTokenRoles, getTokenUserId, isPrivilegedRoles, ROLE } from '@/lib/rbac.js';
import { cn } from '@/lib/utils.js';

const CATEGORIES = ['Report submission', 'Knowledge Products', 'Membership', 'SkillsBuild', 'Account access', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High'];
const STATUSES = ['Open', 'In progress', 'Resolved'];

const STATUS_STYLE = {
  Open: 'text-[var(--sendai-crimson)]',
  'In progress': 'text-[var(--sendai-orange)]',
  Resolved: 'text-[#0B4484]',
};

const PRIORITY_DOT = {
  High: 'bg-[var(--sendai-crimson)]',
  Medium: 'bg-[var(--sendai-orange)]',
  Low: 'bg-[var(--sendai-teal)]',
};

const CHIP_STYLE = {
  Open: 'bg-[var(--sendai-crimson)]/10 text-[var(--sendai-crimson)]',
  'In progress': 'bg-[var(--sendai-orange)]/10 text-[var(--sendai-orange)]',
  Resolved: 'bg-[var(--sendai-teal)]/10 text-[var(--sendai-teal)]',
};

export function Support() {
  const isAdmin = isPrivilegedRoles(getTokenRoles());
  const userId = getTokenUserId();
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
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
    setSubmitting(true);
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
    } catch (err) {
      const message = err?.response?.data?.error?.message;
      if (err?.response?.status === 403) {
        toast.error('Membership approval required', { description: message });
      } else {
        toast.error('Could not submit ticket');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(id, status) {
    try {
      await api.patch(`/support-tickets/${id}`, { status });
      toast.success(`Ticket marked as ${status}`);
      await refresh();
    } catch {
      toast.error('Could not update ticket');
    }
  }

  const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: tickets.filter((t) => t.status === s).length }), {});
  const visible = tickets.filter((t) => filter === 'All' || t.status === filter);

  return (
    <div>
      <PageHero
        title="Support"
        subtitle="Submit an issue or request — our team will get back to you."
        bg={helpBg}
        overlayClassName="bg-[var(--sendai-plum)]/50"
      />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-2 lg:px-6">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="font-heading text-xl font-normal">Open a Ticket</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-xs text-muted-foreground">
              Looking for how-tos? Check the{' '}
              <Link to="/user-manual" className="font-semibold text-[#0B4484] hover:text-[var(--sendai-teal)]">
                User Manual
              </Link>{' '}
              first — it may already answer your question.
            </p>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="editorial-label" htmlFor="ticket-subject">Subject</label>
                <Input id="ticket-subject" value={form.subject} onChange={(e) => set('subject', e.target.value)} placeholder="Brief summary of the issue" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FilterSelect
                  label="Category"
                  value={form.category}
                  onValueChange={(v) => set('category', v)}
                  options={CATEGORIES}
                />
                <FilterSelect
                  label="Priority"
                  value={form.priority}
                  onValueChange={(v) => set('priority', v)}
                  options={PRIORITIES}
                />
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
              <Button type="submit" disabled={submitting}>
                <HugeiconsIcon icon={SentIcon} size={16} strokeWidth={1.8} />
                {submitting ? 'Submitting…' : 'Submit ticket'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading text-xl font-normal">
              {isAdmin ? 'All Tickets' : 'Company Tickets'}
            </CardTitle>
            <div className="flex gap-1 text-xs">
              {['All', ...STATUSES].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={cn(
                    'rounded-sm px-2 py-1 font-medium transition-colors',
                    filter === s ? 'bg-[#e9eff5] text-[#0B4484]' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2 pb-1">
              {STATUSES.map((s) => (
                <span
                  key={s}
                  className={cn('rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums', CHIP_STYLE[s])}
                >
                  {s}: {counts[s] ?? 0}
                </span>
              ))}
            </div>
            {visible.map((t) => {
              const expanded = expandedId === t.id;
              const isOwn = t.author?.id === userId;
              return (
                <div key={t.id} className="rounded-sm border border-border p-3">
                  <button
                    onClick={() => setExpandedId(expanded ? null : t.id)}
                    className="flex w-full items-center gap-2 text-left"
                    aria-expanded={expanded}
                  >
                    <span className={cn('size-2 shrink-0 rounded-full', PRIORITY_DOT[t.priority] ?? PRIORITY_DOT.Low)} title={`${t.priority} priority`} />
                    <span className="text-xs tabular-nums text-muted-foreground">SUP-{1000 + t.id}</span>
                    <Badge variant="outline" className={cn('ml-auto shrink-0', STATUS_STYLE[t.status])}>{t.status}</Badge>
                    <HugeiconsIcon
                      icon={ArrowDown01Icon}
                      size={15}
                      strokeWidth={2}
                      className={cn('shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')}
                    />
                  </button>
                  <p className="mt-1 text-sm font-medium">{t.subject}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t.category} · {t.priority} priority · {new Date(t.updatedAt).toLocaleDateString()}
                    {t.author?.name ? ` · ${t.author.name}` : ''}
                  </p>
                  {expanded && (
                    <div className="mt-2 border-t border-border pt-2">
                      <p className="text-justify text-sm leading-relaxed text-muted-foreground">{t.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          Opened {new Date(t.createdAt).toLocaleDateString()}
                        </p>
                        {isAdmin ? (
                          <FilterSelect
                            value={t.status}
                            onValueChange={(v) => updateStatus(t.id, v)}
                            options={STATUSES}
                            className="w-40 space-y-0"
                            triggerClassName="h-7 text-xs"
                          />
                        ) : (
                          isOwn &&
                          (t.status === 'Resolved' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => updateStatus(t.id, 'Open')}
                            >
                              Reopen ticket
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => updateStatus(t.id, 'Resolved')}
                            >
                              Close ticket
                            </Button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {visible.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No tickets here yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
