# ================================================================
# Speech2Policy Backend - Outputs
# ================================================================

output "summary" {
  description = "Deployment summary"
  value = {
    api_gateway_url = aws_api_gateway_stage.main.invoke_url
    region          = var.aws_region
    environment     = var.environment
  }
}
