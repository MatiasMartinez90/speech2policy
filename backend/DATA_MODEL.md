# IAM Copilot - Data Model Documentation

## Overview

IAM Copilot uses a **multi-tenant B2B architecture** where each organization can have multiple users and AWS accounts. All data is partitioned by `orgId` to ensure tenant isolation.

## Tables

### 1. Organizations

**Purpose:** Store tenant organization data (B2B model)

**Schema:**
```typescript
{
  orgId: string              // PK - Unique organization ID
  name: string               // Organization name
  plan: 'free' | 'pro' | 'enterprise'
  createdAt: number          // Timestamp
  updatedAt: number
  settings: {
    maxAccounts: number
    maxUsers: number
    retentionDays: number
  }
  billing: {
    stripeCustomerId?: string
    subscriptionStatus: string
  }
  ttl?: number               // Auto-cleanup timestamp
}
```

**Indexes:**
- Primary: `orgId`
- GSI: `createdAt-index` (for analytics)

---

### 2. Users

**Purpose:** Users belonging to organizations with roles

**Schema:**
```typescript
{
  userId: string             // PK - Cognito sub
  orgId: string              // Organization ID (tenant isolation)
  email: string
  name: string
  role: 'admin' | 'editor' | 'viewer' | 'approver'
  status: 'active' | 'suspended'
  createdAt: number
  lastLogin: number
  preferences: {
    theme: 'light' | 'dark'
    notifications: boolean
  }
}
```

**Indexes:**
- Primary: `userId`
- GSI: `orgId-index` (list all users in org)
- GSI: `email-index` (lookup by email)

---

### 3. Accounts

**Purpose:** Connected AWS accounts for IAM analysis

**Schema:**
```typescript
{
  accountId: string          // PK - Internal UUID
  orgId: string              // Organization ID
  awsAccountId: string       // AWS Account ID (123456789012)
  accountName: string        // Friendly name (e.g., "Production")
  roleArn: string            // AssumeRole ARN for read access
  externalId: string         // Security: External ID for AssumeRole
  status: 'connected' | 'disconnected' | 'error'
  lastSyncedAt: number
  region: string             // Primary region
  syncStatus: {
    rolesCount: number
    policiesCount: number
    findingsCount: number
  }
  createdAt: number
  createdBy: string          // userId who connected this account
  ttl?: number
}
```

**Indexes:**
- Primary: `accountId`
- GSI: `orgId-index` (list accounts per org)
- GSI: `awsAccountId-index` (lookup by AWS account ID)
- GSI: `status-index` (filter by connection status)

**CloudFormation Template for Customer:**
```yaml
# Customer deploys this in their AWS account
Resources:
  IAMCopilotReadRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: IAMCopilotReadRole
      AssumeRolePolicyDocument:
        Statement:
          - Effect: Allow
            Principal:
              AWS: !Sub "arn:aws:iam::${IAMCopilotAccountId}:root"
            Action: sts:AssumeRole
            Condition:
              StringEquals:
                sts:ExternalId: !Ref ExternalId
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/SecurityAudit
        - arn:aws:iam::aws:policy/CloudWatchReadOnlyAccess
```

---

### 4. Roles

**Purpose:** IAM Roles synced from AWS accounts

**Schema:**
```typescript
{
  roleId: string             // PK - UUID
  accountId: string          // Foreign key to Accounts
  roleArn: string            // arn:aws:iam::123456789012:role/AdminRole
  roleName: string           // AdminRole
  path: string               // /
  trustPolicy: object        // AssumeRolePolicyDocument
  attachedPolicies: [
    {
      policyArn: string
      policyName: string
    }
  ]
  inlinePolicies: object[]   // Inline policy documents
  tags: object
  riskScore: number          // 0-100 calculated risk
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  riskFactors: string[]      // ['wildcard-resources', 'admin-access']
  lastAccessedAt: number     // From IAM Access Advisor
  lastSynced: number
  createdAt: number
  ttl?: number
}
```

**Indexes:**
- Primary: `roleId`
- GSI: `accountId-riskScore-index` (sort by risk per account)
- GSI: `roleArn-index` (lookup by ARN)
- GSI: `lastSynced-index` (find stale data)

---

### 5. Policies

