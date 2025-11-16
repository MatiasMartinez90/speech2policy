# ================================================================
# IAM Copilot - IAM Roles for Lambda Functions
# ================================================================
# Least privilege IAM roles for each Lambda
# ================================================================

# ================================================================
# 1. AWS Sync Handler IAM Role
# ================================================================
resource "aws_iam_role" "aws_sync_handler_role" {
  name = "${var.project_name}-${var.environment}-aws-sync-handler-role"

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
    Name    = "aws-sync-handler-role"
    Service = "IAM-Copilot"
  }
}

# CloudWatch Logs for aws-sync-handler
resource "aws_iam_role_policy" "aws_sync_handler_logs" {
  name = "cloudwatch-logs"
  role = aws_iam_role.aws_sync_handler_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
      Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.project_name}-${var.environment}-aws-sync-handler:*"
    }]
  })
}

# DynamoDB access for aws-sync-handler
resource "aws_iam_role_policy" "aws_sync_handler_dynamodb" {
  name = "dynamodb-access"
  role = aws_iam_role.aws_sync_handler_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ]
      Resource = [
        aws_dynamodb_table.roles.arn,
        "${aws_dynamodb_table.roles.arn}/index/*",
        aws_dynamodb_table.policies.arn,
        "${aws_dynamodb_table.policies.arn}/index/*",
        aws_dynamodb_table.accounts.arn,
        "${aws_dynamodb_table.accounts.arn}/index/*"
      ]
    }]
  })
}

# AssumeRole permission for aws-sync-handler
resource "aws_iam_role_policy" "aws_sync_handler_assume_role" {
  name = "assume-role"
  role = aws_iam_role.aws_sync_handler_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "sts:AssumeRole"
      Resource = "arn:aws:iam::*:role/IAMCopilotReadRole"
      # Note: In production, add Condition with ExternalId
    }]
  })
}

# ================================================================
# 2. Risk Analyzer IAM Role
# ================================================================
resource "aws_iam_role" "risk_analyzer_role" {
  name = "${var.project_name}-${var.environment}-risk-analyzer-role"

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
    Name    = "risk-analyzer-role"
    Service = "IAM-Copilot"
  }
}

resource "aws_iam_role_policy" "risk_analyzer_logs" {
  name = "cloudwatch-logs"
  role = aws_iam_role.risk_analyzer_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
      Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.project_name}-${var.environment}-risk-analyzer:*"
    }]
  })
}

resource "aws_iam_role_policy" "risk_analyzer_dynamodb" {
  name = "dynamodb-access"
  role = aws_iam_role.risk_analyzer_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query"
      ]
      Resource = [
        aws_dynamodb_table.roles.arn,
        "${aws_dynamodb_table.roles.arn}/index/*",
        aws_dynamodb_table.policies.arn,
        "${aws_dynamodb_table.policies.arn}/index/*"
      ]
    }]
  })
}

# ================================================================
# 3. Findings Generator IAM Role
# ================================================================
resource "aws_iam_role" "findings_generator_role" {
  name = "${var.project_name}-${var.environment}-findings-generator-role"

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
    Name    = "findings-generator-role"
    Service = "IAM-Copilot"
  }
}

resource "aws_iam_role_policy" "findings_generator_logs" {
  name = "cloudwatch-logs"
  role = aws_iam_role.findings_generator_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
      Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.project_name}-${var.environment}-findings-generator:*"
    }]
  })
}

resource "aws_iam_role_policy" "findings_generator_dynamodb" {
  name = "dynamodb-access"
  role = aws_iam_role.findings_generator_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ]
      Resource = [
        aws_dynamodb_table.roles.arn,
        "${aws_dynamodb_table.roles.arn}/index/*",
        aws_dynamodb_table.policies.arn,
        "${aws_dynamodb_table.policies.arn}/index/*",
        aws_dynamodb_table.findings.arn,
        "${aws_dynamodb_table.findings.arn}/index/*",
        aws_dynamodb_table.accounts.arn,
        "${aws_dynamodb_table.accounts.arn}/index/*"
      ]
    }]
  })
}

# ================================================================
# 4. Account Manager IAM Role
# ================================================================
resource "aws_iam_role" "account_manager_role" {
  name = "${var.project_name}-${var.environment}-account-manager-role"

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
    Name    = "account-manager-role"
    Service = "IAM-Copilot"
  }
}

resource "aws_iam_role_policy" "account_manager_logs" {
  name = "cloudwatch-logs"
  role = aws_iam_role.account_manager_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
      Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.project_name}-${var.environment}-account-manager:*"
    }]
  })
}

resource "aws_iam_role_policy" "account_manager_dynamodb" {
  name = "dynamodb-access"
  role = aws_iam_role.account_manager_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ]
      Resource = [
        aws_dynamodb_table.accounts.arn,
        "${aws_dynamodb_table.accounts.arn}/index/*"
      ]
    }]
  })
}

resource "aws_iam_role_policy" "account_manager_sts" {
  name = "sts-assume-role"
  role = aws_iam_role.account_manager_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "sts:AssumeRole"
      Resource = "arn:aws:iam::*:role/IAMCopilotReadRole"
    }]
  })
}

# ================================================================
# 5. Apply Executor IAM Role
# ================================================================
resource "aws_iam_role" "apply_executor_role" {
  name = "${var.project_name}-${var.environment}-apply-executor-role"

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
    Name    = "apply-executor-role"
    Service = "IAM-Copilot"
  }
}

resource "aws_iam_role_policy" "apply_executor_logs" {
  name = "cloudwatch-logs"
  role = aws_iam_role.apply_executor_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
      Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.project_name}-${var.environment}-apply-executor:*"
    }]
  })
}

resource "aws_iam_role_policy" "apply_executor_dynamodb" {
  name = "dynamodb-access"
  role = aws_iam_role.apply_executor_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query"
      ]
      Resource = [
        aws_dynamodb_table.apply_requests.arn,
        "${aws_dynamodb_table.apply_requests.arn}/index/*",
        aws_dynamodb_table.accounts.arn,
        "${aws_dynamodb_table.accounts.arn}/index/*",
        aws_dynamodb_table.audit_log.arn,
        "${aws_dynamodb_table.audit_log.arn}/index/*"
      ]
    }]
  })
}

resource "aws_iam_role_policy" "apply_executor_cloudformation" {
  name = "cloudformation-access"
  role = aws_iam_role.apply_executor_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "cloudformation:CreateChangeSet",
        "cloudformation:DescribeChangeSet",
        "cloudformation:ExecuteChangeSet",
        "cloudformation:DescribeStacks",
        "cloudformation:ListStacks"
      ]
      Resource = "*"
    }]
  })
}

resource "aws_iam_role_policy" "apply_executor_sts" {
  name = "sts-assume-role"
  role = aws_iam_role.apply_executor_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "sts:AssumeRole"
      Resource = "arn:aws:iam::*:role/IAMCopilotApplyRole"
      # Note: Customers would deploy a separate role with write permissions
    }]
  })
}
