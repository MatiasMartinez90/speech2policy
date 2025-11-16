# Project and Environment Configuration
variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "cloudacademy"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "prod"
}

# Variables para Google OAuth (deben ser definidas)
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

# Variables para URLs de callback
variable "production_callback_url" {
  description = "Production callback URL for OAuth"
  type        = string
  default     = "https://proyectos.cloudacademy.ar"
}

variable "production_logout_url" {
  description = "Production logout URL for OAuth"
  type        = string
  default     = "https://proyectos.cloudacademy.ar"
}

variable "from_email" {
  description = "Email address for sending welcome emails"
  type        = string
  default     = "noreply@cloudacademy.ar"
}