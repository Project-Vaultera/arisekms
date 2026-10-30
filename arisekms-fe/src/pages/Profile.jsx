import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Award01Icon, ChartUpIcon, Contact01Icon, GridViewIcon, Tick01Icon, UserIcon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { api } from '@/api/client.js';
import { ApplicationEditor } from '@/components/membership/ApplicationEditor.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { SectionTitle } from '@/components/ui/section-title.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { getTokenRoles, getTokenUserId } from '@/lib/rbac.js';
import { cn } from '@/lib/utils.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function serverMessage(err, fallback) {
  return (
    err?.response?.data?.error?.message ??
    err?.response?.data?.message ??
    fallback
  );
}

function statusStyle(status) {
  if (status === 'approved') return 'bg-[var(--sendai-teal)]/10 text-[var(--sendai-teal)]';
  if (status === 'rejected') return 'bg-[var(--sendai-crimson)]/10 text-[var(--sendai-crimson)]';
  if (status === 'submitted') return 'bg-[var(--sendai-orange)]/10 text-[var(--sendai-orange)]';
  return 'bg-[var(--sendai-plum)]/10 text-[var(--sendai-plum)]';
}

function initials(name) {
  return (name ?? '?')
    .split(' ')
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Share of key application fields already filled (profile-completion ring).
function completeness(profile) {
  if (!profile) return 0;
  const keys = ['legalRepName', 'legalRepTitle', 'applicantCountry', 'registeredCountry',
    'sector', 'street', 'zip', 'website', 'fax', 'staffCount', 'annualRevenue',
    'businessOverview', 'geographicFocus'];
  const filled = keys.filter((k) => profile[k] !== null && profile[k] !== undefined && String(profile[k]).trim() !== '').length;
  const primary = (profile.contacts ?? []).find((c) => c.isPrimary);
  const contactOk = primary && primary.firstName && primary.lastName && primary.email ? 1 : 0;
  const docsOk = (profile.documents ?? []).length > 0 || !!profile.noAttachmentExplanation ? 1 : 0;
  return Math.round(((filled + contactOk + docsOk) / (keys.length + 2)) * 100);
}

function fmtDate(raw) {
  if (!raw) return '—';
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

const filled = (v) => v !== null && v !== undefined && String(v).trim() !== '';

// First-run guide: ordered steps with done state for draft applications.
function stepStates(profile, primary) {
  const company = ['legalRepName', 'legalRepTitle', 'applicantCountry', 'registeredCountry',
    'sector', 'street', 'zip', 'website', 'fax', 'staffCount', 'annualRevenue',
    'businessOverview', 'geographicFocus'].every((k) => filled(profile?.[k]));
  const contact = !!(primary && filled(primary.firstName) && filled(primary.lastName) && filled(primary.email));
  const docs = ((profile?.documents ?? []).length > 0) || filled(profile?.noAttachmentExplanation);
  return [
    { id: 'company', label: 'Company details', done: company, target: 'app-company' },
    { id: 'contact', label: 'Primary contact', done: contact, tab: 'contact' },
    { id: 'docs', label: 'Documents', done: docs, target: 'app-docs' },
    { id: 'submit', label: 'Submit for review', done: false, target: 'app-submit' },
  ];
}

const EMPTY_PRIMARY = {
  title: '', firstName: '', middleName: '', lastName: '', position: '',
  email: '', phone: '', sameAsRegistered: false,
  country: '', province: '', city: '', street: '', zip: '',
};

export function Profile() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [profile, setProfile] = useState(null);
  const [reports, setReports] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingAbout, setEditingAbout] = useState(false);
  const [about, setAbout] = useState({ name: '', email: '' });
  const [editingContact, setEditingContact] = useState(false);
  const [contact, setContact] = useState({ ...EMPTY_PRIMARY });

  const VALID_TABS = ['overview', 'about', 'contact', 'activity', 'skills'];
  function tabFromHash() {
    const h = window.location.hash.replace('#', '');
    return VALID_TABS.includes(h) ? h : 'overview';
  }
  const [tab, setTab] = useState(tabFromHash);

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeTab(value) {
    setTab(value);
    window.location.hash = value;
  }

  const isAdmin = getTokenRoles().includes('ADMIN');
  const hasApproved = isAdmin || companies.some((c) => c.status === 'approved');

  const myId = getTokenUserId();
  const companyId = profile?.id ?? companies[0]?.id ?? null;
  const editable = !profile || profile.status !== 'submitted';

  function applyProfileUpdate(p) {
    setProfile(p);
    const prim = (p.contacts ?? []).find((c) => c.isPrimary);
    setContact(prim ? { ...EMPTY_PRIMARY, ...prim } : { ...EMPTY_PRIMARY });
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/users/me').then((res) => {
        setMe(res.data.data);
        setAbout({ name: res.data.data.name ?? '', email: res.data.data.email ?? '' });
      }),
      api.get('/companies').then((res) => setCompanies(res.data.data ?? [])),
      api.get('/reports', { params: { limit: 100, offset: 0 } }).then((res) => setReports(res.data.data ?? [])).catch(() => {}),
      api.get('/certificates', { params: { limit: 100, offset: 0 } }).then((res) => setCertificates(res.data.data ?? [])).catch(() => {}),
    ])
      .catch(() => toast.error('Could not load profile'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!companyId) return;
    api
      .get(`/companies/${companyId}/profile`)
      .then((res) => {
        const p = res.data.data;
        setProfile(p);
        const prim = (p.contacts ?? []).find((c) => c.isPrimary);
        setContact(prim ? { ...EMPTY_PRIMARY, ...prim } : { ...EMPTY_PRIMARY });
      })
      .catch(() => {});
  }, [companyId]);

  const primary = useMemo(
    () => (profile?.contacts ?? []).find((c) => c.isPrimary) ?? null,
    [profile],
  );

  const activity = useMemo(() => {
    const rows = [
      ...(reports ?? []).map((r) => ({
        id: `report-${r.id}`,
        title: r.originalName || r.filename || `Report #${r.id}`,
        status: r.status || 'submitted',
        date: r.createdAt,
        authorId: r.author?.id,
      })),
      ...(certificates ?? []).map((c) => ({
        id: `certificate-${c.id}`,
        title: c.course || `Certificate #${c.id}`,
        status: c.status || 'pending',
        date: c.createdAt,
        authorId: c.submittedBy?.id,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    return {
      mine: rows.filter((r) => Number(r.authorId) === Number(myId)),
      company: rows,
    };
  }, [reports, certificates, myId]);

  const myCertificates = useMemo(
    () => (certificates ?? []).filter((c) => Number(c.submittedBy?.id) === Number(myId)),
    [certificates, myId],
  );

  function goStep(step) {
    if (step.tab) {
      changeTab(step.tab);
      return;
    }
    const scroll = () => document.getElementById(step.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (tab !== 'overview') {
      changeTab('overview');
      setTimeout(scroll, 80);
    } else {
      scroll();
    }
  }

  async function saveAbout() {
    if (!about.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!EMAIL_RE.test(about.email)) {
      toast.error('A valid email is required');
      return;
    }
    setSaving(true);
    try {
      const res = await api.patch('/users/me', { name: about.name.trim(), email: about.email.trim() });
      setMe(res.data.data);
      setEditingAbout(false);
      toast.success('Profile updated');
    } catch (err) {
      toast.error('Could not update profile', { description: serverMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  async function saveContact() {
    if (!contact.firstName?.trim() || !contact.lastName?.trim()) {
      toast.error('First and last name are required');
      return;
    }
    if (!contact.email || !EMAIL_RE.test(contact.email)) {
      toast.error('A valid email is required');
      return;
    }
    if (!companyId) {
      toast.error('Start your membership application first');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...contact, isPrimary: true, contactType: contact.contactType || 'Primary' };
      const res = primary?.id
        ? await api.patch(`/companies/${companyId}/contacts/${primary.id}`, payload)
        : await api.post(`/companies/${companyId}/contacts`, payload);
      const p = res.data.data;
      setProfile(p);
      const prim = (p.contacts ?? []).find((c) => c.isPrimary);
      setContact(prim ? { ...EMPTY_PRIMARY, ...prim } : { ...EMPTY_PRIMARY });
      setEditingContact(false);
      toast.success('Primary contact saved');
    } catch (err) {
      toast.error('Could not save contact', { description: serverMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  const pct = completeness(profile);
  const status = profile?.status ?? 'draft';

  return (
    <div className="overflow-x-clip">
      <div className="px-4 py-6 lg:px-6">
          <div className="mx-auto w-full max-w-6xl">
            <h1 className="font-heading text-2xl font-normal tracking-tight text-[#1e3a5f]">Member Profile</h1>
            <p className="mt-1 text-sm text-muted-foreground">Your details, membership, and activity in one place.</p>
            <div className="mt-4 flex flex-col gap-3">
            {loading ? (
              <Card className="rounded-2xl">
                <CardContent className="space-y-2 p-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/60" />
                  ))}
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="rounded-2xl">
                  <CardContent className="flex flex-wrap items-center gap-4 p-4 pt-4">
                    <span className="relative grid size-16 shrink-0 place-items-center rounded-full">
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 rounded-full"
                        style={{ background: 'conic-gradient(var(--sendai-crimson) 0deg 90deg, var(--sendai-plum) 90deg 180deg, var(--sendai-orange) 180deg 270deg, var(--sendai-teal) 270deg 360deg)' }}
                      />
                      <span className="relative grid size-[58px] place-items-center rounded-full bg-[#0B4484] font-heading text-lg font-black text-white">
                        {initials(me?.name)}
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <h1 className="truncate font-heading text-2xl font-normal tracking-tight text-[#1e3a5f]">{me?.name ?? '—'}</h1>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        @{me?.username ?? '—'} · {profile?.name ?? companies[0]?.name ?? 'No company yet'}
                        {me?.createdAt ? ` · Joined ${fmtDate(me.createdAt)}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {profile && (
                        <Badge className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase', statusStyle(status))}>
                          {status}
                        </Badge>
                      )}
                      <div className="flex items-center gap-2" title="Application completeness">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-[var(--sendai-teal)]" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Tabs value={tab} onValueChange={changeTab}>
                  <TabsList className="flex w-full flex-wrap">
                    <TabsTrigger value="overview" className="flex-1">
                      <HugeiconsIcon icon={GridViewIcon} size={15} strokeWidth={2} />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="about" className="flex-1">
                      <HugeiconsIcon icon={UserIcon} size={15} strokeWidth={2} />
                      About
                    </TabsTrigger>
                    <TabsTrigger value="contact" className="flex-1">
                      <HugeiconsIcon icon={Contact01Icon} size={15} strokeWidth={2} />
                      Primary Contact
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="flex-1">
                      <HugeiconsIcon icon={ChartUpIcon} size={15} strokeWidth={2} />
                      Activity
                    </TabsTrigger>
                    <TabsTrigger value="skills" className="flex-1">
                      <HugeiconsIcon icon={Award01Icon} size={15} strokeWidth={2} />
                      SkillsBuild
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="about" className="pt-2">
                  <Card className="rounded-2xl">
                    <CardHeader className="pb-0.5 pt-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <SectionTitle>About</SectionTitle>
                          <CardDescription>Your account details.</CardDescription>
                        </div>
                        {!editingAbout ? (
                          <Button size="sm" variant="outline" onClick={() => setEditingAbout(true)}>Edit</Button>
                        ) : (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" disabled={saving} onClick={() => { setAbout({ name: me?.name ?? '', email: me?.email ?? '' }); setEditingAbout(false); }}>Cancel</Button>
                            <Button size="sm" disabled={saving} onClick={saveAbout}>{saving ? 'Saving…' : 'Save'}</Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 px-4 pt-2 pb-3">
                      {!editingAbout ? (
                        <dl className="space-y-2 text-sm">
                          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Name</dt><dd className="font-medium">{me?.name ?? '—'}</dd></div>
                          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Username</dt><dd className="font-medium">@{me?.username ?? '—'}</dd></div>
                          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Email</dt><dd className="truncate font-medium">{me?.email ?? '—'}</dd></div>
                        </dl>
                      ) : (
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-sm">Name</Label>
                            <Input value={about.name} onChange={(e) => setAbout((a) => ({ ...a, name: e.target.value }))} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm">Email</Label>
                            <Input value={about.email} onChange={(e) => setAbout((a) => ({ ...a, email: e.target.value }))} type="email" />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  </TabsContent>
                  <TabsContent value="contact" className="pt-2">
                  <Card className="rounded-2xl">
                    <CardHeader className="pb-0.5 pt-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <SectionTitle>Primary Contact</SectionTitle>
                          <CardDescription>Who the secretariat reaches out to.</CardDescription>
                        </div>
                        {!editingContact ? (
                          <Button size="sm" variant="outline" onClick={() => setEditingContact(true)}>
                            {primary ? 'Edit' : 'Add'}
                          </Button>
                        ) : (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" disabled={saving} onClick={() => setEditingContact(false)}>Cancel</Button>
                            <Button size="sm" disabled={saving} onClick={saveContact}>{saving ? 'Saving…' : 'Save'}</Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 px-4 pt-2 pb-3">
                      {!editingContact ? (
                        primary ? (
                          <dl className="space-y-2 text-sm">
                            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Name</dt><dd className="font-medium">{[primary.title, primary.firstName, primary.middleName, primary.lastName].filter(Boolean).join(' ')}</dd></div>
                            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Position</dt><dd className="font-medium">{primary.position || '—'}</dd></div>
                            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Email</dt><dd className="truncate font-medium">{primary.email || '—'}</dd></div>
                            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Phone</dt><dd className="font-medium">{primary.phone || '—'}</dd></div>
                          </dl>
                        ) : (
                          <p className="py-2 text-center text-sm text-muted-foreground">No primary contact yet.</p>
                        )
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5"><Label className="text-sm">Title</Label><Input value={contact.title ?? ''} onChange={(e) => setContact((c) => ({ ...c, title: e.target.value }))} /></div>
                          <div className="space-y-1.5"><Label className="text-sm">Position</Label><Input value={contact.position ?? ''} onChange={(e) => setContact((c) => ({ ...c, position: e.target.value }))} /></div>
                          <div className="space-y-1.5"><Label className="text-sm">First Name *</Label><Input value={contact.firstName ?? ''} onChange={(e) => setContact((c) => ({ ...c, firstName: e.target.value }))} /></div>
                          <div className="space-y-1.5"><Label className="text-sm">Middle Name</Label><Input value={contact.middleName ?? ''} onChange={(e) => setContact((c) => ({ ...c, middleName: e.target.value }))} /></div>
                          <div className="space-y-1.5"><Label className="text-sm">Last Name *</Label><Input value={contact.lastName ?? ''} onChange={(e) => setContact((c) => ({ ...c, lastName: e.target.value }))} /></div>
                          <div className="space-y-1.5"><Label className="text-sm">Email *</Label><Input value={contact.email ?? ''} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} type="email" /></div>
                          <div className="space-y-1.5"><Label className="text-sm">Phone *</Label><Input value={contact.phone ?? ''} onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} /></div>
                          <div className="flex items-center gap-2 sm:col-span-2">
                            <Checkbox
                              checked={!!contact.sameAsRegistered}
                              onCheckedChange={(v) => setContact((c) => ({ ...c, sameAsRegistered: v === true }))}
                              aria-label="Address same as registered"
                            />
                            <span className="text-sm">Address same as the registered company address</span>
                          </div>
                          {!contact.sameAsRegistered && (
                            <>
                              <div className="space-y-1.5"><Label className="text-sm">Country *</Label><Input value={contact.country ?? ''} onChange={(e) => setContact((c) => ({ ...c, country: e.target.value }))} /></div>
                              <div className="space-y-1.5"><Label className="text-sm">Province / State</Label><Input value={contact.province ?? ''} onChange={(e) => setContact((c) => ({ ...c, province: e.target.value }))} /></div>
                              <div className="space-y-1.5"><Label className="text-sm">City *</Label><Input value={contact.city ?? ''} onChange={(e) => setContact((c) => ({ ...c, city: e.target.value }))} /></div>
                              <div className="space-y-1.5"><Label className="text-sm">Post / ZIP Code *</Label><Input value={contact.zip ?? ''} onChange={(e) => setContact((c) => ({ ...c, zip: e.target.value }))} /></div>
                              <div className="space-y-1.5 sm:col-span-2"><Label className="text-sm">Street *</Label><Input value={contact.street ?? ''} onChange={(e) => setContact((c) => ({ ...c, street: e.target.value }))} /></div>
                            </>
                          )}
                        </div>
                      )}
                      {profile?.status === 'approved' && editingContact && (
                        <p className="rounded-sm bg-[var(--sendai-teal)]/10 px-3 py-2 text-xs text-[var(--sendai-teal)]">
                          Saving will return your approved application to draft for re-review.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  </TabsContent>
                  <TabsContent value="overview" className="pt-2">
                  {profile ? (
                    <>
                      {(profile.status === 'draft' || profile.status === 'rejected') && (
                        <Card className="mb-3 rounded-2xl">
                          <CardHeader className="pb-0.5 pt-3">
                            <SectionTitle>Getting started</SectionTitle>
                            <CardDescription>Complete each step, then submit for review.</CardDescription>
                          </CardHeader>
                          <CardContent className="px-4 pt-2 pb-3">
                            <ol className="space-y-1.5">
                              {stepStates(profile, primary).map((s, i) => (
                                <li key={s.id}>
                                  <button
                                    type="button"
                                    onClick={() => goStep(s)}
                                    className="flex w-full items-center gap-3 rounded-sm border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                                  >
                                    <span className={cn(
                                      'grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold',
                                      s.done ? 'bg-[var(--sendai-teal)]/15 text-[var(--sendai-teal)]' : 'bg-muted text-muted-foreground',
                                    )}>
                                      {s.done ? <HugeiconsIcon icon={Tick01Icon} size={13} strokeWidth={2.5} /> : i + 1}
                                    </span>
                                    <span className={cn('flex-1 font-medium', s.done && 'text-muted-foreground line-through')}>
                                      {s.label}
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ol>
                          </CardContent>
                        </Card>
                      )}
                      <ApplicationEditor
                        companyId={companyId}
                        profile={profile}
                        onProfile={applyProfileUpdate}
                        editable={editable}
                      />
                    </>
                  ) : (
                    <Card className="rounded-2xl">
                      <CardContent className="space-y-3 p-4 text-center">
                        <p className="text-sm text-muted-foreground">
                          No application started yet.
                        </p>
                        <Button size="sm" onClick={() => navigate('/membership-form')}>
                          Start application
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                  </TabsContent>
                  <TabsContent value="activity" className="pt-2">
                  <Card className="rounded-2xl">
                    <CardHeader className="pb-0.5 pt-3">
                      <SectionTitle>Activity</SectionTitle>
                    <CardDescription>Reports and certificates.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 pt-2 pb-3">
                    <Tabs defaultValue="mine">
                      <TabsList>
                        <TabsTrigger value="mine">My submissions</TabsTrigger>
                        {hasApproved && <TabsTrigger value="company">Company</TabsTrigger>}
                      </TabsList>
                      {(hasApproved ? ['mine', 'company'] : ['mine']).map((key) => (
                        <TabsContent key={key} value={key} className="pt-2">
                          {activity[key].length === 0 ? (
                            <p className="py-4 text-center text-sm text-muted-foreground">Nothing here yet.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {activity[key].slice(0, 8).map((a) => (
                                <div key={a.id} className="flex items-center gap-2 rounded-sm border border-border px-3 py-1.5 text-sm">
                                  <span className="min-w-0 flex-1 truncate font-medium">{a.title}</span>
                                  <Badge className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase', statusStyle(a.status))}>
                                    {a.status}
                                  </Badge>
                                  <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(a.date)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </TabsContent>
                      ))}
                    </Tabs>
                  </CardContent>
                </Card>
                  </TabsContent>
                  <TabsContent value="skills" className="pt-2">
                  <Card className="rounded-2xl">
                    <CardHeader className="pb-0.5 pt-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <SectionTitle>IBM SkillsBuild</SectionTitle>
                          <CardDescription>Your recorded learning credentials.</CardDescription>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => navigate('/skillsbuild')}>
                          Continue learning
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pt-2 pb-3">
                      {myCertificates.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                          No credentials recorded yet — head to SkillsBuild to earn your first badge.
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {myCertificates.map((c) => (
                            <div key={c.id} className="flex items-center gap-2 rounded-sm border border-border px-3 py-1.5 text-sm">
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">{c.course || `Certificate #${c.id}`}</span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {[c.issuer, c.credentialId].filter(Boolean).join(' · ') || '—'}
                                </span>
                              </span>
                              <Badge className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase', statusStyle(c.status || 'pending'))}>
                                {c.status || 'pending'}
                              </Badge>
                              <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(c.dateIssued)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
          </div>
      </div>
    </div>
  );
}
