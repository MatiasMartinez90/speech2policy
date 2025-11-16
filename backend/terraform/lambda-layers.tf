# ================================================================
# Lambda Layers - Shared Dependencies
# ================================================================
# AWS Lambda Powertools and common dependencies
# ================================================================

# ================================================================
# 1. AWS Lambda Powertools Layer
# ================================================================
# Note: In production, build this layer using:
#   mkdir -p lambda-layers/powertools/python
#   pip install aws-lambda-powertools -t lambda-layers/powertools/python/
#   cd lambda-layers/powertools && zip -r ../powertools.zip .
#
# For MVP, we can use the AWS-provided Powertools layer ARN

resource "aws_lambda_layer_version" "powertools" {
  filename            = "${path.module}/../lambda-layers/powertools.zip"
  layer_name          = "${var.project_name}-${var.environment}-powertools"
  compatible_runtimes = ["python3.11", "python3.10", "python3.9"]
  description         = "AWS Lambda Powertools for Python"

  # Only create if the zip file exists
  # For initial deployment, comment this out and use AWS managed layer below
}

# Alternative: Use AWS-managed Powertools layer (recommended for quick start)
# Uncomment this and comment out the above if you want to use AWS managed layer
/*
data "aws_lambda_layer_version" "powertools" {
  layer_name = "AWSLambdaPowertoolsPythonV2"
}

# Then in lambdas-iam-copilot.tf, change:
#   layers = [aws_lambda_layer_version.powertools.arn]
# To:
#   layers = [data.aws_lambda_layer_version.powertools.arn]
*/

# ================================================================
# 2. Common Dependencies Layer (Optional)
# ================================================================
# For additional dependencies shared across Lambdas
# Include: boto3, botocore, requests, etc.

resource "aws_lambda_layer_version" "common_dependencies" {
  filename            = "${path.module}/../lambda-layers/common-dependencies.zip"
  layer_name          = "${var.project_name}-${var.environment}-common-deps"
  compatible_runtimes = ["python3.11", "python3.10"]
  description         = "Common dependencies for IAM Copilot Lambdas"

  # Build instructions:
  # mkdir -p lambda-layers/common-dependencies/python
  # pip install boto3 requests -t lambda-layers/common-dependencies/python/
  # cd lambda-layers/common-dependencies && zip -r ../common-dependencies.zip .
}

# ================================================================
# Build Scripts (stored as local files)
# ================================================================
# Create these scripts in backend/lambda-layers/

# build-powertools.sh:
/*
#!/bin/bash
set -e

LAYER_DIR="lambda-layers/powertools"
rm -rf $LAYER_DIR
mkdir -p $LAYER_DIR/python

pip install \
  aws-lambda-powertools \
  -t $LAYER_DIR/python/

cd $LAYER_DIR
zip -r ../powertools.zip .
cd ../..

echo "Powertools layer built: lambda-layers/powertools.zip"
*/

# build-common-deps.sh:
/*
#!/bin/bash
set -e

LAYER_DIR="lambda-layers/common-dependencies"
rm -rf $LAYER_DIR
mkdir -p $LAYER_DIR/python

pip install \
  boto3 \
  requests \
  -t $LAYER_DIR/python/

cd $LAYER_DIR
zip -r ../common-dependencies.zip .
cd ../..

echo "Common dependencies layer built: lambda-layers/common-dependencies.zip"
*/

# ================================================================
# Outputs
# ================================================================
output "powertools_layer_arn" {
  description = "ARN of Powertools Lambda layer"
  value       = aws_lambda_layer_version.powertools.arn
}

output "common_dependencies_layer_arn" {
  description = "ARN of common dependencies Lambda layer"
  value       = aws_lambda_layer_version.common_dependencies.arn
}
