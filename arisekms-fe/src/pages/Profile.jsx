import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Edit01Icon, File02Icon, HelpCircleIcon, LockPasswordIcon, Medal02Icon, Award01Icon, Notification01Icon, Settings01Icon, Shield01Icon, Tick01Icon, UserGroupIcon, UserIcon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { FileDropzone } from '@/components/FileDropzone.jsx';
import { api, clearTokens } from '@/api/client.js';
import { ApplicationEditor } from '@/components/membership/ApplicationEditor.jsx';
import { ApplicationSummary } from '@/components/membership/application-summary.jsx';
import { AdditionalContactsTable, PrimaryContactEditor } from '@/components/membership/contact-editors.jsx';
import { SettingRow } from '@/components/profile/setting-row.jsx';
import { SendaiFrame } from '@/components/SendaiFrame.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { FilterSelect } from '@/components/ui/filter-select.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Separator } from '@/components/ui/separator.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { StatCard } from '@/components/reports/StatCard.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { TablePager } from '@/components/reports/TablePager.jsx';
import { effectiveRole, getTokenRoles, getTokenUserId, normalizeRole, ROLE, ROLE_MODULES } from '@/lib/rbac.js';
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
  const primary = (profile?.contacts ?? []).find((c) => c.isPrimary);
  const contactOk = primary && primary.firstName && primary.lastName && primary.email ? 1 : 0;
  const docsOk = (profile?.documents ?? []).length > 0 || !!profile.noAttachmentExplanation ? 1 : 0;
  return Math.round(((filled + contactOk + docsOk) / (keys.length + 2)) * 100);
}

