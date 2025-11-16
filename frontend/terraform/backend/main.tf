# ================================================================
# Speech2Policy - Cognito Authentication Backend
# ================================================================
# Based on cloudacademy example with Google SSO
# ================================================================

terraform {
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

  # Backend configuration - UNCOMMENT after running infra/ setup
  # backend "s3" {
  #   bucket         = "speech2policy-terraform-state-XXXXXXXX"  # From infra/ output
  #   key            = "frontend-backend/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "speech2policy-terraform-lock"
  # }
}

provider "aws" {
  region = var.aws_region
}

provider "random" {}

# Random suffixes for unique names
resource "random_string" "resource_suffix" {
  length  = 6
  special = false
  upper   = false
}

resource "random_string" "domain_suffix" {
  length  = 8
  special = false
  upper   = false
}

# ================================================================
# Lambda for post-confirmation
# ================================================================
resource "aws_lambda_function" "post_confirmation" {
  filename         = "${path.module}/lambda/postConfirmation.zip"
  function_name    = "${var.project_name}-${var.environment}-post-confirmation-${random_string.resource_suffix.result}"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  runtime          = "python3.11"
  source_code_hash = fileexists("${path.module}/lambda/postConfirmation.zip") ? filebase64sha256("${path.module}/lambda/postConfirmation.zip") : "placeholder"
  timeout          = 30

  environment {
    variables = {
      LOG_LEVEL = "INFO"
    }
  }
}

# IAM role for Lambda
resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-${var.environment}-lambda-role-${random_string.resource_suffix.result}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# ================================================================
# Cognito User Pool
# ================================================================
resource "aws_cognito_user_pool" "user_pool" {
  name = "${var.project_name}-${var.environment}-user-pool-${random_string.resource_suffix.result}"

  # Email as username
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Password policy
  password_policy {
    minimum_length    = 8
    require_lowercase = false
    require_numbers   = false
    require_symbols   = false
    require_uppercase = false
  }

  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  # Lambda triggers
  lambda_config {
    post_confirmation = aws_lambda_function.post_confirmation.arn
  }

  # Attributes
  schema {
    attribute_data_type = "String"
    name                = "email"
    required            = true
    mutable             = true

    string_attribute_constraints {
      min_length = 7
      max_length = 256
    }
  }

  schema {
    attribute_data_type = "String"
    name                = "picture"
    required            = false
    mutable             = true

    string_attribute_constraints {
      min_length = 0
      max_length = 2048
    }
  }

  schema {
    attribute_data_type = "String"
    name                = "name"
    required            = false
    mutable             = true

    string_attribute_constraints {
      min_length = 0
      max_length = 256
    }
  }

  tags = {
    Name        = "speech2policy-user-pool"
    Environment = var.environment
  }
}

# Permission for Cognito to invoke Lambda
resource "aws_lambda_permission" "cognito_invoke_lambda" {
  statement_id  = "AllowExecutionFromCognito"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.post_confirmation.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.user_pool.arn
}

# ================================================================
# Google Identity Provider
# ================================================================
resource "aws_cognito_identity_provider" "google" {
  user_pool_id  = aws_cognito_user_pool.user_pool.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id                = var.google_client_id
    client_secret            = var.google_client_secret
    authorize_scopes         = "email openid profile"
    attributes_url           = "https://people.googleapis.com/v1/people/me?personFields="
    attributes_url_add_attributes = "true"
    authorize_url            = "https://accounts.google.com/o/oauth2/v2/auth"
    oidc_issuer              = "https://accounts.google.com"
    token_request_method     = "POST"
    token_url                = "https://www.googleapis.com/oauth2/v4/token"
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
    name     = "name"
    picture  = "picture"
  }
}

# ================================================================
# Cognito Domain
# ================================================================
resource "aws_cognito_user_pool_domain" "user_pool_domain" {
  domain       = "${var.project_name}-${var.environment}-auth-${random_string.domain_suffix.result}"
  user_pool_id = aws_cognito_user_pool.user_pool.id
}

# ================================================================
# Cognito User Pool Client
# ================================================================
resource "aws_cognito_user_pool_client" "user_pool_client" {
  name         = "${var.project_name}-${var.environment}-client-${random_string.resource_suffix.result}"
  user_pool_id = aws_cognito_user_pool.user_pool.id

  # OAuth flows
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  # OAuth configuration
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]

  # Callback URLs
  callback_urls = [
    "https://${aws_cognito_user_pool_domain.user_pool_domain.domain}.auth.${var.aws_region}.amazoncognito.com/oauth2/idpresponse",
    "http://localhost:3000",
    "http://localhost:3000/chat",
    var.production_callback_url,
    "${var.production_callback_url}/chat"
  ]

  logout_urls = [
    "http://localhost:3000",
    var.production_logout_url
  ]

  # Supported identity providers
  supported_identity_providers = ["Google"]

  # Token validity
  access_token_validity  = 24  # 24 hours
  id_token_validity      = 24  # 24 hours
  refresh_token_validity = 720 # 30 days

  # Prevent user existence errors
  prevent_user_existence_errors = "ENABLED"

  # No client secret for public client
  generate_secret = false

  depends_on = [aws_cognito_identity_provider.google]
}

# ================================================================
# Outputs
# ================================================================
output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.user_pool.id
}

output "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = aws_cognito_user_pool.user_pool.arn
}

output "cognito_user_pool_web_client_id" {
  description = "Cognito User Pool Web Client ID"
  value       = aws_cognito_user_pool_client.user_pool_client.id
}

output "cognito_user_pool_domain" {
  description = "Cognito User Pool Domain"
  value       = aws_cognito_user_pool_domain.user_pool_domain.domain
}

output "google_identity_provider_name" {
  description = "Google Identity Provider Name"
  value       = aws_cognito_identity_provider.google.provider_name
}
