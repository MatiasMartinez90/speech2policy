# ================================================================
# IAM Copilot - DynamoDB Tables
# ================================================================
# Multi-tenant B2B architecture with Organizations
# Tables: Organizations, Users, Accounts, Roles, Policies,
#         Findings, ApplyRequests, AuditLog
# ================================================================

# Random suffix for unique table names
resource "random_string" "iam_copilot_suffix" {
  length  = 6
  special = false
  upper   = false
}

locals {
  iam_table_prefix = "iam-copilot-${var.environment}"
}

# ================================================================
# 1. Organizations Table (B2B Tenants)
# ================================================================
resource "aws_dynamodb_table" "organizations" {
  name         = "${local.iam_table_prefix}-Organizations-${random_string.iam_copilot_suffix.result}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "orgId"

  attribute {
    name = "orgId"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "N"
  }

  global_secondary_index {
    name            = "createdAt-index"
    hash_key        = "createdAt"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name        = "Organizations"
    Description = "Tenant organizations (B2B model)"
    Service     = "IAM-Copilot"
  }
}

# ================================================================
# 2. Users Table
# ================================================================
resource "aws_dynamodb_table" "iam_users" {
  name         = "${local.iam_table_prefix}-Users-${random_string.iam_copilot_suffix.result}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "orgId"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name            = "orgId-index"
    hash_key        = "orgId"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "email-index"
    hash_key        = "email"
    projection_type = "ALL"
  }

  tags = {
    Name        = "Users"
    Description = "Users with organization membership"
    Service     = "IAM-Copilot"
  }
}

