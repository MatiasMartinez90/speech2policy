#!/bin/bash

set -e

echo "========================================="
echo "Speech2Policy - Complete Setup Guide"
echo "========================================="
echo ""
echo "This script will guide you through the complete deployment process."
echo ""

# Function to print section headers
print_section() {
    echo ""
    echo "========================================="
    echo "$1"
    echo "========================================="
    echo ""
}

# Function to wait for user confirmation
wait_for_user() {
    echo ""
    read -p "Press Enter to continue..."
    echo ""
}

# Check prerequisites
print_section "Step 1: Prerequisites Check"

echo "Checking prerequisites..."
echo ""

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found"
    echo "Please install: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi
echo "✓ AWS CLI installed"

# Check Terraform
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform not found"
    echo "Please install: https://developer.hashicorp.com/terraform/downloads"
    exit 1
fi
echo "✓ Terraform installed"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found"
    echo "Please install: https://nodejs.org/"
    exit 1
fi
echo "✓ Node.js installed ($(node --version))"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found"
    exit 1
fi
echo "✓ npm installed ($(npm --version))"

# Check jq (optional but useful)
if ! command -v jq &> /dev/null; then
    echo "⚠️  jq not found (optional, but recommended for JSON parsing)"
else
    echo "✓ jq installed"
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured"
    echo "Please run: aws configure"
    exit 1
fi
echo "✓ AWS credentials configured"
echo "  Account: $(aws sts get-caller-identity --query Account --output text)"
echo "  Region: $(aws configure get region)"

echo ""
echo "✅ All prerequisites met!"
wait_for_user

# Step 2: Infrastructure setup
print_section "Step 2: Terraform State Backend"

echo "First, we need to create the Terraform state backend (S3 + DynamoDB)."
echo "This will store the Terraform state securely."
echo ""
read -p "Do you want to set up the infrastructure backend? (yes/no): " setup_infra

if [ "$setup_infra" == "yes" ]; then
    ./scripts/setup-infra.sh

    echo ""
    echo "⚠️  IMPORTANT: Copy the S3 bucket and DynamoDB table names from above!"
    echo "You'll need to update backend/terraform/backend.tf with these values."
    wait_for_user
fi

# Step 3: Cognito setup
print_section "Step 3: Cognito User Pool Setup"

echo "Next, we'll create the Cognito User Pool for authentication."
echo ""
echo "⚠️  You'll need Google OAuth credentials:"
echo "   1. Go to https://console.cloud.google.com/"
echo "   2. Create a new project or select existing"
echo "   3. Enable Google+ API"
echo "   4. Create OAuth 2.0 credentials"
echo ""
read -p "Do you have Google OAuth credentials ready? (yes/no): " has_google

if [ "$has_google" == "yes" ]; then
    read -p "Enter Google Client ID: " GOOGLE_CLIENT_ID
    read -p "Enter Google Client Secret: " GOOGLE_CLIENT_SECRET
    export GOOGLE_CLIENT_ID
    export GOOGLE_CLIENT_SECRET
fi

read -p "Do you want to set up Cognito now? (yes/no): " setup_cognito

if [ "$setup_cognito" == "yes" ]; then
    ./scripts/setup-cognito.sh

    echo ""
    echo "⚠️  IMPORTANT: Save these environment variables!"
    echo "You can create a .env file with:"
    echo ""
    echo "export COGNITO_USER_POOL_ID=<user_pool_id>"
    echo "export COGNITO_USER_POOL_ARN=<user_pool_arn>"
    echo "export COGNITO_CLIENT_ID=<client_id>"
    echo "export COGNITO_DOMAIN=<cognito_domain>"
    wait_for_user
fi

# Step 4: Backend deployment
print_section "Step 4: Backend Deployment"

echo "Now we'll deploy the backend (Lambda functions, API Gateway, DynamoDB)."
echo ""

