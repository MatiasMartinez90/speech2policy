# ================================================================
# Speech2Policy Backend - DynamoDB Tables
# ================================================================

# Random suffix for unique table names
resource "random_string" "table_suffix" {
  length  = 6
  special = false
  upper   = false
}

locals {
  table_prefix = "${var.project_name}-${var.environment}"
}

# ================================================================
# 1. Users Table
# ================================================================
resource "aws_dynamodb_table" "users" {
  name           = "${local.table_prefix}-Users-${random_string.table_suffix.result}"
  billing_mode   = "PAY_PER_REQUEST"  # On-demand pricing
  hash_key       = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  tags = {
    Name        = "Users"
    Description = "User profiles and metadata"
  }
}

# ================================================================
# 2. ChatSessions Table
# ================================================================
resource "aws_dynamodb_table" "chat_sessions" {
  name           = "${local.table_prefix}-ChatSessions-${random_string.table_suffix.result}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "sessionId"

  attribute {
    name = "sessionId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  # GSI for querying sessions by user
  global_secondary_index {
    name            = "userId-timestamp-index"
    hash_key        = "userId"
    range_key       = "timestamp"
    projection_type = "ALL"
  }

  # TTL for automatic cleanup (30 days)
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name        = "ChatSessions"
    Description = "Chat session metadata"
  }
}

# ================================================================
# 3. ChatMessages Table
# ================================================================
resource "aws_dynamodb_table" "chat_messages" {
  name           = "${local.table_prefix}-ChatMessages-${random_string.table_suffix.result}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "sessionId"
  range_key      = "messageId"

  attribute {
    name = "sessionId"
    type = "S"
  }

  attribute {
    name = "messageId"
    type = "S"
  }

  tags = {
    Name        = "ChatMessages"
    Description = "Chat messages (user and AI responses)"
  }
}

# ================================================================
# 4. Policies Table
# ================================================================
resource "aws_dynamodb_table" "policies" {
  name           = "${local.table_prefix}-Policies-${random_string.table_suffix.result}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "policyId"

  attribute {
    name = "policyId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

  # GSI for querying policies by user
  global_secondary_index {
    name            = "userId-createdAt-index"
    hash_key        = "userId"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

  tags = {
    Name        = "Policies"
    Description = "Generated IAM policies"
  }
}

# ================================================================
# 5. UserUsage Table (Rate Limiting)
# ================================================================
resource "aws_dynamodb_table" "user_usage" {
  name           = "${local.table_prefix}-UserUsage-${random_string.table_suffix.result}"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "userId"

  attribute {
    name = "userId"
    type = "S"
  }

  # TTL for automatic cleanup (7 days)
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name        = "UserUsage"
    Description = "User usage tracking and rate limiting"
  }
}

# ================================================================
# Outputs
# ================================================================
output "dynamodb_tables" {
  description = "DynamoDB table names"
  value = {
    users         = aws_dynamodb_table.users.name
    chat_sessions = aws_dynamodb_table.chat_sessions.name
    chat_messages = aws_dynamodb_table.chat_messages.name
    policies      = aws_dynamodb_table.policies.name
    user_usage    = aws_dynamodb_table.user_usage.name
  }
}
