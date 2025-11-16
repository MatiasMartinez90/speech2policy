# ============================================================================
# CloudWatch Alarms - Monitoreo Proactivo
# ============================================================================
# Implementación de Quick Win #1: CloudWatch Alarms
# 4 alarmas críticas para detectar problemas antes que los usuarios
# ============================================================================

# ============================================================================
# SNS Topic para Notificaciones
# ============================================================================

resource "aws_sns_topic" "alarms" {
  name = "cloudacademy-alarms"

  tags = {
    Name        = "cloudacademy-alarms"
    Description = "Topic para notificaciones de CloudWatch Alarms"
  }
}

# SNS Subscription - Email para recibir alertas
# IMPORTANTE: Debes confirmar la subscripción en tu email después del deploy
resource "aws_sns_topic_subscription" "alarms_email" {
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alarm_email # matias@cloudacademy.ar
}

# SNS Subscription adicional - Gmail
resource "aws_sns_topic_subscription" "alarms_email_gmail" {
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = "matias.martinez90@gmail.com"
}

# ============================================================================
# ALARMA 1: Lambda Errors (CRÍTICA)
# ============================================================================
# Detecta cuando algún lambda falla
# Threshold: > 5 errores en 5 minutos

resource "aws_cloudwatch_metric_alarm" "courses_handler_errors" {
  alarm_name          = "Lambda-CoursesHandler-Errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300" # 5 minutos
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "Courses Handler errors > 5 en 5 minutos"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.courses_handler.function_name
  }

  tags = {
    Name     = "courses-handler-errors"
    Severity = "CRITICAL"
  }
}

resource "aws_cloudwatch_metric_alarm" "tutor_handler_errors" {
  alarm_name          = "Lambda-TutorHandler-Errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "Tutor Handler errors > 5 en 5 minutos"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.tutor_handler.function_name
  }

  tags = {
    Name     = "tutor-handler-errors"
    Severity = "CRITICAL"
  }
}

resource "aws_cloudwatch_metric_alarm" "admin_handler_errors" {
  alarm_name          = "Lambda-AdminHandler-Errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "Admin Handler errors > 5 en 5 minutos"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.admin_handler.function_name
  }

  tags = {
    Name     = "admin-handler-errors"
    Severity = "CRITICAL"
  }
}

resource "aws_cloudwatch_metric_alarm" "categories_handler_errors" {
  alarm_name          = "Lambda-CategoriesHandler-Errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "Categories Handler errors > 5 en 5 minutos"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.categories_handler.function_name
  }

  tags = {
    Name     = "categories-handler-errors"
    Severity = "CRITICAL"
  }
}

resource "aws_cloudwatch_metric_alarm" "progress_handler_errors" {
  alarm_name          = "Lambda-ProgressHandler-Errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "Progress Handler errors > 5 en 5 minutos"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.progress_handler.function_name
  }

  tags = {
    Name     = "progress-handler-errors"
    Severity = "CRITICAL"
  }
}

resource "aws_cloudwatch_metric_alarm" "sections_handler_errors" {
  alarm_name          = "Lambda-SectionsHandler-Errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "Sections Handler errors > 5 en 5 minutos"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.sections_handler.function_name
  }

  tags = {
    Name     = "sections-handler-errors"
    Severity = "CRITICAL"
  }
}

resource "aws_cloudwatch_metric_alarm" "upload_handler_errors" {
  alarm_name          = "Lambda-UploadHandler-Errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "Upload Handler errors > 5 en 5 minutos"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.upload_handler.function_name
  }

  tags = {
    Name     = "upload-handler-errors"
    Severity = "CRITICAL"
  }
}

# ============================================================================
# ALARMA 2: Lambda Duration (WARNING)
# ============================================================================
# Detecta cuando los lambdas se vuelven lentos
# Threshold: Promedio > 5 segundos en 5 minutos

resource "aws_cloudwatch_metric_alarm" "tutor_handler_duration" {
  alarm_name          = "Lambda-TutorHandler-Duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Average"
  threshold           = "5000" # 5 segundos en milisegundos
  alarm_description   = "Tutor Handler duration > 5s promedio (Bedrock lento)"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.tutor_handler.function_name
  }

  tags = {
    Name     = "tutor-handler-duration"
    Severity = "WARNING"
  }
}

# ============================================================================
# ALARMA 3: DynamoDB Throttling (CRÍTICA)
# ============================================================================
# Detecta cuando DynamoDB rechaza requests por falta de capacidad
# Threshold: > 10 throttles en 5 minutos

resource "aws_cloudwatch_metric_alarm" "dynamodb_throttling" {
  alarm_name          = "DynamoDB-Throttling-Critical"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "UserErrors"
  namespace           = "AWS/DynamoDB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "DynamoDB throttling > 10 en 5 min (aumentar capacidad)"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = aws_dynamodb_table.courses_catalog.name
  }

  tags = {
    Name     = "dynamodb-throttling"
    Severity = "CRITICAL"
  }
}

# ============================================================================
# ALARMA 4: Circuit Breaker Open (CRÍTICA)
# ============================================================================
# Detecta cuando el circuit breaker se abre por fallos de Bedrock
# Requiere: Metric Filter + Alarma

# Metric Filter: Extrae "Circuit breaker opened" de los logs
resource "aws_cloudwatch_log_metric_filter" "circuit_breaker" {
  name           = "CircuitBreakerOpen"
  log_group_name = aws_cloudwatch_log_group.tutor_handler_logs.name
  pattern        = "Circuit breaker opened"

  metric_transformation {
    name      = "CircuitBreakerOpen"
    namespace = "CloudAcademy/CircuitBreaker"
    value     = "1"
  }
}

# Alarma basada en el metric filter
resource "aws_cloudwatch_metric_alarm" "circuit_breaker_alarm" {
  alarm_name          = "CircuitBreaker-Open-Critical"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "CircuitBreakerOpen"
  namespace           = "CloudAcademy/CircuitBreaker"
  period              = "600" # 10 minutos
  statistic           = "Sum"
  threshold           = "3"
  alarm_description   = "Circuit breaker abierto > 3 veces en 10 min (Bedrock API caído)"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  treat_missing_data  = "notBreaching"

  tags = {
    Name     = "circuit-breaker-open"
    Severity = "CRITICAL"
  }
}

# ============================================================================
# Outputs
# ============================================================================

output "sns_topic_arn" {
  description = "ARN del SNS topic para alarmas"
  value       = aws_sns_topic.alarms.arn
}

output "alarm_names" {
  description = "Lista de alarmas creadas"
  value = [
    aws_cloudwatch_metric_alarm.courses_handler_errors.alarm_name,
    aws_cloudwatch_metric_alarm.tutor_handler_errors.alarm_name,
    aws_cloudwatch_metric_alarm.admin_handler_errors.alarm_name,
    aws_cloudwatch_metric_alarm.categories_handler_errors.alarm_name,
    aws_cloudwatch_metric_alarm.progress_handler_errors.alarm_name,
    aws_cloudwatch_metric_alarm.sections_handler_errors.alarm_name,
    aws_cloudwatch_metric_alarm.upload_handler_errors.alarm_name,
    aws_cloudwatch_metric_alarm.tutor_handler_duration.alarm_name,
    aws_cloudwatch_metric_alarm.dynamodb_throttling.alarm_name,
    aws_cloudwatch_metric_alarm.circuit_breaker_alarm.alarm_name,
  ]
}
