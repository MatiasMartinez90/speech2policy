terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "terraform-state-bucket-vz26twi7"
    key            = "bedrock/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-lock-table"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

# Data source to get current AWS account ID
data "aws_caller_identity" "current" {}

# IAM Role for FastAPI to access Bedrock
resource "aws_iam_role" "fastapi_bedrock_role" {
  name = "fastapi-bedrock-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "FastAPI Bedrock Role"
    Environment = var.environment
    Project     = "CloudAcademy"
  }
}

# IAM Policy for Bedrock access
resource "aws_iam_policy" "bedrock_access" {
  name        = "bedrock-access-policy"
  description = "Policy for FastAPI to access Amazon Bedrock"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
          "bedrock:ListFoundationModels",
          "bedrock:GetFoundationModel"
        ]
        Resource = [
          "arn:aws:bedrock:${var.aws_region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0",
          "arn:aws:bedrock:${var.aws_region}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "bedrock:ListFoundationModels"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name        = "Bedrock Access Policy"
    Environment = var.environment
    Project     = "CloudAcademy"
  }
}

# Attach the policy to the role
resource "aws_iam_role_policy_attachment" "fastapi_bedrock_policy" {
  role       = aws_iam_role.fastapi_bedrock_role.name
  policy_arn = aws_iam_policy.bedrock_access.arn
}

# IAM User for FastAPI (alternative to EC2 role)
resource "aws_iam_user" "fastapi_bedrock_user" {
  name = "fastapi-bedrock-user"
  path = "/"

  tags = {
    Name        = "FastAPI Bedrock User"
    Environment = var.environment
    Project     = "CloudAcademy"
  }
}

# Attach policy to user
resource "aws_iam_user_policy_attachment" "fastapi_bedrock_user_policy" {
  user       = aws_iam_user.fastapi_bedrock_user.name
  policy_arn = aws_iam_policy.bedrock_access.arn
}

# Create access key for the user
resource "aws_iam_access_key" "fastapi_bedrock_key" {
  user = aws_iam_user.fastapi_bedrock_user.name
}

# Store access key in AWS Systems Manager Parameter Store
resource "aws_ssm_parameter" "bedrock_access_key_id" {
  name  = "/cloudacademy/bedrock/access_key_id"
  type  = "SecureString"
  value = aws_iam_access_key.fastapi_bedrock_key.id

  tags = {
    Name        = "Bedrock Access Key ID"
    Environment = var.environment
    Project     = "CloudAcademy"
  }
}

resource "aws_ssm_parameter" "bedrock_secret_access_key" {
  name  = "/cloudacademy/bedrock/secret_access_key"
  type  = "SecureString"
  value = aws_iam_access_key.fastapi_bedrock_key.secret

  tags = {
    Name        = "Bedrock Secret Access Key"
    Environment = var.environment
    Project     = "CloudAcademy"
  }
}