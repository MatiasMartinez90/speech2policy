# Variables para el módulo API Gateway

variable "db_host" {
  description = "PostgreSQL RDS endpoint"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "proyecto_cloudacademy"
}

variable "db_user" {
  description = "PostgreSQL database user"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "PostgreSQL database password"
  type        = string
  sensitive   = true
}

variable "db_port" {
  description = "PostgreSQL database port"
  type        = string
  default     = "5432"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "CloudAcademy"
}