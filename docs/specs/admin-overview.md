# Spec: Admin overview page

| Field | Value |
|---|---|
| Status | Accepted |
| Date | 2026-10-30 |

## Problem

After removing the duplicate Admin Desk alias, admins land on the same
DashboardHome as members. Admins need one monitoring surface: pending queues,
per-company output, and cross-company activity.

## Users + permissions

- **Admin (`ADMIN`)** only: route gated to `admin-center` (members bounce to
  `/` via the existing `allowedRoute` guard). All data comes from existing
  admin-visible list endpoints; no API change.

## Scope

In scope (frontend-only, `pages/AdminOverview.jsx` + nav wiring):

- Global stat cards via existing `SectionCards` (admin variant).
- Approvals summary: pending reports / pending certificates / open tickets
  counts, each linking to `/admin-approvals`.
- Per-company table: members, reports, certificates, open tickets per company,
  computed client-side from list endpoints + `GET /companies`.
- Cross-company activity: existing `RecentActivity` fed by `useDashboardData`.
- Sidebar `Admin Center` first item + `/admin-overview` route + rbac mapping.

Out of scope: new endpoints, seeds, chart changes, member-facing changes.

## API contract

None (reuses `GET /reports`, `/certificates`, `/support-tickets`,
`/companies`, dashboard hook fetches). Row caps follow the existing 100-row
client-side sampling shortcut.

## Data model

None.

## Security + tenancy

- Admin-only route; no member data newly exposed (admins already see all rows).
- No secret leakage; counts only.

## UI states

- Loading skeletons, empty companies state, existing table/activity states.

## Acceptance criteria

- Given an admin, when they open Admin Overview, then they see global stats,
  three pending counts linking to Approvals, a per-company table, and recent
  cross-company activity.
- Given a member, when they visit `/admin-overview`, then they bounce to `/`.
- Given no companies exist, when an admin opens the page, then the company
  table shows its empty state and everything else still renders.

## Test plan

- FE `npm run build`; click-through as admin; member deep-link redirect check.
- BE suite untouched (no API change).

## Rollout + rollback

- Additive page + nav item; rollback by reverting the route/sidebar entries.
