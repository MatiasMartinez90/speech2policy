# Speech2Policy - Quick Start Guide

Get Speech2Policy up and running in 15 minutes.

## Prerequisites

- AWS account with CLI configured
- Terraform >= 1.5.7
- Node.js >= 18
- Python >= 3.11
- Google OAuth credentials

## Step 1: Clone and Prepare (2 min)

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/speech2policy.git
cd speech2policy

# Make scripts executable
chmod +x scripts/*.sh
```

## Step 2: Get Google OAuth Credentials (3 min)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create project → Enable Google+ API
3. Create OAuth 2.0 Client ID (Web application)
4. Save **Client ID** and **Client Secret**
5. Leave redirect URIs empty for now (we'll add them later)

## Step 3: Run Guided Setup (10 min)

```bash
# Run the complete setup script
./scripts/full-setup.sh
```

The script will:
1. ✅ Check prerequisites
2. ✅ Create Terraform state backend
3. ✅ Deploy Cognito User Pool
4. ✅ Deploy backend infrastructure
5. ✅ Deploy frontend infrastructure
6. ✅ Build and deploy frontend

**During setup, you'll be prompted for:**
- Google Client ID
- Google Client Secret
- Confirmation to proceed with each step

## Step 4: Update Google OAuth (1 min)

After Cognito deployment, the script will show you a domain like:
```
speech2policy-dev.auth.us-east-1.amazoncognito.com
```

Go back to [Google Cloud Console](https://console.cloud.google.com/apis/credentials) and add:
```
https://YOUR-COGNITO-DOMAIN/oauth2/idpresponse
```

## Step 5: Access Your App! (1 min)

The script will output a CloudFront URL:
```
🌐 Your application: https://d1a2b3c4d5e6f7.cloudfront.net
```

Open it in your browser and sign in with Google!

## Alternative: Manual Step-by-Step

If you prefer manual control:

### 1. Infrastructure Backend

```bash
./scripts/setup-infra.sh
```

Save the S3 bucket and DynamoDB table names, then update:
- `backend/terraform/backend.tf`
- `frontend/terraform/backend/backend.tf`
- `frontend/terraform/frontend/backend.tf`

### 2. Cognito

```bash
export GOOGLE_CLIENT_ID="your-id"
export GOOGLE_CLIENT_SECRET="your-secret"
./scripts/setup-cognito.sh
```

Save the outputs:
- `COGNITO_USER_POOL_ID`
- `COGNITO_USER_POOL_ARN`
- `COGNITO_CLIENT_ID`
- `COGNITO_DOMAIN`

### 3. Backend

```bash
export COGNITO_USER_POOL_ID="us-east-1_xxxxx"
export COGNITO_USER_POOL_ARN="arn:aws:cognito-idp:..."
./scripts/deploy-backend.sh
```

Save the `API_GATEWAY_URL`.

### 4. Frontend Infrastructure

```bash
cd frontend/terraform/frontend
terraform init
terraform apply
```

Save:
- `S3_BUCKET_NAME`
- `CLOUDFRONT_DISTRIBUTION_ID`
- `CLOUDFRONT_DOMAIN`

### 5. Frontend Application

```bash
export NEXT_PUBLIC_API_URL="https://xxxxx.execute-api.us-east-1.amazonaws.com/dev"
export COGNITO_USER_POOL_ID="us-east-1_xxxxx"
export COGNITO_CLIENT_ID="xxxxx"
export COGNITO_DOMAIN="speech2policy-dev.auth.us-east-1.amazoncognito.com"
export S3_BUCKET_NAME="your-bucket"
export CLOUDFRONT_DISTRIBUTION_ID="E1234567890"
export CLOUDFRONT_DOMAIN="d1234567890.cloudfront.net"

./scripts/deploy-frontend.sh
```

## Local Development

Want to develop locally?

```bash
cd frontend/app

# Create .env.local
cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=https://your-api.execute-api.us-east-1.amazonaws.com/dev
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_xxxxx
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=xxxxx
NEXT_PUBLIC_COGNITO_DOMAIN=your-domain.auth.us-east-1.amazoncognito.com
EOF

# Install and run
npm install
npm run dev

# Open http://localhost:3000
```

## CI/CD with GitHub Actions

Want automated deployments?

```bash
./scripts/setup-github-secrets.sh
```

This will configure all required secrets for GitHub Actions.

Push to `main` or `dev` branch to trigger automatic deployments!

## Verify Everything Works

```bash
# Get your CloudFront URL
cd frontend/terraform/frontend
terraform output cloudfront_domain

# Open in browser
# 1. Click "Sign in with Google"
# 2. Authorize the app
# 3. You should be redirected to /chat
# 4. Send a message: "Create a policy for S3 read access"
# 5. You should get an AI response with a JSON policy!
```

## Common Issues

### "Bedrock model access denied"

1. Go to AWS Console → Amazon Bedrock → Model access
2. Request access to Claude 3.5 Sonnet v2
3. Wait for approval (usually instant)

### "Google OAuth error: redirect_uri_mismatch"

1. Check the Cognito domain in your Cognito User Pool
2. Add exact redirect URI to Google OAuth settings:
   ```
   https://YOUR-EXACT-COGNITO-DOMAIN/oauth2/idpresponse
   ```

### "Frontend shows 404 on refresh"

This is normal during CloudFront propagation. Wait 5-10 minutes.

### "API returns 401 Unauthorized"

1. Check if you're signed in
2. Try signing out and back in
3. Verify COGNITO_USER_POOL_ID matches in frontend .env

## Clean Up

To delete everything:

```bash
# Frontend app
aws s3 rm s3://YOUR_BUCKET --recursive

# Infrastructure (in reverse order)
cd frontend/terraform/frontend && terraform destroy
cd ../../backend/terraform && terraform destroy
cd ../../frontend/terraform/backend && terraform destroy
cd ../../../infra && terraform destroy
```

## Next Steps

- 📖 Read [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed info
- 🧪 Read [TESTING.md](./TESTING.md) for testing guide
- 🔧 Explore [scripts/README.md](./scripts/README.md) for script docs
- 🚀 Set up monitoring and alerts
- 🔒 Review security best practices
- 💰 Set up cost alerts in AWS

## Need Help?

- Check CloudWatch Logs for errors
- Review [TESTING.md](./TESTING.md) troubleshooting section
- Verify all environment variables are set correctly

---

**Ready to use Speech2Policy!** 🎉

Generate IAM policies in seconds with natural language.
