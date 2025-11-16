# IAM Copilot - Backend Deployment Guide

## Architecture Overview

IAM Copilot backend consists of:
- **8 DynamoDB Tables**: Organizations, Users, Accounts, Roles, Policies, Findings, ApplyRequests, AuditLog
- **5 Lambda Functions**: AWS Sync Handler, Risk Analyzer, Findings Generator, Account Manager, Apply Executor
- **2 Lambda Layers**: Powertools, Common Dependencies
- **EventBridge Rules**: Scheduled automation triggers
- **IAM Roles**: Least-privilege roles for each Lambda

## Prerequisites

### AWS Account Setup
- AWS CLI configured with credentials
- Terraform >= 1.5.0
- Python 3.11+
- Access to us-east-1 region

### Local Development
```bash
# Install dependencies
pip install boto3 aws-lambda-powertools

# Install Terraform
brew install terraform  # macOS
# or download from https://www.terraform.io/downloads
```

## Step-by-Step Deployment

### 1. Build Lambda Layers

Lambda Layers contain shared dependencies used across all functions.

```bash
cd backend/lambda-layers
chmod +x build-all.sh
./build-all.sh
```

This creates:
- `powertools.zip` (~5 MB)
- `common-dependencies.zip` (~10 MB)

### 2. Package Lambda Functions

Each Lambda function needs to be packaged with its dependencies.

```bash
cd backend/lambdas

# Package aws-sync-handler
cd aws-sync-handler
zip -r deployment.zip lambda_function.py
cd ..

# Package risk-analyzer
cd risk-analyzer
zip -r deployment.zip lambda_function.py
cd ..

# Package findings-generator
cd findings-generator
zip -r deployment.zip lambda_function.py
cd ..

# Package account-manager
cd account-manager
zip -r deployment.zip lambda_function.py
cd ..

# Package apply-executor
cd apply-executor
zip -r deployment.zip lambda_function.py
cd ..
```

**Alternative:** Use the automated packaging script:

```bash
cd backend
./scripts/package-lambdas.sh
```

### 3. Initialize Terraform

```bash
cd backend/terraform

# Initialize Terraform (downloads providers)
terraform init

# Review the plan
terraform plan -var-file=environments/dev.tfvars
```

### 4. Deploy Infrastructure

```bash
# Apply changes
terraform apply -var-file=environments/dev.tfvars

# Confirm with: yes
```

This creates:
- All 8 DynamoDB tables
- All 5 Lambda functions
- Lambda layers
- IAM roles with least-privilege permissions
- EventBridge scheduled rules

**Deployment time:** ~5-10 minutes

### 5. Verify Deployment

```bash
# Check DynamoDB tables
aws dynamodb list-tables --region us-east-1 | grep iam-copilot

# Check Lambda functions
aws lambda list-functions --region us-east-1 | grep iam-copilot

# Check EventBridge rules
aws events list-rules --region us-east-1 | grep iam-copilot
```

### 6. Seed Initial Data (Optional)

For testing, seed the Organizations and Users tables:

```bash
cd backend/scripts
python seed-test-data.py
```

This creates:
- 1 test organization
- 1 admin user
- Sample account configuration

## Lambda Functions Detail

### 1. AWS Sync Handler
**Purpose:** Connect to customer AWS accounts via AssumeRole and sync IAM data

**Trigger:** EventBridge (every 1 hour) or manual invocation

**Environment Variables:**
- `ROLES_TABLE_NAME`: DynamoDB Roles table
- `POLICIES_TABLE_NAME`: DynamoDB Policies table
- `ACCOUNTS_TABLE_NAME`: DynamoDB Accounts table

**Permissions:**
- DynamoDB read/write on Roles, Policies, Accounts
- `sts:AssumeRole` on `arn:aws:iam::*:role/IAMCopilotReadRole`

**Timeout:** 300 seconds (5 minutes)

**Memory:** 512 MB

### 2. Risk Analyzer
**Purpose:** Calculate risk scores (0-100) for IAM roles and policies

**Trigger:** After sync completes, or manual invocation

**Environment Variables:**
- `ROLES_TABLE_NAME`: DynamoDB Roles table
- `POLICIES_TABLE_NAME`: DynamoDB Policies table

