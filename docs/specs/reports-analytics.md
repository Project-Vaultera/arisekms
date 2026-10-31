# Spec: reports analytics (membership / summary / performance)

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-11-04 |

## Problem

Sidebar Reports placeholders (Membership, Report Summary, Performance and
Metrics) had no destinations. KPI cards requested (international response,
youth, technical assistance, F2F trained, collaborations) had no data source,
and gender / region / target-audience filters had no backing columns.

## Users + permissions

- **Member (`USER`, approved company)**: views the three report pages
  (company-scoped rows), logs activities (draft → submitted), edits own
  profile gender, edits own company region.
- **Admin (`ADMIN`)**: full visibility, approves/rejects activities,
  same as the report review flow.

## Scope

In scope:

- `users.gender` nullable (`male|female|other|prefer-not-to-say`), self-editable
  via `PATCH /users/me`, admin-editable, exposed in `UserOutput` + `AuthorOutput`
  (aggregates only in UI, never per-user tables).
- `companies.region varchar(120)` nullable, editable in the application editor
  (Section C), exposed in `MembershipProfileOutput` + `CompanyOutput` list
  (kills the N+1 profile fetch when present, with address fallback for legacy rows).
- New `activities` entity + CRUD (`POST/GET/PATCH/DELETE /activities`,
  company isolation like reports, status admin-only).
- FE: `DateRangeFilter` presets, home-style `StatCard`s, `TablePager`
  (Show + pagination) on all three pages, stacked/legend chart polish,
  activity log form + admin review, live gender/audience filters.

Out of scope: server-side analytics aggregates (client buckets + 100-row cap
stay, noted in UI), region enum hard-coding, SkillsBuild true enrollment
(certificates count stays the proxy, labeled as such).

## API contract

- `GET /companies` now includes `sector, region, legalRepName` (nullable).
- `PATCH /users/me {name?, email?, gender?}`, `PATCH /users/:id` gender for admins.
- `POST /activities {title, activityType, targetAudience? (one of 6 fixed values), happenedAt?,
  youthCount?, trainedCount?, isInternational?, notes?, companyId?}` → `submitted`.
- `GET /activities?limit&offset` (company-scoped), `PATCH /activities/:id`
  (members: everything except `status`; admins: incl. `status`).

## Data model

- `users.gender varchar(20)`, `companies.region varchar(120)` (migration
  `AddReportsAnalytics1793370000000`).
- `companies.sector` stays `varchar(200)` but is restricted to the 28-value
  admission applicant taxonomy (`COMPANY_SECTORS`, no schema change; migrations
  `NormalizeCompanySectors1793380000000` + `AdoptAdmissionSectors1793381000000`
  reconciled earlier values).
- `activities(id, title, activityType enum, targetAudience enum [6 fixed values],
  status enum
  default submitted, happenedAt date, youthCount int, trainedCount int,
  isInternational bool, notes text, company FK SET NULL, createdBy FK CASCADE,
  createdAt, updatedAt)`.

## Security + tenancy

- Activity list/read gated by company membership (`getCompanyMemberUserIds`),
  cross-company → `401`, mirroring reports/tickets. Status escalation
  member-proof (input stripped unless admin). Manual entries only count toward
  KPIs when `approved`.

## UI states

- KPI cards: live values where a source exists; empty-filter → `0` with
  “Approved only” hint (no fake `—` for sourced cards).
- Gender/audience filters degrade: `Unspecified` / `All audiences` options
  instead of disabled placeholders.
- Tables: `Show 10/25/50/100` + `Showing X–Y of Z` + Previous/Next, page reset
  on any filter change.

## Acceptance criteria

- Given a member sets gender, when an admin filters reports by it, then the
  report appears under that gender bucket.
- Given a company sets region, when membership analytics load, then no
  per-profile fetch is needed for that row.
- Given a member logs an activity, when an admin approves it, then KPI cards
  include it; before approval they do not.
- Given a non-author member, when they PATCH another activity, then `401`.

## Test plan

- `src/activity/services/activity.service.spec.ts`: status strip for authors,
  admin override, non-author `401`.
- `test/kms/membership.e2e-spec.ts` passes unchanged (region optional).
- `npm test` (19 suites), `npm run build`, FE `npm run build`.

## Rollout + rollback

- Forward-only migration; rollback via `migration:revert`. Existing rows get
  `NULL` gender/region — UI falls back to address-derived region and
  `Unspecified` gender; no backfill.
