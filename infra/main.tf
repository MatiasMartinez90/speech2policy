# ================================================================
# Speech2Policy - Terraform State Backend Infrastructure
# ================================================================
# This creates the S3 bucket and DynamoDB table needed to store
# Terraform state with locking for all other infrastructure
# ================================================================

terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "speech2policy"
      ManagedBy   = "terraform"
      Environment = "shared"
      Component   = "state-backend"
    }
  }
}

# ================================================================
# Random suffix for globally unique S3 bucket name
# ================================================================
resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# ================================================================
# S3 Bucket for Terraform State
# ================================================================
resource "aws_s3_bucket" "terraform_state" {
  bucket = "speech2policy-terraform-state-${random_string.bucket_suffix.result}"

  tags = {
    Name        = "speech2policy-terraform-state"
    Description = "Terraform state storage for Speech2Policy project"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Enable versioning for state history
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Enable encryption at rest
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle rule to manage old versions
resource "aws_s3_bucket_lifecycle_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }

  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# ================================================================
# DynamoDB Table for State Locking
# ================================================================
resource "aws_dynamodb_table" "terraform_lock" {
  name         = "speech2policy-terraform-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name        = "speech2policy-terraform-lock"
    Description = "Terraform state locking for Speech2Policy project"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# ================================================================
# Outputs
# ================================================================
output "s3_bucket_name" {
  description = "Name of the S3 bucket for Terraform state"
  value       = aws_s3_bucket.terraform_state.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket for Terraform state"
  value       = aws_s3_bucket.terraform_state.arn
}

output "dynamodb_table_name" {
  description = "Name of the DynamoDB table for state locking"
  value       = aws_dynamodb_table.terraform_lock.name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table for state locking"
  value       = aws_dynamodb_table.terraform_lock.arn
}

output "backend_config" {
  description = "Backend configuration to use in other Terraform modules"
  value = {
    bucket         = aws_s3_bucket.terraform_state.id
    region         = var.aws_region
    dynamodb_table = aws_dynamodb_table.terraform_lock.name
    encrypt        = true
  }
}
