# Production deployment

Single-VPS deployment: Docker Compose runs the NestJS API, PostgreSQL, and a
Caddy edge container that serves the built React SPA, reverse-proxies the API,
and obtains/renews TLS certificates automatically.

```text
Internet ──80/443──▶ Caddy (web)
                      ├─ /api/*, /swagger*  ──▶ app:3006 (NestJS)
                      └─ everything else    ──▶ /srv (Vite build, SPA fallback)
                                                app ──▶ pgsqldb:5432
```

Only Caddy publishes host ports. PostgreSQL and the API stay on the internal
Compose network.

## Files

| File | Purpose |
| --- | --- |
| `docker-compose.prod.yml` | Production stack: `web` (Caddy), `app`, `pgsqldb` |
| `Dockerfile.prod` | Multi-stage backend image; prunes dev deps, runs as `node`, has a healthcheck |
| `docker-entrypoint.sh` | Applies pending migrations, then starts the API |
| `Dockerfile.web` | Builds the SPA, then serves it from Caddy with the API proxy config |
| `deploy/Caddyfile` | TLS, SPA fallback, `/api` proxy, security headers |
| `.env.production.template` | Every variable the stack needs; copy to `.env.production` |
| `deploy/deploy.sh` | Pull + start + wait for health (migrations run at API startup) |
| `deploy/backup.sh` | `pg_dump` with 14-day retention |
| `.github/workflows/deploy.yml` | Build/push images to GHCR, then roll out over SSH |

## Prerequisites

- A Linux VPS with Docker Engine and Docker Compose v2.17+ (needed for
  `up --wait`).
- A **static** public IP. Point DNS at the stable address, not at a
  provider-assigned ephemeral one that survives only until the next reboot.
- DNS: an `A` (and `AAAA` if applicable) record for `DOMAIN` pointing at the VPS.
  Behind Cloudflare, use **DNS only** (grey cloud) so Caddy terminates TLS and
  issues its own certificate.
- Firewall/security group allowing inbound `22`, `80`, `443` (TCP) and `443/UDP`
  (HTTP/3). Do **not** expose `5432` or `3006`.
- The repository checked out on the server, e.g. `/opt/arisekms`.

## Provisioned host (this deployment)

The production host is already bootstrapped. This records what exists, so it can
be handed over or rebuilt.

| Item | Value |
| --- | --- |
| Provider / region | AWS Lightsail, `ap-southeast-1`, 0.5 GB bundle |
| Public IPv4 | `47.131.221.85` — attached **static** IP (was ephemeral `13.212.91.118`) |
| Public IPv6 | `2406:da18:7bf:6200:a719:77d8:2206:f9d3` |
| OS | Ubuntu 24.04.5 LTS |
| Size | 2 vCPU, 412 MiB RAM, 19 GB disk |
| SSH | `ssh ubuntu@47.131.221.85` — key-based, passwordless `sudo` |
| Checkout | `/opt/arisekms` |
| Domain | `arisekms.vaulteralabs.com` |
| ACME email | `info@vaulteralabs.com` |

Already applied:

- 2 GB swap at `/swapfile`, persisted in `/etc/fstab`.
- UFW enabled, allowing inbound `22`, `80`, `443` TCP and `443` UDP only.
- `ubuntu` added to the `docker` group, so deploys and backups do not need `sudo`.
  **This one bites:** until the group is applied, `docker compose pull` fails with
  `permission denied ... unix:///var/run/docker.sock`, and the SSH deploy job
  fails even though the app images built fine.
- Repository cloned to `/opt/arisekms` (HTTPS, read-only, no credentials on the
  host) on branch `main`.
- `.env.production` written in `/opt/arisekms`, mode `600`, with freshly
  generated `DB_PASS`, JWT key pair, and `DEFAULT_ADMIN_USER_PASSWORD`.
- A dedicated ed25519 deploy keypair for CI, stored in the repository secrets
  below — the operator's own SSH key is not used by the workflow.
- Repository secrets set: `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`,
  `SSH_KNOWN_HOSTS`, `DEPLOY_PATH`.
- Daily database backup in `ubuntu`'s crontab at 03:15 UTC, writing
  `/opt/arisekms/backups` and logging to `/var/log/arisekms-backup.log`.
- Docker log rotation at the daemon level (`/etc/docker/daemon.json`,
  `json-file`, 10 MB × 3). Caddy logs every request to stdout, so unbounded
  `json-file` growth would eventually fill a 19 GB disk. The setting applies to
  **newly created** containers, so apply it and then recreate the stack:
  `docker compose ... up -d --force-recreate`.
- Initial admin user created: `it-admin`, password from
  `DEFAULT_ADMIN_USER_PASSWORD` in `.env.production`. Change it after first login
  and store it in the team password manager — it is not recorded anywhere else.
  The CLI seeds `it-admin@example.com` as the email; replace it via `PATCH
  /users/me` after the first login.

