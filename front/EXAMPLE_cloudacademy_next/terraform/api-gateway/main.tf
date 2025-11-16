terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    # Estos valores se configurarán al inicializar el backend
    bucket         = "terraform-state-bucket-vz26twi7"
    key            = "api-gateway/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-lock-table"
  }
}

provider "aws" {
  region = "us-east-1"
}

# API Gateway REST API para CloudAcademy
resource "aws_api_gateway_rest_api" "courses_api" {
  name        = "CloudAcademy-Courses-API"
  description = "API Gateway para funciones de cursos de CloudAcademy"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Environment = "production"
    Project     = "CloudAcademy"
    Module      = "api-gateway"
  }
}

# Lambda function para getUserProgress
resource "aws_lambda_function" "get_user_progress" {
  filename         = "../../lambda/getUserProgress_with_deps.zip"
  function_name    = "getUserProgress"
  role             = data.aws_iam_role.lambda_role.arn
  handler          = "getUserProgress.lambda_handler"
  runtime          = "python3.9"
  source_code_hash = filebase64sha256("../../lambda/getUserProgress_with_deps.zip")
  timeout          = 60

  environment {
    variables = {
      DB_HOST     = var.db_host
      DB_NAME     = var.db_name
      DB_USER     = var.db_user
      DB_PASSWORD = var.db_password
      DB_PORT     = var.db_port
    }
  }

  tags = {
    Environment = "production"
    Project     = "CloudAcademy"
    Function    = "getUserProgress"
  }

  lifecycle {
    ignore_changes = [source_code_hash]
  }
}

# Referencia al IAM role existente del módulo backend
data "aws_iam_role" "lambda_role" {
  name = "post_confirmation_lambda_role"
}

# Permiso para que API Gateway invoque la Lambda
resource "aws_lambda_permission" "api_gw_invoke_get_user_progress" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_user_progress.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.courses_api.execution_arn}/*/*"
}

# API Gateway Resources - Estructura: /api/users/me/progress

# Resource: /api
resource "aws_api_gateway_resource" "api" {
  rest_api_id = aws_api_gateway_rest_api.courses_api.id
  parent_id   = aws_api_gateway_rest_api.courses_api.root_resource_id
  path_part   = "api"
}

# Resource: /api/users
resource "aws_api_gateway_resource" "users" {
  rest_api_id = aws_api_gateway_rest_api.courses_api.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "users"
}

# Resource: /api/users/me
resource "aws_api_gateway_resource" "users_me" {
  rest_api_id = aws_api_gateway_rest_api.courses_api.id
  parent_id   = aws_api_gateway_resource.users.id
  path_part   = "me"
}

# Resource: /api/users/me/progress
resource "aws_api_gateway_resource" "users_me_progress" {
  rest_api_id = aws_api_gateway_rest_api.courses_api.id
  parent_id   = aws_api_gateway_resource.users_me.id
  path_part   = "progress"
}

# Method: GET /api/users/me/progress
resource "aws_api_gateway_method" "get_user_progress" {
  rest_api_id   = aws_api_gateway_rest_api.courses_api.id
  resource_id   = aws_api_gateway_resource.users_me_progress.id
  http_method   = "GET"
  authorization = "NONE"

  request_parameters = {
    "method.request.querystring.user_id" = false
  }
}

# Integration: GET /api/users/me/progress → Lambda
resource "aws_api_gateway_integration" "get_user_progress" {
  rest_api_id = aws_api_gateway_rest_api.courses_api.id
  resource_id = aws_api_gateway_resource.users_me_progress.id
  http_method = aws_api_gateway_method.get_user_progress.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.get_user_progress.invoke_arn
}

# CORS Support - Method: OPTIONS /api/users/me/progress
resource "aws_api_gateway_method" "get_user_progress_options" {
  rest_api_id   = aws_api_gateway_rest_api.courses_api.id
  resource_id   = aws_api_gateway_resource.users_me_progress.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# CORS Support - Integration: OPTIONS
resource "aws_api_gateway_integration" "get_user_progress_options" {
  rest_api_id = aws_api_gateway_rest_api.courses_api.id
  resource_id = aws_api_gateway_resource.users_me_progress.id
  http_method = aws_api_gateway_method.get_user_progress_options.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
    })
  }
}

# CORS Support - Method Response OPTIONS
resource "aws_api_gateway_method_response" "get_user_progress_options" {
  rest_api_id = aws_api_gateway_rest_api.courses_api.id
  resource_id = aws_api_gateway_resource.users_me_progress.id
  http_method = aws_api_gateway_method.get_user_progress_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }

  response_models = {
    "application/json" = "Empty"
  }
}

# CORS Support - Integration Response OPTIONS
resource "aws_api_gateway_integration_response" "get_user_progress_options" {
  rest_api_id = aws_api_gateway_rest_api.courses_api.id
  resource_id = aws_api_gateway_resource.users_me_progress.id
  http_method = aws_api_gateway_method.get_user_progress_options.http_method
  status_code = aws_api_gateway_method_response.get_user_progress_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [aws_api_gateway_integration.get_user_progress_options]
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "courses_api" {
  depends_on = [
    aws_api_gateway_integration.get_user_progress,
    aws_api_gateway_integration.get_user_progress_options
  ]

  rest_api_id = aws_api_gateway_rest_api.courses_api.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.users_me_progress.id,
      aws_api_gateway_method.get_user_progress.id,
      aws_api_gateway_integration.get_user_progress.id,
      aws_api_gateway_method.get_user_progress_options.id,
      aws_api_gateway_integration.get_user_progress_options.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway Stage
resource "aws_api_gateway_stage" "courses_api" {
  deployment_id = aws_api_gateway_deployment.courses_api.id
  rest_api_id   = aws_api_gateway_rest_api.courses_api.id
  stage_name    = "prod"

  tags = {
    Environment = "production"
    Project     = "CloudAcademy"
  }
}