**Permissions:**
- DynamoDB read/write on Roles, Policies

**Timeout:** 120 seconds (2 minutes)

**Memory:** 512 MB

### 3. Findings Generator
**Purpose:** Detect security issues and generate actionable findings

**Trigger:** After risk analysis, or manual invocation

**Environment Variables:**
- `ROLES_TABLE_NAME`: DynamoDB Roles table
- `POLICIES_TABLE_NAME`: DynamoDB Policies table
- `FINDINGS_TABLE_NAME`: DynamoDB Findings table
- `ACCOUNTS_TABLE_NAME`: DynamoDB Accounts table

**Permissions:**
- DynamoDB read/write on Roles, Policies, Findings, Accounts

**Timeout:** 180 seconds (3 minutes)

**Memory:** 512 MB

### 4. Account Manager
**Purpose:** Manage AWS account connections (connect/test/disconnect)

**Trigger:** API Gateway or manual invocation

**Environment Variables:**
- `ACCOUNTS_TABLE_NAME`: DynamoDB Accounts table
- `IAM_COPILOT_ACCOUNT_ID`: IAM Copilot AWS account ID

**Permissions:**
- DynamoDB full access on Accounts table
- `sts:AssumeRole` for testing connections

**Timeout:** 60 seconds

**Memory:** 512 MB

### 5. Apply Executor
**Purpose:** Execute approved IAM changes via CloudFormation

**Trigger:** Manual (after approval workflow)

**Environment Variables:**
- `APPLY_REQUESTS_TABLE_NAME`: DynamoDB ApplyRequests table
- `ACCOUNTS_TABLE_NAME`: DynamoDB Accounts table
- `AUDIT_LOG_TABLE_NAME`: DynamoDB AuditLog table

**Permissions:**
- DynamoDB access for ApplyRequests, Accounts, AuditLog
- CloudFormation ChangeSet operations
- `sts:AssumeRole` on `arn:aws:iam::*:role/IAMCopilotApplyRole`

**Timeout:** 300 seconds (5 minutes)

**Memory:** 512 MB

## EventBridge Automation

### IAM Sync Schedule
**Frequency:** Every 1 hour

**Target:** aws-sync-handler Lambda

**Purpose:** Automatically sync IAM data from all connected AWS accounts

**State:** ENABLED by default

### Risk Analysis Schedule
**Frequency:** Every 1 hour (10 minutes after sync)

**Target:** risk-analyzer Lambda

**Purpose:** Calculate risk scores for newly synced data

**State:** DISABLED (enable after testing)

### Findings Generation Schedule
**Frequency:** Every 1 hour (20 minutes after sync)

**Target:** findings-generator Lambda

**Purpose:** Generate security findings from risk analysis

**State:** DISABLED (enable after testing)

## Manual Testing

### Test Account Connection

```bash
aws lambda invoke \
  --function-name iam-copilot-dev-account-manager \
  --payload '{"action": "connect", "orgId": "org-123", "accountName": "Test Account", "awsAccountId": "123456789012"}' \
  response.json

cat response.json
```

### Test IAM Sync

```bash
aws lambda invoke \
  --function-name iam-copilot-dev-aws-sync-handler \
  --payload '{"accountId": "acc-xyz"}' \
  response.json

cat response.json
```

### Test Risk Analysis

```bash
aws lambda invoke \
  --function-name iam-copilot-dev-risk-analyzer \
  --payload '{"accountId": "acc-xyz"}' \
  response.json

cat response.json
```

### Test Findings Generation

```bash
aws lambda invoke \
  --function-name iam-copilot-dev-findings-generator \
  --payload '{"accountId": "acc-xyz"}' \
  response.json

cat response.json
```

## Workflow Example

### Complete Sync and Analysis Workflow

