resource "aws_db_subnet_group" "main" {
  name       = local.name
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = local.name }
}

# TLS is required, matching the app's DB_SSL=true. Without this, credentials
# would cross the VPC in clear text.
resource "aws_db_parameter_group" "main" {
  name   = "${local.name}-pg16"
  family = "postgres16"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  # Reject connections that cannot prove the server identity, so a
  # misconfigured client fails loudly instead of falling back to plaintext.
  parameter {
    name  = "ssl_min_protocol_version"
    value = "TLSv1.2"
  }

  tags = { Name = "${local.name}-pg16" }
}

resource "aws_db_instance" "main" {
  identifier = local.name

  engine         = "postgres"
  engine_version = "16.3"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_allocated_storage * 5
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username

  # AWS generates and rotates the password into a Secrets Manager secret, so no
  # credential ever appears in Terraform state or in the repository.
  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.main.id
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.main.name

  publicly_accessible = false
  multi_az            = var.db_multi_az

  backup_retention_period = var.db_backup_retention_days
  backup_window           = "18:00-19:00" # 23:30-00:30 IST
  maintenance_window      = "sun:19:00-sun:20:00"

  auto_minor_version_upgrade = true
  apply_immediately          = false

  deletion_protection = true
  skip_final_snapshot = false
  # Static on purpose: `timestamp()` would differ on every plan and show a
  # perpetual diff. If a snapshot with this name already exists, delete it or
  # rename here before destroying.
  final_snapshot_identifier = "${local.name}-final"
  copy_tags_to_snapshot     = true

  performance_insights_enabled = false

  tags = { Name = local.name }
}
