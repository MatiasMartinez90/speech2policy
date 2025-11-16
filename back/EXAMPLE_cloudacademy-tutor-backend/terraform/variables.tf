# Variables de configuración para CloudAcademy Tutor Backend

variable "aws_region" {
  description = "AWS Region para desplegar recursos"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Nombre del proyecto"
  type        = string
  default     = "cloudacademy-tutor"
}

variable "environment" {
  description = "Ambiente de despliegue"
  type        = string
  default     = "production"
}

# Cognito User Pool existente (del frontend)
variable "cognito_user_pool_arn" {
  description = "ARN del Cognito User Pool existente"
  type        = string
  default     = "arn:aws:cognito-idp:us-east-1:982081083386:userpool/us-east-1_FbLlcvGLl"
}

variable "cognito_user_pool_id" {
  description = "ID del Cognito User Pool"
  type        = string
  default     = "us-east-1_FbLlcvGLl"
}

variable "cognito_user_pool_client_id" {
  description = "Client ID del Cognito User Pool"
  type        = string
  default     = "7k692bp886on11hdqfroo2pp44"
}

# Configuración de Bedrock
variable "bedrock_model_id" {
  description = "ID del modelo de Bedrock para el tutor IA"
  type        = string
  default     = "anthropic.claude-3-haiku-20240307-v1:0"
}

# TTL para tablas DynamoDB
variable "tutor_sessions_ttl_days" {
  description = "Días antes de borrar automáticamente las sesiones del tutor"
  type        = number
  default     = 30
}

variable "user_usage_ttl_days" {
  description = "Días antes de borrar automáticamente los registros de uso"
  type        = number
  default     = 7
}

# CloudWatch Alarms
variable "alarm_email" {
  description = "Email para recibir notificaciones de CloudWatch Alarms"
  type        = string
  default     = "matias.martinez90@gmail.com"
}

# Tags comunes
variable "common_tags" {
  description = "Tags comunes para todos los recursos"
  type        = map(string)
  default = {
    Project     = "CloudAcademy-Tutor"
    ManagedBy   = "Terraform"
    Environment = "production"
    Owner       = "matias@cloudacademy.ar"
  }
}
