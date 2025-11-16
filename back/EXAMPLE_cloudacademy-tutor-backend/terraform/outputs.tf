# Outputs de Terraform para CloudAcademy Tutor Backend

# ============================================================================
# DynamoDB Tables
# ============================================================================

output "dynamodb_tables" {
  description = "Nombres de las tablas DynamoDB creadas"
  value = {
    courses_catalog = aws_dynamodb_table.courses_catalog.name
    user_progress   = aws_dynamodb_table.user_progress.name
    tutor_sessions  = aws_dynamodb_table.tutor_sessions.name
    user_usage      = aws_dynamodb_table.user_usage.name
    users           = aws_dynamodb_table.users.name
    categories      = aws_dynamodb_table.categories.name
  }
}

output "dynamodb_table_arns" {
  description = "ARNs de las tablas DynamoDB"
  value = {
    courses_catalog = aws_dynamodb_table.courses_catalog.arn
    user_progress   = aws_dynamodb_table.user_progress.arn
    tutor_sessions  = aws_dynamodb_table.tutor_sessions.arn
    user_usage      = aws_dynamodb_table.user_usage.arn
    users           = aws_dynamodb_table.users.arn
    categories      = aws_dynamodb_table.categories.arn
  }
}

# ============================================================================
# Cognito (ya existente)
# ============================================================================

output "cognito_user_pool_id" {
  description = "ID del Cognito User Pool (existente)"
  value       = var.cognito_user_pool_id
}

output "cognito_user_pool_arn" {
  description = "ARN del Cognito User Pool (existente)"
  value       = var.cognito_user_pool_arn
}

output "cognito_user_pool_client_id" {
  description = "Client ID del Cognito User Pool (existente)"
  value       = var.cognito_user_pool_client_id
}

# ============================================================================
# AWS Account Info
# ============================================================================

output "aws_account_id" {
  description = "AWS Account ID"
  value       = data.aws_caller_identity.current.account_id
}

output "aws_region" {
  description = "AWS Region"
  value       = data.aws_region.current.name
}

# ============================================================================
# Bedrock Configuration
# ============================================================================

output "bedrock_model_id" {
  description = "ID del modelo de Bedrock para el tutor IA"
  value       = var.bedrock_model_id
}

# ============================================================================
# Environment Variables para Lambdas
# ============================================================================

output "lambda_environment_variables" {
  description = "Variables de entorno recomendadas para las funciones Lambda"
  value = {
    COURSES_TABLE        = aws_dynamodb_table.courses_catalog.name
    PROGRESS_TABLE       = aws_dynamodb_table.user_progress.name
    SESSIONS_TABLE       = aws_dynamodb_table.tutor_sessions.name
    USAGE_TABLE          = aws_dynamodb_table.user_usage.name
    USERS_TABLE          = aws_dynamodb_table.users.name
    CATEGORIES_TABLE     = aws_dynamodb_table.categories.name
    BEDROCK_MODEL_ID     = var.bedrock_model_id
    COGNITO_USER_POOL_ID = var.cognito_user_pool_id
    AWS_REGION           = data.aws_region.current.name
  }
}

# ============================================================================
# Resumen del Deployment
# ============================================================================

output "deployment_summary" {
  description = "Resumen del deployment"
  value = {
    project     = var.project_name
    environment = var.environment
    region      = data.aws_region.current.name
    account_id  = data.aws_caller_identity.current.account_id
    tables_created = [
      aws_dynamodb_table.courses_catalog.name,
      aws_dynamodb_table.user_progress.name,
      aws_dynamodb_table.tutor_sessions.name,
      aws_dynamodb_table.user_usage.name,
      aws_dynamodb_table.users.name,
      aws_dynamodb_table.categories.name
    ]
    ttl_enabled = {
      tutor_sessions = "${var.tutor_sessions_ttl_days} days"
      user_usage     = "${var.user_usage_ttl_days} days"
    }
  }
}
