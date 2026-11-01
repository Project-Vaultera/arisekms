# Arise KMS

> Open-source knowledge management system (placeholder scope).

NestJS REST API + React/Vite + PostgreSQL in Docker Compose, optimized for Ubuntu on WSL2. AI agents must read `AGENTS.md` before editing.

## New contributor checklist

First run (copy-paste):

```bash
git clone <arisekms-remote> ~/oss-vaultera/arisekms
cd ~/oss-vaultera/arisekms
cp .env.template .env
chmod +x ./scripts/generate-jwt-keys
./scripts/generate-jwt-keys
# paste JWT_PUBLIC_KEY_BASE64 / JWT_PRIVATE_KEY_BASE64 into .env, set DB_PASS + DEFAULT_ADMIN_USER_PASSWORD
cp arisekms-fe/.env.example arisekms-fe/.env
docker compose up --build -d
docker compose exec app npm run migration:run
docker compose exec app npm run cli:dev
curl -i http://localhost:3006/api/v1
curl -i http://localhost:5176
```

Returning contributor:

```bash
git pull --ff-only
docker compose up -d
docker compose exec app npm run migration:run
docker compose ps
```

## Table of contents

- [Product scope](#product-scope)
- [Technology stack](#technology-stack)
- [Repository structure](#repository-structure)
- [Local services](#local-services)
- [Prerequisites](#prerequisites)
- [First-run setup](#first-run-setup)
- [Returning contributors](#returning-contributors)
- [Branch switching and resets](#branch-switching-and-resets)
- [Application configuration](#application-configuration)
- [Authentication](#authentication)
- [Daily commands](#daily-commands)
- [Troubleshooting](#troubleshooting)
- [Security baseline](#security-baseline)
- [Working with AI coding agents](#working-with-ai-coding-agents)
- [License](#license)

## Product scope

KMS placeholder — domain entities are TBD:

| Area | Status |
| --- | --- |
| Workspaces / tenants | TBD (single-tenant code; company scoping only in ticket/certificate/report/activity via `getCompanyMemberUserIds`) |
| Identity and access | Starter JWT (see Authentication) + role ACLs per module |
| Documents / notes | Knowledge moderation live: member upload → `submitted`, staff auto-`approved`, `POST :id/review`, `GET :id/history` |
| Tags and search | Title/description/ID search + category filter on Knowledge Products |
| Sharing | Approved docs visible to all; own pending docs visible to author only |
| Audit history | `src/audit/` (writes auto-recorded) + per-document timeline (`KNOWLEDGE_*` actions) |

First slice done: sign in → member submits report/knowledge → staff approves in Approvals → member sees it in library. Cross-tenant 404 hiding is still TBD (see `SECURITY.md` H6).

## Technology stack

| Layer | Technology |
| --- | --- |
| Backend API | NestJS REST API ([starter](https://github.com/monstar-lab-oss/nestjs-starter-rest-api)) |
| Frontend | React 19 + Vite 8 + Tailwind v4 + shadcn `dashboard-01` block + Bklit charts + HugeIcons (`arisekms-fe/`) |
| Database | PostgreSQL 16.3 via TypeORM migrations |
| Auth | Local JWT (RS256 access + refresh rotation) |
| Docs | Swagger/OpenAPI |
| Local orchestration | Docker Compose + Adminer |

## Repository structure

```text
arisekms/
├── src/                 # NestJS app (modules, shared/, main.ts, cli.ts)
├── test/                # Backend e2e
├── migrations/          # TypeORM migrations (only way to change schema)
├── scripts/             # generate-jwt-keys, npm
├── arisekms-fe/         # React placeholder (api/client.js, App.jsx)
├── docs/
├── docker-compose.yml
├── .env.template
├── AGENTS.md
└── README.md
```

## Local services

Host ports offset to run beside a sibling stack on `3000/5173/5432/8080`:

| Service | Compose name | Host address |
| --- | --- | --- |
| Frontend | `frontend` | <http://localhost:5176> |
| API server | `app` | <http://localhost:3006> |
| API base (global prefix) | `app` | <http://localhost:3006/api/v1> |
| Swagger | `app` | <http://localhost:3006/swagger> |
| Adminer | `adminer` | <http://localhost:8086> |
| Postgres (host) | `pgsqldb` | `localhost:5436` |
| Postgres (in Compose) | `pgsqldb` | `pgsqldb:5432` |

All host ports overridable via `.env` (`APP_PORT`, `FRONTEND_PORT`, `PGSQL_HOST_PORT`, `ADMINER_PORT`).

## Prerequisites

Windows 10/11, WSL2 Ubuntu, Docker Desktop with WSL Integration → Ubuntu, Git inside Ubuntu. Keep the repo under `/home/...`, not `/mnt/c/...`.

```bash
docker --version && docker compose version && git --version && docker info
wsl --list --verbose   # run in PowerShell, Ubuntu must show VERSION 2
```

## First-run setup

### 1. Backend env

```bash
cp .env.template .env
./scripts/generate-jwt-keys   # paste both BASE64 values into .env
nano .env
```

Minimum to change: `DB_PASS`, `DEFAULT_ADMIN_USER_PASSWORD`, both `JWT_*_BASE64`. Defaults already point at `3006/5176/5436/8086` and `DB_HOST=pgsqldb`. Never commit `.env`.

### 2. Frontend env

```bash
cp arisekms-fe/.env.example arisekms-fe/.env
```

Contents: `VITE_API_URL=http://localhost:3006/api/v1`. Browser-only URL — never `http://app:3006`. Restart the frontend container after any change (`docker compose restart frontend`).

### 3. Start + migrate + seed admin

```bash
docker compose up --build -d
docker compose exec app npm run migration:run
docker compose exec app npm run cli:dev   # creates it-admin if missing
```

`cli:dev` runs `src/cli.ts` and is idempotent. Default login: `it-admin` / value of `DEFAULT_ADMIN_USER_PASSWORD` (`Arise@2026` unless changed).

### 3b. Roles + POV check accounts (dev only)

Single role per user (`CreateUserInput.roles` / `UpdateUserInput.roles` accept exactly one):

| Role | Powers |
|---|---|
| `ARISE_IT_ADMIN` | Manage everything; Governance → User Directory (accounts, role assignment, disable) + Support Monitoring + Audit Logs |
| `ARISE_SECRETARIAT` | Member approvals + full Manage on content; Member Directory stays here |
| `ARISE_MEMBER` | Author-scoped CRUD on content; apply for membership; knowledge: upload lands `submitted`, edit/delete own pending, read approved + own |
| `ARISE_DATA_ANALYST` | List/Read on approved content (knowledge: approved-only) + reports/summary/performance/activities/certificates/tickets; no users/companies/membership-analytics, no writes |

```bash
docker compose exec app npm run seed:roles   # idempotent, resets password + role
```

| Username | Role | Password |
|---|---|---|
| `ariseitadmin` | Arise IT Admin | `Arise@2026` |
| `arisesecretariat` | Arise Secretariat | `Arise@2026` |
| `arisemember` | Arise Member | `Arise@2026` |
| `ariseanalyst` | Arise Data Analyst | `Arise@2026` |

Demo content accounts (from `seed:demo`, §4): `demo.member.1`–`71`, password `DemoPass123!` (eleven inactive). Default admin: `it-admin` / `DEFAULT_ADMIN_USER_PASSWORD`.

### 4. Seed demo dashboard data (optional, dev only)

```bash
docker compose exec app npm run seed:demo
```

Creates 71 demo members (`demo.member.1`–`71`, password `DemoPass123!`, eleven inactive), 20 demo companies (4 primary companies with exclusive member pairs, 16 with a single member), ~40 reports across the last 26 weeks, ~30 certificates, and 12 knowledge docs with backdated timestamps so the dashboard charts, timeline, and recent activity have content. Staff see everything; members only see their own company's submissions (server-enforced). Refuses to run with `APP_ENV=production`. Re-running is a no-op for users/reports, while company membership converges by name. To wipe (orphan files under `./uploads` are harmless in dev):

```sql
DELETE FROM users WHERE username LIKE 'demo.member.%';  -- cascades their reports + certificates
DELETE FROM knowledge_documents WHERE title LIKE 'Demo:%';
```

### 4b. Knowledge moderation (how docs flow)

- Member `POST /api/v1/knowledge` (multipart: `title`, `description`, `category`, `file`) → saved `submitted`, visible to author only.
- Staff (secretariat/IT admin) uploads skip the queue → saved `approved`.
- Review: `POST /api/v1/knowledge/:id/review` `{status: approved|rejected, reason?}` — secretariat/IT-admin only, reject requires `reason` (≤500 chars), second decision → 409.
- Author edits own pending docs: `PATCH /api/v1/knowledge/:id` (multipart, optional replacement `file`); editing a `rejected` doc resubmits it (`submitted`, reason cleared).
- Author deletes own pending docs: `DELETE /api/v1/knowledge/:id`. Analysts list everything but can only read `approved` docs.
- Timeline: `GET /api/v1/knowledge/:id/history` (author or reviewer) returns the `KNOWLEDGE_UPLOADED/EDITED/RESUBMITTED/APPROVED/REJECTED` audit trail, oldest first.
- Migration `AddKnowledgeModeration` backfills pre-moderation docs to `approved`.
- FE: Knowledge Products page (search + category filter, Preview/Download, Upload Document modal, status badges, History dialog); Approvals page Documents tab with bulk approve/reject.

### 4c. Profile, avatar, sessions, invites

- `PATCH /api/v1/users/me` — self-service `name`, `email`, `gender` + password change (`password` + `currentPassword`, 6–100 chars). A password change bumps `tokenVersion`, signing out **all** devices including this one — FE redirects to login.
- `POST /api/v1/users/me/sessions/revoke` — sign out all devices now (bumps `tokenVersion`).
- Avatar (jpg/png): `POST /api/v1/users/me/avatar` (multipart `file`), `GET /api/v1/users/me/avatar/file`, `DELETE /api/v1/users/me/avatar`. Migration `AddUserAvatar`.
- `POST /api/v1/users/invite` — IT-admin only, creates an account with an explicit single role (Governance → User Directory → Invite user; share the temp password securely).
- FE Profile page: avatar upload/remove, personal info, password change, sign-out-all-devices, activity overview.

### 5. Verify (what actually exists)

There is **no** `/api/v1/health` in this starter — a 404 there is expected. Verify with:

```bash
curl -i http://localhost:3006/api/v1          # hello from AppController
curl -i http://localhost:3006/swagger         # 301/HTML redirect, open in browser instead
curl -i -X POST http://localhost:3006/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"it-admin","password":"<from .env>"}'
curl -i http://localhost:5176
```

Open <http://localhost:3006/swagger> and <http://localhost:5176> in a browser. If a route 404s, inspect source instead of guessing:

```bash
rg "setGlobalPrefix|SwaggerModule.setup|Controller\(" src
```

## Returning contributors

```bash
git pull --ff-only
docker compose up -d
docker compose exec app npm run migration:run
docker compose exec app npm run cli:dev   # safe to re-run after pulls
```

After changing `arisekms-fe/.env`: `docker compose restart frontend`.

## Branch switching and resets

```bash
# new work
git checkout master && git pull --ff-only
git checkout -b {feat,fix,docs,style,refactor,perf,test,build,ci,chore}/<issue>-one-liner
docker compose exec app npm run migration:run

# schema changed on this branch?
npm run migration:generate --name=AddFoo   # review file, then commit it
docker compose exec app npm run migration:run
docker compose exec app npm run migration:revert   # undo last, dev only

# nuke everything (deletes PG data + node_modules volumes)
docker compose down -v
```

Never edit an applied/shared migration — add a new one. Never run `down -v` without a backup.

## Application configuration

### CORS

`src/main.ts` allows only the KMS frontend (dev baseline):

```typescript
app.enableCors({
  origin: ['http://localhost:5176', 'http://127.0.0.1:5176'],
  credentials: true,
});
```

### Frontend API layer

All calls go through `arisekms-fe/src/api/client.js` (baseURL from `VITE_API_URL`, Bearer interceptor, single-flight 401 → `POST /auth/refresh-token`). Never scatter `fetch`/`axios` in pages. `shortcut: localStorage tokens are dev-only; HttpOnly refresh cookie + revocation list is the prod upgrade.`

### Adminer

<http://localhost:8086> — System `PostgreSQL`, Server `pgsqldb`, credentials from `.env`. Use `pgsqldb`, not `localhost`, inside Compose.

## Authentication

- `POST /api/v1/auth/register` — create user (forced `ARISE_MEMBER`, active)
- `POST /api/v1/auth/login` — `{username, password}` → `{accessToken, refreshToken}`
- `POST /api/v1/auth/refresh-token` — `{refreshToken}` → new pair
- `PATCH /api/v1/users/me` — own name/email/gender + password change (bumps `tokenVersion`, signs out all devices)
- `POST /api/v1/users/me/sessions/revoke` — sign out all devices
- `POST /api/v1/users/me/avatar` / `GET /api/v1/users/me/avatar/file` / `DELETE /api/v1/users/me/avatar` — own avatar (jpg/png)
- `POST /api/v1/users/invite` — IT-admin only, create account with explicit role
- Knowledge: `POST /api/v1/knowledge` (member → `submitted`, staff → `approved`), `PATCH /api/v1/knowledge/:id` (author-pending, optional file), `POST /api/v1/knowledge/:id/review` (staff), `GET /api/v1/knowledge/:id/history` (author/reviewer), `DELETE /api/v1/knowledge/:id` (author-pending)

Guards: `LocalAuthGuard` (login), `JwtAuthGuard` (routes), `JwtRefreshGuard` (refresh).

## Daily commands

| Task | Command |
| --- | --- |
| Config check | `docker compose config` |
| Start / rebuild | `docker compose up -d` / `docker compose up --build -d` |
| Status / logs | `docker compose ps` / `docker compose logs -f app frontend` |
| Shell in API | `docker compose exec app sh` |
| Migrate / revert | `docker compose exec app npm run migration:run` / `... migration:revert` |
| Test / lint / build (BE) | `docker compose exec app npm test` / `npm run lint` / `npm run build` |
| Build (FE) | `docker compose exec frontend npm run build` |
| Audit (BE) | `docker compose exec app npm audit --omit=dev --audit-level=moderate` |
| Stop (keep data) | `docker compose down` |

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `GET /api/v1/health` 404 | Expected — no health controller yet; verify with `GET /api/v1` + `/swagger` |
| `Cannot GET /` | Expected — global prefix is `/api/v1`; `/` is outside the app |
| React can't reach API | Check `VITE_API_URL`, CORS `5176`, port `3006`, `docker compose restart frontend` |
| PG connect fail | Inside Compose use `DB_HOST=pgsqldb`; compare `DB_*` in `.env` vs compose |
| `relation does not exist` | You switched branches — run `migration:run` |
| Compose YAML error | `docker compose config`; spaces only, no tabs |
| Files owned by root | Recreate with `-u "$(id -u):$(id -g)"`; fix only the affected path |
| Port in use | `ss -ltnp \| grep -E '3006\|5176\|5436\|8086'`; override that var in `.env` |
| Hot reload dead | Repo must be under `/home/...`, not `/mnt/c/...` |

```bash
docker compose logs --tail=200 app
docker compose exec pgsqldb pg_isready -U "$DB_USER" -d "$DB_NAME"
```

## Security baseline

Server-enforced tenant scope + cross-tenant denial tests; validation pipes on all input; no secrets/tokens/PII in logs; rate-limit auth when abuse-prone endpoints land; validated uploads + private storage when files land; encrypted backups before prod data; `npm audit` clean or exception recorded. Never commit `.env`, keys, or tokens — pre-commit check is `git status` + `git diff --cached --stat`.

## Working with AI coding agents

```text
Read AGENTS.md and README.md first.
Implement: <feature>
Acceptance criteria:
- Given <context>, when <action>, then <result>.
Inspect existing patterns. Add migrations + tests. Report checks run.
```

## License

MIT — see `LICENSE.md`. Retain upstream starter notices.
