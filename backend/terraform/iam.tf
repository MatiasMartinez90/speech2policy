# ================================================================
# Speech2Policy Backend - IAM Roles and Policies
# ================================================================

# ================================================================
# Chat Handler IAM Role
# ================================================================
resource "aws_iam_role" "lambda_chat_handler" {
  name = "${var.project_name}-${var.environment}-chat-handler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = {
    Name = "chat-handler-role"
  }
}

# Basic Lambda execution role (CloudWatch Logs)
resource "aws_iam_role_policy_attachment" "chat_handler_basic" {
  role       = aws_iam_role.lambda_chat_handler.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# DynamoDB access policy for chat handler
resource "aws_iam_role_policy" "chat_handler_dynamodb" {
  name = "${var.project_name}-${var.environment}-chat-handler-dynamodb"
  role = aws_iam_role.lambda_chat_handler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          aws_dynamodb_table.users.arn,
          aws_dynamodb_table.chat_sessions.arn,
          aws_dynamodb_table.chat_messages.arn,
          aws_dynamodb_table.policies.arn,
          aws_dynamodb_table.user_usage.arn,
          "${aws_dynamodb_table.chat_sessions.arn}/index/*",
          "${aws_dynamodb_table.policies.arn}/index/*"
        ]
      }
    ]
  })
}

# Bedrock access policy for chat handler
resource "aws_iam_role_policy" "chat_handler_bedrock" {
  name = "${var.project_name}-${var.environment}-chat-handler-bedrock"
  role = aws_iam_role.lambda_chat_handler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = [
          "arn:aws:bedrock:${var.aws_region}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
        ]
      }
    ]
  })
}

# ================================================================
# History Handler IAM Role
# ================================================================
resource "aws_iam_role" "lambda_history_handler" {
  name = "${var.project_name}-${var.environment}-history-handler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = {
    Name = "history-handler-role"
  }
}

resource "aws_iam_role_policy_attachment" "history_handler_basic" {
  role       = aws_iam_role.lambda_history_handler.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "history_handler_dynamodb" {
  name = "${var.project_name}-${var.environment}-history-handler-dynamodb"
  role = aws_iam_role.lambda_history_handler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.policies.arn,
          "${aws_dynamodb_table.policies.arn}/index/*"
        ]
      }
    ]
  })
}

# ================================================================
# User Handler IAM Role
# ================================================================
resource "aws_iam_role" "lambda_user_handler" {
  name = "${var.project_name}-${var.environment}-user-handler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = {
    Name = "user-handler-role"
  }
}

resource "aws_iam_role_policy_attachment" "user_handler_basic" {
  role       = aws_iam_role.lambda_user_handler.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "user_handler_dynamodb" {
  name = "${var.project_name}-${var.environment}-user-handler-dynamodb"
  role = aws_iam_role.lambda_user_handler.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem"
        ]
        Resource = [
          aws_dynamodb_table.users.arn
        ]
      }
    ]
  })
}
