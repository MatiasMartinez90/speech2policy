terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# S3 bucket para el estado de Terraform
resource "aws_s3_bucket" "terraform_state" {
  bucket = "terraform-state-bucket-${random_string.suffix.result}"

  # Prevenir eliminación accidental de este bucket S3
  lifecycle {
    prevent_destroy = true
  }
}

# Habilitar versionamiento para el bucket S3
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Habilitar encriptación por defecto para el bucket S3
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Bloquear todas las políticas públicas
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Tabla DynamoDB para el bloqueo del estado
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-lock-table"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}

# Random string para el nombre del bucket
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# Outputs
output "terraform_state_bucket" {
  value       = aws_s3_bucket.terraform_state.bucket
  description = "Nombre del bucket S3 para el estado de Terraform"
}

output "dynamodb_table_name" {
  value       = aws_dynamodb_table.terraform_locks.name
  description = "Nombre de la tabla DynamoDB para el bloqueo del estado"
} 