# Speech2Policy - Deployment Guide

Complete guide for deploying the Speech2Policy application to AWS.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Deployment Steps](#detailed-deployment-steps)
- [Configuration](#configuration)
- [CI/CD Setup](#cicd-setup)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Users                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    CloudFront (CDN)                          │
│                  Static Website Hosting                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     S3 Bucket                                │
│              Next.js Static Export                           │
└─────────────────────────────────────────────────────────────┘
                     │
                     │ API Calls
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway                                │
│              Cognito Authorization                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Lambda Functions                            │
│   • Chat Handler (Bedrock Integration)                      │
│   • Session Manager                                          │
│   • Policy Manager                                           │
│   • User Manager                                             │
│   • Cognito Post-Confirmation                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   DynamoDB Tables                            │
│   • Users • ChatSessions • ChatMessages                      │
│   • Policies • UserUsage                                     │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Amazon Bedrock                              │
│            Claude 3.5 Sonnet                                 │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Required Tools

1. **AWS CLI** (v2.x or later)
   ```bash
   # Install
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install

   # Configure
   aws configure
   ```

2. **Terraform** (v1.5.7 or later)
   ```bash
   # Install on Linux
   wget https://releases.hashicorp.com/terraform/1.5.7/terraform_1.5.7_linux_amd64.zip
   unzip terraform_1.5.7_linux_amd64.zip
   sudo mv terraform /usr/local/bin/

   # Verify
   terraform version
   ```

3. **Node.js** (v18 or later) and **npm**
   ```bash
   # Install via nvm
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18

   # Verify
   node --version
   npm --version
   ```

4. **GitHub CLI** (optional, for CI/CD setup)
   ```bash
   # Install
   curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
   echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
   sudo apt update
   sudo apt install gh

   # Authenticate
   gh auth login
   ```

### AWS Requirements

1. **AWS Account** with appropriate permissions
2. **IAM User** with programmatic access
3. **Required AWS Services** available in your region (us-east-1 recommended):
   - Amazon Bedrock (Claude 3.5 Sonnet model access)
   - Lambda
   - API Gateway
   - DynamoDB
   - S3
   - CloudFront
   - Cognito

4. **Bedrock Model Access**
   ```bash
   # Enable Bedrock model access via AWS Console
   # Navigate to: Amazon Bedrock → Model access
   # Request access to: Claude 3.5 Sonnet v2
   ```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen
6. Create **Web application** credentials
7. Add authorized redirect URIs (you'll update this after Cognito deployment):
   ```
   https://YOUR-COGNITO-DOMAIN.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
   ```
8. Save the **Client ID** and **Client Secret**

## Quick Start

The fastest way to deploy is using the guided setup script:

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/speech2policy.git
cd speech2policy

# Run the complete setup
./scripts/full-setup.sh
```

This script will guide you through all deployment steps interactively.

## Detailed Deployment Steps

### Step 1: Terraform State Backend

Create the S3 bucket and DynamoDB table for Terraform state management.

```bash
cd infra
terraform init
terraform plan
terraform apply
```

**Save the outputs:**
- `terraform_state_bucket`: S3 bucket name
- `terraform_state_lock_table`: DynamoDB table name

**Update backend configurations:**

Edit `backend/terraform/backend.tf`:
```hcl
terraform {
  backend "s3" {
    bucket         = "YOUR_STATE_BUCKET_NAME"  # From output above
    key            = "backend/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "YOUR_LOCK_TABLE_NAME"    # From output above
    encrypt        = true
  }
}
```

Repeat for:
- `frontend/terraform/backend/backend.tf`
- `frontend/terraform/frontend/backend.tf`

### Step 2: Cognito User Pool

Deploy authentication infrastructure with Google OAuth.

```bash
cd frontend/terraform/backend

# Create terraform.tfvars
cat > terraform.tfvars <<EOF
google_client_id     = "YOUR_GOOGLE_CLIENT_ID"
google_client_secret = "YOUR_GOOGLE_CLIENT_SECRET"
aws_region          = "us-east-1"
environment         = "dev"
EOF

terraform init
terraform plan
terraform apply
```

**Save the outputs:**
- `user_pool_id`: Cognito User Pool ID
- `user_pool_arn`: Cognito User Pool ARN
- `user_pool_client_id`: App Client ID
- `cognito_domain`: Cognito domain for OAuth

**Update Google OAuth:**

Go back to Google Cloud Console and add the redirect URI:
```
https://YOUR_COGNITO_DOMAIN/oauth2/idpresponse
```

### Step 3: Backend Deployment

Deploy Lambda functions, API Gateway, and DynamoDB tables.

```bash
# Build Lambda Layer
cd backend/layers
./build-powertools-layer.sh

# Deploy infrastructure
cd ../terraform

# Create terraform.tfvars
cat > terraform.tfvars <<EOF
cognito_user_pool_id  = "YOUR_USER_POOL_ID"
cognito_user_pool_arn = "YOUR_USER_POOL_ARN"
aws_region           = "us-east-1"
environment          = "dev"
EOF

terraform init
terraform plan
terraform apply
```

**Save the output:**
- `api_gateway_url`: API Gateway endpoint URL

### Step 4: Frontend Infrastructure

Create S3 bucket and CloudFront distribution for hosting.

```bash
cd frontend/terraform/frontend

terraform init
terraform plan
terraform apply
```

**Save the outputs:**
- `s3_bucket_name`: S3 bucket for static files
- `cloudfront_distribution_id`: CloudFront distribution ID
- `cloudfront_domain`: CloudFront domain name

### Step 5: Frontend Application

Build and deploy the Next.js application.

```bash
cd frontend/app

# Install dependencies
npm ci

# Create environment file
cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=YOUR_API_GATEWAY_URL
NEXT_PUBLIC_COGNITO_USER_POOL_ID=YOUR_USER_POOL_ID
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=YOUR_CLIENT_ID
NEXT_PUBLIC_COGNITO_DOMAIN=YOUR_COGNITO_DOMAIN
EOF

# Build the application
npm run build

# Create runtime config
cat > out/env.json <<EOF
{
  "cognitoUserPoolId": "YOUR_USER_POOL_ID",
  "cognitoUserPoolWebClientId": "YOUR_CLIENT_ID",
  "cognitoDomain": "YOUR_COGNITO_DOMAIN"
}
EOF

# Deploy to S3
aws s3 sync ./out s3://YOUR_S3_BUCKET_NAME/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_CLOUDFRONT_DISTRIBUTION_ID \
  --paths "/*"
```

**Access your application:**
```
https://YOUR_CLOUDFRONT_DOMAIN
```

## Configuration

### Environment Variables

Create a `.env` file for local deployment:

```bash
# AWS Configuration
export AWS_REGION="us-east-1"
export AWS_ACCOUNT_ID="123456789012"

# Cognito
export COGNITO_USER_POOL_ID="us-east-1_AbCdEfGhI"
export COGNITO_USER_POOL_ARN="arn:aws:cognito-idp:us-east-1:123456789012:userpool/us-east-1_AbCdEfGhI"
export COGNITO_CLIENT_ID="1a2b3c4d5e6f7g8h9i0j1k2l3m"
export COGNITO_DOMAIN="speech2policy-dev.auth.us-east-1.amazoncognito.com"

# Google OAuth
export GOOGLE_CLIENT_ID="123456789012-abc.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="GOCSPX-abc123def456"

# Backend
export NEXT_PUBLIC_API_URL="https://abc123def456.execute-api.us-east-1.amazonaws.com/dev"

# Frontend
export S3_BUCKET_NAME="speech2policy-frontend-abc123"
export CLOUDFRONT_DISTRIBUTION_ID="E1A2B3C4D5E6F7"
export CLOUDFRONT_DOMAIN="d1a2b3c4d5e6f7.cloudfront.net"
```

Load it before running scripts:
```bash
source .env
```

### Terraform Variables

Each Terraform module accepts variables via `terraform.tfvars` files.

**Example: `backend/terraform/terraform.tfvars`**
```hcl
aws_region            = "us-east-1"
environment           = "dev"
cognito_user_pool_id  = "us-east-1_AbCdEfGhI"
cognito_user_pool_arn = "arn:aws:cognito-idp:us-east-1:123456789012:userpool/us-east-1_AbCdEfGhI"

# Optional: Override defaults
lambda_timeout        = 30
lambda_memory_size    = 256
```

## CI/CD Setup

### GitHub Actions Secrets

Set up secrets for automated deployments:

```bash
# Using the helper script
./scripts/setup-github-secrets.sh

# Or manually via GitHub CLI
gh secret set AWS_ACCESS_KEY_ID --body "YOUR_ACCESS_KEY"
gh secret set AWS_SECRET_ACCESS_KEY --body "YOUR_SECRET_KEY"
gh secret set COGNITO_USER_POOL_ID --body "YOUR_POOL_ID"
gh secret set COGNITO_USER_POOL_ARN --body "YOUR_POOL_ARN"
gh secret set COGNITO_CLIENT_ID --body "YOUR_CLIENT_ID"
gh secret set COGNITO_DOMAIN --body "YOUR_COGNITO_DOMAIN"
gh secret set S3_BUCKET_NAME --body "YOUR_S3_BUCKET"
gh secret set CLOUDFRONT_DISTRIBUTION_ID --body "YOUR_DISTRIBUTION_ID"
gh secret set CLOUDFRONT_DOMAIN --body "YOUR_CLOUDFRONT_DOMAIN"
gh secret set NEXT_PUBLIC_API_URL --body "YOUR_API_URL"
```

### Workflows

Three GitHub Actions workflows are available:

1. **`terraform-validate.yml`** - Runs on PRs
   - Validates Terraform formatting
   - Runs `terraform validate`
   - Executes tfsec security scan

2. **`deploy-backend.yml`** - Deploys backend
   - Triggers on push to `main`/`dev` branches
   - Builds Lambda layer
   - Deploys with Terraform

3. **`deploy-frontend.yml`** - Deploys frontend
   - Triggers on push to `main`/`dev` branches
   - Builds Next.js application
   - Syncs to S3 and invalidates CloudFront

### Manual Workflow Trigger

```bash
# Trigger backend deployment
gh workflow run deploy-backend.yml

# Trigger frontend deployment
gh workflow run deploy-frontend.yml
```

## Monitoring and Maintenance

### CloudWatch Logs

Lambda functions log to CloudWatch:

```bash
# View chat handler logs
aws logs tail /aws/lambda/speech2policy-dev-chat-handler --follow

# View session manager logs
aws logs tail /aws/lambda/speech2policy-dev-session-manager --follow
```

### DynamoDB Monitoring

```bash
# Check table metrics
aws dynamodb describe-table --table-name speech2policy-dev-ChatSessions

# Scan items (for debugging)
aws dynamodb scan --table-name speech2policy-dev-Users --limit 10
```

### API Gateway Monitoring

```bash
# View API Gateway logs
aws logs tail /aws/apigateway/speech2policy-dev --follow
```

### Costs

Monitor AWS costs:
- Navigate to: AWS Console → Cost Explorer
- Set up budget alerts for unexpected charges

**Expected monthly costs (light usage):**
- Lambda: ~$1-5
- API Gateway: ~$3.50 per million requests
- DynamoDB (on-demand): ~$1-10
- S3: ~$0.50
- CloudFront: ~$1-5
- Bedrock (Claude): ~$3 per 1M input tokens, ~$15 per 1M output tokens
- **Total: ~$20-50/month** (varies with usage)

### Backups

DynamoDB tables have point-in-time recovery enabled:

```bash
# Create on-demand backup
aws dynamodb create-backup \
  --table-name speech2policy-dev-ChatSessions \
  --backup-name manual-backup-$(date +%Y%m%d)

# List backups
aws dynamodb list-backups --table-name speech2policy-dev-ChatSessions
```

## Troubleshooting

### Common Issues

#### 1. Terraform State Lock

**Error:** `Error acquiring the state lock`

**Solution:**
```bash
# Check DynamoDB for locks
aws dynamodb scan --table-name YOUR_LOCK_TABLE_NAME

# Force unlock (use carefully!)
terraform force-unlock LOCK_ID
```

#### 2. Lambda Permission Errors

**Error:** `User is not authorized to perform: bedrock:InvokeModel`

**Solution:**
Check IAM role in `backend/terraform/iam.tf` and ensure Bedrock permissions are correct.

#### 3. Cognito OAuth Errors

**Error:** `redirect_uri_mismatch`

**Solution:**
1. Check Google OAuth authorized redirect URIs
2. Ensure Cognito domain matches exactly
3. Verify callback URL format: `https://DOMAIN/oauth2/idpresponse`

#### 4. Frontend CORS Errors

**Error:** `Access to fetch has been blocked by CORS policy`

**Solution:**
Check `backend/terraform/api-gateway.tf` CORS configuration:
```hcl
allowed_origins = ["*"]  # Or specific CloudFront domain
allowed_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
```

#### 5. Next.js Build Failures

**Error:** Build fails with missing dependencies

**Solution:**
```bash
cd frontend/app
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 6. Rate Limiting Issues

**Error:** Users hitting rate limits unexpectedly

**Solution:**
Check `backend/lambdas/shared/rate_limiter.py` configuration:
```python
FREE_TIER_LIMIT = 5  # Adjust as needed
```

### Debug Mode

Enable debug logging in Lambda functions:

Edit `backend/lambdas/*/lambda_function.py`:
```python
import os
os.environ['LOG_LEVEL'] = 'DEBUG'
```

### Health Checks

Test backend endpoints:

```bash
# Get auth token from Cognito
TOKEN="your-jwt-token"

# Test chat endpoint
curl -X POST https://YOUR_API_URL/api/chat/message \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Create S3 read-only policy"}'

# Test session list
curl https://YOUR_API_URL/api/chat/sessions \
  -H "Authorization: Bearer $TOKEN"
```

### Clean Up Resources

To completely remove all infrastructure:

```bash
# Frontend application (just files)
aws s3 rm s3://YOUR_S3_BUCKET_NAME --recursive

# Frontend infrastructure
cd frontend/terraform/frontend
terraform destroy

# Backend
cd backend/terraform
terraform destroy

# Cognito
cd frontend/terraform/backend
terraform destroy

# State backend (last!)
cd infra
terraform destroy
```

⚠️ **Warning:** This will permanently delete all data!

## Support

For issues and questions:
- Check [GitHub Issues](https://github.com/YOUR_USERNAME/speech2policy/issues)
- Review [AWS Documentation](https://docs.aws.amazon.com/)
- Consult [Terraform Documentation](https://developer.hashicorp.com/terraform/docs)

## Next Steps

After successful deployment:

1. Test the application thoroughly
2. Configure custom domain (Route 53 + ACM certificate)
3. Set up monitoring alerts (CloudWatch Alarms)
4. Implement additional security measures (WAF, Shield)
5. Enable AWS X-Ray for distributed tracing
6. Set up staging environment
7. Configure automated backups schedule
8. Review and optimize costs

---

**Deployed successfully?** 🎉

Access your application at: `https://YOUR_CLOUDFRONT_DOMAIN`
