# Security Audit — Arise KMS

Date: 2026-10-31. Scope: `src/` (NestJS 11 API), `arisekms-fe/src/` (React 19), Docker/Compose, env/config, uploads. Method: code read + pattern grep, no live DAST, no `npm audit` run. Repo is source of truth.

## Summary

| Severity | Count | Issues |
|---|---|---|
| High | 6 | H1–H6 |
| Medium | 8 | M1–M8 |
| Low / hardening | 6 | L0–L6 |

No SQL injection (parameterized `$1` / ORM), no committed `.env` (only `.env.template`), uploads git-ignored. Biggest chain: XSS → `localStorage` token theft → long-lived JWT + unauthenticated Swagger/Adminer recon over plain HTTP.

## High

### H1 — JWTs in `localStorage` (XSS = full takeover)
- `arisekms-fe/src/api/client.js:8-18,48`, `arisekms-fe/src/lib/rbac.js:48-66`.
- Access + refresh tokens JS-readable; any XSS exfiltrates both. Self-noted at `client.js:41` (no revocation list).
- Fix: HttpOnly `Secure; SameSite` cookies for refresh (at minimum); short-lived access in memory; add server token blocklist (`tokenVersion` exists — wire it to refresh rotation, H2).

### H2 — Refresh tokens never rotate / no reuse detection
- `src/auth/services/auth.service.ts:77-87` re-issues pair from `ctx.user.id` without bumping `tokenVersion` or invalidating presented token. Refresh accepted from JSON body (`src/auth/strategies/jwt-refresh.strategy.ts:21` `fromBodyField('refreshToken')`).
- Fix: rotate on each use, keep refresh-token id/version server-side, reject reuse.

### H3 — Pre-`tokenVersion` access tokens survive revocation
- `src/auth/strategies/jwt-auth.strategy.ts:38-40`: `if (payload.tokenVersion !== undefined && …)` — legacy tokens skip the check, so password/role changes (`src/user/services/user.service.ts:193-200`) don't kill them. Same in `jwt-refresh.strategy.ts:36-38`.
- Fix: require `tokenVersion` claim (reject if missing) after backfilling column; keep disabled-check as-is.

### H4 — Known default credentials in repo + seed script
- `src/seed-roles.ts:9` (`PASSWORD='Arise@2026'`), `:66-71` resets password+role on every run; usernames `ariseitadmin/arisesecretariat/arisemember/ariseanalyst` documented in `AGENTS.md`; `/.env.template:16` commits same password.
- Fix: no production `seed:roles`; fail closed when `NODE_ENV=production`; generate random password per env, print once; remove real password from template/docs.

### H5 — Swagger + Adminer + plaintext HTTP exposed
- `src/main.ts:40-41` mounts Swagger unconditionally; `src/main.ts:45` `listen(..., '0.0.0.0')` with no `httpsOptions`; `docker-compose.yml:70-78` exposes `adminer:latest` unpinned on shared network; FE fallback `http://localhost:3006` (`client.js:4`).
- Fix: gate Swagger to non-prod; pin/remove Adminer from prod compose; terminate TLS (proxy/LB), add HSTS; don't ship dev `Dockerfile` (runs as root) — use `Dockerfile.prod` (`USER node`).

### H6 — No tenant isolation (single-tenant code, multi-tenant claims)
- Grep `organization_id|organizationId|tenant` in `src/` hits only `src/audit/entities/audit-log.entity.ts:13` ("no organization column") and a comment in `src/company/services/membership.service.ts:79`. No per-org scoping; cross-tenant contract inverted (401 instead of 404, contrary to `AGENTS.md` §8).
- Concrete IDOR-by-design: `src/article/services/article.service.ts:75-79` lists with `where: {}`, `getArticleById (:88-109)` has no company check — any authenticated `MEMBER`/`ANALYST` reads every article. `src/knowledge/services/knowledge.service.ts:94-100,107-121` same (`findAndCount({take…})`, no `where`, no `assertCompanyAccess`); controller advertises "admin only" (`knowledge.controller.ts:55,129,147`) but `knowledge-acl.service.ts:15` grants `MEMBER: List,Read` — any member lists/downloads all files. Correct pattern exists in ticket/certificate/report/activity (`ticket.service.ts:74-75,88-97` via `getCompanyMemberUserIds()`).
- Fix: decide single-tenant (document it, drop cross-tenant claims) or add `organization_id` + server-enforced scoping + negative tests before any shared hosting. If article/knowledge are intentionally global, document as accepted risk.

## Medium

