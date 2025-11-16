#!/bin/bash

set -e

echo "========================================="
echo "Speech2Policy - Infrastructure Setup"
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

# Navigate to infra directory
cd "$(dirname "$0")/../infra"

echo "📦 Initializing Terraform state backend..."
terraform init

echo ""
echo "📋 Planning infrastructure..."
terraform plan -out=tfplan

echo ""
read -p "Do you want to apply this plan? (yes/no): " confirm

if [ "$confirm" == "yes" ]; then
    echo ""
    echo "🚀 Creating infrastructure..."
    terraform apply tfplan

    echo ""
    echo "✅ Infrastructure setup complete!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Note the S3 bucket name and DynamoDB table name from outputs"
    echo "2. Update backend/terraform/backend.tf with these values"
    echo "3. Run ./scripts/deploy-backend.sh to deploy the backend"
else
    echo "❌ Deployment cancelled"
    rm -f tfplan
    exit 0
fi

# Cleanup
rm -f tfplan

echo ""
echo "🎉 Done!"
