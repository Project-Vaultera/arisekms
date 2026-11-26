# Arise KMS

> Open-source knowledge management system (placeholder scope).

NestJS REST API + React/Vite + PostgreSQL in Docker Compose, optimized for Ubuntu on WSL2. AI agents must read `AGENTS.md` before editing.

## New contributor

Goal: from a clean machine to a signed-in app, with the commands below and
nothing else. Defaults are shown, so an omitted optional value is never a
surprise.

**Prerequisites, done by you once** (the commands cannot install these):

- Git.
- Docker Engine with the Compose plugin. `docker compose version` must print
  `v2.` or later. On Windows use WSL2 Ubuntu with Docker Desktop's WSL
  integration on, and keep the clone under `/home/...`, not `/mnt/c/...`.

The stack publishes its own host ports, so no `.env` editing is needed to start.

```bash
git clone https://github.com/Project-Vaultera/arisekms.git
cd arisekms
cp .env.template .env
node scripts/init-env.mjs .env
docker compose up -d --wait
docker compose exec app npm run migration:run
docker compose exec app npm run seed:dev
curl -i http://localhost:3006/api/v1/health
open http://localhost:5176/login          # macOS; xdg-open on Linux
```

Sign in as `dev.secretariat` with the value of `DEFAULT_ADMIN_USER_PASSWORD`
in `.env` — `Arise@2026` unless you changed it. The account lands on
**`/approvals`**, the first screen with content on it.

To confirm the whole chain from the terminal instead of a browser, this must
print `200` (it mints a token and reads `/reports?limit=1`, the call that page
makes):

```bash
TOKEN=$(curl -s -X POST http://localhost:3006/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"dev.secretariat\",\"password\":\"$(sed -n 's/^DEFAULT_ADMIN_USER_PASSWORD=//p' .env)\"}" \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.accessToken')
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3006/api/v1/reports?limit=1 \
  -H "Authorization: Bearer $TOKEN"
```

`node scripts/init-env.mjs .env` fills the three values a template cannot carry:
both `JWT_*_BASE64` keys and `DB_PASS`. Nothing is sent anywhere and re-running
is safe.

`--wait` returns once every container reports healthy, so the next command
cannot race the database.

`seed:dev` creates one secretariat account and is safe to run twice; the
second run leaves it alone. `npm run seed:all` adds 71 demo members and demo
content on top if you want a populated app.

## Returning contributor

```bash
git pull --ff-only
docker compose up -d --wait
docker compose exec app npm run migration:run
curl -s http://localhost:3006/api/v1/health   # {"status":"ok"}
```

If `init-env` is ever re-run, it keeps an existing `DB_PASS`: a Postgres volume
only keeps the password it was created with.

## Table of contents