### M1 — Auth-only in-memory throttle, proxy-unsafe
- `src/auth/guards/login-throttle.guard.ts:3-27`: 10 req/min/IP in-process `Map`, reset on restart, shared across login/register/refresh; `main.ts` never sets `trust proxy`, so behind a proxy all clients share one bucket (self-DoS) or `X-Forwarded-For` spoof bypasses it. No throttle on user/audit lists.
- Fix: `@nestjs/throttler` + Redis store, `trust proxy` set to proxy count, separate stricter login bucket.

### M2 — 401 for authorization failures; role design leaked
- Content services throw `UnauthorizedException` on failed `canDoAction` (e.g. `src/article/services/article.service.ts:47,71,103,127,155`; same in ticket/knowledge/certificate/company). `RolesGuard` body echoes roles: `src/auth/guards/roles.guard.ts:36-38`. Guards also stringify passport `info` (`jwt-auth.guard.ts:25`, `jwt-refresh.guard.ts:25`: `jwt expired` vs `invalid signature` oracle).
- Fix: 401 unauthenticated / 403 forbidden / 404 hide; generic "Unauthorized"/"Forbidden" messages only.

### M3 — Open registration depends on one overwrite line- `POST /auth/register` unauthenticated (`auth.controller.ts:66-67`); safety is `auth.service.ts:67-69` forcing `roles=[ARISE_MEMBER], isAccountDisabled=false`. DTO still declares them settable (`auth-register-input.dto.ts:36-38`) and `UserService.createUser` mass-assigns via `plainToClass(User, input)` (`user.service.ts:38`).
- Fix: strip `roles/isAccountDisabled` from register DTO (separate admin-only DTO), `@IsNotEmpty()` on username, explicit allowlist in `createUser`.

### M4 — Weak password policy, minimum bcrypt cost, user-enum timing
- `Length(6,100)` only (`auth-register-input.dto.ts:26`), bcrypt rounds 10 (`user.service.ts:40,189`; OWASP minimum, 12 preferred). `validateUsernamePassword` returns before `compare` when user missing (`user.service.ts:66-70`) — generic message but timing differs.
- Fix: length ≥10 + breach-list check, bcrypt 12, always `compare` against dummy hash.

### M5 — Missing hardening headers / CORS / validation gaps
- Only 3 manual headers (`main.ts:16-21`); no `helmet`, CSP, HSTS, COOP/CORP, `Permissions-Policy`; no `helmet` dep. `VALIDATION_PIPE_OPTIONS={transform:true, whitelist:true}` (`shared/constants/common.ts:5`) — no `forbidNonWhitelisted`, no body-size cap. CORS `credentials:true` with env-extensible origins (`main.ts:23-30`) — one `CORS_ORIGINS=*` entry silently widens credentialed access.
- Fix: `helmet`, `forbidNonWhitelisted:true`, JSON body limit (~100kb), validate/normalize `CORS_ORIGINS` (reject `*` with credentials).

### M6 — Sensitive reads unaudited; audit is lossy fire-and-forget
- Only `POST/PATCH/PUT/DELETE` audited (`logging.interceptor.ts:16,46`; `all-exceptions.filter.ts:95`). `GET /audit-logs`, `/users`, member directory, exports: zero rows. Writes swallow errors (`audit.service.ts:85-104`).
- Fix: audit sensitive views/exports per AGENTS §9/§10; durable outbox or at least error-count metric.

### M7 — File persisted to disk *before* authorization (orphaned-file / disk-fill)
- `src/knowledge/services/knowledge.service.ts:53` `persistUpload(file)` precedes `canDoAction(Create)` at `:65-70`; `src/report/services/report.service.ts:48` precedes ACL at `:57-62`. `file-storage.ts:25-30` writes synchronously to `./uploads` with no cleanup on the throw path. Any JWT holder (e.g. `DATA_ANALYST` with no Create grant) can fill disk with rejected 10 MB uploads. `membership.service.ts:453` already does check-then-persist — copy that order.
- Fix: move `persistUpload()` after `isAllowed` check; delete orphan on failure; rate-limit upload routes (only auth routes throttled today).

### M8 — Write paths skip the company check reads enforce; seed/CLI prod guards missing
- `ticket.service.ts:108-141` (update), `:143-158` (delete), `certificate.service.ts:150-174,176-191`, `report.service.ts:122-147,149-165`, `activity.service.ts:113-134,136-145` omit `assertCompanyAccess()` that their read paths call. Safe today only because member ACLs restrict to `isAuthor`/no-write — any future company-wide triage grant silently becomes cross-company write. Add the assert to update/delete.
- `src/seed-demo.ts:77-80` refuses `APP_ENV=production` (good) but `src/seed-roles.ts:43-79` has no env guard and *resets* passwords/roles (`:66-72`); `src/cli.ts:10-38` creates `it-admin` from `DEFAULT_ADMIN_USER_PASSWORD` with no confirmation; `src/shared/seeds/demo-content.ts:12` (`DEMO_PASSWORD='DemoPass123!'`, 71 users) + `seed-demo.ts:132-133` logs it; `configuration.ts:29` falls back to `AdminPass123!`. Fix per H4 + guard every seed/CLI path.

