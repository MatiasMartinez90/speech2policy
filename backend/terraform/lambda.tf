# ================================================================
# Speech2Policy Backend - Lambda Functions
# ================================================================

# ================================================================
# Lambda Layer - Shared code + AWS Lambda Powertools
# ================================================================
resource "aws_lambda_layer_version" "powertools" {
  filename            = "${path.module}/../layers/powertools.zip"
  layer_name          = "${var.project_name}-${var.environment}-powertools"
  compatible_runtimes = ["python3.11"]
  description         = "AWS Lambda Powertools + Shared utilities"

  lifecycle {
    ignore_changes = [filename]
  }
}

# ================================================================
# Lambda: Chat Handler
# ================================================================
data "archive_file" "chat_handler" {
  type        = "zip"
  source_dir  = "${path.module}/../lambdas/chat-handler"
  output_path = "${path.module}/.terraform/chat-handler.zip"

  excludes = [
    "__pycache__",
    "*.pyc",
    ".pytest_cache",
    "tests"
  ]
}

resource "aws_lambda_function" "chat_handler" {
  filename         = data.archive_file.chat_handler.output_path
  function_name    = "${var.project_name}-${var.environment}-chat-handler"
  role             = aws_iam_role.lambda_chat_handler.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.11"
  timeout          = var.lambda_timeout
  memory_size      = var.lambda_memory_size
  source_code_hash = data.archive_file.chat_handler.output_base64sha256

  layers = [aws_lambda_layer_version.powertools.arn]

  environment {
    variables = {
      LOG_LEVEL            = "INFO"
      USERS_TABLE          = aws_dynamodb_table.users.name
      CHAT_SESSIONS_TABLE  = aws_dynamodb_table.chat_sessions.name
      CHAT_MESSAGES_TABLE  = aws_dynamodb_table.chat_messages.name
      POLICIES_TABLE       = aws_dynamodb_table.policies.name
      USER_USAGE_TABLE     = aws_dynamodb_table.user_usage.name
      AWS_REGION           = var.aws_region
      POWERTOOLS_SERVICE_NAME = "speech2policy-chat"
    }
  }

  tags = {
    Name = "chat-handler"
  }
}

# CloudWatch Logs
resource "aws_cloudwatch_log_group" "chat_handler" {
  name              = "/aws/lambda/${aws_lambda_function.chat_handler.function_name}"
  retention_in_days = var.log_retention_days
}

# ================================================================
# Lambda: History Handler
# ================================================================
data "archive_file" "history_handler" {
  type        = "zip"
  source_dir  = "${path.module}/../lambdas/history-handler"
  output_path = "${path.module}/.terraform/history-handler.zip"

  excludes = [
    "__pycache__",
    "*.pyc"
  ]
}

resource "aws_lambda_function" "history_handler" {
  filename         = data.archive_file.history_handler.output_path
  function_name    = "${var.project_name}-${var.environment}-history-handler"
  role             = aws_iam_role.lambda_history_handler.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256
  source_code_hash = data.archive_file.history_handler.output_base64sha256

  layers = [aws_lambda_layer_version.powertools.arn]

  environment {
    variables = {
      LOG_LEVEL        = "INFO"
      POLICIES_TABLE   = aws_dynamodb_table.policies.name
      POWERTOOLS_SERVICE_NAME = "speech2policy-history"
    }
  }

  tags = {
    Name = "history-handler"
  }
}

resource "aws_cloudwatch_log_group" "history_handler" {
  name              = "/aws/lambda/${aws_lambda_function.history_handler.function_name}"
  retention_in_days = var.log_retention_days
}

# ================================================================
# Lambda: User Handler
# ================================================================
data "archive_file" "user_handler" {
  type        = "zip"
  source_dir  = "${path.module}/../lambdas/user-handler"
  output_path = "${path.module}/.terraform/user-handler.zip"

  excludes = [
    "__pycache__",
    "*.pyc"
  ]
}

resource "aws_lambda_function" "user_handler" {
  filename         = data.archive_file.user_handler.output_path
  function_name    = "${var.project_name}-${var.environment}-user-handler"
  role             = aws_iam_role.lambda_user_handler.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256
  source_code_hash = data.archive_file.user_handler.output_base64sha256

  layers = [aws_lambda_layer_version.powertools.arn]

  environment {
    variables = {
      LOG_LEVEL       = "INFO"
      USERS_TABLE     = aws_dynamodb_table.users.name
      POWERTOOLS_SERVICE_NAME = "speech2policy-user"
    }
  }

  tags = {
    Name = "user-handler"
  }
}

resource "aws_cloudwatch_log_group" "user_handler" {
  name              = "/aws/lambda/${aws_lambda_function.user_handler.function_name}"
  retention_in_days = var.log_retention_days
}

# ================================================================
# Lambda Permissions for API Gateway
# ================================================================
resource "aws_lambda_permission" "chat_handler_api" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.chat_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "history_handler_api" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.history_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "user_handler_api" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.user_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# ================================================================
# Outputs
# ================================================================
output "lambda_functions" {
  description = "Lambda function ARNs"
  value = {
    chat_handler    = aws_lambda_function.chat_handler.arn
    history_handler = aws_lambda_function.history_handler.arn
    user_handler    = aws_lambda_function.user_handler.arn
  }
}
