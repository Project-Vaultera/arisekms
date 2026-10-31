import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Award01Icon, ChartUpIcon, Contact01Icon, Edit01Icon, GridViewIcon, UserGroupIcon, UserIcon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { FileDropzone } from '@/components/FileDropzone.jsx';
import { api } from '@/api/client.js';
import { ApplicationEditor } from '@/components/membership/ApplicationEditor.jsx';
import { ApplicationSummary } from '@/components/membership/application-summary.jsx';
import { AdditionalContactsTable, PrimaryContactEditor } from '@/components/membership/contact-editors.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card.jsx';
import { FilterSelect } from '@/components/ui/filter-select.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { SectionTitle } from '@/components/ui/section-title.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { getTokenRoles, getTokenUserId, normalizeRole, ROLE } from '@/lib/rbac.js';
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
  const [about, setAbout] = useState({ name: '', email: '', gender: '' });

  const VALID_TABS = ['overview', 'about', 'contact', 'company', 'activity', 'skills'];
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

  const isAdmin = getTokenRoles().some((r) => [ROLE.IT_ADMIN, ROLE.SECRETARIAT].includes(normalizeRole(r)));
  const hasApproved = isAdmin || companies.some((c) => c.status === 'approved');

  const myId = getTokenUserId();
  const companyId = profile?.id ?? companies[0]?.id ?? null;
  const editable = !profile || profile.status !== 'submitted';
  const [editingApp, setEditingApp] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [rosterName, setRosterName] = useState('');

  function applyProfileUpdate(p) {
    setProfile(p);
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/users/me').then((res) => {
        setMe(res.data.data);
        setAbout({ name: res.data.data.name ?? '', email: res.data.data.email ?? '', gender: res.data.data.gender ?? '' });
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
        setProfile(res.data.data);
      })
      .catch(() => {});
  }, [companyId]);

  const primary = useMemo(
    () => (profile?.contacts ?? []).find((c) => c.isPrimary) ?? null,
    [profile],
  );

  // Company logo served as a blob (auth headers can't ride an <img> URL).
  useEffect(() => {
    if (!profile?.logoOriginalName || !companyId) {
      setLogoUrl(null);
      return;
    }
    let cancelled = false;
    let url = null;
    api
      .get(`/companies/${companyId}/logo/file`, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        url = URL.createObjectURL(res.data);
        setLogoUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [companyId, profile?.logoOriginalName]);

  async function uploadLogoFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png'].includes(ext)) {
      toast.error('Unsupported file type', { description: 'Logo must be a JPG or PNG image.' });
      return;
    }
    const data = new FormData();
    data.append('file', file);
    setSaving(true);
    try {
      const res = await api.post(`/companies/${companyId}/logo`, data);
      applyProfileUpdate(res.data.data);
      toast.success('Company logo updated');
    } catch {
      toast.error('Upload failed', { description: 'Check the file and try again.' });
    } finally {
      setSaving(false);
    }
  }

  async function addRosterMember() {
    if (!rosterName.trim()) {
      toast.error('Username is required');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post(`/companies/${companyId}/roster`, { username: rosterName.trim() });
      applyProfileUpdate(res.data.data);
      setRosterName('');
      toast.success('Member added');
    } catch (err) {
      toast.error('Could not add member', { description: serverMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  async function removeRosterMember(userId, username) {
    setSaving(true);
    try {
      const res = await api.delete(`/companies/${companyId}/roster/${userId}`);
      applyProfileUpdate(res.data.data);
      toast.success(`${username} removed`);
    } catch (err) {
      toast.error('Could not remove member', { description: serverMessage(err) });
    } finally {
      setSaving(false);
    }
  }

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
      const res = await api.patch('/users/me', {
        name: about.name.trim(),
        email: about.email.trim(),
        ...(about.gender ? { gender: about.gender } : {}),
      });
      setMe(res.data.data);
      setEditingAbout(false);
      toast.success('Profile updated');
    } catch (err) {
      toast.error('Could not update profile', { description: serverMessage(err) });
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
                      <span
                        className="grid size-[58px] place-items-center overflow-hidden rounded-full bg-[#0B4484] font-heading text-lg font-black text-white"
                        style={{ position: 'relative' }}
                      >
                        {logoUrl ? (
                          <img src={logoUrl} alt="" className="size-full object-cover" />
                        ) : (
                          initials(me?.name)
                        )}
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
                      {editable && profile && !editingApp && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-[#0c4585] hover:text-[#00ada8]"
                          aria-label="Edit profile"
                          title="Edit profile"
                          onClick={() => { changeTab('overview'); setEditingApp(true); }}
                        >
                          <HugeiconsIcon icon={Edit01Icon} size={17} strokeWidth={2} />
                        </Button>
                      )}
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
                    <TabsTrigger value="company" className="flex-1">
                      <HugeiconsIcon icon={UserGroupIcon} size={15} strokeWidth={2} />
                      Company
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
                            <Button size="sm" variant="ghost" disabled={saving} onClick={() => { setAbout({ name: me?.name ?? '', email: me?.email ?? '', gender: me?.gender ?? '' }); setEditingAbout(false); }}>Cancel</Button>
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
                          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Gender</dt><dd className="font-medium">{me?.gender ?? '—'}</dd></div>
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
                          <FilterSelect
                            label="Gender"
                            value={about.gender ?? ''}
                            onValueChange={(v) => setAbout((a) => ({ ...a, gender: v }))}
                            placeholder="— Select —"
                            options={['male', 'female', 'other', 'prefer-not-to-say']}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  </TabsContent>
                  <TabsContent value="contact" className="space-y-3 pt-2">
                  <Card className="rounded-2xl">
                    <CardHeader className="pb-0.5 pt-3">
                      <SectionTitle>Primary Contact</SectionTitle>
                      <CardDescription>Who the secretariat reaches out to.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 pt-2 pb-3">
                      <PrimaryContactEditor
                        companyId={companyId}
                        primary={primary}
                        onSaved={applyProfileUpdate}
                        editable={editable}
                        showDraftWarning={profile?.status === 'approved'}
                      />
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl">
                    <CardHeader className="pb-0.5 pt-3">
                      <SectionTitle>Additional Contacts</SectionTitle>
                      <CardDescription>Everyone else on the account.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-4 pt-2 pb-3">
                      <AdditionalContactsTable
                        companyId={companyId}
                        contacts={(profile?.contacts ?? []).filter((c) => !c.isPrimary)}
                        onChanged={applyProfileUpdate}
                        editable={editable}
                      />
                    </CardContent>
                  </Card>
                  </TabsContent>
                  <TabsContent value="company" className="space-y-3 pt-2">
                  <Card className="rounded-2xl">
                    <CardHeader className="pb-0.5 pt-3">
                      <SectionTitle>Company</SectionTitle>
                      <CardDescription>{profile?.name ?? companies[0]?.name ?? 'No company yet'}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 px-4 pt-2 pb-3">
                      <div className="flex flex-wrap items-center gap-4">
                        <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-muted">
                          {logoUrl ? (
                            <img src={logoUrl} alt="" className="size-full object-cover" />
                          ) : (
                            <span className="font-heading text-lg font-black text-muted-foreground">
                              {(profile?.name ?? '?').charAt(0).toUpperCase()}
                            </span>
                          )}
                        </span>
                        <div className="min-w-0 flex-1 text-sm">
                          <p className="truncate font-medium">{profile?.name ?? '—'}</p>
                          <p className="truncate text-muted-foreground">{[profile?.sector, profile?.city, profile?.country].filter(Boolean).join(' · ') || '—'}</p>
                        </div>
                      </div>
                      {editable && companyId ? (
                        <FileDropzone compact onPick={uploadLogoFile} title="Upload company logo" subtitle="JPG or PNG" hint="Square images look best" buttonLabel="Select logo" accept=".jpg,.jpeg,.png" />
                      ) : (
                        <p className="text-xs text-muted-foreground">Logo changes are locked while under review.</p>
                      )}
                      {profile && (
                        <dl className="grid gap-2 text-sm sm:grid-cols-2">
                          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Sector</dt><dd className="text-right font-medium">{profile.sector || '—'}</dd></div>
                          <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Staff</dt><dd className="font-medium">{profile.staffCount ?? '—'}</dd></div>
                          <div className="flex justify-between gap-3 sm:col-span-2"><dt className="text-muted-foreground">Address</dt><dd className="text-right font-medium">{[profile.street, profile.city, profile.province, profile.zip, profile.country].filter(Boolean).join(', ') || '—'}</dd></div>
                        </dl>
                      )}
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl">
                    <CardHeader className="pb-0.5 pt-3">
                      <SectionTitle>Members</SectionTitle>
                      <CardDescription>{(profile?.members ?? []).length} member(s) in this company.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 px-4 pt-2 pb-3">
                      {editable && companyId && (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            value={rosterName}
                            onChange={(e) => setRosterName(e.target.value)}
                            placeholder="Username to add…"
                            className="flex-1"
                          />
                          <Button size="sm" variant="outline" disabled={saving} onClick={addRosterMember}>
                            Add member
                          </Button>
                        </div>
                      )}
                      {(profile?.members ?? []).length === 0 ? (
                        <p className="py-2 text-center text-sm text-muted-foreground">No members yet.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {(profile?.members ?? []).map((m) => (
                            <div key={m.id} className="flex items-center gap-2 rounded-sm border border-border px-3 py-2 text-sm">
                              <span className="font-medium">{m.name}</span>
                              <span className="truncate text-muted-foreground">@{m.username}</span>
                              {editable && Number(m.id) !== Number(myId) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="ml-auto text-[var(--sendai-crimson)]"
                                  disabled={saving}
                                  onClick={() => removeRosterMember(m.id, m.username)}
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  </TabsContent>
                  <TabsContent value="overview" className="pt-2">
                  {profile ? (
                    editingApp ? (
                      <>
                        <div className="mb-3 flex justify-end">
                          <Button size="sm" variant="ghost" onClick={() => setConfirmDiscard(true)}>
                            Cancel
                          </Button>
                        </div>
                        <ApplicationEditor
                          companyId={companyId}
                          profile={profile}
                          onProfile={applyProfileUpdate}
                          editable={editable}
                          onSubmitted={() => setEditingApp(false)}
                        />
                      </>
                    ) : (
                      <ApplicationSummary profile={profile} companyId={companyId} />
                    )
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
                        <Button size="sm" variant="outline" onClick={() => navigate('/activity')}>
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
      <Dialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              Anything you changed in the editor will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDiscard(false)}>Keep editing</Button>
            <Button
              className="bg-[var(--sendai-crimson)] text-white hover:bg-[var(--sendai-crimson)]/90 hover:text-white"
              onClick={() => { setConfirmDiscard(false); setEditingApp(false); }}
            >
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
