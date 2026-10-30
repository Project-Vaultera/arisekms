import { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Tick01Icon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { api, downloadFile } from '@/api/client.js';
import { FileDropzone } from '@/components/FileDropzone.jsx';
import { Button } from '@/components/ui/button.jsx';
import { FilterSelect } from '@/components/ui/filter-select.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { validateUploadFile } from '@/lib/file-upload.js';

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

function Section({ title, children, id }) {
  return (
    <div id={id} className="space-y-3 scroll-mt-4 rounded-lg border p-4">
      <h3 className="font-heading text-base font-semibold text-[#1e3a5f]">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

const TAB_FIELDS = {
  company: ['legalRepName', 'legalRepTitle', 'applicantCountry', 'registeredCountry',
    'noAttachmentExplanation', 'sector', 'isTradeAssociation', 'isBusinessAssociation',
    'exchangeSymbol', 'parentCompanyDetails', 'street', 'city', 'province', 'zip',
    'country', 'phone', 'website', 'fax', 'staffCount', 'annualRevenue'],
  affiliations: ['unGlobalCompact', 'otherUnAgency', 'whichAgency', 'otherOrgs', 'affiliationDetails'],
  other: ['businessOverview', 'geographicFocus'],
};

// The full application editor: company sections, affiliations, other info,
// documents, and submit. Used inline on the profile Overview tab.
export function ApplicationEditor({ companyId, profile, onProfile, editable }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (!profile) return;
    setForm({
      legalRepName: profile.legalRepName ?? '', legalRepTitle: profile.legalRepTitle ?? '',
      applicantCountry: profile.applicantCountry ?? '', registeredCountry: profile.registeredCountry ?? '',
      noAttachmentExplanation: profile.noAttachmentExplanation ?? '', sector: profile.sector ?? '',
      isTradeAssociation: profile.isTradeAssociation, isBusinessAssociation: profile.isBusinessAssociation,
      exchangeSymbol: profile.exchangeSymbol ?? '', parentCompanyDetails: profile.parentCompanyDetails ?? '',
      street: profile.street ?? '', city: profile.city ?? '', province: profile.province ?? '', zip: profile.zip ?? '',
      country: profile.country ?? '', phone: profile.phone ?? '', website: profile.website ?? '', fax: profile.fax ?? '',
      staffCount: profile.staffCount ?? '', annualRevenue: profile.annualRevenue ?? '',
      unGlobalCompact: profile.unGlobalCompact, otherUnAgency: profile.otherUnAgency,
      whichAgency: profile.whichAgency ?? '', otherOrgs: profile.otherOrgs ?? '',
      affiliationDetails: profile.affiliationDetails ?? '', businessOverview: profile.businessOverview ?? '',
      geographicFocus: profile.geographicFocus ?? '',
    });
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const proofs = (profile?.documents ?? []).filter((d) => d.kind === 'registration_proof');
  const supporting = (profile?.documents ?? []).filter((d) => d.kind === 'supporting');

  async function saveFields(fields) {
    if (!editable) return false;
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
      patch[k] = v === '' ? null : v;
      if (k === 'staffCount' && form[k] === '') patch[k] = null;
    }
    setSaving(true);
    try {
      const res = await api.put(`/companies/${companyId}/profile`, patch);
      onProfile(res.data.data);
      toast.success('Draft saved');
      return true;
    } catch {
      toast.error('Could not save draft');
      return false;
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
      onProfile(res.data.data);
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
      onProfile(res.data.data);
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
      onProfile(res.data.data);
      toast.success('Submitted for review');
    } catch (err) {
      toast.error('Submission failed', { description: serverMessage(err, 'Complete all required fields.') });
    } finally {
      setSaving(false);
    }
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
            <Button variant="ghost" size="sm" className="h-7" onClick={() => downloadDoc(d)}>Download</Button>
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
    <div className="space-y-3">
      {profile?.status === 'rejected' && profile.rejectReason && (
        <p className="rounded-sm bg-[var(--sendai-crimson)]/10 px-3 py-2 text-sm text-[var(--sendai-crimson)]">
          Reviewer feedback: {profile.rejectReason}
        </p>
      )}
      {profile?.status === 'submitted' && (
        <p className="rounded-sm bg-[var(--sendai-orange)]/10 px-3 py-2 text-sm text-[var(--sendai-orange)]">
          Under review — editing is locked until the secretariat decides.
        </p>
      )}
      {profile?.status === 'approved' && (
        <p className="rounded-sm bg-[var(--sendai-teal)]/10 px-3 py-2 text-sm text-[var(--sendai-teal)]">
          Approved. Saving any change will return your application to draft for re-review.
        </p>
      )}
      <Section title="A. Company Identity" id="app-company">
        <div className="sm:col-span-2">
          <Field label="Company Name">
            <Input value={profile?.name ?? ''} disabled />
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
      <Section title="UN & CSR Affiliations" id="app-docs">
        <BoolRow label="Are you a member of the UN Global Impact" required value={form.unGlobalCompact} onChange={set('unGlobalCompact')} />
        <BoolRow label="Are you affiliated with any other United Nations Agency" value={form.otherUnAgency} onChange={set('otherUnAgency')} />
        {form.otherUnAgency && (
          <div className="sm:col-span-2">
            <TextRow label="If yes, which one" required value={form.whichAgency} onChange={set('whichAgency')} disabled={!editable} />
          </div>
        )}
        <div className="sm:col-span-2">
          <AreaRow label="List other organizations" value={form.otherOrgs} onChange={set('otherOrgs')} rows={3} />
        </div>
        <div className="sm:col-span-2">
          <AreaRow label="Additional affiliation details" value={form.affiliationDetails} onChange={set('affiliationDetails')} rows={3} />
        </div>
        <div className="sm:col-span-2">
          <Field label="Upload supporting documents" hint="PDF, DOC, JPG or PNG, up to 100MB each. Drag and drop supported.">
            {editable && <FileDropzone compact onPick={(f) => uploadDoc('supporting', f)} title="Upload supporting document" />}
          </Field>
          <div className="mt-2"><DocList docs={supporting} /></div>
        </div>
      </Section>
      <Section title="Business Overview & Geographic Focus">
        <div className="sm:col-span-2">
          <AreaRow label="Brief description of your business and primary activities" required value={form.businessOverview} onChange={set('businessOverview')} rows={5} />
        </div>
        <div className="sm:col-span-2">
          <AreaRow label="Indicate specific country focus" required value={form.geographicFocus} onChange={set('geographicFocus')} rows={4} />
        </div>
      </Section>
      {editable && (
        <div id="app-submit" className="flex scroll-mt-4 flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => saveFields([...TAB_FIELDS.company, ...TAB_FIELDS.affiliations, ...TAB_FIELDS.other])}
          >
            {saving ? 'Saving…' : 'Save draft'}
          </Button>
          <Button disabled={saving} onClick={submit}>
            {saving ? 'Submitting…' : 'Submit for review'}
          </Button>
        </div>
      )}
    </div>
  );
}
