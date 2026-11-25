terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Remote state is not configured on purpose: it needs a bucket that must
  # exist before `terraform init`, and creating it here would be circular.
  # Copy backend.tf.example to backend.tf and fill in the bucket, or pass
  # `-backend-config` flags. Without it, state is local and must never be
  # committed (see .gitignore).
}