**Purpose:** IAM Policies synced from AWS

**Schema:**
```typescript
{
  policyId: string           // PK - UUID
  accountId: string          // Foreign key
  policyArn: string          // arn:aws:iam::123456789012:policy/MyPolicy
  policyName: string
  policyType: 'Managed' | 'Inline' | 'AWS-Managed'
  policyDocument: object     // JSON policy document
  version: string            // v1, v2, etc.
  attachedToRoles: string[]  // roleArns
  attachedToUsers: string[]
  attachedToGroups: string[]
  riskScore: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  wildcards: {
    actions: boolean         // Has Action: "*"
    resources: boolean       // Has Resource: "*"
  }
  dangerousPermissions: string[]  // ['iam:*', 's3:DeleteBucket']
  lastSynced: number
  createdAt: number
  ttl?: number
}
```

**Indexes:**
- Primary: `policyId`
- GSI: `accountId-riskScore-index`
- GSI: `policyArn-index`
- GSI: `policyType-index`

---

### 6. Findings

**Purpose:** Security issues detected by analysis engine

**Schema:**
```typescript
{
  findingId: string          // PK - UUID
  orgId: string              // Tenant isolation
  accountId: string
  resourceType: 'role' | 'policy' | 'user'
  resourceId: string         // roleId or policyId
  resourceArn: string
  title: string              // "Overly Permissive S3 Access"
  description: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  category: 'least-privilege' | 'unused-permissions' | 'wildcard' | 'privilege-escalation'
  evidence: {
    cloudTrailEvents?: object[]
    accessAdvisor?: object
    policyAnalysis?: object
  }
  recommendation: string     // Human-readable fix suggestion
  suggestedFix: {
    type: 'replace-policy' | 'remove-permission' | 'restrict-resource'
    policyJson?: object
    diff?: string
  }
  status: 'open' | 'resolved' | 'accepted-risk' | 'false-positive'
  assignedTo?: string        // userId
  comments: [
    {
      userId: string
      text: string
      timestamp: number
    }
  ]
  createdAt: number
  resolvedAt?: number
  resolvedBy?: string
  ttl?: number
}
```

**Indexes:**
- Primary: `findingId`
- GSI: `orgId-severity-index` (dashboard view)
- GSI: `accountId-status-index` (filter by account and status)
- GSI: `status-createdAt-index` (sort by date)

**Finding Categories:**
- `least-privilege`: Permissions not used in X days
- `unused-permissions`: Never used (via CloudTrail)
- `wildcard`: Action or Resource wildcards
- `privilege-escalation`: Dangerous combinations (PassRole + CreateRole)
- `public-exposure`: Resources accessible publicly
- `cross-account`: Unusual trust relationships

---

### 7. ApplyRequests

**Purpose:** Change requests and approval workflow

**Schema:**
```typescript
{
  requestId: string          // PK - UUID
  orgId: string
  accountId: string
  requestedBy: string        // userId
  title: string              // "Fix AdminRole excessive permissions"
  description: string
  changeType: 'create' | 'update' | 'delete' | 'attach' | 'detach'
  resourceType: 'role' | 'policy' | 'user'
  resourceId: string
  changeSet: {
    before?: object          // Current state (policy JSON)
    after: object            // Desired state
    diff: string             // Unified diff
  }
  riskAssessment: {
    riskBefore: number
    riskAfter: number
    impactedServices: string[]
    rollbackPlan: string
  }
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed' | 'rolled-back'
  approvers: [
    {
      userId: string
      approved: boolean
      timestamp: number
      comment?: string
    }
  ]
  requiredApprovals: number  // Default: 1
  executionDetails?: {
    executedAt: number
    executedBy: string
    cloudFormationStackId?: string
    executionLogs: string
  }
  createdAt: number
  expiresAt?: number         // Auto-reject after X days
  ttl?: number
}
```

