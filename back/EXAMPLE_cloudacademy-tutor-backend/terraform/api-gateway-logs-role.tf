# ============================================================================
# CloudWatch Logs Role for API Gateway (SECURITY: CRITICAL-1)
# ============================================================================
# Este role permite a API Gateway escribir logs en CloudWatch
# Requerido para habilitar throttling y logging a nivel de método

data "aws_iam_policy_document" "api_gateway_logs_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["apigateway.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "api_gateway_logs" {
  name               = "api-gateway-cloudwatch-logs-role"
  assume_role_policy = data.aws_iam_policy_document.api_gateway_logs_assume_role.json

  tags = {
    Name        = "api-gateway-cloudwatch-logs-role"
    Description = "Role para permitir a API Gateway escribir logs en CloudWatch"
  }
}

resource "aws_iam_role_policy_attachment" "api_gateway_logs_policy" {
  role       = aws_iam_role.api_gateway_logs.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs"
}

# Configurar el role a nivel de cuenta
resource "aws_api_gateway_account" "main" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_logs.arn

  depends_on = [aws_iam_role_policy_attachment.api_gateway_logs_policy]
}

# Output para verificación
output "api_gateway_logs_role_arn" {
  description = "ARN del role de CloudWatch Logs para API Gateway"
  value       = aws_iam_role.api_gateway_logs.arn
}
