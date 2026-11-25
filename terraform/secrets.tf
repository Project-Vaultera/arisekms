# JWT keys and the bootstrap admin password. Terraform creates the container
# only; the values are put out-of-band so they never land in state or in a
# tfvars file:
#
#   aws secretsmanager put-secret-value \
#     --secret-id arisekms/prod/app \
#     --secret-string '{
#       "JWT_PUBLIC_KEY_BASE64": "...",
#       "JWT_PRIVATE_KEY_BASE64": "...",
#       "JWT_ACCESS_TOKEN_EXP_IN_SEC": "3600",
#       "JWT_REFRESH_TOKEN_EXP_IN_SEC": "86400",
#       "DEFAULT_ADMIN_USER_PASSWORD": "..."
#     }'
#
# The API task fails to start until every key below exists, which is the
# intended failure mode: a missing secret should stop the deploy, not boot with
# a default.
resource "aws_secretsmanager_secret" "app" {
  name                    = var.app_secret_name
  description             = "JWT signing keys and the bootstrap admin password for ${local.name}"
  recovery_window_in_days = 7

  tags = { Name = local.name }
}
