# 🗣️ Speech2Policy

**AI-Powered IAM Policy Generator** - Convert natural language to AWS IAM policies using Claude 3.5 Sonnet.

Conversational chat interface (like ChatGPT/Claude Desktop) that helps you create secure, least-privilege IAM policies through natural language.

---

## ✨ Features

### 🤖 AI-Powered Policy Generation
- **Natural language to IAM JSON**: "Give S3 read access to bucket data-prod" → Valid IAM policy
- **Bedrock Claude 3.5 Sonnet**: State-of-the-art reasoning for security-critical tasks
- **Conversational clarification**: AI asks questions when requests are ambiguous
- **Context-aware**: Remembers conversation history

### 🛡️ Security & Risk Analysis
- **Risk scoring (0-100)**: Automatic security risk assessment
- **Dangerous permission detection**: Wildcards, admin actions, escalation vectors
- **Policy validation**: Syntax, ARN format, action verification
- **Warnings & recommendations**: Clear explanations of security implications

### 💬 Chat Interface
- **Claude Desktop-style UI**: Clean, spacious, professional
- **Markdown support**: Formatted messages
- **Syntax highlighting**: JSON policies with color
- **Inline policy editor**: Edit generated policies directly
- **Diff viewer**: Compare policies side-by-side
- **Copy & download**: Easy export of policies

### 🔐 Authentication
- **Cognito + Google SSO**: Seamless sign-in
- **Multi-tenant**: Isolated data per user
- **Rate limiting**: 5 messages/day free tier

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js)                        │
│  S3 + CloudFront → React Chat Interface                    │
│  - Cognito Auth (Google SSO)                               │
│  - Tailwind CSS                                             │
│  - Static export                                            │
└─────────────────────────────────────────────────────────────┘
                         ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│              API GATEWAY (REST + Cognito Auth)              │
│  /api/chat/message        - Send message                   │
│  /api/chat/sessions       - List sessions                  │
│  /api/policies/history    - Policy history                 │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                 LAMBDA FUNCTIONS (Python 3.11)              │
│  chat-handler    → Bedrock Claude + Risk Analysis          │
│  history-handler → Policy retrieval                         │
│  user-handler    → User management                          │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    DYNAMODB TABLES                          │
│  Users, ChatSessions, ChatMessages, Policies, UserUsage    │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                   AMAZON BEDROCK                            │
│  Claude 3.5 Sonnet (anthropic.claude-3-5-sonnet-v2)       │
└─────────────────────────────────────────────────────────────┘
```

**Stack:**
- **Frontend**: Next.js 14 + React + Tailwind CSS + Amplify Auth
- **Backend**: AWS Lambda (Python 3.11) + API Gateway
- **Database**: DynamoDB (5 tables)
- **AI**: Amazon Bedrock (Claude 3.5 Sonnet)
- **Auth**: Cognito User Pools + Google OAuth
- **IaC**: Terraform
- **CI/CD**: GitHub Actions

---

## 🚀 Deployment Guide

### Prerequisites

- AWS CLI configured (`aws configure`)
- Terraform >= 1.5
- Node.js >= 18
- Python >= 3.11
- Google OAuth credentials ([Get them here](https://console.cloud.google.com/apis/credentials))

### Step 1: Infrastructure State Backend

Create S3 bucket + DynamoDB table for Terraform state:

```bash
cd infra/
terraform init
terraform apply

# Save outputs
terraform output s3_bucket_name
terraform output dynamodb_table_name
```

### Step 2: Deploy Cognito (Authentication)

```bash
cd ../frontend/terraform/backend/

# Create terraform.tfvars
cat > terraform.tfvars <<EOF
aws_region              = "us-east-1"
environment             = "dev"
google_client_id        = "YOUR_GOOGLE_CLIENT_ID"
google_client_secret    = "YOUR_GOOGLE_CLIENT_SECRET"
production_callback_url = "https://yourdomain.com"
production_logout_url   = "https://yourdomain.com"
EOF

# Edit main.tf - uncomment backend "s3" block
# Update with bucket name from Step 1

terraform init
terraform apply

# Save outputs
terraform output cognito_user_pool_id
terraform output cognito_user_pool_arn
terraform output cognito_user_pool_web_client_id
terraform output cognito_user_pool_domain
```

### Step 3: Build Lambda Layer

```bash
cd ../../../backend/layers/
./build-powertools-layer.sh

# This creates powertools.zip with:
# - AWS Lambda Powertools
# - Shared utilities
```

### Step 4: Deploy Backend

```bash
cd ../terraform/

# Create terraform.tfvars
cat > terraform.tfvars <<EOF
aws_region              = "us-east-1"
environment             = "dev"
cognito_user_pool_id    = "us-east-1_XXXXXXXXX"  # From Step 2
cognito_user_pool_arn   = "arn:aws:cognito-idp:us-east-1:XXX:userpool/us-east-1_XXX"
EOF

# Edit provider.tf - uncomment backend "s3" block
# Update with bucket name from Step 1

terraform init
terraform apply

# Save outputs
terraform output api_gateway_url
```

### Step 5: Deploy Frontend

```bash
cd ../../frontend/app/