- [New contributor](#new-contributor)
- [Returning contributor](#returning-contributor)
- [Prerequisites](#prerequisites)
- [Product scope](#product-scope)
- [Technology stack](#technology-stack)
- [Repository structure](#repository-structure)
- [Local services](#local-services)
- [First-run reference](#first-run-reference)
- [Production deployment](#production-deployment)
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
├── deploy/              # Caddyfile, deploy.sh, backup.sh (production)
├── docs/
├── docker-compose.yml          # local dev stack
├── docker-compose.prod.yml     # production stack (Caddy + API + Postgres)
├── Dockerfile.prod             # production API image
├── Dockerfile.web              # SPA build + Caddy edge image
├── .env.template
├── .env.production.template
├── AGENTS.md
└── README.md
```

## Local services

`docker compose up` starts all of these. Check one with the command in the last
column; URLs are the browser-facing ones and are `curl`-able from the host.

| Process | Compose name | URL | "It is up" is |
| --- | --- | --- | --- |
| Frontend (React dev server) | `frontend` | <http://localhost:5176> | `curl -sI http://localhost:5176/login` → `200` |
| API | `app` | <http://localhost:3006/api/v1> | `curl -s http://localhost:3006/api/v1/health` → `{"status":"ok"}` |
| API docs (development only) | `app` | <http://localhost:3006/api/v1/swagger> | opens in a browser; `404` in production |
| Database | `pgsqldb` | `localhost:5436` from the host, `pgsqldb:5432` in Compose | `docker compose ps pgsqldb` → `healthy` |
| Mail catcher (inbox) | `mailpit` | <http://localhost:8025> | `curl -s -o /dev/null -w '%{http_code}' http://localhost:8025` → `200` |
| DB browser | `adminer` | <http://localhost:8086> | opens in a browser |

Host ports are overridable in `.env` (`APP_PORT`, `FRONTEND_PORT`,
`PGSQL_HOST_PORT`, `ADMINER_PORT`, `MAILPIT_UI_PORT`, `MAILPIT_SMTP_PORT`);
change `APP_PUBLIC_URL` too if you move the frontend, or mailed links break.

Reset and invite mail never leaves the machine: `MAIL_TRANSPORT=smtp` points at
`mailpit` and every message is readable at <http://localhost:8025>. Set
`MAIL_TRANSPORT=log` to get the link in `docker compose logs -f app` instead.

## Prerequisites

**You install these; the commands in this README do not.**

- Git.
- Docker with the Compose plugin (`docker compose version` → `v2.` or later).
- Windows only: WSL2 Ubuntu and Docker Desktop with WSL integration for it. Keep
  the clone under `/home/...`; bind mounts under `/mnt/c/...` are very slow.

```bash
docker compose version && git --version && docker info   # docker info must not error
```

Docker Desktop or the daemon must be running, or `up` fails with "cannot connect
to the Docker daemon".

## Prerequisites

Windows 10/11, WSL2 Ubuntu, Docker Desktop with WSL Integration → Ubuntu, Git inside Ubuntu. Keep the repo under `/home/...`, not `/mnt/c/...`.

```bash
docker --version && docker compose version && git --version && docker info
wsl --list --verbose   # run in PowerShell, Ubuntu must show VERSION 2
```

## First-run reference

### 1. Environment

The quick start above is the whole thing. What each step means:

- `.env.template` lists every variable the API reads on boot, commented with
  what it is and which process reads it.
- `scripts/init-env.mjs .env` replaces the empty `JWT_*_BASE64` and `DB_PASS`
  with generated values. It keeps an existing `DB_PASS`, because a Postgres
  volume keeps the password it was created with.
- Nothing in `.env` is a secret worth protecting in development.

Never commit `.env`. To change a host port, edit `.env`; to change the frontend
port, update `APP_PUBLIC_URL` to match.

### 2. Start

```bash
docker compose up -d --wait
```

`--wait` blocks until every healthcheck passes and exits non-zero if one never
does, so a broken boot is a failed command rather than a silent background
container. Watch it with `docker compose logs -f app`; a validation failure
names the variable to fix.

### 3. Migrate and seed

```bash
docker compose exec app npm run migration:run
docker compose exec app npm run seed:dev        # dev.secretariat / DEFAULT_ADMIN_USER_PASSWORD
docker compose exec app npm run cli:dev         # it-admin, the IT admin account (same password)
```

Both seeders are safe to re-run: `seed:dev` skips an existing account,
`cli:dev` creates `it-admin` only if it is missing. Neither resets a password
you changed — remove the row to reset it.

`dev.secretariat` signs in to `/approvals`. `it-admin` signs in to the
dashboard and owns Governance (user directory, audit logs, invites).

### 4. Roles and POV accounts (dev only)

Single role per user (`CreateUserInput.roles` / `UpdateUserInput.roles` accept exactly one):

| Role | Powers |
|---|---|
| `ARISE_IT_ADMIN` | Manage everything; Governance → User Directory (accounts, role assignment, disable) + Support Monitoring + Audit Logs |
| `ARISE_SECRETARIAT` | Member approvals + full Manage on content; Member Directory stays here |
| `ARISE_MEMBER` | Author-scoped CRUD on content; apply for membership; knowledge: upload lands `submitted`, edit/delete own pending, read approved + own |
| `ARISE_DATA_ANALYST` | List/Read on approved content (knowledge: approved-only) + reports/summary/performance/activities/certificates/tickets; no users/companies/membership-analytics, no writes |

```bash
docker compose exec app npm run seed:roles   # idempotent; resets these passwords on every run
```

| Username | Role | Password |
|---|---|---|
| `ariseitadmin` | Arise IT Admin | `Arise@2026` |
| `arisesecretariat` | Arise Secretariat | `Arise@2026` |
| `arisemember` | Arise Member | `Arise@2026` |
| `ariseanalyst` | Arise Data Analyst | `Arise@2026` |

On production run `npm run seed:roles:prod` instead. It needs
`SEED_ALLOW_PRODUCTION=1` and `SEED_ROLES_PASSWORD` (>= 12 chars), and
`SEED_ROLES_ONLY=arisemember,ariseanalyst` narrows the run to those accounts —
see [`docs/specs/production-seeding.md`](docs/specs/production-seeding.md).

Demo content accounts (from `seed:demo`, §4): `demo.member.1`–`71`, password `DemoPass123!` (eleven inactive). Default admin: `it-admin` / `DEFAULT_ADMIN_USER_PASSWORD`.

### 4. Seed demo dashboard data (optional)

```bash
docker compose exec app npm run seed:demo
```

Creates 71 demo members (`demo.member.1`–`71`, password `DemoPass123!`, eleven inactive), 70 demo companies, ~40 reports across the last 26 weeks, ~30 certificates, and 12 knowledge docs with backdated timestamps so the dashboard charts, timeline, and recent activity have content. Staff see everything; members only see their own company's submissions (server-enforced). Re-running converges: accounts, companies, activities and tickets are matched by username/name/title/subject, and the once-only content is skipped after a completed run — an interrupted run retries it.

On production use `npm run seed:demo:prod` with `SEED_ALLOW_PRODUCTION=1` and
`SEED_DEMO_PASSWORD`; the development password is never used on a live
deployment. To wipe (orphan files under `./uploads` are harmless in dev):

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
- `POST /api/v1/auth/invite` — IT-admin only, creates an account with an explicit single role and mails an accept link (Governance → User Directory → Invite user). Omitting `password` requires the invitee to set one from the link; `POST /api/v1/auth/accept-invite` completes it.
- `POST /api/v1/auth/forgot-password` — always `202`; mails a reset link (lands in Mailpit). `POST /api/v1/auth/reset-password` sets it. Both sign out existing sessions.
- FE Profile page: avatar upload/remove, personal info, password change, sign-out-all-devices, activity overview.

### 5. Verify (what actually exists)

`GET /api/v1/health` returns `{"status":"ok"}` (also used by container healthchecks). Verify with:

```bash
curl -i http://localhost:3006/api/v1          # hello from AppController
curl -i http://localhost:3006/api/v1/health   # {"status":"ok"}
curl -i http://localhost:3006/api/v1/swagger   # development only, open in browser
curl -i -X POST http://localhost:3006/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"it-admin","password":"<from .env>"}'
curl -i http://localhost:5176
```

Open <http://localhost:3006/api/v1/swagger> and <http://localhost:5176> in a browser. If a route 404s, inspect source instead of guessing:

```bash
rg "setGlobalPrefix|SwaggerModule.setup|Controller\(" src
```

## Production deployment

Production runs on a single Linux VPS with Docker Compose + Caddy at
**https://arisekms.vaulteralabs.com**. Caddy serves the built React SPA,
reverse-proxies `/api/*` to NestJS on the same origin (no CORS), and manages
Let's Encrypt certificates. Only ports 80/443 are public; Postgres and the API
stay on the internal Docker network.

```bash
cp .env.production.template .env.production
chmod 600 .env.production
# fill in DOMAIN, ACME_EMAIL, DB_PASS, DEFAULT_ADMIN_USER_PASSWORD, JWT keys
./deploy/deploy.sh
```

For the very first deploy, before any image exists in GHCR, build locally:
`docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build`.

The API container entrypoint applies pending migrations before it starts
serving. Create the first admin once:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml \
  exec app npm run cli:prod
```

Full runbook (DNS, server setup, CI/CD secrets, backups, rollback, security
checklist, troubleshooting): [`docs/deployment.md`](docs/deployment.md).

CI/CD: `.github/workflows/deploy.yml` builds and pushes both images to GHCR on
every push to `main`, then pulls and restarts the stack over SSH.

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
- `POST /api/v1/auth/invite` — IT-admin only, create account with explicit role + mailed accept link
- `POST /api/v1/auth/accept-invite` — set a password from an invite link
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

Only failures encountered while setting this up, with how each was produced.

| Symptom | Cause | Fix |
| --- | --- | --- |
| `no configuration file provided` | Wrong working directory; the compose file is at the repo root | `cd` into the clone. `docker compose` reads from the current directory. |
| Boot error `Config validation error: APP_PUBLIC_URL must be an absolute http(s) URL` | `APP_PUBLIC_URL` empty or not a URL; reset links would go relative and 404 | Set `APP_PUBLIC_URL=http://localhost:5176` in `.env`, then `docker compose up -d app`. |
| Reset link in Mailpit reads `http:///reset-password?...` | The API container got no `APP_PUBLIC_URL`. An explicit `environment:` list used to drop it silently | Use the current `docker-compose.yml`; check `docker compose exec app sh -c 'echo $APP_PUBLIC_URL'`. |
| `bind: address already in use` | Another stack holds `3006`, `5176`, `5436`, `8086`, `8025` or `1026` | Change that port in `.env`. If you move the frontend, update `APP_PUBLIC_URL` to match. |
| `password authentication failed for user "root"` | `DB_PASS` changed while an existing volume kept the old one; a volume only keeps its creation password | Restore the old `DB_PASS`, or `docker compose down -v` (drops the dev database). |
| Sign-in stores a session but the page stays blank until a manual refresh | Stale or missing `VITE_API_URL`; Vite inlines it at serve time | `docker compose up -d --force-recreate frontend`, hard-reload. Check `docker compose exec frontend sh -c 'echo $VITE_API_URL'`. |
| Browser calls `http://app:3006/...` | The in-Compose host was used instead of the browser-facing one | `VITE_API_URL` must be `http://localhost:3006/api/v1`. |
| `seed:dev` fails validation on `DEFAULT_ADMIN_USER_PASSWORD` | The default was replaced with a weak value (needs upper, lower, digit, symbol, 12+) | Use `Arise@2026` or another strong value. |
| Everything is empty and endpoints return `[]` | Nothing seeded | `docker compose exec app npm run seed:dev` |
| `Cannot connect to the Docker daemon` | Docker Desktop or `dockerd` is not running | Start it, then `docker info` inside WSL. |

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
