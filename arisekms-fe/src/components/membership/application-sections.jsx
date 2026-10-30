import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Tick01Icon } from '@hugeicons/core-free-icons';

import { FileDropzone } from '@/components/FileDropzone.jsx';
import { Button } from '@/components/ui/button.jsx';
import { FilterSelect } from '@/components/ui/filter-select.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { stripToDigits, stripToPhone } from './validation.js';

export function Field({ label, required, children, hint }) {
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

export function TextRow({ label, required, value, onChange, error, filter, ...rest }) {
  return (
    <Field label={label} required={required}>
      <Input
        value={value ?? ''}
        onChange={(e) => onChange(filter ? filter(e.target.value) : e.target.value)}
        aria-invalid={error ? true : undefined}
        className={error ? 'border-[var(--sendai-crimson)]' : undefined}
        {...rest}
      />
      {error && <p className="text-[11px] text-[var(--sendai-crimson)]">{error}</p>}
    </Field>
  );
}

export function AreaRow({ label, required, value, onChange, error, rows = 4 }) {
  return (
    <Field label={label} required={required}>
      <textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm${error ? ' border-[var(--sendai-crimson)]' : ''}`}
      />
      {error && <p className="text-[11px] text-[var(--sendai-crimson)]">{error}</p>}
    </Field>
  );
}

// Nullable boolean as Yes / No / Unset.
export function BoolRow({ label, required, value, onChange, error }) {
  const str = value === true ? 'yes' : value === false ? 'no' : 'unset';
  return (
    <div>
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
      {error && <p className="mt-1 text-[11px] text-[var(--sendai-crimson)]">{error}</p>}
    </div>
  );
}

export function Section({ title, children, id }) {
  return (
    <div id={id} className="space-y-3 scroll-mt-4 rounded-lg border bg-white p-4">
      <h3 className="font-heading text-base font-semibold text-[#1e3a5f]">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export function DocList({ docs, editable, onDownload, onRemove }) {
  if (docs.length === 0) {
    return <p className="py-2 text-center text-sm text-muted-foreground">No files attached yet.</p>;
  }
  return (
    <div className="space-y-1.5">
      {docs.map((d) => (
        <div key={d.id} className="flex items-center gap-2 rounded-sm border border-border px-3 py-2 text-sm">
          <HugeiconsIcon icon={Tick01Icon} size={15} strokeWidth={2} className="text-[var(--sendai-teal)]" />
          <span className="min-w-0 flex-1 truncate font-medium">{d.originalName}</span>
          <Button variant="ghost" size="sm" className="h-7" onClick={() => onDownload(d)}>Download</Button>
          {editable && (
            <button
              type="button"
              aria-label={`Remove ${d.originalName}`}
              onClick={() => onRemove(d.id)}
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

export function CompanySections({ form, set, editable, companyName, proofs, onUploadProof, onDownload, onRemove, errors = {} }) {
  return (
    <>
      <Section title="A. Company Identity" id="app-company">
        <div className="sm:col-span-2">
          <Field label="Company Name">
            <Input value={companyName ?? ''} disabled />
          </Field>
        </div>
        <TextRow label="Legal Representative (Name)" required value={form.legalRepName} onChange={set('legalRepName')} disabled={!editable} error={errors.legalRepName} />
        <TextRow label="Legal Representative (Title)" required value={form.legalRepTitle} onChange={set('legalRepTitle')} disabled={!editable} error={errors.legalRepTitle} />
        <TextRow label="Country Location of Applicant / Company" required value={form.applicantCountry} onChange={set('applicantCountry')} disabled={!editable} error={errors.applicantCountry} />
        <TextRow label="Country Where Company Is Legally Registered" required value={form.registeredCountry} onChange={set('registeredCountry')} disabled={!editable} error={errors.registeredCountry} />
      </Section>
      <Section title="B. Legal Registration">
        <div className="sm:col-span-2">
          <Field label="Legal Registration Proof" hint="PDF, DOC, JPG or PNG, up to 100MB each.">
            {editable && <FileDropzone compact onPick={onUploadProof} title="Upload registration proof" />}
          </Field>
          <div className="mt-2"><DocList docs={proofs} editable={editable} onDownload={onDownload} onRemove={onRemove} /></div>
        </div>
        <div className="sm:col-span-2">
          <AreaRow label="If zero attachments were made, explain why" value={form.noAttachmentExplanation} onChange={set('noAttachmentExplanation')} rows={2} error={errors._docs} />
        </div>
      </Section>
      <Section title="C. Company Classification">
        <TextRow label="Company Sector" required value={form.sector} onChange={set('sector')} disabled={!editable} error={errors.sector} />
        <BoolRow label="Are You a Trade Association" value={form.isTradeAssociation} onChange={set('isTradeAssociation')} />
        <BoolRow label="Are You a Business Association / Alliance / Network" value={form.isBusinessAssociation} onChange={set('isBusinessAssociation')} />
        <TextRow label="Publicly Traded Company — Exchange Name and Symbol" value={form.exchangeSymbol} onChange={set('exchangeSymbol')} disabled={!editable} />
        <div className="sm:col-span-2">
          <AreaRow label="Subsidiary of Another Company — Details" value={form.parentCompanyDetails} onChange={set('parentCompanyDetails')} rows={2} />
        </div>
      </Section>
      <Section title="D. Registered Business Address">
        <div className="sm:col-span-2">
          <TextRow label="Street" required value={form.street} onChange={set('street')} disabled={!editable} error={errors.street} />
        </div>
        <TextRow label="City" value={form.city} onChange={set('city')} disabled={!editable} error={errors.city} />
        <TextRow label="Province / State" value={form.province} onChange={set('province')} disabled={!editable} error={errors.province} />
        <TextRow label="Post / ZIP Code" required value={form.zip} onChange={set('zip')} disabled={!editable} error={errors.zip} />
        <TextRow label="Country" value={form.country} onChange={set('country')} disabled={!editable} error={errors.country} />
        <TextRow label="Phone" value={form.phone} onChange={set('phone')} disabled={!editable} error={errors.phone} filter={stripToPhone} inputMode="tel" />
      </Section>
      <Section title="E. Company Size and Financial Information">
        <TextRow label="Website" required value={form.website} onChange={set('website')} placeholder="https://" disabled={!editable} error={errors.website} inputMode="url" />
        <TextRow label="Fax (optional)" value={form.fax} onChange={set('fax')} disabled={!editable} error={errors.fax} filter={stripToPhone} inputMode="tel" />
        <TextRow label="Total Number of Staff" required value={form.staffCount} onChange={set('staffCount')} type="number" min="1" disabled={!editable} error={errors.staffCount} filter={stripToDigits} inputMode="numeric" />
        <TextRow label="Annual Revenue in the Past Fiscal Year" required value={form.annualRevenue} onChange={set('annualRevenue')} placeholder="e.g. PHP 50M" disabled={!editable} error={errors.annualRevenue} />
      </Section>
    </>
  );
}

export function AffiliationSections({ form, set, editable, supporting, onUploadSupporting, onDownload, onRemove, errors = {} }) {
  return (
    <>
      <Section title="A. UN Membership" id="app-docs">
        <BoolRow label="Are you a member of the UN Global Impact" required value={form.unGlobalCompact} onChange={set('unGlobalCompact')} error={errors.unGlobalCompact} />
        <BoolRow label="Are you affiliated with any other United Nations Agency" value={form.otherUnAgency} onChange={set('otherUnAgency')} />
        {form.otherUnAgency && (
          <div className="sm:col-span-2">
            <TextRow label="If yes, which one" required value={form.whichAgency} onChange={set('whichAgency')} disabled={!editable} error={errors.whichAgency} />
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
            {editable && <FileDropzone compact onPick={onUploadSupporting} title="Upload supporting document" />}
          </Field>
          <div className="mt-2"><DocList docs={supporting} editable={editable} onDownload={onDownload} onRemove={onRemove} /></div>
        </div>
      </Section>
    </>
  );
}

export function OtherSections({ form, set, editable, errors = {} }) {
  return (
    <>
      <Section title="A. Business Overview">
        <div className="sm:col-span-2">
          <AreaRow label="Brief description of your business and primary activities" required value={form.businessOverview} onChange={set('businessOverview')} rows={5} error={errors.businessOverview} />
        </div>
      </Section>
      <Section title="B. Geographic Focus">
        <div className="sm:col-span-2">
          <AreaRow label="Indicate specific country focus" required value={form.geographicFocus} onChange={set('geographicFocus')} rows={4} error={errors.geographicFocus} />
        </div>
      </Section>
    </>
  );
}
