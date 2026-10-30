import { Button } from '@/components/ui/button.jsx';

import { AffiliationSections, CompanySections, OtherSections } from './application-sections.jsx';
import { TAB_FIELDS, useMembershipDraft } from './useMembershipDraft.js';

// Full application editor in one scroll: company sections, affiliations,
// other info, documents, and submit. Used on the profile Overview tab.
export function ApplicationEditor({ companyId, profile, onProfile, editable, onSubmitted }) {
  const { form, set, saving, saveFields, uploadDoc, removeDoc, downloadDoc, submit, proofs, supporting } =
    useMembershipDraft(companyId, profile, onProfile, { onSubmitted });

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
      <CompanySections
        form={form}
        set={set}
        editable={editable}
        companyName={profile?.name}
        proofs={proofs}
        onUploadProof={(f) => uploadDoc('registration_proof', f)}
        onDownload={downloadDoc}
        onRemove={removeDoc}
      />
      <AffiliationSections
        form={form}
        set={set}
        editable={editable}
        supporting={supporting}
        onUploadSupporting={(f) => uploadDoc('supporting', f)}
        onDownload={downloadDoc}
        onRemove={removeDoc}
      />
      <OtherSections form={form} set={set} editable={editable} />
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
