import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { api, downloadFile } from '@/api/client.js';
import { validateUploadFile } from '@/lib/file-upload.js';
import { filled, normalizeWebsite } from './validation.js';

export const TAB_FIELDS = {
  company: ['legalRepName', 'legalRepTitle', 'applicantCountry', 'registeredCountry',
    'noAttachmentExplanation', 'sector', 'isTradeAssociation', 'isBusinessAssociation',
    'exchangeSymbol', 'parentCompanyDetails', 'street', 'city', 'province', 'zip',
    'country', 'phone', 'website', 'fax', 'staffCount', 'annualRevenue'],
  affiliations: ['unGlobalCompact', 'otherUnAgency', 'whichAgency', 'otherOrgs', 'affiliationDetails'],
  other: ['businessOverview', 'geographicFocus'],
};

function serverMessage(err, fallback) {
  return (
    err?.response?.data?.error?.message ??
    err?.response?.data?.message ??
    fallback
  );
}

// Shared draft state + document + submit operations for the membership
// application. Used by the profile Overview tab and the form wizard alike.
export function useMembershipDraft(companyId, profile, onProfile, { onSubmitted } = {}) {
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
    const patch = {};
    for (const k of fields) {
      let v = form[k];
      if (k === 'website' && filled(v)) v = normalizeWebsite(v);
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
      onSubmitted?.();
      return true;
    } catch (err) {
      toast.error('Submission failed', { description: serverMessage(err, 'Complete all required fields.') });
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { form, set, saving, saveFields, uploadDoc, removeDoc, downloadDoc, submit, proofs, supporting };
}
