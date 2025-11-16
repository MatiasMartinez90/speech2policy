# AWS WAF v2 para API Gateway
# Protege contra ataques comunes: SQL injection, XSS, rate limiting, etc.

# ============================================================================
# WAF WebACL para API Gateway
# ============================================================================

resource "aws_wafv2_web_acl" "api_gateway_waf" {
  name        = "cloudacademy-api-waf"
  description = "WAF rules para CloudAcademy API Gateway"
  scope       = "REGIONAL" # Para API Gateway REST, usar REGIONAL

  default_action {
    allow {}
  }

  # Regla 1: AWS Managed Rules - Core Rule Set (OWASP Top 10)
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        # Excluir reglas que podrían causar falsos positivos
        rule_action_override {
          action_to_use {
            count {} # Solo contar, no bloquear
          }
          name = "SizeRestrictions_BODY"
        }

        rule_action_override {
          action_to_use {
            count {}
          }
          name = "GenericRFI_BODY"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # Regla 2: Rate Limiting - Máximo 2000 requests por 5 minutos por IP
  rule {
    name     = "RateLimitRule"
    priority = 2

    action {
      block {
        custom_response {
          response_code = 429
          custom_response_body_key = "rate_limit_response"
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = 2000 # 2000 requests per 5 minutes
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRuleMetric"
      sampled_requests_enabled   = true
    }
  }

  # Regla 5: Bloquear IPs específicas (si es necesario)
  # Descomentado cuando quieras agregar IPs a la lista negra
  # rule {
  #   name     = "BlockSpecificIPs"
  #   priority = 5
  #
  #   action {
  #     block {}
  #   }
  #
  #   statement {
  #     ip_set_reference_statement {
  #       arn = aws_wafv2_ip_set.blocked_ips.arn
  #     }
  #   }
  #
  #   visibility_config {
  #     cloudwatch_metrics_enabled = true
  #     metric_name                = "BlockSpecificIPsMetric"
  #     sampled_requests_enabled   = true
  #   }
  # }

  # Custom response body para rate limiting
  custom_response_body {
    key          = "rate_limit_response"
    content      = jsonencode({
      message = "Too many requests. Please try again later."
      error   = "rate_limit_exceeded"
    })
    content_type = "APPLICATION_JSON"
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "CloudAcademyAPIWAF"
    sampled_requests_enabled   = true
  }

  tags = {
    Name        = "cloudacademy-api-waf"
    Environment = "production"
  }
}

# ============================================================================
# IP Set para bloquear IPs específicas (opcional)
# ============================================================================

# resource "aws_wafv2_ip_set" "blocked_ips" {
#   name               = "cloudacademy-blocked-ips"
#   description        = "Lista de IPs bloqueadas"
#   scope              = "REGIONAL"
#   ip_address_version = "IPV4"
#
#   addresses = [
#     # Agregar IPs a bloquear aquí
#     # "192.0.2.0/24",
#     # "198.51.100.0/24",
#   ]
#
#   tags = {
#     Name = "cloudacademy-blocked-ips"
#   }
# }

# ============================================================================
# Asociar WAF con API Gateway Stage
# ============================================================================

resource "aws_wafv2_web_acl_association" "api_gateway" {
  resource_arn = aws_api_gateway_stage.prod.arn
  web_acl_arn  = aws_wafv2_web_acl.api_gateway_waf.arn
}

# ============================================================================
# CloudWatch Log Group para WAF (opcional)
# ============================================================================

# NOTA: WAF logging a CloudWatch Logs tiene requerimientos especiales y costos adicionales
# Por ahora lo dejamos comentado. Las métricas de CloudWatch son suficientes para monitoreo básico.

# resource "aws_cloudwatch_log_group" "waf_logs" {
#   name              = "/aws/wafv2/cloudacademy-api"
#   retention_in_days = 7
#
#   tags = {
#     Name = "cloudacademy-waf-logs"
#   }
# }

# resource "aws_wafv2_web_acl_logging_configuration" "api_waf_logging" {
#   resource_arn = aws_wafv2_web_acl.api_gateway_waf.arn
#   log_destination_configs = ["arn:aws:logs:us-east-1:982081083386:log-group:aws-waf-logs-cloudacademy"]
#
#   redacted_fields {
#     single_header {
#       name = "authorization"
#     }
#   }
#
#   redacted_fields {
#     single_header {
#       name = "cookie"
#     }
#   }
# }

# ============================================================================
# CloudWatch Alarms para WAF
# ============================================================================

# Alarma cuando hay muchos requests bloqueados (posible ataque)
resource "aws_cloudwatch_metric_alarm" "waf_blocked_requests" {
  alarm_name          = "WAF-BlockedRequests-High"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = 300 # 5 minutos
  statistic           = "Sum"
  threshold           = 100 # Más de 100 requests bloqueados en 5 min
  alarm_description   = "Alerta cuando WAF bloquea más de 100 requests en 5 minutos (posible ataque)"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    WebACL = aws_wafv2_web_acl.api_gateway_waf.name
    Region = var.aws_region
    Rule   = "ALL"
  }

  tags = {
    Name = "waf-blocked-requests-alarm"
  }
}

# ============================================================================
# Outputs
# ============================================================================

output "waf_web_acl_id" {
  description = "ID del WAF WebACL"
  value       = aws_wafv2_web_acl.api_gateway_waf.id
}

output "waf_web_acl_arn" {
  description = "ARN del WAF WebACL"
  value       = aws_wafv2_web_acl.api_gateway_waf.arn
}

output "waf_web_acl_capacity" {
  description = "Capacidad de reglas utilizada por el WAF"
  value       = aws_wafv2_web_acl.api_gateway_waf.capacity
}