function fmtDate(raw) {
  if (!raw) return '—';
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

const filled = (v) => v !== null && v !== undefined && String(v).trim() !== '';

const VALID_TABS = ['general', 'profile', 'team', 'permissions', 'notifications', 'security'];
// Legacy hashes keep working by mapping onto the new shell.
const LEGACY_TAB_MAP = {
  overview: 'general',
  about: 'profile',
  contact: 'team',
  company: 'general',
  activity: 'profile',
  skills: 'profile',
  settings: 'profile',
  workspace: 'general',
  billing: 'general',
};
function tabFromHash() {
  const h = window.location.hash.replace('#', '');
  if (VALID_TABS.includes(h)) return h;
  return LEGACY_TAB_MAP[h] ?? '';
}

const ROLE_LABEL = {
  [ROLE.IT_ADMIN]: 'IT Admin',
  [ROLE.SECRETARIAT]: 'Secretariat',
  [ROLE.MEMBER]: 'Member',
  [ROLE.DATA_ANALYST]: 'Data Analyst',
};
const ROLE_ORDER = [ROLE.IT_ADMIN, ROLE.SECRETARIAT, ROLE.MEMBER, ROLE.DATA_ANALYST];
const ROLE_BLURB = {
  [ROLE.IT_ADMIN]: 'Full access — accounts, reviews, analytics, and settings.',
  [ROLE.SECRETARIAT]: 'Reviews and triage — applications, reports, activities, tickets.',
  [ROLE.MEMBER]: 'Author access — applications, reports, activities, and your own team.',
  [ROLE.DATA_ANALYST]: 'Read-only analytics — reports, metrics, and knowledge.',
};
const CAPABILITIES = [
  ['dashboard', 'Home dashboard'],
  ['secretariat-overview', 'Secretariat overview & approvals'],
  ['governance', 'User directory & audit logs'],
  ['reports', 'Report analytics'],
  ['submit', 'Submit reports & log activities'],
  ['membership', 'Membership application'],
  ['knowledge', 'Knowledge products'],
  ['skillsbuild', 'Activity & leaderboards'],
  ['support', 'Support tickets'],
  ['help', 'Help center'],
  ['upload', 'File uploads'],
];

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
  const [tab, setTab] = useState(tabFromHash);
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const avatarInputRef = useRef(null);

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
  const isITAdmin = getTokenRoles().some((r) => normalizeRole(r) === ROLE.IT_ADMIN);
  const viewerIsStaff = getTokenRoles().some((r) => [ROLE.IT_ADMIN, ROLE.SECRETARIAT, ROLE.DATA_ANALYST].includes(normalizeRole(r)));
  const viewerRole = effectiveRole(getTokenRoles());
  const hasApproved = isAdmin || companies.some((c) => c.status === 'approved');

  // Team is the company roster surface, so it only exists for non-staff. Staff
  // manage people through the User Directory / Member Directory / Approvals.
  const canViewTab = (t) => t !== 'team' || !viewerIsStaff;
  const defaultTab = viewerIsStaff ? 'profile' : 'general';
  const activeTab = tab && canViewTab(tab) ? tab : defaultTab;

  const myId = getTokenUserId();
  const companyId = profile?.id ?? companies[0]?.id ?? null;
  // Staff (secretariat/analyst/admin) never answer the membership application:
  // unrestricted profile, no submitted lock.
  const editable = viewerIsStaff ? true : (!profile || profile.status !== 'submitted');
  const [editingApp, setEditingApp] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [rosterName, setRosterName] = useState('');
  const [rosterQuery, setRosterQuery] = useState('');
  const [rosterPage, setRosterPage] = useState(0);
  const [rosterPageSize, setRosterPageSize] = useState(10);
  const [glance, setGlance] = useState({ reports: [], activities: [], tickets: [], certificates: [] });
  const [glanceLoading, setGlanceLoading] = useState(false);

  function applyProfileUpdate(p) {
    setProfile(p);
  }

  function clearNotifications() {
    try {
      localStorage.setItem(`arisekms_bell_cleared_${getTokenUserId() ?? 'anon'}`, new Date().toISOString());
    } catch {
      /* storage unavailable — still confirm */
    }
    toast.success('Notifications marked as read');
  }

  function signOutLocally() {
    clearTokens();
    navigate('/login', { replace: true });
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

  // Staff glance: live queues for the General tab. Same capped reads as the
  // topbar bell; no new endpoints.
  useEffect(() => {
    if (!viewerIsStaff) return;
    setGlanceLoading(true);
    Promise.all([
      api.get('/reports', { params: { limit: 100, offset: 0 } }).catch(() => ({ data: { data: [] } })),
      api.get('/activities', { params: { limit: 100, offset: 0 } }).catch(() => ({ data: { data: [] } })),
      api.get('/support-tickets').catch(() => ({ data: { data: [] } })),
      api.get('/certificates', { params: { limit: 100, offset: 0 } }).catch(() => ({ data: { data: [] } })),
    ])
      .then(([r, a, t, c]) => setGlance({
        reports: r.data.data ?? [],
        activities: a.data.data ?? [],
        tickets: t.data.data ?? [],
        certificates: c.data.data ?? [],
      }))
      .catch(() => {})
      .finally(() => setGlanceLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerIsStaff]);

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

  // Profile photo, same blob pattern as the company logo.
  useEffect(() => {
    if (!me?.avatarOriginalName) {
      setAvatarUrl(null);
      return;
    }
    let cancelled = false;
    let url = null;
    api
      .get('/users/me/avatar/file', { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        url = URL.createObjectURL(res.data);
        setAvatarUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [me?.avatarOriginalName]);

  const headerAvatar = avatarUrl ?? logoUrl;

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

  async function uploadAvatarFile(file) {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png'].includes(ext)) {
      toast.error('Unsupported file type', { description: 'Photo must be a JPG or PNG image.' });
      return;
    }
    const data = new FormData();
    data.append('file', file);
    setSaving(true);
    try {
      const res = await api.post('/users/me/avatar', data);
      setMe(res.data.data);
      toast.success('Profile photo updated');
    } catch {
      toast.error('Upload failed', { description: 'Check the file and try again.' });
    } finally {
      setSaving(false);
    }
  }

  async function removeAvatar() {
    setSaving(true);
    try {
      const res = await api.delete('/users/me/avatar');
      setMe(res.data.data);
      toast.success('Profile photo removed');
    } catch {
      toast.error('Could not remove photo');
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

  const rosterRows = useMemo(() => {
    const q = rosterQuery.trim().toLowerCase();
    return (profile?.members ?? []).filter((m) => {
      if (!q) return true;
      return [m.name, m.username].some((v) => (v ?? '').toLowerCase().includes(q));
    });
  }, [profile, rosterQuery]);
  const rosterPageCount = Math.max(1, Math.ceil(rosterRows.length / rosterPageSize));
  const safeRosterPage = Math.min(rosterPage, rosterPageCount - 1);
  const visibleRoster = rosterRows.slice(safeRosterPage * rosterPageSize, safeRosterPage * rosterPageSize + rosterPageSize);

  const pendingReports = useMemo(
    () => glance.reports.filter((r) => (r.status ?? 'submitted') === 'submitted'),
    [glance],
  );
  const pendingActivities = useMemo(
    () => glance.activities.filter((a) => (a.status ?? 'submitted') === 'submitted'),
    [glance],
  );
  const openTickets = useMemo(
    () => glance.tickets.filter((t) => (t.status || 'Open') === 'Open'),
    [glance],
  );
  const approvedActivities = useMemo(
    () => glance.activities.filter((a) => (a.status ?? 'submitted') === 'approved'),
    [glance],
  );
  const recentItems = useMemo(() => {
    const rows = [
      ...pendingReports.map((r) => ({ key: `report-${r.id}`, kind: 'Report', title: r.originalName || r.filename || `Report #${r.id}`, date: r.createdAt, to: isAdmin ? '/admin-approvals' : '/reports-summary' })),
      ...pendingActivities.map((a) => ({ key: `activity-${a.id}`, kind: 'Activity', title: a.title || `Activity #${a.id}`, date: a.happenedAt ?? a.createdAt, to: isAdmin ? '/admin-approvals' : '/reports-performance' })),
      ...openTickets.map((t) => ({ key: `ticket-${t.id}`, kind: 'Ticket', title: t.title || `Ticket #${t.id}`, date: t.createdAt, to: '/support' })),
    ].sort((a, b) => new Date(b.date ?? 0) - new Date(a.date ?? 0));
    return rows.slice(0, 5);
  }, [pendingReports, pendingActivities, openTickets, isAdmin]);

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

  async function changePassword() {
    if (!pw.current || !pw.next || !pw.confirm) {
      toast.error('Fill in all password fields');
      return;
    }
    if (pw.next.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (pw.next !== pw.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    setPwSaving(true);
    try {
      await api.patch('/users/me', { password: pw.next, currentPassword: pw.current });
      toast.success('Password changed — please sign in again');
      signOutLocally();
    } catch (err) {
      toast.error('Could not change password', { description: serverMessage(err) });
    } finally {
      setPwSaving(false);
    }
  }

  async function signOutEverywhere() {
    if (!window.confirm('Sign out all devices, including this one?')) return;
    try {
      await api.post('/users/me/sessions/revoke');
    } catch {
      /* token may already be dead — still sign out locally */
    }
    toast.success('Signed out everywhere — please sign in again');
    signOutLocally();
  }

  const pct = completeness(profile);
  const status = profile?.status ?? 'draft';

  return (
    <div className="overflow-x-clip">
      <div className="px-4 py-6 lg:px-6">
          <div className="mx-auto w-full max-w-6xl">
            <h1 className="font-heading text-2xl font-normal tracking-tight text-[#1e3a5f]">{isITAdmin ? 'Admin Settings' : 'Account settings'}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage your profile, workspace defaults, access, and notifications.</p>
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
                <SendaiFrame slim>
                <Card className="relative z-10 rounded-2xl">
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
                        {headerAvatar ? (
                          <img src={headerAvatar} alt="" className="size-full object-cover" />
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
                      {editable && profile && !editingApp && !viewerIsStaff && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-[#0c4585] hover:text-[#00ada8]"
                          aria-label="Edit profile"
                          title="Edit profile"
                          onClick={() => { changeTab('general'); setEditingApp(true); }}
                        >
                          <HugeiconsIcon icon={Edit01Icon} size={17} strokeWidth={2} />
                        </Button>
                      )}
                      {profile && !viewerIsStaff && (
                        <Badge className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase', statusStyle(status))}>
                          {status}
                        </Badge>
                      )}
                      {!viewerIsStaff && (
                      <div className="flex items-center gap-2" title="Application completeness">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-[var(--sendai-teal)]" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
                      </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                </SendaiFrame>

                <Tabs value={activeTab} onValueChange={changeTab}>
                  <TabsList variant="line" className="w-full justify-start overflow-x-auto">
                    <TabsTrigger value="general" className="flex-none after:bg-[var(--sendai-teal)]">
                      <HugeiconsIcon icon={Settings01Icon} size={16} strokeWidth={1.8} />
                      General
                    </TabsTrigger>
                    <TabsTrigger value="profile" className="flex-none after:bg-[var(--sendai-orange)]">
                      <HugeiconsIcon icon={UserIcon} size={16} strokeWidth={1.8} />
                      Profile
                    </TabsTrigger>
                    {!viewerIsStaff && (
                      <TabsTrigger value="team" className="flex-none after:bg-[var(--sendai-plum)]">
                        <HugeiconsIcon icon={UserGroupIcon} size={16} strokeWidth={1.8} />
                        Team
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="permissions" className="flex-none after:bg-[var(--sendai-crimson)]">
                      <HugeiconsIcon icon={Shield01Icon} size={16} strokeWidth={1.8} />
                      Permissions
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="flex-none after:bg-[var(--sendai-teal)]">
                      <HugeiconsIcon icon={Notification01Icon} size={16} strokeWidth={1.8} />
                      Notifications
                    </TabsTrigger>
                    <TabsTrigger value="security" className="flex-none after:bg-[var(--sendai-orange)]">
                      <HugeiconsIcon icon={LockPasswordIcon} size={16} strokeWidth={1.8} />
                      Security
                    </TabsTrigger>
                  </TabsList>
                  <div className="pt-4">
                    <TabsContent value="general" className="space-y-6">
                      {viewerIsStaff ? (
                        <section>
                          <h2 className="font-heading text-xl font-bold text-[#1e3a5f]">Workspace at a glance</h2>
                          <p className="mt-0.5 text-sm text-muted-foreground">Live queues and recent submissions across the workspace.</p>
                          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                            {isAdmin ? (
                              <>
                                <StatCard label="Pending reports" value={glanceLoading ? '—' : String(pendingReports.length)} hint="Submitted, awaiting review" icon={File02Icon} tint="text-[var(--sendai-teal)]/10" to="/admin-approvals" linkLabel="Review" />
                                <StatCard label="Pending activities" value={glanceLoading ? '—' : String(pendingActivities.length)} hint="Submitted, awaiting review" icon={Medal02Icon} tint="text-[#00ada8]/10" to="/admin-approvals" linkLabel="Review" />
                                <StatCard label="Open tickets" value={glanceLoading ? '—' : String(openTickets.length)} hint="Open, awaiting triage" icon={HelpCircleIcon} tint="text-[var(--sendai-orange)]/10" to="/support" linkLabel="Triage" />
                              </>
                            ) : (
                              <>
                                <StatCard label="Reports" value={glanceLoading ? '—' : String(glance.reports.length)} hint="Reports in the workspace" icon={File02Icon} tint="text-[var(--sendai-teal)]/10" to="/reports-summary" linkLabel="View" />
                                <StatCard label="Approved activities" value={glanceLoading ? '—' : String(approvedActivities.length)} hint="Approved performance entries" icon={Medal02Icon} tint="text-[#00ada8]/10" to="/reports-performance" linkLabel="View" />
                                <StatCard label="Certificates" value={glanceLoading ? '—' : String(glance.certificates.length)} hint="Certificates issued" icon={Award01Icon} tint="text-[var(--sendai-orange)]/10" to="/activity" linkLabel="View" />
                              </>
                            )}
                          </div>
                          <Card className="mt-3 rounded-2xl">
                            <CardContent className="px-4 pt-2 pb-3">
                              {glanceLoading ? (
                                <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>
                              ) : recentItems.length === 0 ? (
                                <p className="py-4 text-center text-sm text-muted-foreground">Nothing here yet.</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {recentItems.map((it) => (
                                    <button
                                      key={it.key}
                                      type="button"
                                      onClick={() => navigate(it.to)}
                                      className="flex w-full cursor-pointer items-center gap-2 rounded-sm border border-border px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted/60"
                                    >
                                      <Badge className="shrink-0 rounded-full bg-[var(--sendai-plum)]/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--sendai-plum)] uppercase">
                                        {it.kind}
                                      </Badge>
                                      <span className="min-w-0 flex-1 truncate font-medium">{it.title}</span>
                                      <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(it.date)}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                          <p className="mt-2 text-xs text-muted-foreground">Staff accounts aren&apos;t linked to a company — people management lives in the User Directory, Member Directory, and Approvals.</p>
                        </section>
                      ) : (
                        <>
                          <section>
                            <h2 className="font-heading text-xl font-bold text-[#1e3a5f]">Workspace Basics</h2>
                            <p className="mt-0.5 text-sm text-muted-foreground">Keep your workspace identity and defaults tidy.</p>
                            <SendaiFrame className="mt-3">
                            <Card className="relative z-10 rounded-2xl">
                              <CardContent className="px-4 py-2">
                                <SettingRow
                                  label="Workspace name"
                                  description="Your company as it appears across the workspace."
                                  hint={!profile ? 'No application yet — start one to claim this workspace.' : status === 'submitted' ? 'Under review — editing is locked until the secretariat decides.' : status === 'approved' ? 'Approved — editing reopens the review cycle.' : 'Draft — complete each section, then submit for review.'}
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-medium">{profile?.name ?? companies[0]?.name ?? '—'}</span>
                                    {profile && (
                                      <Badge className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase', statusStyle(status))}>
                                        {status}
                                      </Badge>
                                    )}
                                    {editable && (
                                      <Button size="sm" variant="outline" onClick={() => navigate('/membership-form')}>
                                        {profile ? 'Open application' : 'Start application'}
                                      </Button>
                                    )}
                                  </div>
                                </SettingRow>
                                <SettingRow
                                  label="Logo"
                                  description="Square JPG or PNG images look best."
                                  hint={editable && companyId ? undefined : 'Logo changes are locked while under review.'}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-muted">
                                      {logoUrl ? (
                                        <img src={logoUrl} alt="" className="size-full object-cover" />
                                      ) : (
                                        <span className="font-heading text-base font-black text-muted-foreground">
                                          {(profile?.name ?? '?').charAt(0).toUpperCase()}
                                        </span>
                                      )}
                                    </span>
                                    {editable && companyId && (
                                      <div className="min-w-0 flex-1">
                                        <FileDropzone compact onPick={uploadLogoFile} title="Upload company logo" subtitle="JPG or PNG" hint="Square images look best" buttonLabel="Select logo" accept=".jpg,.jpeg,.png" />
                                      </div>
                                    )}
                                  </div>
                                </SettingRow>
                                <SettingRow
                                  label="Sector"
                                  description="Industry taxonomy from your application."
                                  hint="Managed through your membership application."
                                >
                                  <p className="text-sm font-medium">{profile?.sector || '—'}</p>
                                </SettingRow>
                                <SettingRow
                                  label="Address"
                                  description="Registered address on record."
                                  hint="Managed through your membership application."
                                >
                                  <p className="text-sm font-medium">{[profile?.street, profile?.city, profile?.province, profile?.zip, profile?.country].filter((v) => filled(v)).join(', ') || '—'}</p>
                                </SettingRow>
                                <SettingRow
                                  label="Staff count"
                                  description="People on record for this workspace."
                                  hint="Managed through your membership application."
                                >
                                  <p className="text-sm font-medium">{profile?.staffCount ?? '—'}</p>
                                </SettingRow>
                              </CardContent>
                            </Card>
                            </SendaiFrame>
                          </section>
                          <section>
                            <h2 className="font-heading text-xl font-bold text-[#1e3a5f]">Membership application</h2>
                            <p className="mt-0.5 text-sm text-muted-foreground">Your application and review status.</p>
                            <SendaiFrame className="mt-3">
                            <div className="relative z-10">
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
                            </div>
                            </SendaiFrame>
                          </section>
                        </>
                      )}
                    </TabsContent>
                    <TabsContent value="profile" className="space-y-6">
                      <section>
                        <h2 className="font-heading text-xl font-bold text-[#1e3a5f]">Profile</h2>
                        <p className="mt-0.5 text-sm text-muted-foreground">Your account details and learning footprint.</p>
                        <Card className="mt-3 rounded-2xl">
                          <CardContent className="space-y-4 px-4 py-4">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-3">
                                <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-muted">
                                  {avatarUrl ? (
                                    <img src={avatarUrl} alt="" className="size-full object-cover" />
                                  ) : (
                                    <span className="font-heading text-lg font-black text-muted-foreground">
                                      {initials(me?.name)}
                                    </span>
                                  )}
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  <Button size="sm" variant="outline" disabled={saving} onClick={() => avatarInputRef.current?.click()}>
                                    {me?.avatarOriginalName ? 'Change photo' : 'Upload photo'}
                                  </Button>
                                  {me?.avatarOriginalName && (
                                    <Button size="sm" variant="ghost" className="text-[var(--sendai-crimson)]" disabled={saving} onClick={removeAvatar}>
                                      Remove
                                    </Button>
                                  )}
                                </div>
                                <input
                                  ref={avatarInputRef}
                                  type="file"
                                  accept=".jpg,.jpeg,.png"
                                  className="hidden"
                                  aria-label="Profile photo file"
                                  onChange={(e) => { uploadAvatarFile(e.target.files?.[0]); e.target.value = ''; }}
                                />
                                <div className="ml-auto flex gap-1">
                                  {!editingAbout ? (
                                    <Button size="sm" variant="outline" onClick={() => setEditingAbout(true)}>Edit</Button>
                                  ) : (
                                    <>
                                      <Button size="sm" variant="ghost" disabled={saving} onClick={() => { setAbout({ name: me?.name ?? '', email: me?.email ?? '', gender: me?.gender ?? '' }); setEditingAbout(false); }}>Cancel</Button>
                                      <Button size="sm" disabled={saving} onClick={saveAbout}>{saving ? 'Saving…' : 'Save'}</Button>
                                    </>
                                  )}
                                </div>
                              </div>
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
                            </div>
                            {viewerIsStaff && (
                              <>
                                <Separator />
                                <div className="space-y-4">
                                  <dl className="space-y-2 text-sm">
                                    <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Username</dt><dd className="font-medium">@{me?.username ?? '—'}</dd></div>
                                    <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Role</dt><dd className="font-medium">{viewerRole}</dd></div>
                                    <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Joined</dt><dd className="font-medium">{fmtDate(me?.createdAt)}</dd></div>
                                  </dl>
                                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
                                    <div className="text-sm">
                                      <p className="font-medium">Notifications</p>
                                      <p className="text-xs text-muted-foreground">Clear everything currently in your notification center.</p>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={clearNotifications}>Mark all as read</Button>
                                  </div>
                                  <p className="text-xs text-muted-foreground">Profile fields (name, email, gender) are edited under the About tab with no restrictions.</p>
                                </div>
                              </>
                            )}
                            {!viewerIsStaff && (
                              <>
                                <Separator />
                                <div>
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
                                </div>
                                <Separator />
                                <div className="space-y-3">
                                  <div className="flex justify-end">
                                    <Button size="sm" variant="outline" onClick={() => navigate('/activity')}>
                                      Continue learning
                                    </Button>
                                  </div>
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
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      </section>
                    </TabsContent>
                    {!viewerIsStaff && (
                      <TabsContent value="team" className="space-y-6">
                        <section>
                          <h2 className="font-heading text-xl font-bold text-[#1e3a5f]">Team</h2>
                          <p className="mt-0.5 text-sm text-muted-foreground">People in this workspace and who the secretariat contacts.</p>
                          <Card className="mt-3 rounded-2xl">
                            <CardContent className="space-y-4 px-4 py-4">
                              <div className="space-y-3">
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
                                <Input
                                  value={rosterQuery}
                                  onChange={(e) => { setRosterQuery(e.target.value); setRosterPage(0); }}
                                  placeholder="Search members…"
                                  className="max-w-xs"
                                />
                                {visibleRoster.length === 0 ? (
                                  <p className="py-2 text-center text-sm text-muted-foreground">
                                    {(profile?.members ?? []).length === 0 ? 'No members yet.' : 'No members match.'}
                                  </p>
                                ) : (
                                  <div className="overflow-hidden rounded-lg border">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Member</TableHead>
                                          <TableHead>Username</TableHead>
                                          {editable && <TableHead className="text-right">Actions</TableHead>}
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {visibleRoster.map((m) => (
                                          <TableRow key={m.id}>
                                            <TableCell className="font-medium">{m.name}</TableCell>
                                            <TableCell className="text-muted-foreground">@{m.username}</TableCell>
                                            {editable && (
                                              <TableCell className="text-right">
                                                {Number(m.id) !== Number(myId) ? (
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-[var(--sendai-crimson)]"
                                                    disabled={saving}
                                                    onClick={() => removeRosterMember(m.id, m.username)}
                                                  >
                                                    Remove
                                                  </Button>
                                                ) : (
                                                  <span className="text-xs text-muted-foreground">You</span>
                                                )}
                                              </TableCell>
                                            )}
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                                {rosterRows.length > 0 && (
                                  <TablePager
                                    page={safeRosterPage}
                                    pageCount={rosterPageCount}
                                    pageSize={rosterPageSize}
                                    onPageSize={setRosterPageSize}
                                    total={rosterRows.length}
                                    fromIdx={safeRosterPage * rosterPageSize + 1}
                                    toIdx={Math.min(rosterRows.length, safeRosterPage * rosterPageSize + visibleRoster.length)}
                                    onPage={setRosterPage}
                                  />
                                )}
                              </div>
                              <Separator />
                              <PrimaryContactEditor
                                companyId={companyId}
                                primary={primary}
                                onSaved={applyProfileUpdate}
                                editable={editable}
                                showDraftWarning={profile?.status === 'approved'}
                              />
                              <Separator />
                              <AdditionalContactsTable
                                companyId={companyId}
                                contacts={(profile?.contacts ?? []).filter((c) => !c.isPrimary)}
                                onChanged={applyProfileUpdate}
                                editable={editable}
                              />
                            </CardContent>
                          </Card>
                        </section>
                      </TabsContent>
                    )}
                    <TabsContent value="permissions" className="space-y-6">
                      <section>
                        <h2 className="font-heading text-xl font-bold text-[#1e3a5f]">Permissions</h2>
                        <p className="mt-0.5 text-sm text-muted-foreground">Who can do what across the workspace.</p>
                        <Card className="mt-3 rounded-2xl">
                          <CardContent className="space-y-4 px-4 py-4">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm text-muted-foreground">{ROLE_BLURB[viewerRole] ?? ''}</p>
                                <Badge className="rounded-full bg-[var(--sendai-teal)]/10 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-[var(--sendai-teal)] uppercase">
                                  {ROLE_LABEL[viewerRole] ?? viewerRole}
                                </Badge>
                              </div>
                              {isAdmin && (
                                <div className="flex flex-wrap gap-2">
                                  {isITAdmin && (
                                    <Button size="sm" variant="outline" onClick={() => navigate('/governance-users')}>
                                      Manage in User Directory
                                    </Button>
                                  )}
                                  <Button size="sm" variant="outline" onClick={() => navigate('/admin-approvals')}>
                                    Open Approvals
                                  </Button>
                                </div>
                              )}
                            </div>
                            <Separator />
                            <div className="overflow-x-auto rounded-lg border">
                              <Table className="text-xs [&_td]:py-1 [&_th]:h-8">
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Capability</TableHead>
                                    {ROLE_ORDER.map((r) => (
                                      <TableHead key={r} className="text-center">{ROLE_LABEL[r]}</TableHead>
                                    ))}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {CAPABILITIES.map(([mod, label]) => (
                                    <TableRow key={mod}>
                                      <TableCell className="font-medium">{label}</TableCell>
                                      {ROLE_ORDER.map((r) => (
                                        <TableCell key={r} className="text-center">
                                          {ROLE_MODULES[r]?.has(mod) ? (
                                            <HugeiconsIcon icon={Tick01Icon} size={14} strokeWidth={2.5} className="inline text-[var(--sendai-teal)]" />
                                          ) : (
                                            <span className="text-muted-foreground">—</span>
                                          )}
                                        </TableCell>
                                      ))}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </CardContent>
                        </Card>
                      </section>
                    </TabsContent>
                    <TabsContent value="notifications" className="space-y-6">
                      <section>
                        <h2 className="font-heading text-xl font-bold text-[#1e3a5f]">Notifications</h2>
                        <p className="mt-0.5 text-sm text-muted-foreground">Stay on top of reviews and tickets.</p>
                        <Card className="mt-3 rounded-2xl">
                          <CardContent className="px-4 py-2">
                            <SettingRow
                              label="Notification center"
                              description="Pending reviews and open tickets, live from the queues."
                              hint="Read state is kept in this browser. Clearing hides everything listed until newer items arrive."
                            >
                              <div className="space-y-2 text-sm text-muted-foreground">
                                <p className="text-justify leading-relaxed">
                                  The topbar bell lists everything waiting on you: submitted reports and
                                  activities awaiting review, plus open support tickets. Reviewers see every
                                  pending item; members see their own submissions. The list refreshes each
                                  time the bell opens, so a member&apos;s new report reaches the secretariat
                                  without a page reload.
                                </p>
                                <Button size="sm" variant="outline" onClick={clearNotifications}>Mark all as read</Button>
                              </div>
                            </SettingRow>
                          </CardContent>
                        </Card>
                      </section>
                    </TabsContent>
                    <TabsContent value="security" className="space-y-6">
                      <section>
                        <h2 className="font-heading text-xl font-bold text-[#1e3a5f]">Security</h2>
                        <p className="mt-0.5 text-sm text-muted-foreground">Passwords and sessions.</p>
                        <Card className="mt-3 rounded-2xl">
                          <CardContent className="px-4 py-2">
                            <SettingRow
                              label="Password"
                              description="Change the password you sign in with."
                              hint="Changing your password signs out all devices, including this one. You'll sign in again."
                            >
                              <div className="max-w-sm space-y-2">
                                <div className="space-y-1.5">
                                  <Label className="text-sm">Current password</Label>
                                  <Input type="password" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} autoComplete="current-password" />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-sm">New password</Label>
                                  <Input type="password" value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} autoComplete="new-password" />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-sm">Confirm new password</Label>
                                  <Input type="password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} autoComplete="new-password" />
                                </div>
                                <Button size="sm" disabled={pwSaving} onClick={changePassword}>
                                  {pwSaving ? 'Updating…' : 'Update password'}
                                </Button>
                              </div>
                            </SettingRow>
                            <SettingRow
                              label="Active sessions"
                              description="Devices signed in to this account."
                              hint="Sign-in tokens can't be listed per device, so this ends every session at once."
                            >
                              <Button size="sm" variant="outline" className="text-[var(--sendai-crimson)]" onClick={signOutEverywhere}>
                                Sign out all devices
                              </Button>
                            </SettingRow>
                          </CardContent>
                        </Card>
                      </section>
                    </TabsContent>
                  </div>
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
