# AGENTS.md — Arise KMS (authoritative AI-agent guide)

> Read this file, `README.md`, and the files directly relevant to the requested change before editing. Repo is source of truth: on mismatch, inspect code, state it in the handoff, and update docs in the same change.

## 1. Product

Open-source knowledge management system (placeholder scope): workspaces, documents/notes, tags/search, sharing, audit history. Exact domain entities are TBD — do not invent a full domain model unasked; implement only the requested slice.

Invariants: tenant isolation, least privilege, traceability. AI features are optional enhancements, never silent decision-makers.

## 2. Instruction priority

1. User's current request + acceptance criteria
2. Security, tenant isolation, no secret leakage
3. Existing repo conventions + tests
4. This file
5. `README.md` and other docs

Never weaken auth, authz, validation, tenant scoping, or auditability to make a feature pass.

## 3. Monorepo map

| Path | Stack | Notes |
|---|---|---|
| `src/` | NestJS 11 REST API | Domain modules, `shared/`, `main.ts`, `cli.ts` |
| `arisekms-fe/src/` | React 19 + Vite 8 | `api/client.js` (shared layer), `App.jsx`, pages/components as added |
| `migrations/` | TypeORM | Only way to change schema |
| `test/` | e2e (BE) | `jest --config ./test/jest-e2e.json` |

## 4. Environment

- Docker Compose, WSL2. Services: `app`, `frontend`, `pgsqldb` (Postgres 16.3), `adminer`.
- Ports (defaults): API `3006`, FE `5176`, PG host `5436`, Adminer `8086`. Chosen to avoid `3000/5173/5432/8080` sibling-stack clashes; all overridable via `.env`.
- Browser-facing API base: `http://localhost:3006/api/v1` (`VITE_API_URL`).
- DB creds / JWT keys / ports come from `.env` (see `.env.template`). Never commit `.env` or secrets.
- FE API layer: all server calls go through `arisekms-fe/src/api/client.js`. Never scatter `fetch`/`axios` in pages.

## 5. Commands (use only scripts that exist)

Backend (`package.json` at root):

```bash
docker compose config
docker compose exec app npm run lint
docker compose exec app npm test
docker compose exec app npm run test:e2e
docker compose exec app npm run build
npm run migration:generate --name=Foo   # then review generated file
npm run migration:run / migration:revert
```

Frontend (`arisekms-fe/package.json`): `dev`, `build`, `preview` only.

```bash
docker compose exec frontend npm run build
```

Narrowest relevant check first, then broader. If a check can't run, report exact command + reason. Never claim a pass you didn't execute.

## 6. Required workflow (spec-driven, vertical slices)

### 6.1 Discover

- Read relevant module, DTOs, entities, migrations, guards, tests, routes, FE API calls.
- Search for an existing pattern before new abstraction.
- `git status` first; preserve unrelated user changes.

### 6.2 Spec

For non-trivial work establish before coding: problem + user outcome; actors/roles; in/out of scope; API request/response/error contracts; data-model + migration plan; tenant-isolation rules; empty/loading/error/forbidden/success states; acceptance criteria + tests. Unresolved material decision → ask. Safe reversible default following repo pattern → document assumption, proceed.

### 6.3 Vertical slice

BE: entity → migration → DTO validation → tenant-scoped service → controller + Swagger → guards/authz → tests. FE: `api/client.js` integration → page states → docs update.

### 6.4 Implement minimally

Smallest coherent diff. Follow existing naming/DI/error conventions. Reuse starter auth, exception, validation, config systems. No new dependency when platform/existing package suffices. No unrelated refactoring. Never fabricate endpoints, env vars, commands, columns, or test results.

### 6.5 Handoff

What/why changed; files + contracts; migration/env action required; checks run with results; assumptions, limits, remaining work.

## 7. Architecture boundaries

- BE: controllers = transport/validation/authz metadata/response mapping. Services = business rules. ORM access stays tenant-scoped. Entities ≠ HTTP payloads.
- FE: pages compose; reusable behavior in hooks/components, not page files. FE may hide unauthorized actions, but API independently enforces every permission. Client-supplied tenant IDs are never authoritative.
- API: base `/api/v1`; DTO validation on all input; Swagger docs + response schemas; consistent status codes + starter error envelope; paginated lists with bounded filters + stable sort.

## 8. Tenancy (placeholder, enforce when domain lands)

