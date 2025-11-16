# Speech2Policy - Testing & Validation Guide

Comprehensive testing guide to verify your Speech2Policy deployment.

## Table of Contents

- [Pre-Deployment Validation](#pre-deployment-validation)
- [Infrastructure Testing](#infrastructure-testing)
- [Backend Testing](#backend-testing)
- [Frontend Testing](#frontend-testing)
- [Integration Testing](#integration-testing)
- [Security Testing](#security-testing)
- [Performance Testing](#performance-testing)
- [Monitoring Setup](#monitoring-setup)

## Pre-Deployment Validation

### Prerequisites Check

Before deploying, verify all tools are installed:

```bash
# AWS CLI
aws --version
# Expected: aws-cli/2.x.x

# Terraform
terraform version
# Expected: Terraform v1.5.7 or later

# Node.js
node --version
# Expected: v18.x.x or later

# Python
python3 --version
# Expected: Python 3.11.x or later

# AWS credentials
aws sts get-caller-identity
# Should return your AWS account details
```

### AWS Service Quotas

Check service limits in your AWS account:

```bash
# Lambda concurrent executions
aws service-quotas get-service-quota \
  --service-code lambda \
  --quota-code L-B99A9384 \
  --region us-east-1

# API Gateway requests per second
aws service-quotas get-service-quota \
  --service-code apigateway \
  --quota-code L-8A5B8E43 \
  --region us-east-1

# DynamoDB tables
aws service-quotas get-service-quota \
  --service-code dynamodb \
  --quota-code L-F98FE922 \
  --region us-east-1
```

### Bedrock Model Access

Verify Claude 3.5 Sonnet access:

```bash
# List foundation models
aws bedrock list-foundation-models \
  --region us-east-1 \
  --query 'modelSummaries[?contains(modelId, `claude-3-5-sonnet`)]'

# Test model invocation (requires access)
aws bedrock-runtime invoke-model \
  --model-id anthropic.claude-3-5-sonnet-20241022-v2:0 \
  --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}' \
  --region us-east-1 \
  response.json

# Check response
cat response.json
```

## Infrastructure Testing

### Terraform State Backend

After deploying the state backend (`infra/`):

```bash
cd infra

# Verify outputs
terraform output

# Check S3 bucket
BUCKET=$(terraform output -raw terraform_state_bucket)
aws s3 ls s3://$BUCKET

# Check DynamoDB table
TABLE=$(terraform output -raw terraform_state_lock_table)
aws dynamodb describe-table --table-name $TABLE
```

### Cognito User Pool

After deploying Cognito (`frontend/terraform/backend/`):

```bash
cd frontend/terraform/backend

# Get User Pool ID
POOL_ID=$(terraform output -raw cognito_user_pool_id)

# Describe user pool
aws cognito-idp describe-user-pool --user-pool-id $POOL_ID

# List identity providers
aws cognito-idp list-identity-providers --user-pool-id $POOL_ID

# Verify Google provider
aws cognito-idp describe-identity-provider \
  --user-pool-id $POOL_ID \
  --provider-name Google
```

### Backend Infrastructure

After deploying backend (`backend/terraform/`):

```bash
cd backend/terraform

# Verify all outputs
terraform output

# Check Lambda functions
aws lambda list-functions \
  --query 'Functions[?starts_with(FunctionName, `speech2policy`)].FunctionName'

# Check DynamoDB tables
aws dynamodb list-tables \
  --query 'TableNames[?starts_with(@, `speech2policy`)]'

# Check API Gateway
API_ID=$(terraform output -raw api_gateway_id)
aws apigateway get-rest-api --rest-api-id $API_ID

# Test API Gateway deployment
aws apigateway get-stages --rest-api-id $API_ID
```

### Frontend Infrastructure

After deploying frontend infrastructure (`frontend/terraform/frontend/`):

```bash
cd frontend/terraform/frontend

# Verify outputs
terraform output

# Check S3 bucket
BUCKET=$(terraform output -raw s3_bucket_name)
aws s3 ls s3://$BUCKET

# Check CloudFront distribution
DIST_ID=$(terraform output -raw cloudfront_distribution_id)
aws cloudfront get-distribution --id $DIST_ID
```

## Backend Testing

### Lambda Functions

#### Test Chat Handler (Direct Invocation)

```bash
# Create test event
cat > test-event.json <<EOF
{
  "httpMethod": "POST",
  "path": "/api/chat/message",
  "headers": {
    "Content-Type": "application/json"
  },
  "requestContext": {
    "authorizer": {
      "claims": {
        "sub": "test-user-123",
        "email": "test@example.com"
      }
    }
  },
  "body": "{\"message\": \"Create a policy for S3 read-only access to bucket my-data\"}"
}
EOF

# Invoke Lambda
aws lambda invoke \
  --function-name speech2policy-dev-chat-handler \
  --payload file://test-event.json \
  --region us-east-1 \
  response.json

# Check response
cat response.json | jq '.'

# Expected: statusCode 200, aiMessage with policyJson
```

#### Test Session Manager

```bash
cat > session-event.json <<EOF
{
  "httpMethod": "GET",
  "path": "/api/chat/sessions",
  "requestContext": {
    "authorizer": {
      "claims": {
        "sub": "test-user-123",
        "email": "test@example.com"
      }
    }
  }
}
EOF

aws lambda invoke \
  --function-name speech2policy-dev-session-manager \
  --payload file://session-event.json \
  response-sessions.json

cat response-sessions.json | jq '.'
```

#### Test Policy Manager

```bash
cat > policy-event.json <<EOF
{
  "httpMethod": "GET",
  "path": "/api/policies/history",
  "requestContext": {
    "authorizer": {
      "claims": {
        "sub": "test-user-123"
      }
    }
  }
}
EOF

aws lambda invoke \
  --function-name speech2policy-dev-policy-manager \
  --payload file://policy-event.json \
  response-policies.json

cat response-policies.json | jq '.'
```

### DynamoDB Tables

#### Verify Table Creation

```bash
# List all tables
aws dynamodb list-tables --region us-east-1

# Check Users table
aws dynamodb describe-table \
  --table-name speech2policy-dev-Users-* \
  --region us-east-1

# Scan Users (limited)
aws dynamodb scan \
  --table-name speech2policy-dev-Users-* \
  --limit 5
```

#### Test TTL Configuration

```bash
# Check TTL on ChatSessions
aws dynamodb describe-time-to-live \
  --table-name speech2policy-dev-ChatSessions-*

# Expected: TimeToLiveStatus: ENABLED, AttributeName: ttl
```

#### Test GSI

```bash
# Query ChatSessions by userId (requires a test user)
aws dynamodb query \
  --table-name speech2policy-dev-ChatSessions-* \
  --index-name userId-timestamp-index \
  --key-condition-expression "userId = :uid" \
  --expression-attribute-values '{":uid":{"S":"test-user-123"}}'
```

### API Gateway

#### Get API URL

```bash
cd backend/terraform
API_URL=$(terraform output -raw api_gateway_url)
echo "API URL: $API_URL"
```

#### Test OPTIONS (CORS Preflight)

```bash
curl -X OPTIONS "$API_URL/api/chat/message" \
  -H "Origin: http://localhost:3000" \
  -i

# Expected:
# Access-Control-Allow-Origin: *
# Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS
# Access-Control-Allow-Headers: Content-Type,Authorization
```

#### Test Unauthorized Access

```bash
curl -X POST "$API_URL/api/chat/message" \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}' \
  -i

# Expected: 401 Unauthorized
```

#### Get Cognito Token (for authorized testing)

```bash
# Using AWS CLI (requires user in Cognito)
USER_POOL_ID="us-east-1_xxxxx"
CLIENT_ID="xxxxx"
USERNAME="test@example.com"
PASSWORD="Test123!"

# Initiate auth
aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id $CLIENT_ID \
  --auth-parameters USERNAME=$USERNAME,PASSWORD=$PASSWORD \
  --query 'AuthenticationResult.IdToken' \
  --output text

# Save token
TOKEN="<paste-token-here>"
```

#### Test Authorized Request

```bash
curl -X POST "$API_URL/api/chat/message" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"Create an S3 read-only policy"}' \
  | jq '.'

# Expected: 200 OK with AI response
```

## Frontend Testing

### Local Development

```bash
cd frontend/app

# Install dependencies
npm ci

# Create .env.local (update with your values)
cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/dev
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_xxxxx
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=xxxxx
NEXT_PUBLIC_COGNITO_DOMAIN=speech2policy-dev.auth.us-east-1.amazoncognito.com
EOF

# Run dev server
npm run dev

# Open http://localhost:3000
```

### Build Validation

```bash
# Clean build
rm -rf .next out

# Build for production
npm run build

# Check output directory
ls -la out/

# Expected files:
# - index.html (landing page)
# - chat.html (chat page)
# - history.html (history page)
# - _next/ (static assets)
```

### Static Export Verification

```bash
# Serve the static export locally
npx serve out

# Test routes
curl http://localhost:3000/
curl http://localhost:3000/chat
curl http://localhost:3000/history
```

### Deployed Frontend

After deploying to S3/CloudFront:

```bash
# Get CloudFront domain
cd frontend/terraform/frontend
CF_DOMAIN=$(terraform output -raw cloudfront_domain)

# Test main page
curl https://$CF_DOMAIN/

# Test SPA routing (should return index.html, not 404)
curl https://$CF_DOMAIN/chat
curl https://$CF_DOMAIN/history

# Test static assets
curl -I https://$CF_DOMAIN/_next/static/css/app.css
```

## Integration Testing

### End-to-End User Flow

1. **Sign Up / Sign In**
   - Navigate to CloudFront URL
   - Click "Sign in with Google"
   - Complete OAuth flow
   - Verify redirect to /chat

2. **Create New Chat**
   - Click "New Chat" button
   - Verify session created
   - Check sidebar for new session

3. **Send Message**
   - Type: "Create a policy for S3 read-only access"
   - Click Send
   - Verify AI response
   - Verify policy JSON displayed
   - Check risk analysis badge

4. **Edit Policy**
   - Click "Edit" on generated policy
   - Modify JSON
   - Click "Save"
   - Verify changes applied

5. **View Diff**
   - Generate another policy
   - Click "Compare with previous"
   - Verify side-by-side diff view

6. **Copy Policy**
   - Click "Copy" on policy
   - Verify clipboard content

7. **View History**
   - Navigate to /history
   - Verify all generated policies listed
   - Click on a policy
   - Verify policy preview

8. **Rate Limiting**
   - Send 5 messages (free tier limit)
   - Try to send 6th message
   - Verify rate limit error

9. **Session Management**
   - Create multiple sessions
   - Switch between sessions
   - Delete a session
   - Verify deletion

### API Integration Tests

Create a test script:

```bash
# test-integration.sh
#!/bin/bash

API_URL="https://xxxxx.execute-api.us-east-1.amazonaws.com/dev"
TOKEN="your-cognito-token"

# Test 1: Send chat message
echo "Test 1: Send chat message"
RESPONSE=$(curl -s -X POST "$API_URL/api/chat/message" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Create S3 read policy"}')

echo $RESPONSE | jq '.success'
SESSION_ID=$(echo $RESPONSE | jq -r '.data.sessionId')

# Test 2: Continue conversation
echo "Test 2: Continue conversation"
curl -s -X POST "$API_URL/api/chat/message" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Make it more restrictive\",\"sessionId\":\"$SESSION_ID\"}" \
  | jq '.success'

# Test 3: List sessions
echo "Test 3: List sessions"
curl -s -X GET "$API_URL/api/chat/sessions" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.success'

# Test 4: Get policy history
echo "Test 4: Get policy history"
curl -s -X GET "$API_URL/api/policies/history" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.success'
```

Run it:
```bash
chmod +x test-integration.sh
./test-integration.sh
```

## Security Testing

### Authentication Tests

```bash
# 1. Test without token
curl -X POST "$API_URL/api/chat/message" \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
# Expected: 401 Unauthorized

# 2. Test with invalid token
curl -X POST "$API_URL/api/chat/message" \
  -H "Authorization: Bearer invalid-token" \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
# Expected: 403 Forbidden

# 3. Test with expired token
curl -X POST "$API_URL/api/chat/message" \
  -H "Authorization: Bearer expired-token" \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
# Expected: 401 Unauthorized
```

### CORS Tests

```bash
# Test valid origin
curl -X POST "$API_URL/api/chat/message" \
  -H "Origin: https://your-cloudfront-domain.cloudfront.net" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}' \
  -i | grep "Access-Control"

# Test invalid origin (should still allow, as we use *)
curl -X POST "$API_URL/api/chat/message" \
  -H "Origin: https://evil.com" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}' \
  -i | grep "Access-Control"
```

### Input Validation

Test injection attempts:

```bash
# SQL injection (DynamoDB is NoSQL, but test validation)
curl -X POST "$API_URL/api/chat/message" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"test; DROP TABLE Users;--"}'

# XSS attempt
curl -X POST "$API_URL/api/chat/message" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"<script>alert(\"xss\")</script>"}'

# Very long input
curl -X POST "$API_URL/api/chat/message" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"$(python3 -c 'print(\"a\"*10000)')\"}"
```

### Terraform Security Scan

```bash
# Run tfsec on backend
cd backend/terraform
tfsec .

# Run tfsec on Cognito
cd ../../frontend/terraform/backend
tfsec .

# Run tfsec on frontend infrastructure
cd ../frontend
tfsec .
```

## Performance Testing

### Lambda Cold Start

```bash
# Warm up Lambda
for i in {1..3}; do
  aws lambda invoke \
    --function-name speech2policy-dev-chat-handler \
    --payload file://test-event.json \
    out.json > /dev/null
  sleep 2
done

# Measure execution time
time aws lambda invoke \
  --function-name speech2policy-dev-chat-handler \
  --payload file://test-event.json \
  out.json

# Expected: < 5 seconds (including Bedrock)
```

### API Gateway Latency

```bash
# Install hey (HTTP load testing)
# https://github.com/rakyll/hey

# Test API latency
hey -n 100 -c 10 \
  -H "Authorization: Bearer $TOKEN" \
  -m POST \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}' \
  "$API_URL/api/chat/message"

# Expected p50: < 2s
# Expected p95: < 5s
```

### CloudFront Cache

```bash
# Test cache headers
curl -I https://$CF_DOMAIN/_next/static/css/app.css

# Expected:
# x-cache: Hit from cloudfront (on 2nd request)
# cache-control: public, max-age=31536000
```

### DynamoDB Performance

```bash
# Check DynamoDB metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name UserErrors \
  --dimensions Name=TableName,Value=speech2policy-dev-ChatSessions-* \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum

# Expected: 0 user errors
```

## Monitoring Setup

### CloudWatch Dashboards

Create a custom dashboard:

```bash
aws cloudwatch put-dashboard \
  --dashboard-name speech2policy-dev \
  --dashboard-body file://dashboard.json
```

`dashboard.json`:
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Lambda", "Invocations", {"stat": "Sum"}],
          [".", "Errors", {"stat": "Sum"}],
          [".", "Duration", {"stat": "Average"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Lambda Metrics"
      }
    }
  ]
}
```

### CloudWatch Alarms

```bash
# Alarm for Lambda errors
aws cloudwatch put-metric-alarm \
  --alarm-name speech2policy-lambda-errors \
  --alarm-description "Alert on Lambda errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1

# Alarm for API Gateway 5xx errors
aws cloudwatch put-metric-alarm \
  --alarm-name speech2policy-api-5xx \
  --metric-name 5XXError \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

### Log Insights Queries

```bash
# View Lambda errors
aws logs start-query \
  --log-group-name /aws/lambda/speech2policy-dev-chat-handler \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --query-string 'fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20'

# View API Gateway access logs
aws logs start-query \
  --log-group-name /aws/apigateway/speech2policy-dev \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --query-string 'fields @timestamp, requestId, status, latency | sort @timestamp desc | limit 100'
```

## Validation Checklist

Use this checklist after deployment:

- [ ] Terraform state backend created successfully
- [ ] All Terraform modules deployed without errors
- [ ] Cognito User Pool created with Google OAuth
- [ ] All Lambda functions deployed and invocable
- [ ] All DynamoDB tables created with correct GSIs and TTL
- [ ] API Gateway deployed with Cognito authorizer
- [ ] S3 bucket created for frontend hosting
- [ ] CloudFront distribution deployed and accessible
- [ ] Frontend application builds successfully
- [ ] Frontend deployed to S3
- [ ] CloudFront cache invalidated
- [ ] Can access application via CloudFront URL
- [ ] Google OAuth sign-in works
- [ ] Can send chat messages and receive AI responses
- [ ] Policies are generated correctly
- [ ] Risk analysis displays properly
- [ ] Inline editor works
- [ ] Diff viewer works
- [ ] Policy history loads
- [ ] Rate limiting enforces 5 messages/day
- [ ] Session management works (create, switch, delete)
- [ ] All API endpoints return correct responses
- [ ] CORS headers configured correctly
- [ ] Authentication required for protected endpoints
- [ ] CloudWatch logs capturing events
- [ ] No critical security findings from tfsec
- [ ] Performance meets expectations (< 5s response time)

## Troubleshooting Common Test Failures

### Lambda Invocation Fails

**Symptom:** Lambda returns errors when invoked

**Checks:**
```bash
# Check Lambda logs
aws logs tail /aws/lambda/speech2policy-dev-chat-handler --follow

# Check IAM role permissions
aws lambda get-function --function-name speech2policy-dev-chat-handler \
  --query 'Configuration.Role'

# Verify Bedrock access
aws iam simulate-principal-policy \
  --policy-source-arn <lambda-role-arn> \
  --action-names bedrock:InvokeModel
```

### API Gateway 403 Errors

**Symptom:** Authorized requests return 403

**Checks:**
```bash
# Verify Cognito authorizer
aws apigateway get-authorizers --rest-api-id $API_ID

# Check token validity
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.'

# Verify User Pool ID matches
```

### DynamoDB Access Denied

**Symptom:** Lambda can't read/write to DynamoDB

**Checks:**
```bash
# Check Lambda IAM role
aws iam get-role-policy \
  --role-name speech2policy-dev-chat-handler-role \
  --policy-name dynamodb-access

# Verify table ARNs in policy
```

### Frontend Build Fails

**Symptom:** `npm run build` errors

**Checks:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Must be >= 18

# Verify .env.local exists
cat .env.local
```

---

**Testing completed successfully?** 🎉

You're ready to use Speech2Policy in production!
