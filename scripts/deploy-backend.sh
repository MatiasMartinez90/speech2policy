#!/bin/bash

set -e

echo "========================================="
echo "Speech2Policy - Backend Deployment"
echo "========================================="
echo ""

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Error: AWS CLI is not configured"
    echo "Please run: aws configure"
    exit 1
fi

echo "✓ AWS CLI configured"
echo ""

# Check for required environment variables
if [ -z "$COGNITO_USER_POOL_ID" ]; then
    echo "❌ Error: COGNITO_USER_POOL_ID environment variable not set"
    echo "Please run: export COGNITO_USER_POOL_ID=your-pool-id"
    exit 1
fi

if [ -z "$COGNITO_USER_POOL_ARN" ]; then
    echo "❌ Error: COGNITO_USER_POOL_ARN environment variable not set"
    echo "Please run: export COGNITO_USER_POOL_ARN=your-pool-arn"
    exit 1
fi

echo "✓ Cognito variables set"
echo ""

# Build Lambda Layer
echo "📦 Building Lambda Powertools layer..."
cd "$(dirname "$0")/../backend/layers"
chmod +x build-powertools-layer.sh
./build-powertools-layer.sh

echo ""
echo "✓ Lambda layer built"
echo ""

# Navigate to Terraform directory
cd ../terraform

echo "🔧 Initializing Terraform..."
terraform init

echo ""
echo "✅ Validating Terraform configuration..."
terraform validate

echo ""
echo "📋 Planning backend deployment..."
terraform plan \
    -var="cognito_user_pool_id=$COGNITO_USER_POOL_ID" \
    -var="cognito_user_pool_arn=$COGNITO_USER_POOL_ARN" \
    -out=tfplan

echo ""
read -p "Do you want to apply this plan? (yes/no): " confirm

if [ "$confirm" == "yes" ]; then
    echo ""
    echo "🚀 Deploying backend..."
    terraform apply -auto-approve tfplan

    echo ""
    echo "✅ Backend deployment complete!"
    echo ""
    echo "📝 API Gateway URL:"
    terraform output api_gateway_url

    echo ""
    echo "💡 Save this URL and set it as NEXT_PUBLIC_API_URL for frontend deployment"
else
    echo "❌ Deployment cancelled"
    rm -f tfplan
    exit 0
fi

# Cleanup
rm -f tfplan

echo ""
echo "🎉 Done!"
