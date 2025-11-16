# Speech2Policy - Backend

Backend infrastructure for Speech2Policy chat application.

## 🏗️ Architecture

- **Lambda Functions**: Python 3.11 handlers for chat, history, and user management
- **DynamoDB**: 5 tables for data storage
- **API Gateway**: REST API with Cognito authorization
- **Bedrock**: Claude 3.5 Sonnet for policy generation

## 📁 Structure

```
backend/
├── lambdas/
│   ├── shared/              # Shared utilities
│   ├── chat-handler/        # Main chat logic + Bedrock
│   ├── history-handler/     # Policy history
│   └── user-handler/        # User management
├── layers/
│   └── powertools/          # AWS Lambda Powertools layer
└── terraform/               # Infrastructure as Code
    ├── provider.tf
    ├── variables.tf
    ├── dynamodb.tf
    ├── lambda.tf
    ├── iam.tf
    ├── api-gateway.tf
    └── outputs.tf
```

## 🚀 Deployment

### Prerequisites

1. **Infra setup** (run once):
   ```bash
   cd ../infra
   terraform init
   terraform apply
   # Note the S3 bucket name and DynamoDB table name
   ```

2. **Frontend terraform** (Cognito):
   ```bash
   cd ../frontend/terraform/backend
   terraform init
   terraform apply
   # Note the Cognito User Pool ID and ARN
   ```

### Deploy Backend

1. Create Lambda layer:
   ```bash
   cd layers
   ./build-powertools-layer.sh  # Creates powertools.zip
   ```

2. Configure Terraform backend:
   ```bash
   cd ../terraform

   # Edit provider.tf - uncomment backend "s3" block
   # Update bucket name from infra/ output
   ```

3. Create terraform.tfvars:
   ```bash
   cat > terraform.tfvars <<EOF
   aws_region              = "us-east-1"
   environment             = "dev"
   cognito_user_pool_id    = "us-east-1_XXXXXXXXX"  # From frontend/terraform/backend
   cognito_user_pool_arn   = "arn:aws:cognito-idp:us-east-1:XXXX:userpool/us-east-1_XXX"
   EOF
   ```

4. Deploy:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

5. Save outputs:
   ```bash
   terraform output api_gateway_url
   # Use this URL in frontend .env.local
   ```

## 🔌 API Endpoints

### Chat
- `POST /api/chat/message` - Send message, get AI response
- `GET /api/chat/sessions` - List user's sessions
- `GET /api/chat/sessions/{id}` - Get session with messages
- `DELETE /api/chat/sessions/{id}` - Delete session

### Policies
- `GET /api/policies/history` - Get policy history

### User
- `GET /api/user/profile` - Get user profile

All endpoints require Cognito JWT token in `Authorization` header.

## 🧪 Testing

```bash
# Test Lambda directly
aws lambda invoke \
  --function-name speech2policy-dev-chat-handler \
  --payload file://test-event.json \
  response.json

# Test API Gateway (with Cognito token)
curl -X POST "https://XXXXX.execute-api.us-east-1.amazonaws.com/dev/api/chat/message" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Create a policy for S3 read access"}'
```

## 📊 DynamoDB Tables

| Table | Purpose | TTL |
|-------|---------|-----|
| **Users** | User profiles | No |
| **ChatSessions** | Session metadata | 30 days |
| **ChatMessages** | Chat messages | No |
| **Policies** | Generated policies | No |
| **UserUsage** | Rate limiting | 7 days |

## 💰 Estimated Costs (100 users/month)

- Lambda: ~$5
- DynamoDB: ~$2
- API Gateway: ~$0.50
- Bedrock (Claude): ~$50
- **Total: ~$57.50/month**

## 🔒 Security

- ✅ Cognito JWT authentication
- ✅ IAM least privilege roles
- ✅ DynamoDB encryption at rest
- ✅ CloudWatch Logs
- ✅ CORS configured
- ✅ Rate limiting (5 req/day free tier)

## 🗑️ Cleanup

```bash
terraform destroy
```

⚠️ **Warning**: This deletes all data!
