# ================================================================
# Speech2Policy Backend - Variables
# ================================================================

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

variable "cognito_user_pool_id" {
  description = "Cognito User Pool ID for API Gateway authorizer"
  type        = string
}

variable "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN for API Gateway authorizer"
  type        = string
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention in days"
  type        = number
  default     = 7
}

variable "lambda_memory_size" {
  description = "Lambda function memory size in MB"
  type        = number
  default     = 512
}

variable "lambda_timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 30
}