- Records belong to a workspace/org directly or via an unambiguous parent. Most tables: `organization_id, created_by, created_at, updated_at, deleted_at`.
- Derive membership from authenticated server context. Scope every read/write/aggregate/search/job/notification to the tenant. Return 404 (not 403) to hide other tenants' records.
- Every feature needs negative tests: other-tenant access denied.

## 9. Roles and authz

Starter JWT only. Enforce in guards + services; deny by default. `401` = unauthenticated, `403` = unauthorized. `shortcut: localStorage tokens are dev-only; HttpOnly refresh cookies + revocation list are the prod upgrade.`

Single role per user, `ARISE_*` strings (`src/auth/constants/role.constant.ts`):

| Role | Powers |
|---|---|
| `ARISE_IT_ADMIN` | `Manage` everywhere; Governance (User Directory, Support Monitoring, Audit Logs) |
| `ARISE_SECRETARIAT` | Membership approvals + `Manage` on content; no user CRUD |
| `ARISE_MEMBER` | Author-scoped CRUD on content; membership application |
| `ARISE_DATA_ANALYST` | `List`/`Read` on the 6 content modules; no users/companies, no writes |

Rules: `RolesGuard` + per-module `*-acl.service.ts` (BE is authoritative; FE `arisekms-fe/src/lib/rbac.js` is display-only). `normalizeRole()` keeps legacy `ADMIN`/`USER` rows and JWTs working — never reintroduce the old values. `isPrivileged()` = IT_ADMIN + SECRETARIAT (approvals, triage, unscoped ticket/company views). Routes: `/secretariat-overview` (no sidebar item, group label only), `/admin-approvals`, `/member-directory`, `/reports-*`, `/governance-users` + `/governance-audit` (IT_ADMIN). POV accounts via `npm run seed:roles` (idempotent, all `Arise@2026`): `ariseitadmin` / `arisesecretariat` / `arisemember` / `ariseanalyst`. Audit trail (`src/audit/`, single-tenant, no org column): POST/PATCH/DELETE auto-recorded fire-and-forget (success via logging interceptor, failures incl. bad logins via exception filter); explicit rows for role changes, access toggles, membership decisions; reads IT_ADMIN-only.

## 10. Security

- Never commit secrets, keys, passwords, tokens, prod data, `.env`.
- No credentials/auth headers/doc contents/unneeded PII in logs.
- Validate + normalize all input; parameterized ORM queries.
- Rate-limit auth and abuse-prone endpoints (when added).
- Uploads (when added): validate size/extension/MIME; private storage.
- Audit: auth events; sensitive views/exports; permission changes.

## 11. DB + migrations

Schema changes only via committed TypeORM migrations. Never edit an applied/shared migration — new migration instead. Deterministic + reversible where practical. No `synchronize` outside disposable local dev. No volume/db wipe without explicit user request + confirmed target.

## 12. Testing

Per-risk coverage: unit (rules/edges) → controller/integration (validation/contracts) → tenant-isolation (cross-tenant denial) → role/record-level authz → migration tests for schema changes → e2e core flows.

## 13. Specs, ADRs

- Substantial features: Markdown spec under `docs/specs/` with Status | Problem | Users+permissions | Scope | API contract | Data model | Security+tenancy | UI states | Acceptance criteria (`Given/When/Then`) | Test plan | Rollout+rollback.
- ADR under `docs/adr/` for consequential, hard-to-reverse choices.
- `README.md` update when setup/ports/env/services/commands change.

## 14. Definition of done

Acceptance criteria met; tenancy + authz server-enforced; inputs/errors/edges handled; migrations reviewed; Swagger + docs updated; relevant checks pass; no secrets/sensitive fixtures; handoff names manual deploy/migration steps.

## 15. Prohibited

Bypass guards/tenant filters to green tests; FE-only authz; leak credentials/token contents/stack traces; prod data in fixtures/prompts; destructive db/volume commands sans explicit authz; unrelated rewrites or silent contract changes; placeholders marked prod-complete.

## 16. Commits + branches (CONTRIBUTING.md)

- Branch from `master`: `{type}/{issueNo}-one-liner`. Type ∈ feat, fix, docs, style, refactor, perf, test, build, ci, chore.
- Header `<type>(<scope>): <subject>` (imperative, lowercase, no trailing dot, ≤74 chars/line). Footer: `Closes #N`, `BREAKING CHANGE:` when applicable.
- PRs target `master`; add tests for code changes; must build clean.
