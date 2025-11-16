# CloudAcademy Next.js - Infrastructure Documentation

## Overview

CloudAcademy Next.js is deployed on AWS using a modern serverless architecture managed with Terraform Infrastructure as Code (IaC). The infrastructure follows AWS Well-Architected Framework principles with proper separation of concerns, security-first design, and automated deployment pipelines.

## Architecture Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Users/Web     │    │   CloudFront     │    │   S3 Bucket     │
│   Browsers      │───▶│   Distribution   │───▶│  (Static Site)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │ CloudFront Func  │
                       │  (URL Rewrite)   │
                       └──────────────────┘

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js App   │    │   AWS Cognito    │    │  Lambda Func    │
│   Frontend      │───▶│   User Pool      │───▶│ PostConfirm     │
└─────────────────┘    └──────────────────┘    └─────────────────┘

┌─────────────────┐    ┌──────────────────┐
│  Terraform      │    │   S3 + DynamoDB  │
│  States         │───▶│   State Backend  │
└─────────────────┘    └──────────────────┘
```

## Infrastructure Components

### 1. Frontend Infrastructure (`terraform/frontend/`)

#### S3 Static Website Hosting
- **Service**: Amazon S3
- **Purpose**: Host static Next.js build files
- **Configuration**:
  - Bucket name: `website-bucket-{random_suffix}`
  - Versioning enabled
  - AES256 server-side encryption
  - Public access completely blocked (CloudFront-only access)
  - SSL enforcement policy

#### CloudFront CDN
- **Service**: Amazon CloudFront
- **Purpose**: Global content delivery and HTTPS termination
- **Configuration**:
  - Global edge locations for low latency
  - HTTPS redirect enforcement
  - IPv6 support enabled
  - Custom 404 error handling (returns 200 with index.html)
  - Origin Access Identity (OAI) for secure S3 access

#### CloudFront Function
- **Purpose**: URL rewriting for clean URLs
- **Location**: `/cloudfrontfunction/rewrite.js`
- **Function**: Handles Next.js routing and clean URL structure

### 2. Backend Infrastructure (`terraform/backend/`)

#### AWS Cognito Authentication
- **Service**: Amazon Cognito User Pool
- **Purpose**: User authentication and management
- **Configuration**:
  - Email-based authentication
  - Self-signup enabled with auto-verified emails
  - Password policy: Minimum 8 characters
  - Token validity: 24h (access/ID), 30 days (refresh)
  - Post-confirmation Lambda trigger

#### Lambda Function
- **Service**: AWS Lambda
- **Function Name**: `PostConfirmationFn`
- **Runtime**: Node.js 18.x
- **Purpose**: Handle post-confirmation user registration
- **Source**: TypeScript code in `/lambda/postConfirmation.ts`
- **Trigger**: Cognito User Pool post-confirmation event

### 3. State Management Infrastructure (`tf_backend/`)

#### Terraform State Backend
- **S3 Bucket**: `terraform-state-bucket-vz26twi7`
  - Versioning enabled for rollback capability
  - Server-side encryption
  - Public access blocked
  - Lifecycle protection (prevent_destroy = true)

- **DynamoDB Table**: `terraform-state-lock`
  - State locking to prevent concurrent operations
  - Pay-per-request billing model
  - Hash key: `LockID`

## Deployment Architecture

### Infrastructure Deployment
The infrastructure is organized into separate Terraform modules with independent state management:

1. **Bootstrap Phase**: Deploy `tf_backend/` to create state storage
2. **Backend Phase**: Deploy `terraform/backend/` for authentication services
3. **Frontend Phase**: Deploy `terraform/frontend/` for hosting infrastructure

### Application Deployment
Frontend application deployment is handled via GitHub Actions:

```yaml
Workflow Trigger (push to tail3) →
Build Next.js Application →
Create Environment Config →
Deploy to S3 Bucket →
Automatic CloudFront Invalidation
```

## Security Configuration

### Network Security
- **S3 Security**: All public access blocked, CloudFront-only access via OAI
- **HTTPS Enforcement**: All traffic redirected to HTTPS
- **WAF Ready**: CloudFront distribution ready for AWS WAF integration

### Identity & Access Management
- **Cognito Security**: Secure authentication with email verification
- **IAM Roles**: Least privilege access for Lambda execution
- **Service Permissions**: Proper service-to-service authentication

### Data Protection
- **Encryption at Rest**: S3 server-side encryption (AES256)
- **Encryption in Transit**: HTTPS/TLS encryption via CloudFront
- **State Security**: Terraform state encrypted and access-controlled

## CI/CD Workflows

### Infrastructure Workflows (`.github/workflows/`)

1. **terraform-backend.yml**
   - Deploys authentication and Lambda infrastructure
   - Triggered on: `ft/auth2` branch changes

2. **terraform-frontend.yml**
   - Deploys S3 bucket and CloudFront distribution
   - Triggered on: `ft/auth2` branch changes

3. **deploy-lambda.yml**
   - Updates Lambda function code only
   - For rapid function updates without full infrastructure deployment

### Application Workflow

4. **deploy-nextjs.yml**
   - Builds and deploys Next.js application
   - Triggered on: `tail3` branch changes
   - Creates runtime environment configuration
   - Syncs build files to S3 with cleanup

## Environment Configuration

### Runtime Configuration
- **Environment File**: `/app/out/env.json` (created during deployment)
- **Cognito Configuration**: User Pool ID and Client ID injected at build time
- **AWS Region**: `us-east-1` (primary region)

### GitHub Secrets Required
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION (optional, defaults to us-east-1)
```

