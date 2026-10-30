# Spec: Membership profile (5-tab onboarding + approval)

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-30 |

## Problem

`MembershipForm` is a `Coming Soon` placeholder. ARISE Philippines needs a
structured membership application: company data, primary + additional contacts,
UN/CSR affiliations, supporting documents, and business overview — submitted by
members, approved by admins.

## Users + permissions

- **New applicant**: registers (`/auth/register` is open), lands on the membership
  form as the only usable page (Support/Help stay visible). First visit: enters
  their company name → `POST /companies/apply` creates their own shell (`draft`)
  and assigns them. One non-approved company per user; admins keep using the
  admin-only `POST /companies`.
- **Member (`USER`)**: fills profile for their company. Draft → submit.
  Edits an approved profile roll it back to `draft` (needs resubmission).
- **Approved member**: full portal unlocks. Only members with ≥1 `approved`
  company can create reports, certificates, and tickets (server-enforced `403`;
  nav hidden display-only).
- **Admin (`ADMIN`)**: bypasses the gate, reviews `submitted` profiles, approves
  or rejects (reason required). Full visibility, as with companies today.

## Scope

In scope:

- `Company` extension: profile columns + `status` (`draft|submitted|approved|rejected`)
  + `rejectReason`. No `country_data_dont_delete...` legacy field — removed by decision.
- `membership_contacts` (primary row `isPrimary=true` + additional rows) and
  `membership_documents` (`registration_proof|supporting`) tables, FK `company_id`
  cascade delete.
- Endpoints under `/companies/:id/...` reusing company membership scoping
  (cross-company → `401 Unauthorized`, matching the existing contract).
- FE: 5-tab wizard (Back / Save draft / Continue, Submit on last tab) reused as
  profile editor; `Approvals` gains a Membership queue.
- E2E: cross-company denial, conditional validation, submit/approve/reject flow.

Out of scope: new-company self-registration (admin creates the shell company, as
today), knowledge scoping changes, object storage (local `uploads/` stays —
see `shortcut` in `file-storage.ts`).

## API contract

- `GET /companies/:id/profile` — member of company or admin.
- `POST /companies/apply {name}` — any authenticated user; one non-approved
  company per user; creator auto-assigned.
- `PUT /companies/:id/profile` — draft save (partial). Member allowed in
  `draft|rejected|approved` (approved → back to `draft`); `submitted` locked for
  members; admin anytime.
- Report/certificate/ticket `POST` — `403` unless the actor is an admin or has
  an `approved` company.
- `POST /companies/:id/submit` — validates the full required set, flips to `submitted`.
- `POST /companies/:id/review {status: approved|rejected, reason?}` — admin only,
  reason required when rejected.
- `POST /companies/:id/contacts` / `PATCH /companies/:id/contacts/:contactId`
  / `DELETE /companies/:id/contacts/:contactId` — same scoping as profile.
- `POST /companies/:id/documents` (multipart `file` + `kind`) /
  `GET /companies/:id/documents/:docId/file` /
  `DELETE /companies/:id/documents/:docId`.
- Errors follow the starter envelope.

## Data model

- `companies`: + `legalRepName, legalRepTitle, applicantCountry, registeredCountry,
  noAttachmentExplanation, sector, isTradeAssociation, isBusinessAssociation,
  exchangeSymbol, parentCompanyDetails, street, city, province, zip, country, phone,
  website, fax (required on submit, per Frappe parity), staffCount, annualRevenue,
  unGlobalCompact, otherUnAgency, whichAgency, otherOrgs, affiliationDetails,
  businessOverview, geographicFocus, status, rejectReason`.
- `membership_contacts(id, company_id FK, isPrimary, title, firstName, middleName,
  lastName, position, email, phone, contactType, sameAsRegistered, country, province,
  city, street, zip)`.
- `membership_documents(id, company_id FK, kind, originalName, storedName, mimeType, size)`.

## Security + tenancy

- Member must share the company (`members.some(id)`) or be admin; otherwise `401`.
- Conditional rule is server-enforced: zero `registration_proof` docs →
  `noAttachmentExplanation` required. `Fax` required on submit.
- `UN Global Impact` keeps its original Frappe wording in the UI.
- `sameAsRegistered=true` snapshots the company address into the contact row
  (copy, not live link), so later company edits don't silently rewrite contacts.

## UI states

- No company: "No company assigned — contact the secretariat."
- `draft|rejected`: wizard editable, banner shows status + reject reason.
- `submitted`: read-only "under review" for members.
- `approved`: editable tabs, banner warns edits need re-approval.
- Contacts table: add/edit modal, remove with confirm; email/phone validated.
- Documents: `FileDropzone` per kind, list with download + remove.

## Acceptance criteria

- Given a member with a company, when they save Tab 1 draft, then refresh keeps values.
- Given zero registration proofs, when they submit, then `400` unless explanation set.
- Given `sameAsRegistered=true`, when company street changes later, then the contact
  street keeps its snapshot.
- Given a submitted profile, when an outsider GETs it, then `401`; admin sees it.
- Given admin rejects without reason, then `400`; with reason, member sees it.
- Given approved profile edited by member, then status returns to `draft`.

## Test plan

- New `test/kms/membership.e2e-spec.ts`: draft save, submit validation (fax,
  explanation conditional, primary contact), cross-company `401`, approve/reject,
  edit-after-approval → draft.
- Existing `test/kms/company.e2e-spec.ts` passes unchanged.
- `npm run lint`, `npm test`, `npm run test:e2e`, FE `npm run build`.

## Rollout + rollback

- Forward-only migration adding columns + 2 tables; rollback via `migration:revert`.
  Existing companies default to `draft` with null profile fields — no backfill.

## Member profile page

`/profile` is the member-facing overview (Profile-V2 inspired, no SendaiFrame,
left-aligned like other dashboard pages): header (avatar, name, company, status
badge, completion %) plus Gamsys-style icon tabs — Overview (first-run
checklist for drafts + the full inline application editor: all sections,
documents, submit), About (`PATCH /users/me`), Primary Contact (inline edit via
the contacts API; the approved → draft rule applies with an on-screen notice),
Activity (nested Mine/Company tabs over reports + certificates; Company hidden
until approval), SkillsBuild (own recorded credentials + continue-learning CTA).
Tabs are URL-hash deep-linked. `/membership-form` is now a thin forwarder
(start-application card when company-less, else redirect to `/profile#overview`);
locked users land on the form only when they have no company, otherwise straight
on the profile. `/profile` is in the pending allowlist (read-only where it
matters). The sidebar avatar menu shows the real member name + company.
