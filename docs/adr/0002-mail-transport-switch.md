# 0002 — Email: one transport switch, hashed one-time tokens

| | |
| --- | --- |
| Status | Accepted |
| Date | 2026-11-26 |
| Spec | `docs/specs/email-reset-and-invite.md` |

## Context

Nothing could send mail: no mailer dependency, no mail module, no
`forgot-password` or `reset-password` route. The "Forgot Password?" button was
`disabled` and a locked-out tester needed an admin to PATCH the password.

Resend was chosen as the provider (HTTPS API, so no outbound port 25, which is
unreliable from the VPS).

## Decision

1. **`MAIL_TRANSPORT` is its own variable, defaulting to `log`.** It is
   deliberately not keyed off `APP_ENV`: staging and production differ in
   exactly one place today (the seeding gate), so branching on `APP_ENV` would
   send or suppress live mail for the wrong reason.
2. **`log` renders the link into container output.** Dev, CI and demo need no
   provider and no key.
3. **A third `smtp` transport serves a local catcher.** Development points it at
   Mailpit (`docker-compose.yml`), so rendered messages have an inbox and are
   never delivered. This is why nodemailer is a dependency at all: Resend's HTTP
   API needs none, but an SMTP catcher does.
3. **Tokens are random 32 bytes, stored only as SHA-256.** Single-use through
   one guarded `UPDATE ... RETURNING`; expired rows swept on issue, capped at 5
   open per user and kind.
4. **Invites are token-based.** The admin no longer picks a password; a random
   unusable hash is stored and the invitee sets their own. Supplying a password
   still works and skips the mail.
5. **`forgot-password` always answers `202`**, including unknown addresses.

## Consequences

- Locked-out users self-serve; secrets never travel by mail.
- A database leak yields no working links, only hashes.
- Consuming a reset bumps `tokenVersion`, so a reset also signs out every
  existing session — the user must log in again everywhere.
- Mail failures are swallowed after the DB commit: the request succeeds and the
  token survives, at the cost of the user waiting for a link that never comes.
  The failure is logged, without the token.
- Seeded `example.com` addresses bounce by design. Testers need real addresses.
- In-memory throttle state is per process, so it shares the `api_desired_count=1`
  constraint already documented for ECS.

## Alternatives considered

- **Key off `APP_ENV`.** Simpler, but couples mail to a variable that also
  controls seeding, and staging would silently send or suppress real mail.
- **Mail the admin-chosen password.** Smallest change, but a plaintext password
  lands in an inbox and usually outlives the invite.
- **Raw SMTP for everything, including production.** Blocked or rate-capped by
  port 25 from this host, which is why production stays on the HTTP transport.
- **Mailpit without nodemailer.** Not possible: it speaks SMTP only. The cost is
  one runtime dependency, kept behind the same interface as every other
  transport.