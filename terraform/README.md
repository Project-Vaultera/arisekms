# ECS infrastructure

Terraform for the AWS deployment described in
[`docs/specs/ecs-deployment.md`](../docs/specs/ecs-deployment.md).

**Nothing here has been applied.** No AWS resource exists yet, and no `plan` has
been run against a real account — only `fmt` and `validate`. Treat the first
apply as a review checkpoint, not a formality.

## What it creates

```text
VPC (2 AZs) ─┬─ public  ── ALB (ACM cert) ── 443 HTTPS
             │            └─ :80 redirect
             ├─ private ── Fargate: api :3006, web :80
             │            RDS Postgres 16.3 (TLS enforced)
             │            EFS: /uploads
             └─ NAT gateway
ECR: api, web          Secrets Manager: app keys
IAM: task roles, GitHub OIDC deploy role
CloudWatch: /ecs/<name>/api, /ecs/<name>/web
```

## Before the first apply

1. **Remote state.** `cp backend.tf.example backend.tf` and fill in an S3 bucket
   and DynamoDB table you create once, by hand. Without it, state is local —
   `*.tfstate` is git-ignored for good reason.
2. **Certificate.** Request an ACM certificate for the domain, add the
   validation CNAME in Cloudflare with the proxy **off** (grey cloud), and put
   the ARN in `terraform.tfvars`.
3. **Variables.** `cp terraform.tfvars.example terraform.tfvars`, set
   `aws_region` and `acm_certificate_arn`. That is the whole minimum.

```bash
terraform init
terraform fmt -check -recursive
terraform validate
terraform plan -out plan.out      # read it before applying
terraform apply plan.out
```

## After the apply

The app secret is created empty on purpose — its values must not pass through
Terraform state:

```bash
aws secretsmanager put-secret-value \
  --secret-id arisekms/prod/app \
  --secret-string '{
    "JWT_PUBLIC_KEY_BASE64": "...",
    "JWT_PRIVATE_KEY_BASE64": "...",
    "JWT_ACCESS_TOKEN_EXP_IN_SEC": "3600",
    "JWT_REFRESH_TOKEN_EXP_IN_SEC": "86400",
    "DEFAULT_ADMIN_USER_PASSWORD": "..."
  }'
```

The API task will not start until every key the task definition references
exists. That is deliberate: a missing secret should stop the deploy, not boot
with a default.

Then set these in the repository's `production` environment:

| Kind | Name | From |
| --- | --- | --- |
| secret | `AWS_DEPLOY_ROLE_ARN` | `terraform output deploy_role_arn` |
| var | `AWS_REGION` | `aws_region` |
| var | `ECS_CLUSTER` | `terraform output cluster_name` |
| var | `ECS_API_SERVICE` | `terraform output api_service_name` |
| var | `ECS_WEB_SERVICE` | `terraform output web_service_name` |
| var | `ECR_API_REPOSITORY` | `terraform output api_repository_url` |
| var | `ECR_WEB_REPOSITORY` | `terraform output web_repository_url` |
| var | `ECS_PRIVATE_SUBNETS` | private subnet ids, comma separated |
| var | `ECS_TASK_SECURITY_GROUP` | the `${name}-tasks` security group id |
| var | `PUBLIC_HOST` | the hostname you point at the ALB |

DNS: create a CNAME from the hostname to `terraform output alb_dns_name`, proxy
**off**. If you ever turn the proxy on, set `APP_TRUSTED_PROXY_HOPS=2` in
`terraform/ecs.tf` in the same change.

## Deploying

`.github/workflows/deploy-ecs.yml` is `workflow_dispatch` only. It builds both
images to ECR, runs migrations as a one-off task, forces a new deployment, waits
for stability and smoke-tests the ALB. Roll back by dispatching it with a
`sha-<commit>` tag.

The VPS workflow (`deploy.yml`) is untouched and still the live path.

## Deliberate limits

- `api_desired_count` is validated to `1`: the auth throttle is per-process.
- One NAT gateway, no WAF, no autoscaling, `db_multi_az = false`.
- EFS stands in for object storage. See the spec's known gaps.
