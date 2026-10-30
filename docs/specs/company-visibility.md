# Spec: Company-wide visibility for member submissions

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-30 |

## Problem

Members can only see their own reports, certificates, and tickets (per-author
isolation). Real member companies have 1+ authors who need to see each other's
submissions and shared activity. Admins already see everything for monitoring.

## Users + permissions

- **Member (`USER`)**: sees rows authored by any user sharing ≥1 company with
  them (including themselves). Users with no company keep today's self-only view.
- **Admin (`ADMIN`)**: unscoped, as today. Manages companies and membership via
  a new admin UI (seed/API follow-up later).
- Knowledge products stay a shared library for all members (admin-submitted);
  no scoping change.

## Scope

In scope:

- `Company` entity + `user_companies` join (many-to-many: users may belong to
  multiple companies), migration, backfill-free (greenfield table).
- `CompanyService` + `CompanyController` (admin-only write; members list only
  their own companies) + `CompanyAclService` following the existing ACL pattern.
- Rescoped member visibility in **reports, certificates, tickets** (list, read,
  file download, update, delete) + certificate **leaderboard** (members see only
  their companies' verified rows).
- Dashboard activity/counts inherit automatically (client-side aggregation over
  the rescoped list endpoints — no dashboard backend change).
- Admin UI page: company list, create/rename, member assign/remove.
- Tests: cross-company denial e2e per module + leaderboard scoping.

Out of scope: knowledge scoping, seeds, workspace roles, per-row company badges
beyond what the existing author payloads allow.

## API contract

- `GET /companies` — admin: all with members; member: own companies with members.
- `POST /companies` `{name}` — admin only.
- `PATCH /companies/:id` `{name}` — admin only.
- `DELETE /companies/:id` — admin only.
- `POST /companies/:id/members` `{userId}` — admin only (idempotent).
- `DELETE /companies/:id/members/:userId` — admin only (idempotent).
- Errors follow the starter envelope. Cross-company record access keeps the
  established `401 Unauthorized` contract (see Security).

## Data model

- `companies(id, name UNIQUE, createdAt, updatedAt)`.
- `user_companies(user_id, company_id)` composite PK via TypeORM `@JoinTable`.
- `users` unchanged (relation only). Reports/certificates/tickets derive company
  via their author (`author` / `submittedBy`); no new columns on those tables.

## Security + tenancy

- Deny by default; least privilege; no company data in logs.
- Deliberate deviation from `AGENTS.md` §8 (404 for cross-tenant): cross-company
  access returns `401 Unauthorized`, matching the existing tested contract
  (`another member cannot read it` asserts `UNAUTHORIZED`). Changing status
  codes would be a silent contract change, which is prohibited.
- Member list scoping uses `author.id IN (companyMemberIds)`; no-company
  members fall back to self-only.

## UI states

- Admin page: loading / empty ("No companies yet") / list with member counts /
  detail with member list, username picker, assign/remove with toasts.
- Member tables unchanged except wider row sets; empty states unchanged.

## Acceptance criteria

- Given two members in company A and one in company B, when A1 submits a
  report, then A2 lists/reads/downloads it, B cannot (401), admin can.
- Given a member with no company, when they list reports, then only their own
  appear (today's behavior preserved).
- Given a verified certificate in company A, when a member of B views the
  leaderboard, then A's rows are absent; admins see all rows.
- Given an admin assigns a user to a company, when that user refreshes, then
  the company's rows appear without re-login.
- Given cross-module check, when the same scenarios run for certificates and
  tickets, then identical visibility holds.

## Test plan

- New `test/kms/company.e2e-spec.ts`: company CRUD + membership admin-only
  (member 403s), cross-company report/certificate/ticket denial (401),
  leaderboard scoping, no-company fallback.
- Existing `test/kms/kms.e2e-spec.ts` must pass unchanged.
- `npm run lint`, `npm test`, `npm run test:e2e`, FE `npm run build`.

## Rollout + rollback

- Forward-only migration creating `companies` + `user_companies`; rollback via
  `migration:revert`. No data migration (greenfield tables). Feature is
  additive: zero companies means today's behavior everywhere.
