# Uploads volume. The app writes to ./uploads on local disk
# (src/shared/files/file-storage.ts); EFS keeps that working across deploys and
# shares the files between tasks.
#
# This is the "for now" answer. The storage layer is a seam: moving to S3 is a
# driver behind the same calls, not a change to the services that persist files.

resource "aws_efs_file_system" "uploads" {
  creation_token = "${local.name}-uploads"
  encrypted      = true

  # Bursting is fine for avatar-sized files; switch to provisioned throughput
  # if uploads ever become a hot path.
  throughput_mode = "bursting"

  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }

  tags = { Name = "${local.name}-uploads" }
}

resource "aws_efs_mount_target" "uploads" {
  count = var.az_count

  file_system_id  = aws_efs_file_system.uploads.id
  subnet_id       = aws_subnet.private[count.index].id
  security_groups = [aws_security_group.efs.id]
}

# The container runs as uid/gid 1000 (`node` in Dockerfile.prod). The access
# point enforces that so the mount is writable without a chown at boot.
resource "aws_efs_access_point" "uploads" {
  file_system_id = aws_efs_file_system.uploads.id

  posix_user {
    uid = 1000
    gid = 1000
  }

  root_directory {
    path = "/uploads"

    creation_info {
      owner_uid   = 1000
      owner_gid   = 1000
      permissions = "0750"
    }
  }

  tags = { Name = "${local.name}-uploads" }
}