if [ -z "$COGNITO_USER_POOL_ID" ]; then
    read -p "Enter Cognito User Pool ID: " COGNITO_USER_POOL_ID
    export COGNITO_USER_POOL_ID
fi

if [ -z "$COGNITO_USER_POOL_ARN" ]; then
    read -p "Enter Cognito User Pool ARN: " COGNITO_USER_POOL_ARN
    export COGNITO_USER_POOL_ARN
fi

read -p "Do you want to deploy the backend? (yes/no): " deploy_backend

if [ "$deploy_backend" == "yes" ]; then
    ./scripts/deploy-backend.sh

    echo ""
    echo "⚠️  IMPORTANT: Save the API Gateway URL!"
    echo "You'll need it for frontend deployment."
    wait_for_user
fi

# Step 5: Frontend infrastructure
print_section "Step 5: Frontend Infrastructure (S3 + CloudFront)"

echo "Now we'll create the frontend hosting infrastructure."
echo ""
read -p "Do you want to deploy frontend infrastructure? (yes/no): " deploy_frontend_infra

if [ "$deploy_frontend_infra" == "yes" ]; then
    cd frontend/terraform/frontend
    terraform init
    terraform plan -out=tfplan
    terraform apply tfplan
    rm -f tfplan

    echo ""
    echo "⚠️  IMPORTANT: Save these values!"
    terraform output -json | jq -r 'to_entries[] | "\(.key): \(.value.value)"'
    cd - > /dev/null
    wait_for_user
fi

# Step 6: Frontend deployment
print_section "Step 6: Frontend Application Deployment"

echo "Finally, we'll build and deploy the Next.js frontend."
echo ""

if [ -z "$NEXT_PUBLIC_API_URL" ]; then
    read -p "Enter API Gateway URL (from backend deployment): " NEXT_PUBLIC_API_URL
    export NEXT_PUBLIC_API_URL
fi

if [ -z "$COGNITO_CLIENT_ID" ]; then
    read -p "Enter Cognito Client ID: " COGNITO_CLIENT_ID
    export COGNITO_CLIENT_ID
fi

if [ -z "$COGNITO_DOMAIN" ]; then
    read -p "Enter Cognito Domain: " COGNITO_DOMAIN
    export COGNITO_DOMAIN
fi

if [ -z "$S3_BUCKET_NAME" ]; then
    read -p "Enter S3 Bucket Name: " S3_BUCKET_NAME
    export S3_BUCKET_NAME
fi

if [ -z "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    read -p "Enter CloudFront Distribution ID (optional): " CLOUDFRONT_DISTRIBUTION_ID
    export CLOUDFRONT_DISTRIBUTION_ID
fi

if [ -z "$CLOUDFRONT_DOMAIN" ]; then
    read -p "Enter CloudFront Domain (optional): " CLOUDFRONT_DOMAIN
    export CLOUDFRONT_DOMAIN
fi

read -p "Do you want to deploy the frontend application? (yes/no): " deploy_frontend_app

if [ "$deploy_frontend_app" == "yes" ]; then
    ./scripts/deploy-frontend.sh
fi

# Complete!
print_section "🎉 Setup Complete!"

echo "Your Speech2Policy application is now deployed!"
echo ""
echo "📋 Summary:"
echo "  ✓ Terraform state backend"
echo "  ✓ Cognito User Pool"
echo "  ✓ Backend API"
echo "  ✓ Frontend infrastructure"
echo "  ✓ Frontend application"
echo ""

if [ ! -z "$CLOUDFRONT_DOMAIN" ]; then
    echo "🌐 Your application: https://$CLOUDFRONT_DOMAIN"
fi

echo ""
echo "📝 Next steps:"
echo "  1. Update Google OAuth authorized redirect URIs"
echo "  2. Test the application"
echo "  3. Set up GitHub Actions secrets for CI/CD"
echo ""
echo "🎉 Happy coding!"
