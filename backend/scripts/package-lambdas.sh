#!/bin/bash
# ================================================================
# Package All Lambda Functions
# ================================================================
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LAMBDAS_DIR="$SCRIPT_DIR/../lambdas"

echo "📦 Packaging IAM Copilot Lambda Functions..."
echo ""

# Array of Lambda function directories
LAMBDAS=(
  "aws-sync-handler"
  "risk-analyzer"
  "findings-generator"
  "account-manager"
  "apply-executor"
)

for lambda in "${LAMBDAS[@]}"; do
  echo "📦 Packaging $lambda..."

  LAMBDA_DIR="$LAMBDAS_DIR/$lambda"

  if [ ! -d "$LAMBDA_DIR" ]; then
    echo "❌ Directory not found: $LAMBDA_DIR"
    continue
  fi

  cd "$LAMBDA_DIR"

  # Remove old deployment package
  rm -f deployment.zip

  # Create new deployment package
  zip -r deployment.zip lambda_function.py -q

  # Add requirements if exists
  if [ -f "requirements.txt" ]; then
    echo "   Installing dependencies from requirements.txt..."
    pip install -r requirements.txt -t . --upgrade --quiet
    zip -r deployment.zip . -x "*.pyc" -x "deployment.zip" -x "lambda_function.py" -x "requirements.txt" -q
  fi

  FILE_SIZE=$(du -h deployment.zip | cut -f1)
  echo "   ✅ $lambda packaged ($FILE_SIZE)"
  echo ""
done

cd "$SCRIPT_DIR"

echo "✅ All Lambda functions packaged successfully!"
echo ""
echo "Next steps:"
echo "1. Build Lambda layers: cd ../lambda-layers && ./build-all.sh"
echo "2. Deploy with Terraform: cd ../terraform && terraform apply"
