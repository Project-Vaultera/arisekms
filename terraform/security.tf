# ALB: the only thing reachable from the internet. Tasks accept traffic from it
# and nothing else; RDS accepts traffic from the tasks and nothing else.

resource "aws_security_group" "alb" {
  name        = "${local.name}-alb"
  description = "Public HTTP/HTTPS to the load balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP, redirected to HTTPS"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "To the tasks"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = { Name = "${local.name}-alb" }
}

resource "aws_security_group" "tasks" {
  name        = "${local.name}-tasks"
  description = "API and web tasks, reachable only from the load balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "API from the ALB"
    from_port       = var.app_port
    to_port         = var.app_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "Web from the ALB"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Tasks need egress for ECR, Secrets Manager, CloudWatch and RDS.
  egress {
    description = "Outbound to AWS APIs and RDS"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name}-tasks" }
}

resource "aws_security_group" "rds" {
  name        = "${local.name}-rds"
  description = "Postgres, reachable only from the tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Postgres from the tasks"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.tasks.id]
  }

  tags = { Name = "${local.name}-rds" }
}

resource "aws_security_group" "efs" {
  name        = "${local.name}-efs"
  description = "NFS for the uploads volume, reachable only from the tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "NFS from the tasks"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.tasks.id]
  }

  tags = { Name = "${local.name}-efs" }
}
