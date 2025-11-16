variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "speech2policy"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

# Optional: for custom domain
# variable "acm_certificate_arn" {
#   description = "ACM certificate ARN for custom domain"
#   type        = string
#   default     = ""
# }
