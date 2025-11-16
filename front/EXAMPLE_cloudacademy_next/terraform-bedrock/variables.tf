variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "bedrock_models" {
  description = "List of Bedrock models to allow access to"
  type        = list(string)
  default = [
    "anthropic.claude-3-haiku-20240307-v1:0",
    "anthropic.claude-3-sonnet-20240229-v1:0",
    "anthropic.claude-instant-v1",
    "anthropic.claude-v2"
  ]
}

variable "project_name" {
  description = "Project name for tagging"
  type        = string
  default     = "CloudAcademy"
}

variable "enable_cloudwatch_logs" {
  description = "Enable CloudWatch logging for Bedrock API calls"
  type        = bool
  default     = true
}