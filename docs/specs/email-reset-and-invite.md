# Password reset and invite emails

| | |
| --- | --- |
| Status | Draft — awaiting review |
| Owners | `src/mail/` (new), `src/auth/`, `src/user/` |
| Related | `docs/deployment.md`, `docs/adr/0001-staging-environment-and-full-seeding.md` |

## Problem

Two flows end at a dead end because nothing can send mail.

- `POST /auth/register` works, but nothing confirms the address and the
  "Forgot Password?" button on `/login` is `disabled`
  (`arisekms-fe/src/pages/Login.jsx:157`). Live probe: `forgot-password` and
  `reset-password` both `404`. A locked-out tester needs an admin to PATCH the
  password by hand.
- `POST /users/invite` creates the account, but the admin must transmit the
  password out of band.

The user outcome: a user who forgets a password recovers it themselves, and an
invited user sets their own password after clicking a link.

## Users and permissions

| Actor | Can | Sees |
| --- | --- | --- |
| Anonymous | request a reset for any address | `200` regardless of whether the address exists |
| Anyone holding a link | set a new password | the form, or `400` for expired/used |
| `ARISE_IT_ADMIN` | invite; resend an invite | the created account |
| Invitee (anonymous) | accept the invite, set a password | the form |

Neither token grants access to anything but the one action.

## Scope

In:

- A `MAIL_TRANSPORT`-selected sender (`log` default, `resend`).
- One-time tokens: forgot/reset password, invite accept.
- Resend of an invite.

Out:

- Email verification on self-signup (see Rollout — signup stays open).
- Changing the signup policy.
- Exports.
- Outbound webhooks or any other integration.

## API contract

| Method | Path | Auth | Success | Failure |
| --- | --- | --- | --- | --- |
| `POST` | `/auth/forgot-password` | none | `202` always | `429` (throttled) |
| `POST` | `/auth/reset-password` | none | `204` | `400` bad/expired/used token, `400` weak password |
| `POST` | `/users/invite` | IT_ADMIN | `201` (unchanged shape) | existing errors |
| `POST` | `/users/:id/invite/resend` | IT_ADMIN | `204` | `404`, `409` account already accepted |

`forgot-password` returns `202` for unknown addresses. Anything else is a user
enumeration oracle.

Rate limits: 3 per 15 minutes per address, 10 per hour per IP, reusing
`ThrottlerGuard` (memory-throttled, consistent with the auth limiter).

## Data model

New table `auth_tokens`, one migration, reversible:

| Column | Notes |
| --- | --- |
| `id` | uuid PK |
| `userId` | FK `users.id`, `ON DELETE CASCADE` |
| `kind` | `password_reset` \| `invite` |
| `tokenHash` | sha256 hex, **unique** — the raw token is never stored |
| `expiresAt` | reset 60 min, invite 48 h |
| `usedAt` | nullable; set on consumption |
| `createdBy` | nullable — admin id for invites, null for self-service |

Consumption is a single `UPDATE ... WHERE tokenHash IS NULL AND expiresAt > now() RETURNING *`,
so concurrent clicks cannot both succeed.

Requests that `kind` and the check that `user_id` matches.

## Security and tenancy

- Token: `crypto.randomBytes(32).toString('base64url')`; only the SHA-256 is
  persisted, so a DB leak yields no usable link.
- Lookup is by unique-indexed hash, not by comparing raw strings.
- Consuming a reset bumps `userId`'s `tokenVersion`, so every existing session
  dies, mirroring `USER_PASSWORD_CHANGED`.
- A reset does **not** re-enable a disabled account; disabling still wins.
- Consumption deletes siblings of the same `kind` for that user, so a second
  link from an earlier request stops working.
- Bounded per-address token count (5); oldest pruned on issue.
- The token appears in the query string only in mailed links, never in logs.
- Every issue/consume is audited (`USER_PASSWORD_RESET_REQUESTED`,
  `USER_PASSWORD_RESET`, `USER_INVITED`).

## Mail module

`MAIL_TRANSPORT` is its own variable, defaulting to `log`. It must **not** key
off `APP_ENV`: staging and production differ in exactly one place (the seeding
gate), so anything branching on `APP_ENV` here would send or suppress live mail
wrongly.

| Transport | Behaviour |
| --- | --- |
| `log` (default) | renders the message and the link into the container log. Works in dev, CI and demo with no config |
| `smtp` | nodemailer to `MAIL_SMTP_HOST:MAIL_SMTP_PORT`. Development points at the Mailpit container, so full rendered messages appear in a local inbox and are never delivered onward |
| `resend` | `POST https://api.resend.com/emails`, requires `RESEND_API_KEY` and `MAIL_FROM` |

Missing `RESEND_API_KEY` with `MAIL_TRANSPORT=resend` fails at boot via Joi
rather than at first send.

Sends are fire-and-forget after the DB commit: a provider outage must not lose
the token, and must not fail the request. Transport errors are logged (no token,
no address beyond the domain).

`APP_PUBLIC_URL` builds links. Wrong value means every mailed link 404s, so it
is validated as a URL at boot.

## UI states

`/forgot-password` — idle, submitting, sent ("If that address is registered,
a link is on its way"), rate-limited, error.
`/reset-password?token=` — idle, submitting, expired/invalid, success → login.
`/signup` — unchanged. `/login` button becomes a link.
`/governance-users` — invite dialog stops requiring a password; per-row "resend
invite".

## Acceptance criteria

- **Given** a registered address, **when** `forgot-password`, **then** `202`,
  one token row, one mail, and a link that resets the password.
- **Given** an unknown address, **then** `202`, no row, no mail, same body.
- **Given** an expired token, **then** `400` and the password is unchanged.
- **Given** a used token, **then** `400`.
- **Given** a successful reset, **then** the old password fails, the new one
  logs in, and the pre-existing session is rejected.
- **Given** `MAIL_TRANSPORT=log`, **then** the link is in the log and no HTTP
  call is made.
- **Given** Resend returns 500, **then** the request still succeeds and the
  token row exists.
- **Given** an admin invite, **then** the account is created unusable (random
  password) and the invitee sets the real one; `resend` invalidates the first
  link.

## Test plan

Unit: token issue/consume/expiry/reuse, single-use under concurrency, prune at
5, disabled account after reset, audit rows.
Integration: table-driven route specs, no user enumeration, throttle, guards.
Transport: `log` accepts every seeded address; `resend` mocked — no live call.
Mailer asserted through a fake transport, so no spec depends on a network.

## Rollout and rollback

1. Migration applies cleanly (new table only, nothing altered).
2. `MAIL_TRANSPORT=log` ships first; behaviour is additive and inert.
3. Set `RESEND_API_KEY`, `MAIL_FROM`, `APP_PUBLIC_URL`, flip to `resend`.
4. Rollback: set `MAIL_TRANSPORT=log`. The table is additive and can stay.

**Prerequisite for staging:** the Resend domain must be verified, and seeded
`example.com` addresses bounce by design. Testers need real addresses.

## Assumptions

- Token-based invites (password never travels by mail).
- Self-signup stays open and unverified for now; verification is a later slice.
- One sender address for every template.