# Outputs del módulo API Gateway

output "api_gateway_url" {
  description = "URL base de la API Gateway"
  value       = "https://${aws_api_gateway_rest_api.courses_api.id}.execute-api.us-east-1.amazonaws.com/${aws_api_gateway_stage.courses_api.stage_name}"
}

output "api_gateway_id" {
  description = "ID de la API Gateway"
  value       = aws_api_gateway_rest_api.courses_api.id
}

output "get_user_progress_endpoint" {
  description = "Endpoint completo para getUserProgress"
  value       = "https://${aws_api_gateway_rest_api.courses_api.id}.execute-api.us-east-1.amazonaws.com/${aws_api_gateway_stage.courses_api.stage_name}/api/users/me/progress"
}

output "lambda_function_name" {
  description = "Nombre de la función Lambda getUserProgress"
  value       = aws_lambda_function.get_user_progress.function_name
}

output "lambda_function_arn" {
  description = "ARN de la función Lambda getUserProgress"
  value       = aws_lambda_function.get_user_progress.arn
}# Trigger workflow sábado, 12 de julio de 2025, 09:15:14 -03
