# Deployment Scripts

This directory contains helper scripts for deploying the Speech2Policy application.

## Prerequisites

Before running any scripts, ensure you have:

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) installed and configured
- [Terraform](https://developer.hashicorp.com/terraform/downloads) 1.5.7 or later
- [Node.js](https://nodejs.org/) 18 or later
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [GitHub CLI](https://cli.github.com/) (optional, for setting up GitHub secrets)

## Scripts Overview

### `full-setup.sh` - Complete Guided Setup
**Recommended for first-time setup**

This script guides you through the entire deployment process step-by-step.

```bash
chmod +x scripts/full-setup.sh
./scripts/full-setup.sh
```

It will:
1. Check all prerequisites
2. Set up Terraform state backend
3. Create Cognito User Pool
4. Deploy backend infrastructure
5. Deploy frontend infrastructure
6. Build and deploy frontend application

### Individual Scripts

#### `setup-infra.sh` - Terraform State Backend

Creates the S3 bucket and DynamoDB table for storing Terraform state.

```bash
chmod +x scripts/setup-infra.sh
./scripts/setup-infra.sh
```

**Outputs:**
- S3 bucket name for Terraform state
- DynamoDB table name for state locking

#### `setup-cognito.sh` - Cognito User Pool

Creates the Cognito User Pool with Google OAuth integration.

```bash
export GOOGLE_CLIENT_ID="your-google-client-id"
export GOOGLE_CLIENT_SECRET="your-google-client-secret"

chmod +x scripts/setup-cognito.sh
./scripts/setup-cognito.sh
```

**Prerequisites:**
- Google OAuth credentials from [Google Cloud Console](https://console.cloud.google.com/)

**Outputs:**
- Cognito User Pool ID
- Cognito User Pool ARN
- Cognito App Client ID
- Cognito Domain

#### `deploy-backend.sh` - Backend Infrastructure

Deploys the backend (Lambda functions, API Gateway, DynamoDB tables).

```bash
export COGNITO_USER_POOL_ID="us-east-1_xxxxx"
export COGNITO_USER_POOL_ARN="arn:aws:cognito-idp:us-east-1:xxx:userpool/us-east-1_xxxxx"

chmod +x scripts/deploy-backend.sh
./scripts/deploy-backend.sh
```

**Prerequisites:**
- Terraform state backend (from `setup-infra.sh`)
- Cognito User Pool (from `setup-cognito.sh`)

**Outputs:**
- API Gateway URL

#### `deploy-frontend.sh` - Frontend Application

Builds and deploys the Next.js frontend to S3/CloudFront.

```bash
export NEXT_PUBLIC_API_URL="https://xxxxx.execute-api.us-east-1.amazonaws.com/dev"
export COGNITO_USER_POOL_ID="us-east-1_xxxxx"
export COGNITO_CLIENT_ID="xxxxx"
export COGNITO_DOMAIN="speech2policy-dev.auth.us-east-1.amazoncognito.com"
export S3_BUCKET_NAME="your-frontend-bucket"
export CLOUDFRONT_DISTRIBUTION_ID="E1234567890ABC"  # Optional
export CLOUDFRONT_DOMAIN="d1234567890.cloudfront.net"  # Optional

chmod +x scripts/deploy-frontend.sh
./scripts/deploy-frontend.sh
```

**Prerequisites:**
- Backend deployed (from `deploy-backend.sh`)
- Frontend infrastructure created (Terraform in `frontend/terraform/frontend/`)

#### `setup-github-secrets.sh` - GitHub Actions Secrets

Helper script to set up GitHub Actions secrets for CI/CD.

```bash
# Install GitHub CLI first
# https://cli.github.com/

gh auth login

chmod +x scripts/setup-github-secrets.sh
./scripts/setup-github-secrets.sh
```

This script will prompt you for all required secrets:
- AWS credentials
- Cognito configuration
- Frontend infrastructure details
- API Gateway URL

## Deployment Order

For first-time deployment, follow this order:

1. **Infrastructure Backend**
   ```bash
   ./scripts/setup-infra.sh
   ```

2. **Update Backend Terraform Config**

   Edit `backend/terraform/backend.tf` with the S3 bucket and DynamoDB table from step 1.

3. **Cognito User Pool**
   ```bash
   ./scripts/setup-cognito.sh
   ```

4. **Backend Deployment**
   ```bash
   ./scripts/deploy-backend.sh
   ```

5. **Frontend Infrastructure**
   ```bash
   cd frontend/terraform/frontend
   terraform init
   terraform plan
   terraform apply
   ```

6. **Frontend Application**
   ```bash
   ./scripts/deploy-frontend.sh
   ```

7. **GitHub Actions (Optional)**
   ```bash
   ./scripts/setup-github-secrets.sh
   ```

## Environment Variables

Create a `.env` file to store your configuration:

```bash
# AWS
export AWS_REGION="us-east-1"

# Cognito
export COGNITO_USER_POOL_ID="us-east-1_xxxxx"
export COGNITO_USER_POOL_ARN="arn:aws:cognito-idp:us-east-1:xxx:userpool/us-east-1_xxxxx"
export COGNITO_CLIENT_ID="xxxxx"
export COGNITO_DOMAIN="speech2policy-dev.auth.us-east-1.amazoncognito.com"

# Google OAuth
export GOOGLE_CLIENT_ID="xxxxx.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="xxxxx"

# Backend
export NEXT_PUBLIC_API_URL="https://xxxxx.execute-api.us-east-1.amazonaws.com/dev"

# Frontend
export S3_BUCKET_NAME="your-frontend-bucket"
export CLOUDFRONT_DISTRIBUTION_ID="E1234567890ABC"
export CLOUDFRONT_DOMAIN="d1234567890.cloudfront.net"
```

Then source it before running scripts:

```bash
source .env
./scripts/deploy-backend.sh
```

## Troubleshooting

### AWS Credentials

If you get authentication errors:
```bash
aws configure
aws sts get-caller-identity
```

### Terraform State

If Terraform state is corrupted:
```bash
cd backend/terraform  # or relevant directory
terraform state list
terraform state pull > backup.tfstate
```

### Lambda Layer Build

If Lambda layer build fails:
```bash
cd backend/layers
rm -rf python python.zip
./build-powertools-layer.sh
```

### Frontend Build

If Next.js build fails:
```bash
cd frontend/app
rm -rf node_modules .next out
npm install
npm run build
```

## CI/CD

Once GitHub secrets are set up, the following workflows are available:

- **`deploy-backend.yml`** - Automatically deploys backend on push to main/dev
- **`deploy-frontend.yml`** - Automatically deploys frontend on push to main/dev
- **`terraform-validate.yml`** - Validates Terraform on PRs

You can also trigger manual deployments:
```bash
gh workflow run deploy-backend.yml
gh workflow run deploy-frontend.yml
```

## Clean Up

To destroy all resources:

```bash
# Frontend
cd frontend/terraform/frontend
terraform destroy

# Backend
cd backend/terraform
terraform destroy

# Cognito
cd frontend/terraform/backend
terraform destroy

# State backend (do this last!)
cd infra
terraform destroy
```

⚠️ **Warning:** This will delete all data including DynamoDB tables and S3 buckets!