# Install dependencies
npm install

# Create .env.local
cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=https://XXXXX.execute-api.us-east-1.amazonaws.com/dev  # From Step 4
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX                        # From Step 2
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX          # From Step 2
NEXT_PUBLIC_COGNITO_DOMAIN=speech2policy-dev-auth-XXXXXXXX.auth.us-east-1.amazoncognito.com
EOF

# Build
npm run build

# Deploy to S3 (via GitHub Actions or manually)
# See .github/workflows/deploy-frontend.yml
```

### Step 6: Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Add authorized redirect URIs:
   - `https://speech2policy-dev-auth-XXXXXXXX.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`
   - `http://localhost:3000` (for development)
3. Save

---

## 🧪 Testing

### Local Development

```bash
cd frontend/app/
npm run dev
# Open http://localhost:3000
```

### Test Backend Directly

```bash
# Test chat-handler Lambda
aws lambda invoke \
  --function-name speech2policy-dev-chat-handler \
  --payload '{"httpMethod":"POST","path":"/api/chat/message","body":"{\"message\":\"Create S3 read policy\"}"}' \
  response.json

# Test API Gateway (with Cognito token)
curl -X POST "https://XXXXX.execute-api.us-east-1.amazonaws.com/dev/api/chat/message" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"I need a policy for Lambda execution"}'
```

---

## 📊 API Reference

### POST /api/chat/message

Send a chat message and get AI response.

**Request:**
```json
{
  "message": "Create a policy for S3 read-only access to bucket my-data",
  "sessionId": "session_abc123" // optional, for continuing conversation
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_abc123",
    "aiMessage": {
      "id": "msg_xyz789",
      "content": "Here's a least-privilege policy...",
      "policyJson": {
        "Version": "2012-10-17",
        "Statement": [...]
      },
      "riskAnalysis": {
        "score": 15,
        "level": "LOW",
        "warnings": [],
        "summary": "✅ This policy appears safe..."
      }
    },
    "usage": {
      "remaining": 4
    }
  }
}
```

### GET /api/chat/sessions

List user's chat sessions.

### GET /api/policies/history

Get user's generated policies.

All endpoints require `Authorization: Bearer <JWT>` header.

---

## 💰 Estimated Costs

For **100 active users/month**:

| Service | Usage | Cost |
|---------|-------|------|
| **DynamoDB** | 1M requests | ~$2.00 |
| **Lambda** | 10K invocations | ~$5.00 |
| **API Gateway** | 10K requests | ~$0.50 |
| **Bedrock Claude** | 500K tokens | ~$50.00 |
| **S3 + CloudFront** | 10GB transfer | ~$2.00 |
| **Cognito** | 100 MAU | Free tier |
| **Total** | | **~$59.50/month** |

**Free tier covers**: ~20 users/month

**Per-user cost**: ~$0.60/month

---

## 🔒 Security

- ✅ **Cognito JWT authentication**: All API endpoints protected
- ✅ **Least privilege IAM roles**: Each Lambda has minimal permissions
- ✅ **Encryption at rest**: DynamoDB + S3
- ✅ **CORS configured**: Frontend allowed origins only
- ✅ **Rate limiting**: 5 requests/day free tier
- ✅ **No secrets in code**: Environment variables + Terraform variables
- ✅ **CloudWatch Logs**: Full audit trail

---

## 📁 Project Structure

```
speech2policy/
├── infra/                    # Terraform state backend (S3 + DynamoDB)
├── backend/
│   ├── lambdas/
│   │   ├── shared/          # Reusable utilities
│   │   ├── chat-handler/    # Main chat + Bedrock integration
│   │   ├── history-handler/ # Policy history
│   │   └── user-handler/    # User management
│   ├── layers/              # Lambda layer (Powertools + shared)
│   └── terraform/           # Backend infrastructure
├── frontend/
│   ├── app/                 # Next.js application
│   │   └── src/
│   │       ├── app/         # App router pages
│   │       ├── components/  # React components
│   │       └── lib/         # Utilities
│   └── terraform/
│       └── backend/         # Cognito + Auth
├── docs/                    # Documentation
└── README.md               # This file
```

---

## 🛠️ Development

### Run Locally

```bash
# Frontend
cd frontend/app
npm install
npm run dev

# Backend (SAM or LocalStack for local Lambda testing)
```

### Code Style

- **Python**: Black formatter
- **TypeScript**: ESLint + Prettier
- **Terraform**: `terraform fmt`

---

## 🗑️ Cleanup

To destroy all infrastructure:

```bash
# Backend
cd backend/terraform/
terraform destroy

# Frontend auth
cd ../../frontend/terraform/backend/
terraform destroy

# State backend (WARNING: destroys state history)
cd ../../../infra/
terraform destroy
```

---

## 📝 License

Private project - All rights reserved

---

## 🤝 Contributing

This is a private project. For questions or issues, contact the team.

---

## 📞 Support

For issues or questions:
- Check `/docs` for detailed documentation
- Review CloudWatch Logs for errors
- Check Terraform outputs for configuration

---

**Built with ❤️ using AWS, Bedrock, and Terraform**
