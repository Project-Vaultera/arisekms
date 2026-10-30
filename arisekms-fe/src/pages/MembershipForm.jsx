import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Agreement01Icon, Contact01Icon, File02Icon, Shield01Icon, Tick01Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { toast } from 'sonner';

import { api } from '@/api/client.js';
import { AffiliationSections, CompanySections, OtherSections } from '@/components/membership/application-sections.jsx';
import { AdditionalContactsTable, PrimaryContactEditor } from '@/components/membership/contact-editors.jsx';
import { TAB_FIELDS, useMembershipDraft } from '@/components/membership/useMembershipDraft.js';
import { firstErrorMessage, validateWizardTab } from '@/components/membership/validation.js';
import { SendaiFrame } from '@/components/SendaiFrame.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { SectionTitle } from '@/components/ui/section-title.jsx';
import { Tabs, TabsContent } from '@/components/ui/tabs.jsx';
import { cn } from '@/lib/utils.js';

const TABS = [
  { id: 'company', label: 'Company', icon: Agreement01Icon },
  { id: 'primary', label: 'Primary Contact', icon: Contact01Icon },
  { id: 'additional', label: 'Additional Contacts', icon: UserGroupIcon },
  { id: 'affiliations', label: 'UN & CSR', icon: Shield01Icon },
  { id: 'other', label: 'Other Info', icon: File02Icon },
];

function statusStyle(status) {
  if (status === 'approved') return 'bg-[var(--sendai-teal)]/10 text-[var(--sendai-teal)]';
  if (status === 'rejected') return 'bg-[var(--sendai-crimson)]/10 text-[var(--sendai-crimson)]';
  if (status === 'submitted') return 'bg-[var(--sendai-orange)]/10 text-[var(--sendai-orange)]';
  return 'bg-[var(--sendai-plum)]/10 text-[var(--sendai-plum)]';
}

