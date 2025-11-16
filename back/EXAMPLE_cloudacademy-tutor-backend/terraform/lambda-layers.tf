# Lambda Layers

# ============================================================================
# Lambda Layer: AWS Lambda Powertools
# ============================================================================

resource "aws_lambda_layer_version" "powertools" {
  filename               = "../layers/powertools-layer.zip"
  layer_name             = "cloudacademy-powertools"
  description            = "AWS Lambda Powertools for Python - Logging, Tracing, Metrics (arm64 compatible)"
  compatible_runtimes    = ["python3.11", "python3.12"]
  compatible_architectures = ["x86_64", "arm64"]  # Compatible con ambas arquitecturas
  source_code_hash       = filebase64sha256("../layers/powertools-layer.zip")

  lifecycle {
    create_before_destroy = true
  }
}

# ============================================================================
# Output
# ============================================================================

output "powertools_layer_arn" {
  description = "ARN del Lambda Layer de Powertools"
  value       = aws_lambda_layer_version.powertools.arn
}

output "powertools_layer_version" {
  description = "Versión del Lambda Layer de Powertools"
  value       = aws_lambda_layer_version.powertools.version
}
