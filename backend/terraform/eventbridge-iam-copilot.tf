# ================================================================
# IAM Copilot - EventBridge Automation
# ================================================================
# Scheduled triggers and Lambda workflow orchestration
# ================================================================

# ================================================================
# 1. Scheduled Sync Rule (Every 1 Hour)
# ================================================================
resource "aws_cloudwatch_event_rule" "iam_sync_schedule" {
  name                = "${var.project_name}-${var.environment}-iam-sync-schedule"
  description         = "Trigger IAM sync every hour for connected accounts"
  schedule_expression = "rate(1 hour)"

  tags = {
    Name    = "iam-sync-schedule"
    Service = "IAM-Copilot"
  }
}

resource "aws_cloudwatch_event_target" "iam_sync_target" {
  rule      = aws_cloudwatch_event_rule.iam_sync_schedule.name
  target_id = "iam-sync-handler"
  arn       = aws_lambda_function.aws_sync_handler.arn

  # Invoke for all connected accounts
  input = jsonencode({
    source = "eventbridge.scheduled"
  })
}

resource "aws_lambda_permission" "allow_eventbridge_sync" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.aws_sync_handler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.iam_sync_schedule.arn
}

# ================================================================
# 2. Risk Analyzer Trigger (After Sync Completes)
# ================================================================
# Note: In a production setup, we'd use Step Functions for orchestration
# For MVP, we trigger risk-analyzer manually or via API after sync
# This rule can be enabled to auto-trigger on all accounts

resource "aws_cloudwatch_event_rule" "risk_analysis_schedule" {
  name                = "${var.project_name}-${var.environment}-risk-analysis-schedule"
  description         = "Trigger risk analysis after sync (10 minutes after sync)"
  schedule_expression = "rate(1 hour)"
  state               = "DISABLED" # Enable after testing

  tags = {
    Name    = "risk-analysis-schedule"
    Service = "IAM-Copilot"
  }
}

resource "aws_cloudwatch_event_target" "risk_analysis_target" {
  rule      = aws_cloudwatch_event_rule.risk_analysis_schedule.name
  target_id = "risk-analyzer"
  arn       = aws_lambda_function.risk_analyzer.arn
}

resource "aws_lambda_permission" "allow_eventbridge_risk" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.risk_analyzer.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.risk_analysis_schedule.arn
}

# ================================================================
# 3. Findings Generator Trigger (After Risk Analysis)
# ================================================================
resource "aws_cloudwatch_event_rule" "findings_generation_schedule" {
  name                = "${var.project_name}-${var.environment}-findings-generation-schedule"
  description         = "Trigger findings generation after risk analysis"
  schedule_expression = "rate(1 hour)"
  state               = "DISABLED" # Enable after testing

  tags = {
    Name    = "findings-generation-schedule"
    Service = "IAM-Copilot"
  }
}

resource "aws_cloudwatch_event_target" "findings_generation_target" {
  rule      = aws_cloudwatch_event_rule.findings_generation_schedule.name
  target_id = "findings-generator"
  arn       = aws_lambda_function.findings_generator.arn
}

resource "aws_lambda_permission" "allow_eventbridge_findings" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.findings_generator.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.findings_generation_schedule.arn
}

# ================================================================
# 4. Daily Cleanup Rule (Optional - for testing)
# ================================================================
resource "aws_cloudwatch_event_rule" "daily_cleanup" {
  name                = "${var.project_name}-${var.environment}-daily-cleanup"
  description         = "Daily cleanup of old data (relies on DynamoDB TTL)"
  schedule_expression = "cron(0 2 * * ? *)" # 2 AM UTC daily
  state               = "DISABLED"

  tags = {
    Name    = "daily-cleanup"
    Service = "IAM-Copilot"
  }
}

# ================================================================
# 5. Step Functions State Machine (Production Workflow)
# ================================================================
# For production, we recommend using Step Functions to orchestrate:
# Sync → Risk Analysis → Findings Generation → Notifications
#
# Uncomment below to enable Step Functions workflow:

/*
resource "aws_sfn_state_machine" "iam_copilot_workflow" {
  name     = "${var.project_name}-${var.environment}-iam-workflow"
  role_arn = aws_iam_role.step_functions_role.arn

  definition = jsonencode({
    Comment = "IAM Copilot - Sync and Analysis Workflow"
    StartAt = "SyncIAMData"
    States = {
      SyncIAMData = {
        Type     = "Task"
        Resource = aws_lambda_function.aws_sync_handler.arn
        Next     = "AnalyzeRisks"
        Retry = [{
          ErrorEquals     = ["States.TaskFailed"]
          IntervalSeconds = 2
          MaxAttempts     = 3
          BackoffRate     = 2.0
        }]
      }
      AnalyzeRisks = {
        Type     = "Task"
        Resource = aws_lambda_function.risk_analyzer.arn
        Next     = "GenerateFindings"
        Retry = [{
          ErrorEquals     = ["States.TaskFailed"]
          IntervalSeconds = 2
          MaxAttempts     = 3
          BackoffRate     = 2.0
        }]
      }
      GenerateFindings = {
        Type     = "Task"
        Resource = aws_lambda_function.findings_generator.arn
        End      = true
        Retry = [{
          ErrorEquals     = ["States.TaskFailed"]
          IntervalSeconds = 2
          MaxAttempts     = 3
          BackoffRate     = 2.0
        }]
      }
    }
  })

  tags = {
    Name    = "iam-copilot-workflow"
    Service = "IAM-Copilot"
  }
}

resource "aws_iam_role" "step_functions_role" {
  name = "${var.project_name}-${var.environment}-step-functions-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "states.amazonaws.com"
      }
    }]
  })

  tags = {
    Name    = "step-functions-role"
    Service = "IAM-Copilot"
  }
}

resource "aws_iam_role_policy" "step_functions_lambda_invoke" {
  name = "lambda-invoke"
  role = aws_iam_role.step_functions_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "lambda:InvokeFunction"
      ]
      Resource = [
        aws_lambda_function.aws_sync_handler.arn,
        aws_lambda_function.risk_analyzer.arn,
        aws_lambda_function.findings_generator.arn
      ]
    }]
  })
}

# Trigger Step Functions on schedule
resource "aws_cloudwatch_event_target" "step_functions_target" {
  rule      = aws_cloudwatch_event_rule.iam_sync_schedule.name
  target_id = "iam-workflow-step-functions"
  arn       = aws_sfn_state_machine.iam_copilot_workflow.arn
  role_arn  = aws_iam_role.eventbridge_step_functions_role.arn
}

resource "aws_iam_role" "eventbridge_step_functions_role" {
  name = "${var.project_name}-${var.environment}-eventbridge-sfn-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "events.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "eventbridge_step_functions_invoke" {
  name = "step-functions-invoke"
  role = aws_iam_role.eventbridge_step_functions_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "states:StartExecution"
      Resource = aws_sfn_state_machine.iam_copilot_workflow.arn
    }]
  })
}
*/

# ================================================================
# Outputs
# ================================================================
output "iam_sync_schedule_arn" {
  description = "ARN of IAM sync schedule rule"
  value       = aws_cloudwatch_event_rule.iam_sync_schedule.arn
}

output "risk_analysis_schedule_arn" {
  description = "ARN of risk analysis schedule rule"
  value       = aws_cloudwatch_event_rule.risk_analysis_schedule.arn
}

output "findings_generation_schedule_arn" {
  description = "ARN of findings generation schedule rule"
  value       = aws_cloudwatch_event_rule.findings_generation_schedule.arn
}
