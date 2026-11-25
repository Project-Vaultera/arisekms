variable "aws_region" {
  description = "Region for every resource."
  type        = string
}

variable "project" {
  description = "Name prefix for resources."
  type        = string
  default     = "arisekms"
}

variable "environment" {
  description = "Name suffix for resources. Note this is not APP_ENV: the app only accepts development, production or test, so tasks always run with APP_ENV=production."
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["prod", "staging"], var.environment)
    error_message = "Use prod or staging for naming."
  }
}

# --- Network ---------------------------------------------------------------

variable "vpc_cidr" {
  description = "CIDR for the dedicated VPC."
  type        = string
  default     = "10.42.0.0/16"
}

variable "az_count" {
  description = "Availability zones to spread across. Two is the minimum for an ALB and RDS subnet group."
  type        = number
  default     = 2

  validation {
    condition     = var.az_count >= 2 && var.az_count <= 4
    error_message = "Use 2 to 4 availability zones."
  }
}

# --- Images ----------------------------------------------------------------

variable "image_tag" {
  description = "Tag applied to both repositories. :latest is what CI pushes on every merge; pin a git SHA here to roll back both services."
  type        = string
  default     = "latest"
}

# --- Compute ---------------------------------------------------------------

variable "api_cpu" {
  description = "Fargate CPU units for the API task (1024 = 1 vCPU)."
  type        = number
  default     = 512
}

variable "api_memory" {
  description = "Fargate memory (MiB) for the API task. Must pair with api_cpu."
  type        = number
  default     = 1024
}

variable "web_cpu" {
  description = "Fargate CPU units for the web task."
  type        = number
  default     = 256
}

variable "web_memory" {
  description = "Fargate memory (MiB) for the web task."
  type        = number
  default     = 512
}

variable "api_desired_count" {
  description = "API task count. The auth throttle keeps counters in process memory, so this MUST stay 1 until a shared store (Redis) lands."
  type        = number
  default     = 1

  validation {
    condition     = var.api_desired_count == 1
    error_message = "The auth throttle is per-process. Scaling the API out splits every budget between tasks — add Redis first."
  }
}

variable "web_desired_count" {
  description = "Web task count. The SPA is stateless, so this can scale freely."
  type        = number
  default     = 1
}

# --- Database --------------------------------------------------------------

variable "db_name" {
  description = "Initial database name."
  type        = string
  default     = "arisekms"
}

variable "db_username" {
  description = "Master username. The password is generated and held by Secrets Manager."
  type        = string
  default     = "arisekms"
}

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GiB."
  type        = number
  default     = 20
}

variable "db_multi_az" {
  description = "Standby instance in a second AZ. Roughly doubles the cost; off for a demo deployment."
  type        = bool
  default     = false
}

variable "db_backup_retention_days" {
  description = "Automated backup retention."
  type        = number
  default     = 7
}

# --- Edge ------------------------------------------------------------------

variable "acm_certificate_arn" {
  description = "ACM certificate for the ALB listener. Request it in ACM, add the validation CNAME in Cloudflare (DNS only), then pass the ARN."
  type        = string
}

variable "app_port" {
  description = "Container port the API listens on. Matches APP_PORT in the app."
  type        = number
  default     = 3006
}

variable "health_check_path" {
  description = "API health probe path."
  type        = string
  default     = "/api/v1/health"
}

# --- App secrets -----------------------------------------------------------

variable "app_secret_name" {
  description = "Secrets Manager secret holding the JWT keys and admin password. Terraform creates the container; the values are put out-of-band so they never enter state."
  type        = string
  default     = "arisekms/prod/app"
}

variable "cors_origins" {
  description = "Extra browser origins, comma separated. The SPA is same-origin behind the ALB, so this is normally empty."
  type        = string
  default     = ""
}

# --- Operations ------------------------------------------------------------

variable "log_retention_days" {
  description = "CloudWatch retention for container logs."
  type        = number
  default     = 30
}

variable "github_repo" {
  description = "owner/repo allowed to assume the deploy role via GitHub OIDC."
  type        = string
  default     = "Project-Vaultera/arisekms"
}

variable "create_github_oidc_provider" {
  description = "Create the GitHub OIDC provider. Set false if the account already has one."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Extra tags applied to everything."
  type        = map(string)
  default     = {}
}
