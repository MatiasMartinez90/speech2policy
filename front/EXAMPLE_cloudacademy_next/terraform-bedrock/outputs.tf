output "iam_role_arn" {
  description = "ARN of the IAM role for Bedrock access"
  value       = aws_iam_role.fastapi_bedrock_role.arn
}

output "iam_user_name" {
  description = "Name of the IAM user for Bedrock access"
  value       = aws_iam_user.fastapi_bedrock_user.name
}

output "iam_user_arn" {
  description = "ARN of the IAM user for Bedrock access"
  value       = aws_iam_user.fastapi_bedrock_user.arn
}

output "bedrock_policy_arn" {
  description = "ARN of the Bedrock access policy"
  value       = aws_iam_policy.bedrock_access.arn
}

output "access_key_id" {
  description = "Access Key ID for the Bedrock user"
  value       = aws_iam_access_key.fastapi_bedrock_key.id
  sensitive   = true
}

output "secret_access_key" {
  description = "Secret Access Key for the Bedrock user"
  value       = aws_iam_access_key.fastapi_bedrock_key.secret
  sensitive   = true
}

output "ssm_access_key_parameter" {
  description = "SSM Parameter name for access key ID"
  value       = aws_ssm_parameter.bedrock_access_key_id.name
}

output "ssm_secret_key_parameter" {
  description = "SSM Parameter name for secret access key"
  value       = aws_ssm_parameter.bedrock_secret_access_key.name
}

output "bedrock_region" {
  description = "AWS region where Bedrock is configured"
  value       = var.aws_region
}

output "allowed_models" {
  description = "List of allowed Bedrock models"
  value       = var.bedrock_models
}