# Lambda Warmer - Mantiene courses-handler caliente para evitar cold starts
# Ver documentación completa en: ../LAMBDA_WARMER.md

# ============================================================================
# EventBridge Rule - Ejecuta cada 2 minutos
# ============================================================================

resource "aws_cloudwatch_event_rule" "keep_courses_warm" {
  name                = "keep-courses-handler-warm"
  description         = "Invoca courses-handler cada 2 minutos para evitar cold starts (~99% cobertura)"
  schedule_expression = "rate(2 minutes)"

  # Para deshabilitar temporalmente, cambia a:
  # is_enabled = false

  tags = {
    Name        = "lambda-warmer-courses"
    Purpose     = "performance-optimization"
    Environment = "production"
  }
}

# ============================================================================
# Target - Invocar Lambda con evento especial
# ============================================================================

resource "aws_cloudwatch_event_target" "courses_warmer" {
  rule      = aws_cloudwatch_event_rule.keep_courses_warm.name
  target_id = "courses-handler-target"
  arn       = aws_lambda_function.courses_handler.arn

  # Payload especial para que lambda detecte que es un warmer ping
  input = jsonencode({
    warmer = true
    source = "eventbridge-warmer"
  })
}

# ============================================================================
# Permission - Permitir a EventBridge invocar la Lambda
# ============================================================================

resource "aws_lambda_permission" "allow_eventbridge_warmer" {
  statement_id  = "AllowExecutionFromEventBridgeWarmer"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.courses_handler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.keep_courses_warm.arn
}

# ============================================================================
# CloudWatch Metric Filter - Monitorear invocaciones del warmer
# ============================================================================

resource "aws_cloudwatch_log_metric_filter" "warmer_invocations" {
  name           = "WarmerInvocations"
  log_group_name = aws_cloudwatch_log_group.courses_handler_logs.name
  pattern        = "[time, request_id, level=INFO, location, message=\"Warmer*\"]"

  metric_transformation {
    name      = "WarmerPings"
    namespace = "CloudAcademy/Performance"
    value     = "1"
  }
}

# ============================================================================
# Outputs
# ============================================================================

output "lambda_warmer_rule_arn" {
  description = "ARN de la regla EventBridge para el lambda warmer"
  value       = aws_cloudwatch_event_rule.keep_courses_warm.arn
}

output "lambda_warmer_schedule" {
  description = "Frecuencia del lambda warmer"
  value       = aws_cloudwatch_event_rule.keep_courses_warm.schedule_expression
}

output "lambda_warmer_enabled" {
  description = "Estado del lambda warmer"
  value       = aws_cloudwatch_event_rule.keep_courses_warm.state
}