The first rollout (merged PR #15) verified: all 16 migrations applied at startup,
`app`, `pgsqldb`, and `web` reached `healthy`, `/api/v1/health` returned `200`,
and `deploy/backup.sh` produced a restorable `pg_dump` on the first run.

Attaching the static IP reassigned the public address (`13.212.91.118` →
`47.131.221.85`) but the host keys were unchanged, confirming the same instance.
After such a change, update `SSH_HOST` **and** regenerate `SSH_KNOWN_HOSTS` —
the secret is keyed by address, so a stale value fails the deploy.

TLS is the last step and depends on the DNS record below. Until it exists, Caddy
logs `DNS problem: NXDOMAIN looking up A for <domain>`. It does not always retry
promptly: the Let's Encrypt order fails fast, then the ZeroSSL fallback can sit
in a pending challenge for hours. **Restart `web` after the record resolves** to
force a fresh order instead of waiting out the backoff.

### Still required to go live

1. ~~**Lightsail → Networking** — `HTTPS`/443 on both the IPv4 and IPv6
   firewalls.~~ Done; 443 answers from the internet.
2. **Cloudflare → DNS** — `A arisekms` → `47.131.221.85`, proxy status
   **DNS only** (grey cloud). Do not add an `AAAA` record until IPv6 is proven;
   never publish an address the firewall does not allow.
3. **Restart the edge, then verify**

   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml restart web
   curl -fsS https://arisekms.vaulteralabs.com/api/v1/health   # {"status":"ok"}
   curl -sSI https://arisekms.vaulteralabs.com | head -1        # HTTP/2 200
   docker compose --env-file .env.production -f docker-compose.prod.yml \
     logs web --tail 20                                          # certificate obtained
   ```

### Lightsail specifics

Lightsail does not use EC2 security groups. Its **IPv4 and IPv6 firewalls are
separate** and live in the Lightsail console (Instance → Networking) or in
`aws lightsail put-instance-public-ports`. Allow `22`, `80`, `443` TCP and `443`
UDP on both.

A port missing from that firewall times out from the internet; a port that is
allowed but has nothing listening is refused. That difference is the quickest way
to tell a firewall gap from a stopped service (`nc -vz <host> 443`).

Lightsail public IPs are dynamic until a static IP is attached. Attach one
**before** pointing DNS at the host, otherwise a stop/start breaks both DNS and
TLS.

### Memory

412 MiB is below comfortable for PostgreSQL 16, Node, and Caddy on one box. Swap
prevents OOM kills, but resize to at least 2 GB before this carries real traffic.
If you must stay small: leave `shared_buffers` at the default, keep
`max_connections` low, and never build images on the host — `npm ci` plus a Vite
build needs more headroom than the box has, so let CI build and push instead.

## One-time server setup

```bash
sudo apt update && sudo apt install -y ca-certificates curl git openssl
# Install Docker Engine + compose plugin from docs.docker.com, then:
sudo usermod -aG docker "$USER"   # log out/in for the group to apply

sudo mkdir -p /opt/arisekms && sudo chown "$USER":"$USER" /opt/arisekms
git clone git@github.com:Project-Vaultera/arisekms.git /opt/arisekms
cd /opt/arisekms

cp .env.production.template .env.production
chmod 600 .env.production
```

### Generate JWT keys

Either use the repo helper (needs Docker):

```bash
./scripts/generate-jwt-keys
```

or plain OpenSSL:

```bash
openssl genrsa -out /tmp/jwt.key 2048
openssl rsa -in /tmp/jwt.key -pubout -out /tmp/jwt.key.pub
printf 'JWT_PRIVATE_KEY_BASE64=%s\n' "$(base64 -w0 /tmp/jwt.key)"
printf 'JWT_PUBLIC_KEY_BASE64=%s\n' "$(base64 -w0 /tmp/jwt.key.pub)"
rm -f /tmp/jwt.key /tmp/jwt.key.pub
```

Paste both values into `.env.production`, and set `DOMAIN`, `ACME_EMAIL`,
`DB_PASS`, and `DEFAULT_ADMIN_USER_PASSWORD`. Generate secrets with
`openssl rand -hex 32` (hex avoids `$`/`#` parsing problems in env files).

`CORS_ORIGINS` must match the public origin, including `www` if you use it.

### Make the packages pullable

CI pushes to GHCR (`ghcr.io/project-vaultera/arisekms-api|web`). The server must
be able to pull them:

```bash
echo "<PAT with read:packages>" | docker login ghcr.io -u <github-user> --password-stdin
```

The deploy workflow logs in with its own `GITHUB_TOKEN` for the pull. A one-time
login on the server is the safer option; if you use it, delete the `docker login`
line from `.github/workflows/deploy.yml`.

## First deploy

If CI has already pushed images:

```bash
cd /opt/arisekms
./deploy/deploy.sh
```

Before the first CI run, build locally instead:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml \
  up -d --build --remove-orphans --wait --wait-timeout 300
```

The API image entrypoint (`docker-entrypoint.sh`) applies every pending TypeORM
migration before it starts serving. If a migration fails, the container exits
instead of serving against a stale schema.

Create the initial IT admin (idempotent):

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml \
  exec app npm run cli:prod
```

Log in at `https://<DOMAIN>` as `it-admin` with `DEFAULT_ADMIN_USER_PASSWORD`,
then change the password. Do **not** run `seed:roles` or `seed:demo` in
production (`seed:demo` refuses to run when `APP_ENV=production`).

## CI/CD

`.github/workflows/deploy.yml` runs on every push to `main` (and manually via
**Actions → deploy → Run workflow**):

1. Builds and pushes `ghcr.io/project-vaultera/arisekms-api:{latest,<sha>}`.
2. Builds and pushes `ghcr.io/project-vaultera/arisekms-web:{latest,<sha>}`.
3. SSHs to the VPS, pulls, restarts the stack (migrations run at API startup),
   and waits for health.

Configure these repository/environment secrets:

| Secret | Required | Notes |
| --- | --- | --- |
| `SSH_HOST` | yes | VPS hostname or IP |
| `SSH_USER` | yes | User allowed to run `docker` |
| `SSH_PRIVATE_KEY` | yes | Private key for that user |
| `SSH_KNOWN_HOSTS` | yes | Output of `ssh-keyscan -H <host>` (pins the host key) |
| `SSH_PORT` | no | Defaults to `22` |
| `DEPLOY_PATH` | no | Defaults to `/opt/arisekms` |

The job uses the `production` GitHub Environment, so you can add required
reviewers or a wait timer under **Settings → Environments**.

Because deploy runs on every push to `main`, protect `main` with branch
protection requiring the `build` and `tests` workflows to pass, so only tested
commits ship.

The remote step runs `git fetch` + `git reset --hard origin/main` in
`DEPLOY_PATH` before pulling, so changes to the compose file, Caddyfile, or
scripts also reach the server. `.env.production` is untracked and preserved.
For manual deploys, run `git pull --ff-only` yourself first.

## Operations

```bash
cd /opt/arisekms
C="docker compose --env-file .env.production -f docker-compose.prod.yml"

$C ps
$C logs -f app          # API logs (stdout)
$C logs -f web          # Caddy / TLS logs
$C logs app             # includes the migration run at startup
curl -fsS https://<DOMAIN>/api/v1/health   # {"status":"ok"}
```

### Run migrations manually

```bash
$C exec app npm run migration:run:prod
```

Migrations are idempotent: TypeORM records applied migrations and skips them.

### Backups

```bash
./deploy/backup.sh
```

Schedule it (daily 03:15 UTC):

```cron
15 3 * * * /opt/arisekms/deploy/backup.sh >> /var/log/arisekms-backup.log 2>&1
```

Copy dumps off the VPS (object storage or `rsync` to another host). A dump on the
same disk does not survive a lost server.

Restore (destructive — stop the API first):

```bash
set -a; . ./.env.production; set +a
$C stop app
$C exec -T pgsqldb pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists \
  < backups/arisekms-YYYYMMDDTHHMMSSZ.dump
$C start app
```

### Rollback

Images are tagged with the commit SHA. Pin the previous pair in
`.env.production` and redeploy:

```dotenv
API_IMAGE=ghcr.io/project-vaultera/arisekms-api:<previous-sha>
WEB_IMAGE=ghcr.io/project-vaultera/arisekms-web:<previous-sha>
```

```bash
./deploy/deploy.sh
```

If the new release added a migration, reverting the image does **not** revert
the schema. Review the migration before running `npm run migration:revert:prod`,
or restore a dump.

## Security checklist

- [ ] `.env.production` is `chmod 600`, owned by the deploy user, never committed.
- [ ] `DB_PASS`, `DEFAULT_ADMIN_USER_PASSWORD`, and both JWT keys are freshly generated.
- [ ] Firewall exposes only `22`, `80`, `443` (TCP) and `443/UDP`.
- [ ] DNS resolves to this VPS before the first start (Caddy needs it for ACME).
- [ ] HTTPS redirect works; `http://` requests return `308` to `https://`.
- [ ] Remove the `/swagger*` block from `deploy/Caddyfile` if the API docs should not be public.
- [ ] Backups run on a schedule and copies leave the VPS.
- [ ] Review `SECURITY.md` before real member data lands.

Known gaps (tracked in `AGENTS.md` / `SECURITY.md`):

- Auth endpoints are not rate-limited yet.
- Uploads are on a local Docker volume, not private object storage.
- Refresh tokens are stateless (no server-side revocation list); the upgrade is
  HttpOnly refresh cookies + a revocation list.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Caddy cannot get a certificate | DNS points at the VPS; ports 80/443 open; `docker compose logs web` |
| `502` from Caddy | `docker compose logs app`; `curl` the health endpoint inside the network |
| Stack will not start | `docker compose logs app`; a failed startup migration exits the container by design |
| `env file .env.production not found` | Run commands from `/opt/arisekms` with `--env-file .env.production` |
| `npm ci` fails in a build | `package.json` and `package-lock.json` are out of sync |
| Uploads fail with `EACCES` | The `app_uploads` volume must be writable by UID `node` (the image creates it owned by `node`) |
