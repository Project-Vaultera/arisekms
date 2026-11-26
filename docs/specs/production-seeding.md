# Production-safe seeding

| | |
| --- | --- |
| Status | Accepted — implemented |
| Owners | `src/shared/seeds/seeding-gate.ts`, `src/seed-roles.ts`, `src/seed-demo.ts` |
| Related | `docs/deployment.md`, `docs/adr/0001-staging-environment-and-full-seeding.md` |

## Problem

The repository has two seeders and neither can run on the production host.

- `npm run seed:roles` and `npm run seed:demo` are `ts-node` commands.
  `ts-node` and `tsconfig-paths` are devDependencies, and `Dockerfile.prod`
  runs `npm prune --omit=dev`. The binaries are already compiled into the image
  (`dist/src/seed-*.js`) — only the scripts were missing.
- `seed:demo` hard-refuses `APP_ENV=production`, so testers cannot be given a
  populated deployment.
- `seed:roles` has **no** production guard and would create four accounts on
  whichever environment it runs against.
- Both hardcode a password (`Arise@2026`, `DemoPass123!`) that is also committed
  to this repository, and both print it into container logs.

The user outcome: seed the live deployment for testers without losing the
refusals that protect it, and without planting a public password.

## Users and permissions

| Actor | Runs | Sees |
| --- | --- | --- |
| Vaultera operator (SSH, `docker compose exec`) | every seeder | container stdout |
| Anonymous visitor | nothing | testers share seeded planner-password below |

Testers get demo member accounts only. `it-admin` and the POV staff accounts are
**not** seeded on production, so no admin credential is handed out.

> **Revised.** `APP_ENV=staging` is now a supported value and `seed:all:prod`
> seeds every account — admin, the four POV staff accounts and the 71 demo
> members — with no flags. That reverses both decisions above, deliberately;
> see the ADR. Production still keeps the gate described below.

## Scope

In:

- compiled `seed:roles:prod` / `seed:demo:prod` scripts;
- a shared production gate: two opt-ins, password from env;
- `SEED_ROLES_ONLY` to narrow which POV accounts a run touches;
- unit tests: of the gate, warnings in `docs/deployment.md`, and README notes.

Out:

- a developer role;
- making seeders idempotent where they are not (see *Known gaps*);
- an in-app seeding endpoint or an admin UI trigger.

## Policy

`APP_ENV=production` requires **both**:

1. `SEED_ALLOW_PRODUCTION=1` — deliberate intent (`true`/`yes` are rejected);
2. the seeder's own password variable, at least 12 characters:

   | Seeder | Password variable | Dev default |
   | --- | --- | --- |
   | `seed:roles` | `SEED_ROLES_PASSWORD` | `Arise@2026` |
   | `seed:demo` | `SEED_DEMO_PASSWORD` | `DemoPass123!` |

The development default is never used in production: a missing password is a
refusal, not a silent fallback. Outside production nothing changes — the
defaults still apply, so `npm run seed:demo` in development behaves exactly as
before.

`staging` is outside the gate entirely: `seed:all:prod` there runs with no flag
and falls back to `Arise@2026` / `DemoPass123!`. That is the point of the
environment — one command, no ceremony — and the cost is that a staging box is
still publicly reachable with committed passwords.

Both variables and the flag live in `.env.production`, which is already mode
600, passed to the stack with `env_file`, and excluded from the image and from
git. They are therefore present inside the container:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml \
  exec app npm run seed:demo:prod
```

Password sources are reported, never the password: `Password source:
SEED_DEMO_PASSWORD` versus `development default`.

## Contract

| Command | Failure | Exit |
| --- | --- | --- |
| `seed:roles` / `seed:demo` (dev, via `ts-node`) | unchanged | non-zero on DB errors |
| `seed:all:prod` in staging | none — seeds everything with dev defaults | 0 |
| `seed:all:prod` in production, no flag | same refusal as the individual seeders | 1 |
| `*:prod` in production, no flag | `refuses to run with APP_ENV=production` + both remedies | 1, no DB connection |
| `*:prod` in production, flag, no password | names the variable | 1 |
| `*:prod` in production, password < 12 | names the variable and minimum | 1 |
| `SEED_ROLES_ONLY` with an unknown name | lists the unknown names and the known ones | 1 |

Refusals happen **before** `NestFactory` opens a DB connection, so none of them
can half-apply a seed.

## Data model

None. No entity, column, or migration — these are scripts.

## Security and tenancy

- No new secret is committed; the committed defaults stay dev-only.
- The password is no longer echoed into logs.
- `SEED_ROLES_ONLY` limits a production run to the accounts a tester needs.
- Seeded rows are ordinary rows, created through the real services, so they
  obey the same validation, role and audit paths as UI-created data.

## UI states

Not applicable; CLI only. `base` output is one line per created or reset account
plus a summary, without the password.

## Acceptance criteria

- `APP_ENV=production npm run seed:demo:prod` → clear refusal, exit 1.
- …with `SEED_ALLOW_PRODUCTION=1` and no `SEED_DEMO_PASSWORD` → names the variable.
- …with a valid password → seeded.
- The same three cases for `seed:roles:prod`.
- `npm run seed:demo` in development → identical behaviour and defaults.
- `SEED_ROLES_ONLY=arisemember,ariseanalyst npm run seed:roles:prod` creates or
  resets exactly those two.
- Gate unit tests pass; `npm run build` succeeds; `npm test` passes.
- Demo members are seeded on the live deployment and can log in.

## Test plan

`src/shared/seeds/seeding-gate.spec.ts` covers the matrix: allowed outside
production; refused without the flag; flag values other than `1` rejected;
missing and short passwords rejected; password precedence and no production
fallback; `parseSeedOnly` trimming, lowering and de-duplication; refusal
reporting and exit code; unrelated errors passing straight through.

Manual, on the host: the three refusal cases per seeder against the real image,
then the real run and a login as one seeded account.

## Rollout and rollback

Rollout: deploy, append the two variables and the flag to `.env.production`,
recreate `app`, run `seed:demo:prod`, spot-check one login.

Rollback: delete the seeded rows (`DELETE FROM users WHERE username LIKE
'demo.member.%'` cascades their rows), remove the variables, `up -d
--force-recreate`. The scripts themselves need no revert.

## Idempotency contract

`seed:demo` converges: users by username, companies by name, activities by
title, tickets by subject. Reports, certificates and knowledge are written once
and gated as a block (see *Content marker* below).

**Content marker.** The first demo company doubles as the marker: its join date
is the only field the companies block does not backfill, and it is stamped `now`
in a `finally` after all three once-only families are written. A stale date
means the last attempt did not finish, so the content is retried; a finished run
stamps today and the next run skips. The stamp must be the *only* writer of that
column — the planner never yields today (`daysAgoToDate` floors at 5 days), so
backfilling it from the planner leaves the gate permanently open and every run
duplicates the content.

Memberships are deliberately not consulted when resolving an author's company:
most approved demo companies are approved by this seed and are still `draft`
during a run, and a member may sit in two companies.

## Known gaps

- **Changing a `SEED_*_PASSWORD` after a first run needs the rows deleted
  first.** `seed:roles` always resets its accounts, and `seed:demo` creates
  users only once.
- Reports, certificates and knowledge are keyed off the marker as a block, not
  per row: an interrupted `seedContent` can leave that family partially seeded
  and the warning-free run that follows only completes the remainder.
- Passwords travel through `env_file`, so `docker compose config` prints them
  (as it already does `DB_PASS`).