```bash
# 1. Connect account (generates ExternalId and template)
aws lambda invoke --function-name iam-copilot-dev-account-manager \
  --payload '{"action": "connect", "orgId": "org-123", "accountName": "Production", "awsAccountId": "123456789012"}' \
  connect-response.json

# Customer deploys CloudFormation stack in their account
# Returns roleArn and externalId

# 2. Test connection
aws lambda invoke --function-name iam-copilot-dev-account-manager \
  --payload '{"action": "test", "accountId": "acc-xyz"}' \
  test-response.json

# 3. Sync IAM data
aws lambda invoke --function-name iam-copilot-dev-aws-sync-handler \
  --payload '{"accountId": "acc-xyz"}' \
  sync-response.json

# 4. Analyze risks
aws lambda invoke --function-name iam-copilot-dev-risk-analyzer \
  --payload '{"accountId": "acc-xyz"}' \
  risk-response.json

# 5. Generate findings
aws lambda invoke --function-name iam-copilot-dev-findings-generator \
  --payload '{"accountId": "acc-xyz"}' \
  findings-response.json
```

## Production Considerations

### Step Functions Orchestration

For production, enable Step Functions workflow in `eventbridge-iam-copilot.tf`:

1. Uncomment Step Functions state machine
2. Apply Terraform changes
3. Disable individual Lambda EventBridge rules
4. Enable Step Functions trigger

**Benefits:**
- Automatic retry logic
- Visual workflow monitoring
- Error handling and notifications
- Parallel execution for multiple accounts

### Monitoring and Alerts

Setup CloudWatch alarms for:
- Lambda errors (> 5 errors in 5 minutes)
- Lambda throttling
- DynamoDB throttling
- High risk findings detected

```bash
# Example CloudWatch alarm
aws cloudwatch put-metric-alarm \
  --alarm-name iam-copilot-sync-errors \
  --alarm-description "Alert on sync errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=FunctionName,Value=iam-copilot-dev-aws-sync-handler
```

### Costs

**Estimated Monthly Costs (100 accounts, 1000 roles each):**

- **DynamoDB:** ~$5-10/month (on-demand)
  - 1M reads: ~$0.25
  - 200K writes: ~$0.25
  - Storage (20 GB): ~$5

- **Lambda:** ~$5-15/month
  - Sync handler (100 accounts × 24 runs/day): ~$10
  - Risk analyzer: ~$2
  - Findings generator: ~$3

- **EventBridge:** ~$1/month
  - Scheduled rules: negligible cost

- **CloudWatch Logs:** ~$2-5/month
  - 10 GB logs: ~$5

**Total: ~$15-30/month**

### Security Best Practices

1. **ExternalId rotation**: Rotate ExternalIds every 90 days
2. **Least privilege**: Review IAM policies quarterly
3. **Encryption**: Enable DynamoDB encryption at rest (enabled by default)
4. **Audit logs**: Archive to S3 Glacier after 90 days
5. **VPC**: Deploy Lambdas in VPC for production (optional)

## Troubleshooting

### Lambda fails with "Unable to import module"
- **Cause:** Missing dependencies or incorrect layer
- **Fix:** Rebuild Lambda layers and redeploy

### AssumeRole fails with "Access Denied"
- **Cause:** ExternalId mismatch or incorrect trust policy
- **Fix:** Verify ExternalId in Accounts table matches CloudFormation parameter

### DynamoDB throttling errors
- **Cause:** High request rate on on-demand tables
- **Fix:** DynamoDB auto-scales, wait 5 minutes. If persistent, contact AWS support

### EventBridge not triggering
- **Cause:** Rule disabled or incorrect target
- **Fix:** Check rule state with `aws events describe-rule`

### High costs
- **Cause:** Too frequent syncs or large accounts
- **Fix:** Reduce sync frequency to 6 hours or 12 hours for large accounts

## Rollback

### Destroy Infrastructure

```bash
cd backend/terraform
terraform destroy -var-file=environments/dev.tfvars
```

**Warning:** This deletes all data including audit logs. Export important data first.

### Partial Rollback

```bash
# Remove specific resource
terraform destroy -target=aws_lambda_function.findings_generator

# Or modify terraform config and re-apply
terraform apply
```

## Next Steps

After backend deployment:
1. **Test all Lambdas** manually
2. **Enable EventBridge rules** for automation
3. **Deploy API Gateway** for frontend integration
4. **Setup Cognito** for user authentication
5. **Deploy frontend** (Phase B)

## Support

For issues:
1. Check CloudWatch Logs for each Lambda
2. Review Terraform state: `terraform show`
3. Verify DynamoDB table contents
4. Check IAM permissions

For detailed architecture, see [DATA_MODEL.md](./DATA_MODEL.md)