**Indexes:**
- Primary: `requestId`
- GSI: `orgId-status-index` (filter pending approvals)
- GSI: `accountId-createdAt-index` (history per account)
- GSI: `requestedBy-index` (user's requests)

**Workflow:**
1. User requests change → `status: pending`
2. Approver(s) review → add to `approvers[]`
3. If approved → `status: approved`
4. Execute change → `status: executed`
5. If fails → `status: failed`, trigger rollback

---

### 8. AuditLog

**Purpose:** Immutable audit trail for compliance

**Schema:**
```typescript
{
  logId: string              // PK - UUID
  orgId: string
  timestamp: number
  userId: string
  userName: string
  userEmail: string
  action: string             // 'apply_change', 'connect_account', 'delete_finding'
  resourceType: string       // 'role', 'policy', 'account', 'finding'
  resourceId: string
  details: object            // Action-specific data
  ipAddress: string
  userAgent: string
  success: boolean
  errorMessage?: string
  changeSet?: object         // For apply actions
  s3ArtifactUrl?: string     // S3 URL for detailed logs
  ttl?: number               // Archive to S3 after 90 days
}
```

**Indexes:**
- Primary: `logId`
- GSI: `orgId-timestamp-index` (audit logs per org)
- GSI: `userId-timestamp-index` (user activity)
- GSI: `action-timestamp-index` (filter by action type)

**DynamoDB Streams:** Enabled to trigger archival Lambda (write to S3)

**Compliance:**
- Immutable: No updates or deletes allowed
- Retention: 7 years in S3 Glacier
- Encryption: At rest + in transit

---

## Data Flows

### 1. Connect AWS Account

```
User → Frontend → API Gateway → connect-account Lambda
  ↓
Generate ExternalId → Store in Accounts table
  ↓
Return CloudFormation template → User deploys in AWS account
  ↓
User provides RoleArn → Test connection via AssumeRole
  ↓
If success → status: connected → Trigger sync-iam Lambda
```

### 2. Sync IAM Data

```
Scheduled EventBridge (every 1 hour) → sync-iam Lambda
  ↓
For each Account (status: connected):
  ↓
AssumeRole → iam:ListRoles, iam:ListPolicies, iam:GetRole, iam:GetPolicy
  ↓
Store in Roles & Policies tables
  ↓
Trigger risk-analyzer Lambda → Calculate risk scores
  ↓
Trigger findings-generator Lambda → Detect issues
```

### 3. Apply Change Workflow

```
User requests change → ApplyRequest (status: pending)
  ↓
Notify approvers (email/Slack)
  ↓
Approver reviews → Approve/Reject
  ↓
If approved → apply-executor Lambda
  ↓
Generate CloudFormation ChangeSet
  ↓
Execute ChangeSet → Update IAM
  ↓
If success → status: executed, log to AuditLog
If failure → status: failed, rollback
```

---

## Security & Access Patterns

### Tenant Isolation

All queries MUST filter by `orgId`:

```python
# ✅ CORRECT
response = table.query(
    IndexName='orgId-index',
    KeyConditionExpression='orgId = :orgId',
    ExpressionAttributeValues={':orgId': user_org_id}
)

# ❌ WRONG - Leaks data across tenants
response = table.scan()
```

### IAM Permissions (Lambda Execution Role)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:UpdateItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:*:table/iam-copilot-*",
        "arn:aws:dynamodb:us-east-1:*:table/iam-copilot-*/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::*:role/IAMCopilotReadRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "${external_id_from_db}"
        }
      }
    }
  ]
}
```

---

## Cost Optimization

### On-Demand Pricing

All tables use `PAY_PER_REQUEST` (on-demand) for:
- Predictable costs
- No capacity planning
- Auto-scaling

**Estimated Costs (100 active orgs):**
- 1M reads/month: ~$0.25
- 200K writes/month: ~$0.25
- Storage (10 GB): ~$2.50
- **Total: ~$3/month**

### TTL Strategy

- **Accounts:** Deleted after org cancels (90 days grace)
- **Roles/Policies:** Refresh every sync, old data expires in 30 days
- **Findings:** Resolved findings expire after 180 days
- **ApplyRequests:** Executed requests expire after 365 days
- **AuditLog:** Moved to S3 Glacier after 90 days

---

## Migration from Speech2Policy

Existing tables (ChatSessions, ChatMessages, Policies from chat) will be:
1. **Preserved** for backward compatibility
2. **Migrated** to new AI Builder schema
3. **Linked** to Organizations via `orgId`

Migration script will:
- Create `orgId` for each existing user
- Link ChatSessions to Organizations
- Preserve all historical data