# ================================================================
# 3. Accounts Table (AWS Accounts Connected)
# ================================================================
resource "aws_dynamodb_table" "accounts" {
  name         = "${local.iam_table_prefix}-Accounts-${random_string.iam_copilot_suffix.result}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "accountId"

  attribute {
    name = "accountId"
    type = "S"
  }

  attribute {
    name = "orgId"
    type = "S"
  }

  attribute {
    name = "awsAccountId"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  global_secondary_index {
    name            = "orgId-index"
    hash_key        = "orgId"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "awsAccountId-index"
    hash_key        = "awsAccountId"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "status-index"
    hash_key        = "status"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name        = "Accounts"
    Description = "Connected AWS accounts"
    Service     = "IAM-Copilot"
  }
}

# ================================================================
# 4. Roles Table (IAM Roles Synced from AWS)
# ================================================================
resource "aws_dynamodb_table" "roles" {
  name         = "${local.iam_table_prefix}-Roles-${random_string.iam_copilot_suffix.result}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "roleId"

  attribute {
    name = "roleId"
    type = "S"
  }

  attribute {
    name = "accountId"
    type = "S"
  }

  attribute {
    name = "roleArn"
    type = "S"
  }

  attribute {
    name = "riskScore"
    type = "N"
  }

  attribute {
    name = "lastSynced"
    type = "N"
  }

  global_secondary_index {
    name            = "accountId-riskScore-index"
    hash_key        = "accountId"
    range_key       = "riskScore"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "roleArn-index"
    hash_key        = "roleArn"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "lastSynced-index"
    hash_key        = "lastSynced"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name        = "Roles"
    Description = "IAM roles synced from AWS accounts"
    Service     = "IAM-Copilot"
  }
}

# ================================================================
# 5. Policies Table (IAM Policies Synced from AWS)
# ================================================================
resource "aws_dynamodb_table" "policies" {
  name         = "${local.iam_table_prefix}-Policies-${random_string.iam_copilot_suffix.result}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "policyId"

  attribute {
    name = "policyId"
    type = "S"
  }

  attribute {
    name = "accountId"
    type = "S"
  }

  attribute {
    name = "policyArn"
    type = "S"
  }

  attribute {
    name = "policyType"
    type = "S"
  }

  attribute {
    name = "riskScore"
    type = "N"
  }

  global_secondary_index {
    name            = "accountId-riskScore-index"
    hash_key        = "accountId"
    range_key       = "riskScore"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "policyArn-index"
    hash_key        = "policyArn"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "policyType-index"
    hash_key        = "policyType"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name        = "Policies"
    Description = "IAM policies synced from AWS accounts"
    Service     = "IAM-Copilot"
  }
}

# ================================================================
# 6. Findings Table (Security Issues Detected)
# ================================================================
resource "aws_dynamodb_table" "findings" {
  name         = "${local.iam_table_prefix}-Findings-${random_string.iam_copilot_suffix.result}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "findingId"

  attribute {
    name = "findingId"
    type = "S"
  }

  attribute {
    name = "orgId"
    type = "S"
  }

  attribute {
    name = "accountId"
    type = "S"
  }

  attribute {
    name = "severity"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "N"
  }

  global_secondary_index {
    name            = "orgId-severity-index"
    hash_key        = "orgId"
    range_key       = "severity"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "accountId-status-index"
    hash_key        = "accountId"
    range_key       = "status"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "status-createdAt-index"
    hash_key        = "status"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name        = "Findings"
    Description = "Security findings and recommendations"
    Service     = "IAM-Copilot"
  }
}

# ================================================================
# 7. ApplyRequests Table (Change Requests & Approvals)
# ================================================================
resource "aws_dynamodb_table" "apply_requests" {
  name         = "${local.iam_table_prefix}-ApplyRequests-${random_string.iam_copilot_suffix.result}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "requestId"

  attribute {
    name = "requestId"
    type = "S"
  }

  attribute {
    name = "orgId"
    type = "S"
  }

  attribute {
    name = "accountId"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "N"
  }

  attribute {
    name = "requestedBy"
    type = "S"
  }

  global_secondary_index {
    name            = "orgId-status-index"
    hash_key        = "orgId"
    range_key       = "status"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "accountId-createdAt-index"
    hash_key        = "accountId"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "requestedBy-index"
    hash_key        = "requestedBy"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name        = "ApplyRequests"
    Description = "IAM change requests and approval workflow"
    Service     = "IAM-Copilot"
  }
}

# ================================================================
# 8. AuditLog Table (Immutable Audit Trail)
# ================================================================
resource "aws_dynamodb_table" "audit_log" {
  name         = "${local.iam_table_prefix}-AuditLog-${random_string.iam_copilot_suffix.result}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "logId"

  attribute {
    name = "logId"
    type = "S"
  }

  attribute {
    name = "orgId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "action"
    type = "S"
  }

  global_secondary_index {
    name            = "orgId-timestamp-index"
    hash_key        = "orgId"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "userId-timestamp-index"
    hash_key        = "userId"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "action-timestamp-index"
    hash_key        = "action"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name        = "AuditLog"
    Description = "Immutable audit trail (archived to S3)"
    Service     = "IAM-Copilot"
  }
}

# ================================================================
# Outputs
# ================================================================
output "organizations_table_name" {
  description = "Organizations DynamoDB table name"
  value       = aws_dynamodb_table.organizations.name
}

output "iam_users_table_name" {
  description = "IAM Copilot Users table name"
  value       = aws_dynamodb_table.iam_users.name
}

output "accounts_table_name" {
  description = "AWS Accounts table name"
  value       = aws_dynamodb_table.accounts.name
}

output "roles_table_name" {
  description = "IAM Roles table name"
  value       = aws_dynamodb_table.roles.name
}

output "policies_table_name" {
  description = "IAM Policies table name"
  value       = aws_dynamodb_table.policies.name
}

output "findings_table_name" {
  description = "Findings table name"
  value       = aws_dynamodb_table.findings.name
}

output "apply_requests_table_name" {
  description = "Apply Requests table name"
  value       = aws_dynamodb_table.apply_requests.name
}

output "audit_log_table_name" {
  description = "Audit Log table name"
  value       = aws_dynamodb_table.audit_log.name
}
