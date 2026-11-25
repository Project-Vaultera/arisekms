output "alb_dns_name" {
  description = "Point the Cloudflare record here (DNS only, grey cloud)."
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Hosted zone id, for an ALIAS/Route53 record instead of a CNAME."
  value       = aws_lb.main.zone_id
}

output "api_repository_url" {
  description = "ECR repository for the API image."
  value       = aws_ecr_repository.api.repository_url
}

output "web_repository_url" {
  description = "ECR repository for the web image."
  value       = aws_ecr_repository.web.repository_url
}

output "cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "api_service_name" {
  value = aws_ecs_service.api.name
}

output "web_service_name" {
  value = aws_ecs_service.web.name
}

output "api_task_definition_family" {
  value = aws_ecs_task_definition.api.family
}

output "deploy_role_arn" {
  description = "Set as AWS_DEPLOY_ROLE_ARN in the repository's production environment."
  value       = aws_iam_role.deploy.arn
}

output "app_secret_arn" {
  description = "Fill with put-secret-value before the first deploy."
  value       = aws_secretsmanager_secret.app.arn
}

output "db_address" {
  description = "RDS endpoint. Private; reachable only from the tasks."
  value       = aws_db_instance.main.address
  sensitive   = true
}

output "uploads_file_system_id" {
  value = aws_efs_file_system.uploads.id
}
