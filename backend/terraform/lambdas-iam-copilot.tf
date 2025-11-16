# ================================================================
# IAM Copilot - Lambda Functions
# ================================================================
# Lambda functions for IAM analysis and management
# ================================================================

locals {
  lambda_runtime = "python3.11"
  lambda_timeout = 60
  lambda_memory  = 512
}

# ================================================================
# 1. AWS Sync Handler Lambda
# ================================================================
resource "aws_lambda_function" "aws_sync_handler" {
  filename      = "${path.module}/../lambdas/aws-sync-handler/deployment.zip"
  function_name = "${var.project_name}-${var.environment}-aws-sync-handler"
  role          = aws_iam_role.aws_sync_handler_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = local.lambda_runtime
  timeout       = 300  # 5 minutes for large accounts
  memory_size   = local.lambda_memory

  environment {
    variables = {
      ROLES_TABLE_NAME     = aws_dynamodb_table.roles.name
      POLICIES_TABLE_NAME  = aws_dynamodb_table.policies.name
      ACCOUNTS_TABLE_NAME  = aws_dynamodb_table.accounts.name
      LOG_LEVEL            = "INFO"
    }
  }

  layers = [aws_lambda_layer_version.powertools.arn]

  tags = {
    Name    = "aws-sync-handler"
    Service = "IAM-Copilot"
  }
}

# ================================================================
# 2. Risk Analyzer Lambda
# ================================================================
resource "aws_lambda_function" "risk_analyzer" {
  filename      = "${path.module}/../lambdas/risk-analyzer/deployment.zip"
  function_name = "${var.project_name}-${var.environment}-risk-analyzer"
  role          = aws_iam_role.risk_analyzer_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = local.lambda_runtime
  timeout       = 120  # 2 minutes
  memory_size   = local.lambda_memory

  environment {
    variables = {
      ROLES_TABLE_NAME    = aws_dynamodb_table.roles.name
      POLICIES_TABLE_NAME = aws_dynamodb_table.policies.name
      LOG_LEVEL           = "INFO"
    }
  }

  layers = [aws_lambda_layer_version.powertools.arn]

  tags = {
    Name    = "risk-analyzer"
    Service = "IAM-Copilot"
  }
}

# ================================================================
# 3. Findings Generator Lambda
# ================================================================
resource "aws_lambda_function" "findings_generator" {
  filename      = "${path.module}/../lambdas/findings-generator/deployment.zip"
  function_name = "${var.project_name}-${var.environment}-findings-generator"
  role          = aws_iam_role.findings_generator_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = local.lambda_runtime
  timeout       = 180  # 3 minutes
  memory_size   = local.lambda_memory

  environment {
    variables = {
      ROLES_TABLE_NAME     = aws_dynamodb_table.roles.name
      POLICIES_TABLE_NAME  = aws_dynamodb_table.policies.name
      FINDINGS_TABLE_NAME  = aws_dynamodb_table.findings.name
      ACCOUNTS_TABLE_NAME  = aws_dynamodb_table.accounts.name
      LOG_LEVEL            = "INFO"
    }
  }

  layers = [aws_lambda_layer_version.powertools.arn]

  tags = {
    Name    = "findings-generator"
    Service = "IAM-Copilot"
  }
}

# ================================================================
# 4. Account Manager Lambda
# ================================================================
resource "aws_lambda_function" "account_manager" {
  filename      = "${path.module}/../lambdas/account-manager/deployment.zip"
  function_name = "${var.project_name}-${var.environment}-account-manager"
  role          = aws_iam_role.account_manager_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = local.lambda_runtime
  timeout       = local.lambda_timeout
  memory_size   = local.lambda_memory

  environment {
    variables = {
      ACCOUNTS_TABLE_NAME      = aws_dynamodb_table.accounts.name
      IAM_COPILOT_ACCOUNT_ID   = data.aws_caller_identity.current.account_id
      LOG_LEVEL                = "INFO"
    }
  }

  layers = [aws_lambda_layer_version.powertools.arn]

  tags = {
    Name    = "account-manager"
    Service = "IAM-Copilot"
  }
}

# ================================================================
# 5. Apply Executor Lambda
# ================================================================
resource "aws_lambda_function" "apply_executor" {
  filename      = "${path.module}/../lambdas/apply-executor/deployment.zip"
  function_name = "${var.project_name}-${var.environment}-apply-executor"
  role          = aws_iam_role.apply_executor_role.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = local.lambda_runtime
  timeout       = 300  # 5 minutes for CloudFormation
  memory_size   = local.lambda_memory

  environment {
    variables = {
      APPLY_REQUESTS_TABLE_NAME = aws_dynamodb_table.apply_requests.name
      ACCOUNTS_TABLE_NAME       = aws_dynamodb_table.accounts.name
      AUDIT_LOG_TABLE_NAME      = aws_dynamodb_table.audit_log.name
      LOG_LEVEL                 = "INFO"
    }
  }

  layers = [aws_lambda_layer_version.powertools.arn]

  tags = {
    Name    = "apply-executor"
    Service = "IAM-Copilot"
  }
}

# ================================================================
# Data Sources
# ================================================================
data "aws_caller_identity" "current" {}

# ================================================================
# Outputs
# ================================================================
output "aws_sync_handler_arn" {
  description = "ARN of aws-sync-handler Lambda"
  value       = aws_lambda_function.aws_sync_handler.arn
}

output "risk_analyzer_arn" {
  description = "ARN of risk-analyzer Lambda"
  value       = aws_lambda_function.risk_analyzer.arn
}

output "findings_generator_arn" {
  description = "ARN of findings-generator Lambda"
  value       = aws_lambda_function.findings_generator.arn
}

output "account_manager_arn" {
  description = "ARN of account-manager Lambda"
  value       = aws_lambda_function.account_manager.arn
}

output "apply_executor_arn" {
  description = "ARN of apply-executor Lambda"
  value       = aws_lambda_function.apply_executor.arn
}
