resource "aws_ecs_cluster" "main" {
  name = local.name

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = { Name = local.name }
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${local.name}/api"
  retention_in_days = var.log_retention_days
  tags              = { Name = "${local.name}-api" }
}

resource "aws_cloudwatch_log_group" "web" {
  name              = "/ecs/${local.name}/web"
  retention_in_days = var.log_retention_days
  tags              = { Name = "${local.name}-web" }
}

# --- API -------------------------------------------------------------------

resource "aws_ecs_task_definition" "api" {
  family                   = "${local.name}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.api_cpu
  memory                   = var.api_memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  volume {
    name = "uploads"

    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.uploads.id
      transit_encryption = "ENABLED"

      authorization_config {
        access_point_id = aws_efs_access_point.uploads.id
        iam             = "DISABLED"
      }
    }
  }

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = local.api_image
      essential = true

      portMappings = [
        {
          containerPort = var.app_port
          protocol      = "tcp"
        },
      ]

      mountPoints = [
        {
          sourceVolume  = "uploads"
          containerPath = "/usr/src/app/uploads"
          readOnly      = false
        },
      ]

      # Non-secret configuration. Anything sensitive comes from `secrets`.
      environment = [
        { name = "APP_ENV", value = "production" },
        { name = "APP_PORT", value = tostring(var.app_port) },
        { name = "NODE_ENV", value = "production" },
        { name = "DB_HOST", value = aws_db_instance.main.address },
        { name = "DB_PORT", value = "5432" },
        { name = "DB_NAME", value = var.db_name },
        { name = "DB_USER", value = var.db_username },
        { name = "DB_SSL", value = "true" },
        # ALB only: one proxy appends the client IP. Raise to 2 if a CDN is
        # ever put in front of the load balancer.
        { name = "APP_TRUSTED_PROXY_HOPS", value = "1" },
        { name = "CORS_ORIGINS", value = var.cors_origins },
        # Migrations run as a one-off task before the service update, so a
        # task that starts here must not also race them.
        { name = "RUN_MIGRATIONS", value = "false" },
      ]

      secrets = [
        {
          name      = "DB_PASS"
          valueFrom = "${aws_db_instance.main.master_user_secret[0].secret_arn}:password::"
        },
        {
          name      = "JWT_PUBLIC_KEY_BASE64"
          valueFrom = "${aws_secretsmanager_secret.app.arn}:JWT_PUBLIC_KEY_BASE64::"
        },
        {
          name      = "JWT_PRIVATE_KEY_BASE64"
          valueFrom = "${aws_secretsmanager_secret.app.arn}:JWT_PRIVATE_KEY_BASE64::"
        },
        {
          name      = "DEFAULT_ADMIN_USER_PASSWORD"
          valueFrom = "${aws_secretsmanager_secret.app.arn}:DEFAULT_ADMIN_USER_PASSWORD::"
        },
        {
          name      = "JWT_ACCESS_TOKEN_EXP_IN_SEC"
          valueFrom = "${aws_secretsmanager_secret.app.arn}:JWT_ACCESS_TOKEN_EXP_IN_SEC::"
        },
        {
          name      = "JWT_REFRESH_TOKEN_EXP_IN_SEC"
          valueFrom = "${aws_secretsmanager_secret.app.arn}:JWT_REFRESH_TOKEN_EXP_IN_SEC::"
        },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.api.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "api"
        }
      }

      # Dockerfile.prod already ships a HEALTHCHECK, but ECS ignores it; the
      # ALB target group is what actually gates traffic. Kept for parity with
      # `docker run` debugging.
      healthCheck = {
        command = [
          "CMD-SHELL",
          "node -e \"fetch('http://127.0.0.1:${var.app_port}${var.health_check_path}').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\"",
        ]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    },
  ])

  tags = { Name = "${local.name}-api" }
}

resource "aws_ecs_service" "api" {
  name            = "${local.name}-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.api_desired_count
  launch_type     = "FARGATE"

  platform_version = "LATEST"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = var.app_port
  }

  # Roll back automatically when the new tasks never become healthy, instead of
  # leaving the service half-updated.
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100

  health_check_grace_period_seconds = 60

  enable_execute_command = false

  # Desired count is owned by Terraform; CI only forces a new deployment.
  lifecycle {
    ignore_changes = [desired_count]
  }

  depends_on = [aws_lb_listener_rule.api]

  tags = { Name = "${local.name}-api" }
}

# --- Web -------------------------------------------------------------------

resource "aws_ecs_task_definition" "web" {
  family                   = "${local.name}-web"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.web_cpu
  memory                   = var.web_memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = "web"
      image     = local.web_image
      essential = true

      portMappings = [
        {
          containerPort = 80
          protocol      = "tcp"
        },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.web.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "web"
        }
      }
    },
  ])

  tags = { Name = "${local.name}-web" }
}

resource "aws_ecs_service" "web" {
  name            = "${local.name}-web"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.web.arn
  desired_count   = var.web_desired_count
  launch_type     = "FARGATE"

  platform_version = "LATEST"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.web.arn
    container_name   = "web"
    container_port   = 80
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100

  health_check_grace_period_seconds = 30

  lifecycle {
    ignore_changes = [desired_count]
  }

  depends_on = [aws_lb_listener.https]

  tags = { Name = "${local.name}-web" }
}
