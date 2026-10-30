import { useEffect, useMemo, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Download01Icon, PlusSignIcon, Tick01Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { api, downloadFile } from '@/api/client.js';
import { FileDropzone } from '@/components/FileDropzone.jsx';
import { PageHero } from '@/components/PageHero.jsx';
import { SendaiFrame } from '@/components/SendaiFrame.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { FilterSelect } from '@/components/ui/filter-select.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { SectionTitle } from '@/components/ui/section-title.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { validateUploadFile } from '@/lib/file-upload.js';
import { cn } from '@/lib/utils.js';

const TABS = [
  { id: 'company', label: 'Company' },
  { id: 'primary', label: 'Primary Contact' },
  { id: 'additional', label: 'Additional Contacts' },
  { id: 'affiliations', label: 'UN & CSR' },
  { id: 'other', label: 'Other Info' },
];

const CONTACT_TYPES = ['Primary', 'Billing', 'Technical', 'Authorized Representative', 'Other'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function serverMessage(err, fallback) {
  return (
    err?.response?.data?.error?.message ??
    err?.response?.data?.message ??
    fallback
  );
}

function Field({ label, required, children, hint }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}
        {required && <span className="text-[var(--sendai-crimson)]"> *</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function TextRow({ label, required, value, onChange, ...rest }) {
  return (
    <Field label={label} required={required}>
      <Input value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />
    </Field>
  );
}

function AreaRow({ label, required, value, onChange, rows = 4 }) {
  return (
    <Field label={label} required={required}>
      <textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
      />
    </Field>
  );
}

// Nullable boolean as Yes / No / Unset.
function BoolRow({ label, required, value, onChange }) {
  const str = value === true ? 'yes' : value === false ? 'no' : 'unset';
  return (
    <FilterSelect
      label={
        <>
          {label}
          {required && <span className="text-[var(--sendai-crimson)]"> *</span>}
        </>
      }
      value={str}
      onValueChange={(v) => onChange(v === 'unset' ? null : v === 'yes')}
      options={[
        { value: 'unset', label: '— Select —' },
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ]}
    />
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <h3 className="font-heading text-base font-semibold text-[#1e3a5f]">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function statusStyle(status) {
  if (status === 'approved') return 'bg-[var(--sendai-teal)]/10 text-[var(--sendai-teal)]';
  if (status === 'rejected') return 'bg-[var(--sendai-crimson)]/10 text-[var(--sendai-crimson)]';
  if (status === 'submitted') return 'bg-[var(--sendai-orange)]/10 text-[var(--sendai-orange)]';
  return 'bg-[var(--sendai-plum)]/10 text-[var(--sendai-plum)]';
}

const EMPTY_CONTACT = {
  title: '', firstName: '', middleName: '', lastName: '', position: '',
  email: '', phone: '', contactType: 'Billing', sameAsRegistered: false,
  country: '', province: '', city: '', street: '', zip: '',
};

export function MembershipForm() {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applyName, setApplyName] = useState('');
  const [applying, setApplying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('company');
  const [form, setForm] = useState({});
  const [primary, setPrimary] = useState({ ...EMPTY_CONTACT, isPrimary: true });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ ...EMPTY_CONTACT });

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const setP = (key) => (value) => setPrimary((p) => ({ ...p, [key]: value }));
  const setD = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));

  function applyProfile(p) {
    setProfile(p);
    setForm({
      legalRepName: p.legalRepName ?? '', legalRepTitle: p.legalRepTitle ?? '',
      applicantCountry: p.applicantCountry ?? '', registeredCountry: p.registeredCountry ?? '',
      noAttachmentExplanation: p.noAttachmentExplanation ?? '', sector: p.sector ?? '',
      isTradeAssociation: p.isTradeAssociation, isBusinessAssociation: p.isBusinessAssociation,
      exchangeSymbol: p.exchangeSymbol ?? '', parentCompanyDetails: p.parentCompanyDetails ?? '',
      street: p.street ?? '', city: p.city ?? '', province: p.province ?? '', zip: p.zip ?? '',
      country: p.country ?? '', phone: p.phone ?? '', website: p.website ?? '', fax: p.fax ?? '',
      staffCount: p.staffCount ?? '', annualRevenue: p.annualRevenue ?? '',
      unGlobalCompact: p.unGlobalCompact, otherUnAgency: p.otherUnAgency,
      whichAgency: p.whichAgency ?? '', otherOrgs: p.otherOrgs ?? '',
      affiliationDetails: p.affiliationDetails ?? '', businessOverview: p.businessOverview ?? '',
      geographicFocus: p.geographicFocus ?? '',
    });
    const prim = (p.contacts ?? []).find((c) => c.isPrimary);
    setPrimary(prim ? { ...EMPTY_CONTACT, ...prim } : { ...EMPTY_CONTACT, isPrimary: true });
  }

  function loadCompanies() {
    setLoading(true);
    return api
      .get('/companies')
      .then((res) => {
        const rows = res.data.data ?? [];
        setCompanies(rows);
        if (rows.length > 0) setCompanyId((prev) => prev ?? rows[0].id);
        else setProfile(null);
      })
      .catch(() => toast.error('Could not load companies'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadCompanies(); }, []);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    api
      .get(`/companies/${companyId}/profile`)
      .then((res) => applyProfile(res.data.data))
      .catch(() => toast.error('Could not load membership profile'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function apply() {
    if (!applyName.trim()) {
      toast.error('Company name is required');
      return;
    }
    setApplying(true);
    try {
      const res = await api.post('/companies/apply', { name: applyName.trim() });
      const created = res.data.data;
      setCompanies([created]);
      setApplyName('');
      setCompanyId(created.id);
      toast.success('Application started', { description: 'Complete each tab, then submit for review.' });
    } catch (err) {
      toast.error('Could not start application', { description: serverMessage(err) });
    } finally {
      setApplying(false);
    }
  }

  const additional = useMemo(
    () => (profile?.contacts ?? []).filter((c) => !c.isPrimary),
    [profile],
  );
  const proofs = useMemo(
    () => (profile?.documents ?? []).filter((d) => d.kind === 'registration_proof'),
    [profile],
  );
  const supporting = useMemo(
    () => (profile?.documents ?? []).filter((d) => d.kind === 'supporting'),
    [profile],
  );

  const editable = !profile || profile.status !== 'submitted';
  const status = profile?.status ?? 'draft';

  async function saveTab(fields) {
    if (!editable) return true;
    const patch = {};
    for (const k of fields) {
      let v = form[k];
      if (k === 'staffCount') {
        if (v === '' || v === null || v === undefined) continue;
        v = Number(v);
        if (!Number.isInteger(v) || v < 1) {
          toast.error('Staff count must be a whole number of 1 or more');
          return false;
        }
      }
      if (v === '' && k !== 'staffCount') {
        // Send empty strings through so clears persist; server treats as-is.
      }
      patch[k] = v === '' ? null : v;
      if (k === 'staffCount' && form[k] === '') patch[k] = null;
    }
    setSaving(true);
    try {
      const res = await api.put(`/companies/${companyId}/profile`, patch);
      applyProfile(res.data.data);
      toast.success('Draft saved');
      return true;
    } catch {
      toast.error('Could not save draft');
      return false;
    } finally {
      setSaving(false);
    }
  }

  const TAB_FIELDS = {
    company: ['legalRepName', 'legalRepTitle', 'applicantCountry', 'registeredCountry',
      'noAttachmentExplanation', 'sector', 'isTradeAssociation', 'isBusinessAssociation',
      'exchangeSymbol', 'parentCompanyDetails', 'street', 'city', 'province', 'zip',
      'country', 'phone', 'website', 'fax', 'staffCount', 'annualRevenue'],
    affiliations: ['unGlobalCompact', 'otherUnAgency', 'whichAgency', 'otherOrgs', 'affiliationDetails'],
    other: ['businessOverview', 'geographicFocus'],
  };

  async function savePrimary() {
    if (!primary.firstName?.trim() || !primary.lastName?.trim()) {
      toast.error('Primary contact needs a first and last name');
      return false;
    }
    if (!primary.email || !EMAIL_RE.test(primary.email)) {
      toast.error('Primary contact needs a valid email');
      return false;
    }
    setSaving(true);
    try {
      const payload = { ...primary, isPrimary: true };
      const res = primary.id
        ? await api.patch(`/companies/${companyId}/contacts/${primary.id}`, payload)
        : await api.post(`/companies/${companyId}/contacts`, payload);
      applyProfile(res.data.data);
      toast.success('Primary contact saved');
      return true;
    } catch (err) {
      toast.error('Could not save primary contact', { description: serverMessage(err) });
      return false;
    } finally {
      setSaving(false);
    }
  }

  function openAdd() {
    setEditing(null);
    setDraft({ ...EMPTY_CONTACT });
    setDialogOpen(true);
  }

  function openEdit(c) {
    setEditing(c);
    setDraft({ ...EMPTY_CONTACT, ...c });
    setDialogOpen(true);
  }

  async function saveDialog() {
    if (!draft.firstName?.trim() || !draft.lastName?.trim()) {
      toast.error('First and last name are required');
      return;
    }
    if (!draft.email || !EMAIL_RE.test(draft.email)) {
      toast.error('A valid email is required');
      return;
    }
    if (!draft.contactType) {
      toast.error('Contact type is required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...draft, isPrimary: false };
      const res = editing
        ? await api.patch(`/companies/${companyId}/contacts/${editing.id}`, payload)
        : await api.post(`/companies/${companyId}/contacts`, payload);
      applyProfile(res.data.data);
      setDialogOpen(false);
      toast.success(editing ? 'Contact updated' : 'Contact added');
    } catch (err) {
      toast.error('Could not save contact', { description: serverMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  async function removeContact(id) {
    setSaving(true);
    try {
      const res = await api.delete(`/companies/${companyId}/contacts/${id}`);
      applyProfile(res.data.data);
      toast.success('Contact removed');
    } catch {
      toast.error('Could not remove contact');
    } finally {
      setSaving(false);
    }
  }

  async function uploadDoc(kind, file) {
    const problem = validateUploadFile(file);
    if (problem) {
      toast.error(problem.title, { description: problem.description });
      return;
    }
    const data = new FormData();
    data.append('kind', kind);
    data.append('file', file);
    setSaving(true);
    try {
      const res = await api.post(`/companies/${companyId}/documents`, data);
      applyProfile(res.data.data);
      toast.success('Document uploaded');
    } catch {
      toast.error('Upload failed', { description: 'Check the file type and try again.' });
    } finally {
      setSaving(false);
    }
  }

  async function removeDoc(id) {
    try {
      const res = await api.delete(`/companies/${companyId}/documents/${id}`);
      applyProfile(res.data.data);
      toast.success('Document removed');
    } catch {
      toast.error('Could not remove document');
    }
  }

  function downloadDoc(doc) {
    if (!doc?.id) return;
    downloadFile(`/companies/${companyId}/documents/${doc.id}/file`, doc.originalName || 'document')
      .catch(() => toast.error('Download failed'));
  }

  async function submit() {
    setSaving(true);
    try {
      const res = await api.post(`/companies/${companyId}/submit`);
      applyProfile(res.data.data);
      toast.success('Submitted for review');
    } catch (err) {
      toast.error('Submission failed', { description: serverMessage(err, 'Complete all required fields.') });
    } finally {
      setSaving(false);
    }
  }

  const idx = TABS.findIndex((t) => t.id === tab);

  async function next() {
    let ok = true;
    if (tab === 'company') ok = await saveTab(TAB_FIELDS.company);
    else if (tab === 'primary') ok = await savePrimary();
    else if (tab === 'affiliations') ok = await saveTab(TAB_FIELDS.affiliations);
    else if (tab === 'other') ok = await saveTab(TAB_FIELDS.other);
    if (ok && idx < TABS.length - 1) setTab(TABS[idx + 1].id);
  }

  function DocList({ docs }) {
    if (docs.length === 0) {
      return <p className="py-2 text-center text-sm text-muted-foreground">No files attached yet.</p>;
    }
    return (
      <div className="space-y-1.5">
        {docs.map((d) => (
          <div key={d.id} className="flex items-center gap-2 rounded-sm border border-border px-3 py-2 text-sm">
            <HugeiconsIcon icon={Tick01Icon} size={15} strokeWidth={2} className="text-[var(--sendai-teal)]" />
            <span className="min-w-0 flex-1 truncate font-medium">{d.originalName}</span>
            <Button variant="ghost" size="sm" className="h-7" onClick={() => downloadDoc(d)}>
              <HugeiconsIcon icon={Download01Icon} size={14} strokeWidth={2} />
              Download
            </Button>
            {editable && (
              <button
                type="button"
                aria-label={`Remove ${d.originalName}`}
                onClick={() => removeDoc(d.id)}
                className="rounded-sm p-1 text-muted-foreground hover:text-[var(--sendai-crimson)]"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-clip">
      <PageHero
        title="Membership Form"
        subtitle="Apply for or update your ARISE Philippines membership."
      />
      <div className="mx-auto max-w-6xl px-4 py-10 lg:px-6">
        <SendaiFrame>
          <Card className="relative z-10 rounded-2xl">
            <CardHeader className="pb-0.5 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <SectionTitle>Membership Application</SectionTitle>
                  <CardDescription>Complete each tab, then submit for review.</CardDescription>
                </div>
                {profile && (
                  <Badge className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase', statusStyle(status))}>
                    {status}
                  </Badge>
                )}
              </div>
              {companies.length > 1 ? (
                <div className="mt-2 max-w-xs">
                  <FilterSelect
                    label="Company"
                    value={String(companyId ?? '')}
                    onValueChange={(v) => setCompanyId(Number(v))}
                    options={companies.map((c) => ({ value: String(c.id), label: c.name }))}
                  />
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Applying as <span className="font-semibold text-[#1e3a5f]">{profile?.name ?? companies[0]?.name ?? ''}</span>
                </p>
              )}
              {profile?.status === 'rejected' && profile.rejectReason && (
                <p className="mt-2 rounded-sm bg-[var(--sendai-crimson)]/10 px-3 py-2 text-sm text-[var(--sendai-crimson)]">
                  Reviewer feedback: {profile.rejectReason}
                </p>
              )}
              {profile?.status === 'approved' && (
                <p className="mt-2 rounded-sm bg-[var(--sendai-teal)]/10 px-3 py-2 text-sm text-[var(--sendai-teal)]">
                  Approved. Editing any field will return this application to draft for re-review.
                </p>
              )}
              {profile?.status === 'submitted' && (
                <p className="mt-2 rounded-sm bg-[var(--sendai-orange)]/10 px-3 py-2 text-sm text-[var(--sendai-orange)]">
                  Under review — editing is locked until the secretariat decides.
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-3 px-4 pt-2 pb-3">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/60" />
                  ))}
                </div>
              ) : !profile ? (
                <div className="space-y-3 py-6 text-center">
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
                </div>
              ) : (
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList className="flex w-full flex-wrap">
                    {TABS.map((t) => (
                      <TabsTrigger key={t.id} value={t.id} className="flex-1">
                        {t.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <TabsContent value="company" className="space-y-3 pt-3">
                    <Section title="A. Company Identity">
                      <div className="sm:col-span-2">
                        <Field label="Company Name">
                          <Input value={profile.name} disabled />
                        </Field>
                      </div>
                      <TextRow label="Legal Representative (Name)" required value={form.legalRepName} onChange={set('legalRepName')} disabled={!editable} />
                      <TextRow label="Legal Representative (Title)" required value={form.legalRepTitle} onChange={set('legalRepTitle')} disabled={!editable} />
                      <TextRow label="Country Location of Applicant / Company" required value={form.applicantCountry} onChange={set('applicantCountry')} disabled={!editable} />
                      <TextRow label="Country Where Company Is Legally Registered" required value={form.registeredCountry} onChange={set('registeredCountry')} disabled={!editable} />
                    </Section>
                    <Section title="B. Legal Registration">
                      <div className="sm:col-span-2">
                        <Field label="Legal Registration Proof" hint="PDF, DOC, JPG or PNG, up to 100MB each.">
                          {editable && <FileDropzone compact onPick={(f) => uploadDoc('registration_proof', f)} title="Upload registration proof" />}
                        </Field>
                        <div className="mt-2"><DocList docs={proofs} /></div>
                      </div>
                      <div className="sm:col-span-2">
                        <AreaRow label="If zero attachments were made, explain why" value={form.noAttachmentExplanation} onChange={set('noAttachmentExplanation')} rows={2} />
                      </div>
                    </Section>
                    <Section title="C. Company Classification">
                      <TextRow label="Company Sector" required value={form.sector} onChange={set('sector')} disabled={!editable} />
                      <BoolRow label="Are You a Trade Association" value={form.isTradeAssociation} onChange={set('isTradeAssociation')} />
                      <BoolRow label="Are You a Business Association / Alliance / Network" value={form.isBusinessAssociation} onChange={set('isBusinessAssociation')} />
                      <TextRow label="Publicly Traded Company — Exchange Name and Symbol" value={form.exchangeSymbol} onChange={set('exchangeSymbol')} disabled={!editable} />
                      <div className="sm:col-span-2">
                        <AreaRow label="Subsidiary of Another Company — Details" value={form.parentCompanyDetails} onChange={set('parentCompanyDetails')} rows={2} />
                      </div>
                    </Section>
                    <Section title="D. Registered Business Address">
                      <div className="sm:col-span-2">
                        <TextRow label="Street" required value={form.street} onChange={set('street')} disabled={!editable} />
                      </div>
                      <TextRow label="City" value={form.city} onChange={set('city')} disabled={!editable} />
                      <TextRow label="Province / State" value={form.province} onChange={set('province')} disabled={!editable} />
                      <TextRow label="Post / ZIP Code" required value={form.zip} onChange={set('zip')} disabled={!editable} />
                      <TextRow label="Country" value={form.country} onChange={set('country')} disabled={!editable} />
                      <TextRow label="Phone" value={form.phone} onChange={set('phone')} disabled={!editable} />
                    </Section>
                    <Section title="E. Company Size and Financial Information">
                      <TextRow label="Website" required value={form.website} onChange={set('website')} placeholder="https://" disabled={!editable} />
                      <TextRow label="Fax" required value={form.fax} onChange={set('fax')} disabled={!editable} />
                      <TextRow label="Total Number of Staff" required value={form.staffCount} onChange={set('staffCount')} type="number" min="1" disabled={!editable} />
                      <TextRow label="Annual Revenue in the Past Fiscal Year" required value={form.annualRevenue} onChange={set('annualRevenue')} placeholder="e.g. PHP 50M" disabled={!editable} />
                    </Section>
                  </TabsContent>

                  <TabsContent value="primary" className="space-y-3 pt-3">
                    <Section title="A. Contact Information">
                      <TextRow label="Title" value={primary.title} onChange={setP('title')} disabled={!editable} />
                      <TextRow label="Position" value={primary.position} onChange={setP('position')} disabled={!editable} />
                      <TextRow label="First Name" required value={primary.firstName} onChange={setP('firstName')} disabled={!editable} />
                      <TextRow label="Middle Name" value={primary.middleName} onChange={setP('middleName')} disabled={!editable} />
                      <TextRow label="Last Name" required value={primary.lastName} onChange={setP('lastName')} disabled={!editable} />
                    </Section>
                    <Section title="B. Contact Details">
                      <TextRow label="Email" required value={primary.email} onChange={setP('email')} type="email" disabled={!editable} />
                      <TextRow label="Phone Number" required value={primary.phone} onChange={setP('phone')} disabled={!editable} />
                    </Section>
                    <Section title="C. Contact Address">
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <Checkbox
                          checked={!!primary.sameAsRegistered}
                          onCheckedChange={(v) => setPrimary((p) => ({ ...p, sameAsRegistered: v === true }))}
                          disabled={!editable}
                          aria-label="Address same as legal representative"
                        />
                        <span className="text-sm">Is address same as the legal representative?</span>
                      </div>
                      {!primary.sameAsRegistered && (
                        <>
                          <TextRow label="Country" required value={primary.country} onChange={setP('country')} disabled={!editable} />
                          <TextRow label="Province / State" value={primary.province} onChange={setP('province')} disabled={!editable} />
                          <TextRow label="City" required value={primary.city} onChange={setP('city')} disabled={!editable} />
                          <TextRow label="Street" required value={primary.street} onChange={setP('street')} disabled={!editable} />
                          <TextRow label="Post / ZIP Code" required value={primary.zip} onChange={setP('zip')} disabled={!editable} />
                        </>
                      )}
                      {primary.sameAsRegistered && (
                        <p className="text-xs text-muted-foreground sm:col-span-2">
                          Uses the company&apos;s registered address (snapshot saved on submit).
                        </p>
                      )}
                    </Section>
                  </TabsContent>

                  <TabsContent value="additional" className="space-y-3 pt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">{additional.length} contact(s)</p>
                      {editable && (
                        <Button size="sm" onClick={openAdd}>
                          <HugeiconsIcon icon={PlusSignIcon} size={15} strokeWidth={2} />
                          Add contact
                        </Button>
                      )}
                    </div>
                    {additional.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">No additional contacts yet.</p>
                    ) : (
                      <div className="overflow-hidden rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Position</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead>Type</TableHead>
                              {editable && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {additional.map((c) => (
                              <TableRow key={c.id}>
                                <TableCell className="font-medium">
                                  {[c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ')}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{c.position || '—'}</TableCell>
                                <TableCell className="text-muted-foreground">{c.email || '—'}</TableCell>
                                <TableCell className="text-muted-foreground">{c.phone || '—'}</TableCell>
                                <TableCell className="text-muted-foreground">{c.contactType || '—'}</TableCell>
                                {editable && (
                                  <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>Edit</Button>
                                    <Button variant="ghost" size="sm" className="text-[var(--sendai-crimson)]" onClick={() => removeContact(c.id)}>
                                      Remove
                                    </Button>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="affiliations" className="space-y-3 pt-3">
                    <Section title="A. UN Membership">
                      <BoolRow label="Are you a member of the UN Global Impact" required value={form.unGlobalCompact} onChange={set('unGlobalCompact')} />
                      <BoolRow label="Are you affiliated with any other United Nations Agency" value={form.otherUnAgency} onChange={set('otherUnAgency')} />
                      {form.otherUnAgency && (
                        <div className="sm:col-span-2">
                          <TextRow label="If yes, which one" required value={form.whichAgency} onChange={set('whichAgency')} disabled={!editable} />
                        </div>
                      )}
                    </Section>
                    <Section title="B. Other Organizational Affiliations">
                      <div className="sm:col-span-2">
                        <AreaRow label="List other organizations" value={form.otherOrgs} onChange={set('otherOrgs')} rows={3} />
                      </div>
                      <div className="sm:col-span-2">
                        <AreaRow label="Additional affiliation details" value={form.affiliationDetails} onChange={set('affiliationDetails')} rows={3} />
                      </div>
                    </Section>
                    <Section title="C. Supporting Documents">
                      <div className="sm:col-span-2">
                        <Field label="Upload supporting documents" hint="PDF, DOC, JPG or PNG, up to 100MB each. Drag and drop supported.">
                          {editable && <FileDropzone compact onPick={(f) => uploadDoc('supporting', f)} title="Upload supporting document" />}
                        </Field>
                        <div className="mt-2"><DocList docs={supporting} /></div>
                      </div>
                    </Section>
                  </TabsContent>

                  <TabsContent value="other" className="space-y-3 pt-3">
                    <Section title="A. Business Overview">
                      <div className="sm:col-span-2">
                        <AreaRow label="Brief description of your business and primary activities" required value={form.businessOverview} onChange={set('businessOverview')} rows={5} />
                      </div>
                    </Section>
                    <Section title="B. Geographic Focus">
                      <div className="sm:col-span-2">
                        <AreaRow label="Indicate specific country focus" required value={form.geographicFocus} onChange={set('geographicFocus')} rows={4} />
                      </div>
                    </Section>
                    {editable && (
                      <Button className="w-full" onClick={submit} disabled={saving}>
                        {saving ? 'Submitting…' : 'Submit for review'}
                      </Button>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
            {profile && editable && (
              <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
                <Button variant="outline" disabled={idx === 0 || saving} onClick={() => setTab(TABS[idx - 1].id)}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={saving}
                    onClick={() => {
                      if (tab === 'company') saveTab(TAB_FIELDS.company);
                      else if (tab === 'primary') savePrimary();
                      else if (tab === 'affiliations') saveTab(TAB_FIELDS.affiliations);
                      else if (tab === 'other') saveTab(TAB_FIELDS.other);
                      else toast.info('Contacts save immediately');
                    }}
                  >
                    Save draft
                  </Button>
                  {idx < TABS.length - 1 ? (
                    <Button disabled={saving} onClick={next}>Continue</Button>
                  ) : (
                    <Button disabled={saving} onClick={submit}>Submit for review</Button>
                  )}
                </div>
              </div>
            )}
          </Card>
        </SendaiFrame>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit contact' : 'Add contact'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextRow label="Title" value={draft.title} onChange={setD('title')} />
            <div>
              <FilterSelect
                label={<>Contact Type <span className="text-[var(--sendai-crimson)]">*</span></>}
                value={draft.contactType || 'Billing'}
                onValueChange={setD('contactType')}
                options={CONTACT_TYPES}
              />
            </div>
            <TextRow label="First Name" required value={draft.firstName} onChange={setD('firstName')} />
            <TextRow label="Middle Name" value={draft.middleName} onChange={setD('middleName')} />
            <TextRow label="Last Name" required value={draft.lastName} onChange={setD('lastName')} />
            <TextRow label="Position" value={draft.position} onChange={setD('position')} />
            <TextRow label="Email" required value={draft.email} onChange={setD('email')} type="email" />
            <TextRow label="Phone" value={draft.phone} onChange={setD('phone')} />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveDialog} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
