# ECS deployment (prepared, not applied)

| | |
| --- | --- |
| Status | Prepared — nothing provisioned, no `terraform apply` run |
| Scope | `terraform/`, `deploy-ecs.yml`, `DB_SSL`, static-only web image |
| Supersedes | Nothing; the VPS stack (`docker-compose.prod.yml` + Caddy) stays live |

## Problem

The deployment is a single VPS running Compose and Caddy. Moving to ECS gives
managed capacity, a load balancer and managed Postgres, but the current code
carries three assumptions that only hold on that VPS:

1. **One proxy.** `X-Forwarded-For` is read one hop from the right. Correct
   behind Caddy; behind a CDN *and* an ALB it would collapse every caller onto
   the CDN edge and share one throttle bucket.
2. **Plaintext Postgres.** `ormconfig.ts` and `shared.module.ts` have no TLS
   option, and RDS rejects non-TLS connections when `rds.force_ssl=1`.
3. **Caddy proxies the API.** The web image's Caddyfile reverse-proxies
   `app:3006`, which does not exist on ECS — the ALB routes `/api/*` instead.

## Users and permissions

Unchanged. Deployment credentials move from an SSH key to a GitHub OIDC role
scoped to `repo:Project-Vaultera/arisekms:ref:refs/heads/main`; no long-lived
AWS keys exist in the repository or in GitHub secrets.

## Scope

In: Terraform for VPC, ALB, ECR, ECS Fargate, RDS, EFS, Secrets Manager, IAM,
CloudWatch; a manual-only deploy workflow; the three code changes above.

Out: cutover, DNS switch, data migration off the VPS, Redis, S3 uploads, WAF,
autoscaling, multi-region.

## Contract

```text
Cloudflare (DNS only) ──▶ ALB :443 (ACM)
                            ├── /api/*  ──▶ tg-api  ──▶ Fargate api :3006
                            └── default ──▶ tg-web  ──▶ Fargate web :80
                                                          │
                              RDS Postgres ◀──────────────┤
                              EFS ./uploads ◀─────────────┘
```

API task environment is the existing contract, not a new one: `APP_ENV`,
`APP_PORT`, `DB_*`, `CORS_ORIGINS`, `APP_TRUSTED_PROXY_HOPS`. Secrets come from
Secrets Manager: `DB_PASS` (RDS-managed, never in state), the two JWT keys,
their TTLs, and `DEFAULT_ADMIN_USER_PASSWORD`.

## Data model

None. No migration accompanies this change; RDS starts empty and
`migration:run:prod` builds the schema on the first deploy.

## Security and tenancy

- Tasks and RDS live in private subnets; only the ALB is public. RDS accepts
  5432 from the task security group only; EFS accepts 2049 from it only.
- `rds.force_ssl=1`, `ssl_min_protocol_version=TLSv1.2`, and the app connects
  with `DB_SSL=true`. Certificate verification is relaxed (`rejectUnauthorized:
  false`) because the RDS CA is not bundled — the transport is encrypted, the
  server is not authenticated.
- Storage encrypted at rest (RDS, EFS, ECR). Container images scanned on push.
- The app secret's *values* never pass through Terraform: the container is
  created, values are put with `put-secret-value`.
- `APP_TRUSTED_PROXY_HOPS=1` matches ALB-only. If Cloudflare's proxy is turned
  on in front of the ALB, this must become `2` in the same change, or the
  throttle collapses to the CDN's addresses.
- Tenant isolation is unchanged — it is enforced in the application, and none of
  this touches it.

## UI states

None. The SPA is served from the web target group with the same client-side
routing fallback.

## Acceptance criteria

- **Given** the stack is applied, **then** `GET /api/v1/health` returns `200`
  through the ALB and `GET /api/v1/swagger` returns `404`.
- **Given** a login is repeated past its budget, **then** `429` carries
  `Retry-After` and a different account is unaffected — behind the ALB, not
  just locally.
- **Given** a task is replaced, **then** files under `./uploads` survive (EFS).
- **Given** a migration fails, **then** the deploy stops before the service is
  updated.
- **Given** a new task never becomes healthy, **then** the circuit breaker rolls
  the service back.

## Test plan

Code changes: existing unit suites, plus `DB_SSL` off by default so the VPS path
is unchanged. Terraform: `terraform fmt -check` and `terraform validate` pass;
`terraform plan` requires credentials and is left to the operator. The workflow
is `workflow_dispatch` only, so it cannot run before review.

Not verifiable here: no AWS credentials, no Docker, so neither the plan nor a
real deploy has been executed. Every acceptance criterion above is unverified
until the operator applies the stack.

## Rollout and rollback

1. Apply Terraform into a fresh account/VPC. Nothing routes to it yet.
2. Fill the app secret, then run `deploy-ecs` manually.
3. Point a test hostname at the ALB and run the runbook checks.
4. Only then move `arisekms.vaulteralabs.com` (Cloudflare, DNS only).

Rollback before cutover is `terraform destroy` on a stack carrying no traffic.
After cutover, repoint the record at the VPS, which is still running.

## Known gaps

- **One API task.** The throttle counts in process memory; the variable is
  validated to stay at 1. Autoscaling needs Redis first.
- **EFS, not object storage.** Uploads survive deploys and are shared, but EFS
  is not a CDN and has no lifecycle story for member documents. The intended
  seam is a storage driver selected by config, with S3 as the second
  implementation.
- **Single NAT gateway.** One AZ failure removes egress for both tasks.
- **No WAF, no autoscaling, no multi-AZ RDS** (`db_multi_az = false`).
- **Final snapshot name is static.** Destroying twice needs a rename or the old
  snapshot deleted.
