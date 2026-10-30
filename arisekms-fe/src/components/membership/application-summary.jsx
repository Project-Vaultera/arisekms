import { downloadFile } from '@/api/client.js';

import { DocList, Section } from './application-sections.jsx';

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value || '—'}</dd>
    </div>
  );
}

function TextBlock({ label, value }) {
  if (!value) return null;
  return (
    <div className="sm:col-span-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-sm font-medium">{value}</p>
    </div>
  );
}

// Read-only answers view of the membership application. Pure presentational;
// editing happens in ApplicationEditor.
export function ApplicationSummary({ profile, companyId }) {
  if (!profile) return null;
  const proofs = (profile.documents ?? []).filter((d) => d.kind === 'registration_proof');
  const supporting = (profile.documents ?? []).filter((d) => d.kind === 'supporting');

  function download(doc) {
    if (!doc?.id) return;
    downloadFile(`/companies/${companyId}/documents/${doc.id}/file`, doc.originalName || 'document');
  }

  return (
    <div className="space-y-3">
      {profile.status === 'rejected' && profile.rejectReason && (
        <p className="rounded-sm bg-[var(--sendai-crimson)]/10 px-3 py-2 text-sm text-[var(--sendai-crimson)]">
          Reviewer feedback: {profile.rejectReason}
        </p>
      )}
      {profile.status === 'submitted' && (
        <p className="rounded-sm bg-[var(--sendai-orange)]/10 px-3 py-2 text-sm text-[var(--sendai-orange)]">
          Under review — editing is locked until the secretariat decides.
        </p>
      )}
      {profile.status === 'approved' && (
        <p className="rounded-sm bg-[var(--sendai-teal)]/10 px-3 py-2 text-sm text-[var(--sendai-teal)]">
          Approved. Editing will return your application to draft for re-review.
        </p>
      )}
      <Section title="A. Company Identity">
        <div className="sm:col-span-2">
          <dl className="space-y-2 text-sm">
            <Row label="Company Name" value={profile.name} />
            <Row label="Legal Representative" value={[profile.legalRepName, profile.legalRepTitle].filter(Boolean).join(', ')} />
            <Row label="Applicant Country" value={profile.applicantCountry} />
            <Row label="Registered Country" value={profile.registeredCountry} />
          </dl>
        </div>
      </Section>
      <Section title="B. Legal Registration">
        <div className="sm:col-span-2">
          <DocList docs={proofs} editable={false} onDownload={download} onRemove={() => {}} />
          <TextBlock label="Why no attachments" value={profile.noAttachmentExplanation} />
        </div>
      </Section>
      <Section title="C. Company Classification">
        <div className="sm:col-span-2">
          <dl className="space-y-2 text-sm">
            <Row label="Sector" value={profile.sector} />
            <Row label="Trade Association" value={profile.isTradeAssociation == null ? null : profile.isTradeAssociation ? 'Yes' : 'No'} />
            <Row label="Business Association / Alliance / Network" value={profile.isBusinessAssociation == null ? null : profile.isBusinessAssociation ? 'Yes' : 'No'} />
            <Row label="Exchange / Symbol" value={profile.exchangeSymbol} />
          </dl>
          <TextBlock label="Subsidiary details" value={profile.parentCompanyDetails} />
        </div>
      </Section>
      <Section title="D. Registered Business Address">
        <div className="sm:col-span-2">
          <dl className="space-y-2 text-sm">
            <Row label="Address" value={[profile.street, profile.city, profile.province, profile.zip, profile.country].filter(Boolean).join(', ')} />
            <Row label="Phone" value={profile.phone} />
          </dl>
        </div>
      </Section>
      <Section title="E. Company Size and Financial Information">
        <div className="sm:col-span-2">
          <dl className="space-y-2 text-sm">
            <Row label="Website" value={profile.website} />
            <Row label="Fax" value={profile.fax} />
            <Row label="Staff" value={profile.staffCount} />
            <Row label="Annual Revenue" value={profile.annualRevenue} />
          </dl>
        </div>
      </Section>
      <Section title="UN & CSR Affiliations">
        <div className="sm:col-span-2">
          <dl className="space-y-2 text-sm">
            <Row label="UN Global Impact" value={profile.unGlobalCompact == null ? null : profile.unGlobalCompact ? 'Yes' : 'No'} />
            <Row label="Other UN Agency" value={profile.otherUnAgency == null ? null : profile.otherUnAgency ? 'Yes' : 'No'} />
            {profile.otherUnAgency ? <Row label="Which agency" value={profile.whichAgency} /> : null}
          </dl>
          <TextBlock label="Other organizations" value={profile.otherOrgs} />
          <TextBlock label="Affiliation details" value={profile.affiliationDetails} />
          <div className="mt-2">
            <DocList docs={supporting} editable={false} onDownload={download} onRemove={() => {}} />
          </div>
        </div>
      </Section>
      <Section title="Business Overview & Geographic Focus">
        <TextBlock label="Business overview" value={profile.businessOverview} />
        <TextBlock label="Geographic focus" value={profile.geographicFocus} />
      </Section>
    </div>
  );
}
