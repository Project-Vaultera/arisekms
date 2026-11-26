# 0001 — A `staging` environment that seeds every account

| | |
| --- | --- |
| Status | Accepted |
| Date | 2026-11-26 |
| Supersedes in part | `docs/specs/production-seeding.md` (its "Out of scope" and "Testers get demo members only") |

## Context

The live deployment runs with `APP_ENV=production`, which is the only value that
makes seeding deliberate: `seed:roles:prod` and `seed:demo:prod` refuse unless
`SEED_ALLOW_PRODUCTION=1` and a per-seeder password are set.

That protected the deployment, but it left the tester set incomplete. Production
held one `ARISE_IT_ADMIN` (`it-admin`) and 71 `ARISE_MEMBER` accounts — no
`ARISE_SECRETARIAT`, no `ARISE_DATA_ANALYST`. Both restricted roles exist in the
app, so their boundaries (a secretariat that cannot create users, an analyst
that cannot write) had no account to exercise them against. The rules are
covered by unit tests, but not by anyone using the deployment.

Two smaller frictions:

- Seeding takes two commands, two password variables and a flag.
- The `seed:*` npm scripts use `ts-node`, a devDependency that `Dockerfile.prod`
  prunes, so the container can only run the `:prod` variants.

## Decision

1. **`staging` is a valid `APP_ENV`.** It is a publicly reachable
   tester-facing deployment, not a synonym for "unreachable".
2. **Seeding is unguarded in `staging`.** `seed:all:prod` runs with no flag and
   falls back to the committed development passwords. Production keeps its gate
   unchanged.
3. **One seeder seeds every account.** `seed:all` / `seed:all:prod` chains
   `seed:roles` then `seed:demo`: admin, four POV staff accounts, 71 demo
   members, and the demo content.
4. **The compiled scripts are the only ones a deployment uses.** `:prod`
   variants run `node dist/src/seed-*.js` and need no devDependency.

## Consequences

- Every role has an account, so the restricted-role boundaries are testable by
  a human on a live deployment.
- **A staging box carries committed passwords.** `Arise@2026` and
  `DemoPass123!` are in the repository. Anyone who can reach the deployment can
  log in as an analyst or secretariat. This is acceptable for demo data and
  unacceptable for real member data — which is why staging must not hold any.
- **Swagger stays off in staging.** `src/main.ts` gates the schema on
  `development` and `test` only, so relabelling a deployment as staging does not
  republish the endpoint map. Adding `staging` there would undo the fix for #19.
- **Production is unchanged.** `SEED_ALLOW_PRODUCTION=1` plus a ≥12-character
  password is still required, and the flag is still rejected as anything but
  `1`.
- `docker-compose.prod.yml` interpolates `APP_ENV` (`${APP_ENV:-production}`)
  instead of hardcoding it. A hardcoded value silently overrode
  `.env.production`, so the environment could not be changed from that file at
  all.
- Re-running `seed:all` resets the four POV passwords to the default. It does
  **not** reset the demo members: `seed:demo` only creates missing accounts.

## Alternatives considered

- **Keep production and pass the flags.** Rejected as the default because it
  keeps two commands and two passwords in the critical path of every reseed, and
  the failure mode is a refusal the operator has to debug.
- **Add `staging` to the Swagger allowlist too.** Rejected: staging is public,
  and the schema enumerates every endpoint, payload and error shape.
- **Invite the two accounts by hand through `/governance-users`.** This works
  and needs no code, but it is per-environment manual work that will be
  forgotten on the next rebuild. Kept as the option for production.
