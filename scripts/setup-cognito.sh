#!/bin/bash

set -e

echo "========================================="
echo "Speech2Policy - Cognito Setup"
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

# Check for Google OAuth credentials
if [ -z "$GOOGLE_CLIENT_ID" ]; then
    echo "⚠️  Warning: GOOGLE_CLIENT_ID not set"
    echo "You'll need Google OAuth credentials from https://console.cloud.google.com/"
    echo ""
    read -p "Enter Google Client ID (or press Enter to skip): " GOOGLE_CLIENT_ID
fi

if [ -z "$GOOGLE_CLIENT_SECRET" ]; then
    echo "⚠️  Warning: GOOGLE_CLIENT_SECRET not set"
    echo ""
    read -p "Enter Google Client Secret (or press Enter to skip): " GOOGLE_CLIENT_SECRET
fi

# Navigate to Cognito Terraform directory
cd "$(dirname "$0")/../frontend/terraform/backend"

echo "🔧 Initializing Terraform..."
terraform init

echo ""
echo "📋 Planning Cognito infrastructure..."

if [ ! -z "$GOOGLE_CLIENT_ID" ] && [ ! -z "$GOOGLE_CLIENT_SECRET" ]; then
    terraform plan \
        -var="google_client_id=$GOOGLE_CLIENT_ID" \
        -var="google_client_secret=$GOOGLE_CLIENT_SECRET" \
        -out=tfplan
else
    echo "⚠️  Deploying without Google OAuth (you can add it later)"
    terraform plan -out=tfplan
fi

echo ""
read -p "Do you want to apply this plan? (yes/no): " confirm

if [ "$confirm" == "yes" ]; then
    echo ""
    echo "🚀 Creating Cognito User Pool..."
    terraform apply -auto-approve tfplan

    echo ""
    echo "✅ Cognito setup complete!"
    echo ""
    echo "📝 Important outputs:"
    echo "-------------------"
    terraform output -json | jq -r 'to_entries[] | "\(.key): \(.value.value)"'

    echo ""
    echo "💡 Next steps:"
    echo "1. Save the User Pool ID and ARN as environment variables"
    echo "2. Update Google OAuth Authorized Redirect URIs with the Cognito domain"
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
