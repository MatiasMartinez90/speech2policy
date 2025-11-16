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

variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  sensitive   = true
}

variable "production_callback_url" {
  description = "Production callback URL"
  type        = string
  default     = "https://speech2policy.example.com"
}

variable "production_logout_url" {
  description = "Production logout URL"
  type        = string
  default     = "https://speech2policy.example.com"
}
