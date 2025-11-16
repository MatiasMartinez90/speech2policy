#!/bin/bash

set -e

echo "========================================="
echo "Speech2Policy - Frontend Deployment"
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
if [ -z "$NEXT_PUBLIC_API_URL" ]; then
    echo "❌ Error: NEXT_PUBLIC_API_URL environment variable not set"
    echo "Get this from backend deployment output"
    exit 1
fi

if [ -z "$COGNITO_USER_POOL_ID" ]; then
    echo "❌ Error: COGNITO_USER_POOL_ID environment variable not set"
    exit 1
fi

if [ -z "$COGNITO_CLIENT_ID" ]; then
    echo "❌ Error: COGNITO_CLIENT_ID environment variable not set"
    exit 1
fi

if [ -z "$COGNITO_DOMAIN" ]; then
    echo "❌ Error: COGNITO_DOMAIN environment variable not set"
    exit 1
fi

echo "✓ Environment variables set"
echo ""

# Navigate to frontend app directory
cd "$(dirname "$0")/../frontend/app"

echo "📦 Installing dependencies..."
npm ci

echo ""
echo "🔧 Creating .env.local..."
cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
NEXT_PUBLIC_COGNITO_USER_POOL_ID=$COGNITO_USER_POOL_ID
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=$COGNITO_CLIENT_ID
NEXT_PUBLIC_COGNITO_DOMAIN=$COGNITO_DOMAIN
EOF

echo "✓ Environment file created"
echo ""

echo "🏗️  Building Next.js application..."
npm run build

echo ""
echo "✓ Build complete"
echo ""

echo "📝 Creating runtime env.json..."
cat > out/env.json <<EOF
{
  "cognitoUserPoolId": "$COGNITO_USER_POOL_ID",
  "cognitoUserPoolWebClientId": "$COGNITO_CLIENT_ID",
  "cognitoDomain": "$COGNITO_DOMAIN"
}
EOF

echo "✓ Runtime config created"
echo ""

# Deploy to S3
if [ -z "$S3_BUCKET_NAME" ]; then
    echo "❌ Error: S3_BUCKET_NAME environment variable not set"
    echo "Create the S3 bucket first using Terraform in frontend/terraform/frontend/"
    exit 1
fi

echo "🚀 Deploying to S3..."
aws s3 sync ./out s3://$S3_BUCKET_NAME/ --delete

echo ""
echo "✓ Files uploaded to S3"
echo ""

# Invalidate CloudFront cache if distribution ID is provided
if [ ! -z "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    echo "🔄 Invalidating CloudFront cache..."
    aws cloudfront create-invalidation \
        --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
        --paths "/*"

    echo ""
    echo "✓ Cache invalidated"
fi

echo ""
echo "✅ Frontend deployment complete!"
echo ""

if [ ! -z "$CLOUDFRONT_DOMAIN" ]; then
    echo "🌐 Your application is available at: https://$CLOUDFRONT_DOMAIN"
fi

echo ""
echo "🎉 Done!"
