#!/bin/bash

echo "========================================="
echo "GitHub Secrets Setup Guide"
echo "========================================="
echo ""
echo "This script will help you set up GitHub Actions secrets."
echo "You'll need the GitHub CLI (gh) installed and authenticated."
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) not found"
    echo ""
    echo "Please install it from: https://cli.github.com/"
    echo ""
    echo "Alternative: You can set secrets manually via:"
    echo "  https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions"
    echo ""
    echo "Required secrets:"
    echo "  - AWS_ACCESS_KEY_ID"
    echo "  - AWS_SECRET_ACCESS_KEY"
    echo "  - COGNITO_USER_POOL_ID"
    echo "  - COGNITO_USER_POOL_ARN"
    echo "  - COGNITO_CLIENT_ID"
    echo "  - COGNITO_DOMAIN"
    echo "  - S3_BUCKET_NAME"
    echo "  - CLOUDFRONT_DISTRIBUTION_ID"
    echo "  - CLOUDFRONT_DOMAIN"
    echo "  - NEXT_PUBLIC_API_URL"
    exit 1
fi

echo "✓ GitHub CLI installed"
echo ""

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub"
    echo "Please run: gh auth login"
    exit 1
fi

echo "✓ Authenticated with GitHub"
echo ""

# Get repository info
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo "📦 Repository: $REPO"
echo ""

echo "We'll now set up the required secrets for GitHub Actions."
echo "⚠️  Make sure you have all the values ready!"
echo ""

# Function to set a secret
set_secret() {
    local name=$1
    local description=$2
    local value=""

    echo "---"
    echo "Setting: $name"
    echo "Description: $description"
    read -p "Enter value (or press Enter to skip): " value

    if [ ! -z "$value" ]; then
        echo "$value" | gh secret set "$name"
        echo "✓ $name set successfully"
    else
        echo "⊘ Skipped $name"
    fi
    echo ""
}

# AWS Credentials
echo "========================================="
echo "AWS Credentials"
echo "========================================="
echo ""
set_secret "AWS_ACCESS_KEY_ID" "AWS Access Key ID for deployment"
set_secret "AWS_SECRET_ACCESS_KEY" "AWS Secret Access Key for deployment"

# Cognito
echo "========================================="
echo "Cognito Configuration"
echo "========================================="
echo ""
set_secret "COGNITO_USER_POOL_ID" "Cognito User Pool ID (e.g., us-east-1_xxxxx)"
set_secret "COGNITO_USER_POOL_ARN" "Cognito User Pool ARN"
set_secret "COGNITO_CLIENT_ID" "Cognito App Client ID"
set_secret "COGNITO_DOMAIN" "Cognito Domain (e.g., speech2policy-dev.auth.us-east-1.amazoncognito.com)"

# Frontend Infrastructure
echo "========================================="
echo "Frontend Infrastructure"
echo "========================================="
echo ""
set_secret "S3_BUCKET_NAME" "S3 bucket for frontend hosting"
set_secret "CLOUDFRONT_DISTRIBUTION_ID" "CloudFront distribution ID"
set_secret "CLOUDFRONT_DOMAIN" "CloudFront domain (e.g., d1234567890.cloudfront.net)"

# API Gateway
echo "========================================="
echo "Backend API"
echo "========================================="
echo ""
set_secret "NEXT_PUBLIC_API_URL" "API Gateway URL (from backend deployment)"

echo "========================================="
echo "✅ Secrets setup complete!"
echo "========================================="
echo ""
echo "You can verify the secrets at:"
echo "  https://github.com/$REPO/settings/secrets/actions"
echo ""
echo "🚀 Your GitHub Actions workflows are now ready to use!"