## State Management

### Remote State Configuration
```hcl
terraform {
  backend "s3" {
    bucket         = "terraform-state-bucket-vz26twi7"
    key            = "backend/terraform.tfstate"  # or frontend/terraform.tfstate
    region         = "us-east-1"
    dynamodb_table = "terraform-state-lock"
    encrypt        = true
  }
}
```

### State Organization
- **Backend State**: `backend/terraform.tfstate` - Authentication and Lambda
- **Frontend State**: `frontend/terraform.tfstate` - S3 and CloudFront
- **Cross-State References**: Data sources for sharing outputs between modules

## Key Infrastructure Outputs

### Backend Module Outputs
```
cognito_user_pool_id          # For application configuration
cognito_user_pool_web_client_id  # For frontend authentication
```

### Frontend Module Outputs
```
frontend_endpoint             # CloudFront distribution domain
website_bucket_name          # S3 bucket for deployments
cloudfront_distribution_id   # For cache invalidation
```

## Monitoring & Observability

### Current Monitoring
- **CloudFront**: Built-in access logs and metrics
- **Lambda**: CloudWatch logs and basic metrics
- **Cognito**: Built-in authentication logs

### Recommended Additions
- CloudWatch dashboards for application metrics
- AWS X-Ray tracing for Lambda functions
- CloudWatch alarms for error rates and performance
- SNS notifications for critical alerts

## Cost Optimization

### Current Cost Factors
- **S3**: Storage and requests (minimal for static site)
- **CloudFront**: Data transfer and requests
- **Lambda**: Invocations and execution time (pay-per-use)
- **Cognito**: Monthly active users
- **DynamoDB**: Pay-per-request for state locking

### Optimization Opportunities
- CloudFront caching optimization
- S3 lifecycle policies for old versions
- Lambda memory optimization
- Cognito pricing tier evaluation

## Disaster Recovery

### Backup Strategy
- **Terraform State**: Versioned in S3 with cross-region replication option
- **Application Code**: Version controlled in GitHub
- **User Data**: Cognito user pool data backed up via AWS native services

### Recovery Procedures
1. Infrastructure recovery via Terraform state restoration
2. Application redeployment via GitHub Actions
3. DNS updates if necessary for regional failover

## Security Best Practices Implemented

✅ **Infrastructure as Code**: All infrastructure version-controlled and auditable  
✅ **Least Privilege Access**: IAM roles with minimal required permissions  
✅ **Encryption**: Data encrypted at rest and in transit  
✅ **Network Security**: Private S3 access via CloudFront OAI  
✅ **State Security**: Remote state with locking and encryption  
✅ **Secret Management**: Sensitive data in GitHub Secrets  

## Recommended Improvements

### Security Enhancements
- [ ] Implement AWS WAF on CloudFront distribution
- [ ] Add CloudTrail for comprehensive audit logging
- [ ] Migrate secrets to AWS Secrets Manager
- [ ] Enable AWS GuardDuty for threat detection
- [ ] Implement AWS Config for compliance monitoring

### Operational Excellence
- [ ] Add comprehensive CloudWatch monitoring
- [ ] Implement automated backup verification
- [ ] Create runbooks for common operations
- [ ] Set up multi-environment support (dev/staging/prod)
- [ ] Add infrastructure testing with Terratest

### Performance Optimization
- [ ] Implement CloudFront caching strategies
- [ ] Add Lambda function optimization
- [ ] Consider AWS Global Accelerator for global users
- [ ] Implement S3 Transfer Acceleration

## Getting Started

### Prerequisites
- AWS CLI configured with appropriate permissions
- Terraform >= 1.0
- Node.js 18+ for Lambda development

### Deployment Steps
1. **Deploy State Backend**:
   ```bash
   cd tf_backend
   terraform init
   terraform plan
   terraform apply
   ```

2. **Deploy Backend Services**:
   ```bash
   cd terraform/backend
   terraform init
   terraform plan
   terraform apply
   ```

3. **Deploy Frontend Infrastructure**:
   ```bash
   cd terraform/frontend
   terraform init
   terraform plan
   terraform apply
   ```

4. **Deploy Application**: Push to `tail3` branch to trigger GitHub Actions

## Support & Maintenance

### Regular Maintenance Tasks
- Monitor AWS costs and usage
- Update Terraform provider versions
- Review and rotate access keys
- Update Lambda runtime versions
- Monitor security advisories

### Troubleshooting
- Check CloudWatch logs for Lambda errors
- Verify Cognito configuration for authentication issues
- Use CloudFront invalidation for cache issues
- Review S3 bucket policies for access problems

---

**Last Updated**: December 2024  
**Infrastructure Version**: Terraform AWS Provider ~> 5.0  
**Maintained By**: CloudAcademy DevOps Team