# Auth throttle and Swagger exposure

| | |
| --- | --- |
| Status | Implemented |
| Issues | #19 (public schema), #20 (single-bucket throttle) |
| Scope | `POST /auth/login`, `POST /auth/register`, Swagger mounting, edge config |

## Problem

Two production defects, both from dev-only assumptions surviving into the
public deployment.

**#19.** `src/main.ts` mounted Swagger unconditionally, so
`/api/v1/swagger` published the whole endpoint and payload surface to the
internet.

**#20.** `LoginThrottleGuard` kept **one** `Map` bucket keyed on the client IP,
and read the **left-most** `X-Forwarded-For` entry. Observed on the live host:
seven `401`s and then `429` for *every* caller — a second person could not log
in while the first was mistyping. Because the left-most hop is caller-supplied,
anyone could pick a fresh value per request and never be limited at all.

## Users and permissions

Unauthenticated callers. Throttles are the only control on these two routes, so
they must not depend on a session.

## Scope

In: per-caller limits on `login`/`register`, trustworthy client identity,
`Retry-After`, Swagger off in production, docs.

Out: a shared counter store, CAPTCHA, per-account lockout with notification.

## API contract

`429` on `login` or `register`:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 42

{ "error": { "statusCode": 429, "message": "Too many attempts, try again later" } }
```

Narrowest rule first, so a caller only spends the broadest budget once the
narrow ones are exhausted:

| Rule | Default | Protects against |
| --- | --- | --- |
| `(ip, username)` | 10 / min | guessing one account |
| `username` | 20 / 5 min | distributing one guess |
| `ip` | 30 / min | unauthenticated flood |
| `ip` (register) | 20 / hour | signup spam |

`refresh-token` is **not** throttled: no username, and it fires on every expiry,
so counting it would consume the login budget.

## Security and identity

- Client IP is the **right-most** `X-Forwarded-For` hop, because each proxy
  appends the peer it saw and everything left of it is caller-controlled.
  `APP_TRUSTED_PROXY_HOPS` says how many proxies to walk back: `1` for Caddy or
  a bare ALB, `2` when a CDN in front of the load balancer also appends. Too
  few hops collapses every caller onto the CDN's address — the shared-bucket
  bug this fix exists to prevent — so the count is deployment config, not a
  constant. A header shorter than the configured depth is ignored entirely.
- Widening: an address that exhausts its IP budget moves to its `/24` (`/48` for
  IPv6) until the window ends, and the network bucket inherits the spent
  allowance so a neighbour cannot walk in on a fresh one.
- An unidentifiable client (`unknown`) is let through rather than pooled, since a
  shared bucket would let them lock each other out.
- `APP_TRUST_PROXY_HEADERS=0` falls back to the socket address (direct
  connections, or the proxy bypassed). `APP_THROTTLE_ENABLED=0` disables
  everything.
- State is in process memory: correct for one replica, split across several, lost
  on restart.

## Data model

None. Independent of tenancy.

## UI states

No frontend work. The API client surfaces `429` as an error like any other.

## Acceptance criteria

- **Given** one caller exceeds 10 attempts for a username, **then** they get
  `429` with `Retry-After`, **and** a different username from the same address
  still succeeds.
- **Given** a caller rotates the left-most `X-Forwarded-For` value, **then**
  the counter keeps counting down.
- **Given** an address is over its IP budget, **then** a neighbour in the same
  `/24` is refused too, while a different `/24` is not.
- **Given** `APP_ENV=production`, **then** `/api/v1/swagger` is `404`; in
  `development` it serves the UI.
- **Given** a `429`, **then** `Retry-After` is a positive number of seconds.

## Test plan

`login-throttle.guard.spec.ts` covers each criterion, including the #20
regression (one client cannot starve another) and the spoofed-prefix bypass.
`client-ip.spec.ts` covers hop selection, fallbacks and prefixing. Swagger
gating is covered by the `404` check in the deploy runbook, since it is
configuration rather than logic.

## Rollout and rollback

Behaviour change only; no migration. Deploy, then re-run the runbook's
verification table. Rollback: revert the commit and redeploy — counters are
in-memory, so there is no state to undo.

## Known gaps

- In-memory counters (see above).
- No notification or unlock endpoint; a locked-out user waits, or an operator
  restarts `app`.
- Limits are compile-time constants (`AUTH_THROTTLE_RULES`), not env-tunable.