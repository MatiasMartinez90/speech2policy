# Variables para el frontend
variable "domain_name" {
  description = "Domain name for the website"
  type        = string
  default     = "proyectos.cloudacademy.ar"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "cloudacademy"
}