## Low / hardening

- **L0 Local-disk uploads, stale-role alias, email change keeps sessions:** `UPLOADS_DIR='./uploads'`, 10 MB cap + magic-byte check good (`file-storage.ts:20-23,46-53`), but no virus scan/signed URLs (self-noted `:7-8` shortcut). `LEGACY_ROLE_MAP ADMIN→ARISE_IT_ADMIN` (`role.constant.ts:9-16`) silently grants admin from stale rows; `RolesGuard` fails open with no `@Roles` (`roles.guard.ts:23-25`). Self email change needs no verification and doesn't bump `tokenVersion` (`user.service.ts:134-165,193-200`). Fix: private object storage + AV; backfill roles, delete map; deny-by-default; verify email change + bump `tokenVersion`.
- **L1 Verbose errors:** 4xx `exception.getResponse()` echoed verbatim; only 500s suppressed in prod (`all-exceptions.filter.ts:60-68,121-125`). Generic messages for 4xx details; confirm Winston sink doesn't persist tokens/PII (`logger.service.ts:29-50`, TypeORM `debug` in `shared.module.ts:29`).
- **L2 `findById` null-map:** `user.service.ts:98-107` returns 200 `{data:null}` for deleted user. Return 404.
- **L3 Dead ACL vs routes:** `UserAclService` grants member `Read` on any user but routes deny it (`user.controller.ts:111-112,143-144`); `forActor` unused — one enforcement path only.
- **L4 FE dev server as prod:** `arisekms-fe/Dockerfile` runs Vite dev on `0.0.0.0`; no prod `nginx`/static build, no CSP. `CompanyLogo.jsx` stores data-URL in `localStorage` (quota nit).
- **L5 Secrets hygiene OK with caveats:** `.env` untracked and ignored (`.gitignore:390,392,398-399`), but live keys sit in compose env (`docker-compose.yml:24-25`, visible in `docker inspect`); JWTs long-lived (`JWT_*_EXP_IN_SEC`). Add rotation story, short access TTL.
- **L6 Unbounded endpoints + missing `ParseIntPipe` + unbounded text fields:** `membership.service.ts:115-129 listSubmissions()` (no `take/skip`, eager contacts/documents) and `certificate.service.ts:115-148 getLeaderboard()` (unbounded `GROUP BY`) bypass the otherwise solid `pagination-params.dto.ts:5-33` (`@Max(100)` + `clampPagination`). Every `@Param('id') id: number` (article/ticket/certificate/knowledge/report/activity/company controllers) lacks `ParseIntPipe` — `?id=abc` reaches TypeORM instead of 400. Text DTOs (`ActivityInput.notes`, `MembershipContactInput` address fields) lack `@MaxLength` (only body-parser 100 kb default bounds them). Fix: cap lists, add `ParseIntPipe`, `@MaxLength(2000-5000)` on text DTOs. `logoStoredName` reads are safe (`basename()` in `membership.service.ts:500,540`, `removeUploadFile` pops `/` in `file-storage.ts:35`); `getLogoFile` hardcodes `image/png` (`:539-543`) — return stored `mimeType` instead.

## What's solid (keep)

Parameterized `$1` queries + ORM (no string-interpolated SQL found); `FileTypeValidator fallbackToMimetype:false` + `limits.fileSize/files`; `tokenVersion` revocation design (needs H2/H3 completion); race-safe unique handling (`user.service.ts:47-50`); `clampPagination` bounding; `.env`/`uploads/` correctly ignored.

## Remediation order

1. H4 seed/prod guard → 2. H2+H3 rotation + mandatory `tokenVersion` → 3. H1 cookie move → 4. H5 gate Swagger/Adminer, TLS → 5. M1 shared throttle → 6. M2 status/message fix → 7. M5 helmet/validation → 8. H6 tenancy decision → 9. M6 sensitive-view audit → 10. M7/L hardening.

Skipped/not verified: live `npm audit`/CVE scan, running-stack header/CORS/Swagger probe, per-module ACL parity (ticket/company/certificate/knowledge line-by-line), FE `rbac.js` drift, migration history, JWT key strength/rotation. Risk: H6/M1 severity depends on deployment (single-tenant dev vs shared prod behind proxy).