// Five-tab onboarding wizard. All fields and saves come from the shared
// membership components — the same code the profile Overview tab uses.
export function MembershipForm() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('company');
  const [errors, setErrors] = useState({});
  const [applyName, setApplyName] = useState('');
  const [applying, setApplying] = useState(false);

  function applyProfile(p) {
    setProfile(p);
  }

  useEffect(() => {
    setLoading(true);
    api
      .get('/companies')
      .then((res) => {
        const rows = res.data.data ?? [];
        setCompanies(rows);
        if (rows.length > 0) setCompanyId((prev) => prev ?? rows[0].id);
      })
      .catch(() => {
        setCompanies([]);
        toast.error('Could not load companies');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);
    api
      .get(`/companies/${companyId}/profile`)
      .then((res) => setProfile(res.data.data))
      .catch(() => toast.error('Could not load membership profile'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const { form, set, saving, saveFields, uploadDoc, removeDoc, downloadDoc, submit, proofs, supporting } =
    useMembershipDraft(companyId, profile, applyProfile);

  const editable = !profile || profile.status !== 'submitted';
  const status = profile?.status ?? 'draft';

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
      toast.error('Could not start application', {
        description: err?.response?.data?.error?.message ?? err?.response?.data?.message,
      });
    } finally {
      setApplying(false);
    }
  }

  const idx = TABS.findIndex((t) => t.id === tab);
  const primary = (profile?.contacts ?? []).find((c) => c.isPrimary) ?? null;
  const additional = useMemo(
    () => (profile?.contacts ?? []).filter((c) => !c.isPrimary),
    [profile],
  );

  // Live per-step validity for the progress indicators. Pure and cheap;
  // navigation still goes exclusively through Back / Continue. Additional
  // counts only when it holds at least one valid contact (still skippable).
  const stepDone = useMemo(() => {
    const done = {};
    for (const t of TABS) {
      done[t.id] = Object.keys(validateWizardTab(t.id, form, { proofs, primary, contacts: additional })).length === 0;
    }
    return done;
  }, [form, proofs, primary, additional]);

  // Gated steps: the current tab must validate before advancing. Submit lives
  // only on the last tab; the server re-validates everything regardless.
  async function next() {
    if (tab === 'primary') {
      const errs = validateWizardTab('primary', {}, { primary });
      if (Object.keys(errs).length > 0) {
        toast.error('Complete this step', { description: firstErrorMessage(errs) });
        return;
      }
      setTab(TABS[idx + 1].id);
      return;
    }
    if (tab === 'additional') {
      // Skippable when empty; listed contacts must be valid to move on.
      if (additional.length > 0) {
        const errs = validateWizardTab('additional', {}, { contacts: additional });
        if (Object.keys(errs).length > 0) {
          toast.error('Complete this step', { description: firstErrorMessage(errs) });
          return;
        }
      }
      setTab(TABS[idx + 1].id);
      return;
    }
    const errs = validateWizardTab(tab, form, { proofs });
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('Complete required fields', { description: firstErrorMessage(errs) });
      return;
    }
    let ok = true;
    if (tab === 'company') ok = await saveFields(TAB_FIELDS.company);
    else if (tab === 'affiliations') ok = await saveFields(TAB_FIELDS.affiliations);
    else if (tab === 'other') ok = await saveFields(TAB_FIELDS.other);
    if (ok && idx < TABS.length - 1) {
      setErrors({});
      setTab(TABS[idx + 1].id);
    }
  }

  async function submitAll() {
    const errs = validateWizardTab('other', form, {});
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('Complete required fields', { description: firstErrorMessage(errs) });
      return;
    }
    if (!(await saveFields(TAB_FIELDS.other))) return;
    if (await submit()) navigate('/profile#overview');
  }

  if (!loading && companies && companies.length > 0 && !companyId) {
    return null;
  }

  return (
    <div className="overflow-x-clip">
      <div className="px-4 py-6 lg:px-6">
        <div className="mx-auto w-full max-w-6xl">
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
              {profile && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Applying as <span className="font-semibold text-[#1e3a5f]">{profile.name}</span>
                </p>
              )}
              {profile?.status === 'rejected' && profile.rejectReason && (
                <p className="mt-2 rounded-sm bg-[var(--sendai-crimson)]/10 px-3 py-2 text-sm text-[var(--sendai-crimson)]">
                  Reviewer feedback: {profile.rejectReason}
                </p>
              )}
              {profile?.status === 'submitted' && (
                <p className="mt-2 rounded-sm bg-[var(--sendai-orange)]/10 px-3 py-2 text-sm text-[var(--sendai-orange)]">
                  Under review — editing is locked until the secretariat decides. You can continue on your profile page.
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
                <Tabs value={tab}>
                  {/* Progress bar: display-only, navigation via buttons only. */}
                  <div className="mx-auto flex w-full max-w-2xl items-start" aria-hidden="true">
                    {TABS.map((t, i) => {
                      const done = !!stepDone[t.id];
                      const current = i === idx;
                      return (
                        <Fragment key={t.id}>
                          <div className="flex w-24 shrink-0 flex-col items-center gap-2">
                            <span
                              className={cn(
                                'grid size-14 place-items-center rounded-full border-2',
                                done
                                  ? 'border-transparent bg-[var(--sendai-teal)] text-white'
                                  : current
                                    ? 'border-[var(--sendai-teal)] bg-[var(--sendai-teal)] text-white ring-2 ring-[var(--sendai-teal)]/30'
                                    : 'border-border bg-muted text-muted-foreground',
                              )}
                            >
                              {done ? (
                                <HugeiconsIcon icon={Tick01Icon} size={24} strokeWidth={2.5} />
                              ) : (
                                <HugeiconsIcon icon={t.icon} size={22} strokeWidth={2} />
                              )}
                            </span>
                            <span className={cn(
                              'text-center text-sm leading-tight',
                              current ? 'font-semibold text-[#1e3a5f]' : 'text-muted-foreground',
                            )}>
                              {t.label}
                            </span>
                          </div>
                          {i < TABS.length - 1 && (
                            <div className={cn(
                              'mt-7 h-1 min-w-2 flex-1 rounded-full',
                              done ? 'bg-[var(--sendai-teal)]' : 'bg-border',
                            )} />
                          )}
                        </Fragment>
                      );
                    })}
                  </div>

                  <TabsContent value="company" className="space-y-3 pt-3">
                    <CompanySections
                      form={form}
                      set={set}
                      editable={editable}
                      companyName={profile.name}
                      proofs={proofs}
                      onUploadProof={(f) => uploadDoc('registration_proof', f)}
                      onDownload={downloadDoc}
                      onRemove={removeDoc}
                      errors={errors}
                    />
                  </TabsContent>

                  <TabsContent value="primary" className="space-y-3 pt-3">
                    <PrimaryContactEditor
                      companyId={companyId}
                      primary={primary}
                      onSaved={applyProfile}
                      editable={editable}
                      showDraftWarning={profile.status === 'approved'}
                    />
                  </TabsContent>

                  <TabsContent value="additional" className="space-y-3 pt-3">
                    <AdditionalContactsTable
                      companyId={companyId}
                      contacts={additional}
                      onChanged={applyProfile}
                      editable={editable}
                    />
                  </TabsContent>

                  <TabsContent value="affiliations" className="space-y-3 pt-3">
                    <AffiliationSections
                      form={form}
                      set={set}
                      editable={editable}
                      supporting={supporting}
                      onUploadSupporting={(f) => uploadDoc('supporting', f)}
                      onDownload={downloadDoc}
                      onRemove={removeDoc}
                      errors={errors}
                    />
                  </TabsContent>

                  <TabsContent value="other" className="space-y-3 pt-3">
                    <OtherSections form={form} set={set} editable={editable} errors={errors} />
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
            {profile && editable && (
              <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
                <Button variant="outline" disabled={idx === 0 || saving} onClick={() => { setErrors({}); setTab(TABS[idx - 1].id); }}>
                  Back
                </Button>
                {idx < TABS.length - 1 ? (
                  <Button disabled={saving} onClick={next}>
                    {saving ? 'Saving…' : 'Continue'}
                  </Button>
                ) : (
                  <Button disabled={saving} onClick={submitAll}>
                    {saving ? 'Submitting…' : 'Submit for review'}
                  </Button>
                )}
              </div>
            )}
          </Card>
          </SendaiFrame>
        </div>
      </div>
    </div>
  );
}
