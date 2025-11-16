# API Gateway para CloudAcademy Tutor Backend

# ============================================================================
# REST API
# ============================================================================

resource "aws_api_gateway_rest_api" "tutor_api" {
  name        = "cloudacademy-tutor-api"
  description = "API Gateway para CloudAcademy Tutor con Bedrock"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name = "cloudacademy-tutor-api"
  }
}

# ============================================================================
# Cognito Authorizer
# ============================================================================

resource "aws_api_gateway_authorizer" "cognito" {
  name            = "CognitoAuthorizer"
  rest_api_id     = aws_api_gateway_rest_api.tutor_api.id
  type            = "COGNITO_USER_POOLS"
  provider_arns   = [var.cognito_user_pool_arn]
  identity_source = "method.request.header.Authorization"
}

# ============================================================================
# Resources: /api
# ============================================================================

resource "aws_api_gateway_resource" "api" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_rest_api.tutor_api.root_resource_id
  path_part   = "api"
}

# ============================================================================
# Resources: /api/tutor
# ============================================================================

resource "aws_api_gateway_resource" "tutor" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "tutor"
}

# /api/tutor/ask
resource "aws_api_gateway_resource" "tutor_ask" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_resource.tutor.id
  path_part   = "ask"
}

resource "aws_api_gateway_method" "tutor_ask_post" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.tutor_ask.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "tutor_ask_post" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.tutor_ask.id
  http_method             = aws_api_gateway_method.tutor_ask_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.tutor_handler.invoke_arn
}

# /api/tutor/validate
resource "aws_api_gateway_resource" "tutor_validate" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_resource.tutor.id
  path_part   = "validate"
}

resource "aws_api_gateway_method" "tutor_validate_post" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.tutor_validate.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "tutor_validate_post" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.tutor_validate.id
  http_method             = aws_api_gateway_method.tutor_validate_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.tutor_handler.invoke_arn
}

# /api/tutor/hint
resource "aws_api_gateway_resource" "tutor_hint" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_resource.tutor.id
  path_part   = "hint"
}

resource "aws_api_gateway_method" "tutor_hint_get" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.tutor_hint.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "tutor_hint_get" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.tutor_hint.id
  http_method             = aws_api_gateway_method.tutor_hint_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.tutor_handler.invoke_arn
}

# /api/tutor/progress
resource "aws_api_gateway_resource" "tutor_progress" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_resource.tutor.id
  path_part   = "progress"
}

resource "aws_api_gateway_method" "tutor_progress_get" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.tutor_progress.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "tutor_progress_get" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.tutor_progress.id
  http_method             = aws_api_gateway_method.tutor_progress_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.progress_handler.invoke_arn
}

# ============================================================================
# Resources: /api/courses
# ============================================================================

resource "aws_api_gateway_resource" "courses" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "courses"
}

# GET /api/courses (público - sin auth)
resource "aws_api_gateway_method" "courses_get" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.courses.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "courses_get" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.courses.id
  http_method             = aws_api_gateway_method.courses_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.courses_handler.invoke_arn
}

# /api/courses/{id}
resource "aws_api_gateway_resource" "courses_id" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_resource.courses.id
  path_part   = "{id}"
}

# GET /api/courses/{id} (público - sin auth)
resource "aws_api_gateway_method" "courses_id_get" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.courses_id.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "courses_id_get" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.courses_id.id
  http_method             = aws_api_gateway_method.courses_id_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.courses_handler.invoke_arn
}

# /api/courses/{id}/sections
resource "aws_api_gateway_resource" "courses_sections" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_resource.courses_id.id
  path_part   = "sections"
}

# /api/courses/{id}/sections/{sectionId}
resource "aws_api_gateway_resource" "courses_sections_id" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_resource.courses_sections.id
  path_part   = "{sectionId}"
}

# GET /api/courses/{id}/sections/{sectionId} (autenticado)
resource "aws_api_gateway_method" "courses_sections_id_get" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.courses_sections_id.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "courses_sections_id_get" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.courses_sections_id.id
  http_method             = aws_api_gateway_method.courses_sections_id_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.courses_handler.invoke_arn
}

# ============================================================================
# Resources: /api/stats (Estadísticas globales - público)
# ============================================================================

resource "aws_api_gateway_resource" "stats" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "stats"
}

# GET /api/stats (público - sin auth)
resource "aws_api_gateway_method" "stats_get" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.stats.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "stats_get" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.stats.id
  http_method             = aws_api_gateway_method.stats_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.courses_handler.invoke_arn
}

# OPTIONS /api/stats (CORS preflight)
resource "aws_api_gateway_method" "stats_options" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.stats.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "stats_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.stats.id
  http_method = aws_api_gateway_method.stats_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "stats_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.stats.id
  http_method = aws_api_gateway_method.stats_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "stats_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.stats.id
  http_method = aws_api_gateway_method.stats_options.http_method
  status_code = aws_api_gateway_method_response.stats_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# ============================================================================
# Resources: /api/categories
# ============================================================================

resource "aws_api_gateway_resource" "categories" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "categories"
}

# GET /api/categories (público - listar categorías activas)
resource "aws_api_gateway_method" "categories_get" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.categories.id
  http_method   = "GET"
  authorization = "NONE" # Público
}

resource "aws_api_gateway_integration" "categories_get" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.categories.id
  http_method             = aws_api_gateway_method.categories_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.categories_handler.invoke_arn
}

# POST /api/categories (admin - crear categoría)
resource "aws_api_gateway_method" "categories_post" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.categories.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "categories_post" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.categories.id
  http_method             = aws_api_gateway_method.categories_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.categories_handler.invoke_arn
}

# /api/categories/{category_id}
resource "aws_api_gateway_resource" "categories_id" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_resource.categories.id
  path_part   = "{category_id}"
}

# GET /api/categories/{category_id} (público - obtener categoría específica)
resource "aws_api_gateway_method" "categories_id_get" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.categories_id.id
  http_method   = "GET"
  authorization = "NONE" # Público
}

resource "aws_api_gateway_integration" "categories_id_get" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.categories_id.id
  http_method             = aws_api_gateway_method.categories_id_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.categories_handler.invoke_arn
}

# PUT /api/categories/{category_id} (admin - actualizar categoría)
resource "aws_api_gateway_method" "categories_id_put" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.categories_id.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "categories_id_put" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.categories_id.id
  http_method             = aws_api_gateway_method.categories_id_put.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.categories_handler.invoke_arn
}

# DELETE /api/categories/{category_id} (admin - eliminar categoría)
resource "aws_api_gateway_method" "categories_id_delete" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.categories_id.id
  http_method   = "DELETE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "categories_id_delete" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.categories_id.id
  http_method             = aws_api_gateway_method.categories_id_delete.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.categories_handler.invoke_arn
}

# ============================================================================
# Resources: /api/admin
# ============================================================================

resource "aws_api_gateway_resource" "admin" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "admin"
}

# /api/admin/courses
resource "aws_api_gateway_resource" "admin_courses" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "courses"
}

# POST /api/admin/courses (crear curso)
resource "aws_api_gateway_method" "admin_courses_post" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.admin_courses.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "admin_courses_post" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.admin_courses.id
  http_method             = aws_api_gateway_method.admin_courses_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.admin_handler.invoke_arn
}

# /api/admin/courses/{id}
resource "aws_api_gateway_resource" "admin_courses_id" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_resource.admin_courses.id
  path_part   = "{id}"
}

# PUT /api/admin/courses/{id} (actualizar curso)
resource "aws_api_gateway_method" "admin_courses_id_put" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.admin_courses_id.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "admin_courses_id_put" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.admin_courses_id.id
  http_method             = aws_api_gateway_method.admin_courses_id_put.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.admin_handler.invoke_arn
}

# DELETE /api/admin/courses/{id} (eliminar curso)
resource "aws_api_gateway_method" "admin_courses_id_delete" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.admin_courses_id.id
  http_method   = "DELETE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "admin_courses_id_delete" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.admin_courses_id.id
  http_method             = aws_api_gateway_method.admin_courses_id_delete.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.admin_handler.invoke_arn
}

# ============================================================================
# CORS Configuration
# ============================================================================
# Se necesitan métodos OPTIONS para manejar preflight requests del navegador
# Mock integration responde directamente sin llamar a Lambda

# OPTIONS /api/courses
resource "aws_api_gateway_method" "courses_options" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.courses.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "courses_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.courses.id
  http_method = aws_api_gateway_method.courses_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "courses_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.courses.id
  http_method = aws_api_gateway_method.courses_options.http_method
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

resource "aws_api_gateway_integration_response" "courses_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.courses.id
  http_method = aws_api_gateway_method.courses_options.http_method
  status_code = aws_api_gateway_method_response.courses_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.courses_options
  ]
}

# OPTIONS /api/courses/{id}
resource "aws_api_gateway_method" "courses_id_options" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.courses_id.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "courses_id_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.courses_id.id
  http_method = aws_api_gateway_method.courses_id_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "courses_id_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.courses_id.id
  http_method = aws_api_gateway_method.courses_id_options.http_method
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

resource "aws_api_gateway_integration_response" "courses_id_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.courses_id.id
  http_method = aws_api_gateway_method.courses_id_options.http_method
  status_code = aws_api_gateway_method_response.courses_id_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.courses_id_options
  ]
}

# OPTIONS /api/admin/courses
resource "aws_api_gateway_method" "admin_courses_options" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.admin_courses.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_courses_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.admin_courses.id
  http_method = aws_api_gateway_method.admin_courses_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_courses_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.admin_courses.id
  http_method = aws_api_gateway_method.admin_courses_options.http_method
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

resource "aws_api_gateway_integration_response" "admin_courses_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.admin_courses.id
  http_method = aws_api_gateway_method.admin_courses_options.http_method
  status_code = aws_api_gateway_method_response.admin_courses_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.admin_courses_options
  ]
}

# OPTIONS /api/admin/courses/{id}
resource "aws_api_gateway_method" "admin_courses_id_options" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.admin_courses_id.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_courses_id_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.admin_courses_id.id
  http_method = aws_api_gateway_method.admin_courses_id_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_courses_id_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.admin_courses_id.id
  http_method = aws_api_gateway_method.admin_courses_id_options.http_method
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

resource "aws_api_gateway_integration_response" "admin_courses_id_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.admin_courses_id.id
  http_method = aws_api_gateway_method.admin_courses_id_options.http_method
  status_code = aws_api_gateway_method_response.admin_courses_id_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.admin_courses_id_options
  ]
}

# ============================================================================
# Upload Endpoints (images para cursos)
# ============================================================================

# Resource: /api/admin/upload-url
resource "aws_api_gateway_resource" "admin_upload_url" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "upload-url"
}

# POST /api/admin/upload-url
resource "aws_api_gateway_method" "admin_upload_url_post" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.admin_upload_url.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "admin_upload_url_post" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.admin_upload_url.id
  http_method             = aws_api_gateway_method.admin_upload_url_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.upload_handler.invoke_arn
}

# Resource: /api/admin/images
resource "aws_api_gateway_resource" "admin_images" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "images"
}

# GET /api/admin/images
resource "aws_api_gateway_method" "admin_images_get" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.admin_images.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "admin_images_get" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.admin_images.id
  http_method             = aws_api_gateway_method.admin_images_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.upload_handler.invoke_arn
}

# Resource: /api/admin/images/{key}
resource "aws_api_gateway_resource" "admin_images_key" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_resource.admin_images.id
  path_part   = "{key}"
}

# DELETE /api/admin/images/{key}
resource "aws_api_gateway_method" "admin_images_key_delete" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.admin_images_key.id
  http_method   = "DELETE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "admin_images_key_delete" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.admin_images_key.id
  http_method             = aws_api_gateway_method.admin_images_key_delete.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.upload_handler.invoke_arn
}

# ============================================================================
# Sections Endpoints (edición de contenido de secciones)
# ============================================================================

# Resource: /api/admin/courses/{id}/sections
resource "aws_api_gateway_resource" "admin_courses_id_sections" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_resource.admin_courses_id.id
  path_part   = "sections"
}

# POST /api/admin/courses/{id}/sections
resource "aws_api_gateway_method" "admin_sections_post" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.admin_courses_id_sections.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "admin_sections_post" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.admin_courses_id_sections.id
  http_method             = aws_api_gateway_method.admin_sections_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.sections_handler.invoke_arn
}

# Resource: /api/admin/courses/{id}/sections/{sectionId}
resource "aws_api_gateway_resource" "admin_courses_id_sections_id" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_resource.admin_courses_id_sections.id
  path_part   = "{sectionId}"
}

# PUT /api/admin/courses/{id}/sections/{sectionId}
resource "aws_api_gateway_method" "admin_sections_id_put" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.admin_courses_id_sections_id.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "admin_sections_id_put" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.admin_courses_id_sections_id.id
  http_method             = aws_api_gateway_method.admin_sections_id_put.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.sections_handler.invoke_arn
}

# DELETE /api/admin/courses/{id}/sections/{sectionId}
resource "aws_api_gateway_method" "admin_sections_id_delete" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.admin_courses_id_sections_id.id
  http_method   = "DELETE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "admin_sections_id_delete" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.admin_courses_id_sections_id.id
  http_method             = aws_api_gateway_method.admin_sections_id_delete.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.sections_handler.invoke_arn
}

# Resource: /api/admin/courses/{id}/sections/reorder
resource "aws_api_gateway_resource" "admin_courses_id_sections_reorder" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_resource.admin_courses_id_sections.id
  path_part   = "reorder"
}

# PUT /api/admin/courses/{id}/sections/reorder
resource "aws_api_gateway_method" "admin_sections_reorder_put" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.admin_courses_id_sections_reorder.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "admin_sections_reorder_put" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.admin_courses_id_sections_reorder.id
  http_method             = aws_api_gateway_method.admin_sections_reorder_put.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.sections_handler.invoke_arn
}

# ============================================================================
# CORS OPTIONS methods para nuevos endpoints
# ============================================================================

# OPTIONS /api/admin/upload-url
resource "aws_api_gateway_method" "admin_upload_url_options" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.admin_upload_url.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_upload_url_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.admin_upload_url.id
  http_method = aws_api_gateway_method.admin_upload_url_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_upload_url_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.admin_upload_url.id
  http_method = aws_api_gateway_method.admin_upload_url_options.http_method
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

resource "aws_api_gateway_integration_response" "admin_upload_url_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.admin_upload_url.id
  http_method = aws_api_gateway_method.admin_upload_url_options.http_method
  status_code = aws_api_gateway_method_response.admin_upload_url_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.admin_upload_url_options
  ]
}

# OPTIONS /api/admin/images
resource "aws_api_gateway_method" "admin_images_options" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.admin_images.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_images_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.admin_images.id
  http_method = aws_api_gateway_method.admin_images_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_images_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.admin_images.id
  http_method = aws_api_gateway_method.admin_images_options.http_method
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

resource "aws_api_gateway_integration_response" "admin_images_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.admin_images.id
  http_method = aws_api_gateway_method.admin_images_options.http_method
  status_code = aws_api_gateway_method_response.admin_images_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.admin_images_options
  ]
}

# OPTIONS /api/admin/courses/{id}/sections
resource "aws_api_gateway_method" "admin_sections_options" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.admin_courses_id_sections.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_sections_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.admin_courses_id_sections.id
  http_method = aws_api_gateway_method.admin_sections_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_sections_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.admin_courses_id_sections.id
  http_method = aws_api_gateway_method.admin_sections_options.http_method
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

resource "aws_api_gateway_integration_response" "admin_sections_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.admin_courses_id_sections.id
  http_method = aws_api_gateway_method.admin_sections_options.http_method
  status_code = aws_api_gateway_method_response.admin_sections_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.admin_sections_options
  ]
}

# OPTIONS /api/admin/courses/{id}/sections/{sectionId}
resource "aws_api_gateway_method" "admin_sections_id_options" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.admin_courses_id_sections_id.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_sections_id_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.admin_courses_id_sections_id.id
  http_method = aws_api_gateway_method.admin_sections_id_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_sections_id_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.admin_courses_id_sections_id.id
  http_method = aws_api_gateway_method.admin_sections_id_options.http_method
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

resource "aws_api_gateway_integration_response" "admin_sections_id_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.admin_courses_id_sections_id.id
  http_method = aws_api_gateway_method.admin_sections_id_options.http_method
  status_code = aws_api_gateway_method_response.admin_sections_id_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.admin_sections_id_options
  ]
}

# OPTIONS /api/admin/courses/{id}/sections/reorder
resource "aws_api_gateway_method" "admin_sections_reorder_options" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.admin_courses_id_sections_reorder.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "admin_sections_reorder_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.admin_courses_id_sections_reorder.id
  http_method = aws_api_gateway_method.admin_sections_reorder_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "admin_sections_reorder_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.admin_courses_id_sections_reorder.id
  http_method = aws_api_gateway_method.admin_sections_reorder_options.http_method
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

resource "aws_api_gateway_integration_response" "admin_sections_reorder_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.admin_courses_id_sections_reorder.id
  http_method = aws_api_gateway_method.admin_sections_reorder_options.http_method
  status_code = aws_api_gateway_method_response.admin_sections_reorder_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'PUT,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.admin_sections_reorder_options
  ]
}

# OPTIONS /api/categories
resource "aws_api_gateway_method" "categories_options" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.categories.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "categories_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.categories.id
  http_method = aws_api_gateway_method.categories_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "categories_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.categories.id
  http_method = aws_api_gateway_method.categories_options.http_method
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

resource "aws_api_gateway_integration_response" "categories_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.categories.id
  http_method = aws_api_gateway_method.categories_options.http_method
  status_code = aws_api_gateway_method_response.categories_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.categories_options
  ]
}

# OPTIONS /api/categories/{category_id}
resource "aws_api_gateway_method" "categories_id_options" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.categories_id.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "categories_id_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.categories_id.id
  http_method = aws_api_gateway_method.categories_id_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "categories_id_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.categories_id.id
  http_method = aws_api_gateway_method.categories_id_options.http_method
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

resource "aws_api_gateway_integration_response" "categories_id_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.categories_id.id
  http_method = aws_api_gateway_method.categories_id_options.http_method
  status_code = aws_api_gateway_method_response.categories_id_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }

  depends_on = [
    aws_api_gateway_integration.categories_id_options
  ]
}

# ============================================================================
# Lambda Permissions (permitir que API Gateway invoque las Lambdas)
# ============================================================================

# tutor-handler
resource "aws_lambda_permission" "api_gateway_tutor" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.tutor_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.tutor_api.execution_arn}/*/*"
}

# courses-handler
resource "aws_lambda_permission" "api_gateway_courses" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.courses_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.tutor_api.execution_arn}/*/*"
}

# progress-handler
resource "aws_lambda_permission" "api_gateway_progress" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.progress_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.tutor_api.execution_arn}/*/*"
}

# admin-handler
resource "aws_lambda_permission" "api_gateway_admin" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.admin_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.tutor_api.execution_arn}/*/*"
}

# upload-handler
resource "aws_lambda_permission" "api_gateway_upload" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.upload_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.tutor_api.execution_arn}/*/*"
}

# sections-handler
resource "aws_lambda_permission" "api_gateway_sections" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sections_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.tutor_api.execution_arn}/*/*"
}

# categories-handler
resource "aws_lambda_permission" "api_gateway_categories" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.categories_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.tutor_api.execution_arn}/*/*"
}

# ============================================================================
# Deployment
# ============================================================================

resource "aws_api_gateway_deployment" "prod" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id

  # Forzar nuevo deployment cuando cambian los recursos
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.api.id,
      aws_api_gateway_resource.tutor.id,
      aws_api_gateway_resource.courses.id,
      aws_api_gateway_resource.admin.id,
      aws_api_gateway_integration.tutor_ask_post.id,
      aws_api_gateway_integration.tutor_validate_post.id,
      aws_api_gateway_integration.tutor_hint_get.id,
      aws_api_gateway_integration.tutor_progress_get.id,
      aws_api_gateway_integration.courses_get.id,
      aws_api_gateway_integration.courses_id_get.id,
      aws_api_gateway_integration.courses_sections_id_get.id,
      aws_api_gateway_integration.admin_courses_post.id,
      aws_api_gateway_integration.admin_courses_id_put.id,
      aws_api_gateway_integration.admin_courses_id_delete.id,
      # Upload endpoints
      aws_api_gateway_integration.admin_upload_url_post.id,
      aws_api_gateway_integration.admin_images_get.id,
      aws_api_gateway_integration.admin_images_key_delete.id,
      # Sections endpoints
      aws_api_gateway_integration.admin_sections_post.id,
      aws_api_gateway_integration.admin_sections_id_put.id,
      aws_api_gateway_integration.admin_sections_id_delete.id,
      aws_api_gateway_integration.admin_sections_reorder_put.id,
      # Categories endpoints
      aws_api_gateway_integration.categories_get.id,
      aws_api_gateway_integration.categories_post.id,
      aws_api_gateway_integration.categories_id_get.id,
      aws_api_gateway_integration.categories_id_put.id,
      aws_api_gateway_integration.categories_id_delete.id,
      # CORS OPTIONS methods
      aws_api_gateway_integration.courses_options.id,
      aws_api_gateway_integration.courses_id_options.id,
      aws_api_gateway_integration.admin_courses_options.id,
      aws_api_gateway_integration.admin_courses_id_options.id,
      aws_api_gateway_integration.admin_upload_url_options.id,
      aws_api_gateway_integration.admin_images_options.id,
      aws_api_gateway_integration.admin_sections_options.id,
      aws_api_gateway_integration.admin_sections_id_options.id,
      aws_api_gateway_integration.admin_sections_reorder_options.id,
      aws_api_gateway_integration.categories_options.id,
      aws_api_gateway_integration.categories_id_options.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.tutor_ask_post,
    aws_api_gateway_integration.tutor_validate_post,
    aws_api_gateway_integration.tutor_hint_get,
    aws_api_gateway_integration.tutor_progress_get,
    aws_api_gateway_integration.courses_get,
    aws_api_gateway_integration.courses_id_get,
    aws_api_gateway_integration.courses_sections_id_get,
    aws_api_gateway_integration.admin_courses_post,
    aws_api_gateway_integration.admin_courses_id_put,
    aws_api_gateway_integration.admin_courses_id_delete,
    # Upload endpoints
    aws_api_gateway_integration.admin_upload_url_post,
    aws_api_gateway_integration.admin_images_get,
    aws_api_gateway_integration.admin_images_key_delete,
    # Sections endpoints
    aws_api_gateway_integration.admin_sections_post,
    aws_api_gateway_integration.admin_sections_id_put,
    aws_api_gateway_integration.admin_sections_id_delete,
    aws_api_gateway_integration.admin_sections_reorder_put,
    # Categories endpoints
    aws_api_gateway_integration.categories_get,
    aws_api_gateway_integration.categories_post,
    aws_api_gateway_integration.categories_id_get,
    aws_api_gateway_integration.categories_id_put,
    aws_api_gateway_integration.categories_id_delete,
    # CORS OPTIONS methods
    aws_api_gateway_integration_response.courses_options,
    aws_api_gateway_integration_response.courses_id_options,
    aws_api_gateway_integration_response.admin_courses_options,
    aws_api_gateway_integration_response.admin_courses_id_options,
    aws_api_gateway_integration_response.admin_upload_url_options,
    aws_api_gateway_integration_response.admin_images_options,
    aws_api_gateway_integration_response.admin_sections_options,
    aws_api_gateway_integration_response.admin_sections_id_options,
    aws_api_gateway_integration_response.admin_sections_reorder_options,
    aws_api_gateway_integration_response.categories_options,
    aws_api_gateway_integration_response.categories_id_options,
  ]
}

# ============================================================================
# Stage
# ============================================================================

resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.prod.id
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  stage_name    = "prod"

  tags = {
    Name = "prod-stage"
  }
}

# ============================================================================
# Method Settings - Throttling & Logging (SECURITY: CRITICAL-1)
# ============================================================================

resource "aws_api_gateway_method_settings" "prod_settings" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  stage_name  = aws_api_gateway_stage.prod.stage_name
  method_path = "*/*"

  settings {
    # Global throttling limits para prevenir DoS
    throttling_burst_limit = 100 # Burst máximo permitido
    throttling_rate_limit  = 50  # 50 requests/segundo

    # Logging para detectar ataques
    logging_level      = "INFO"
    data_trace_enabled = true
    metrics_enabled    = true
  }

  depends_on = [aws_api_gateway_account.main]
}

# Throttling específico para endpoints admin (más restrictivo)
resource "aws_api_gateway_method_settings" "admin_throttling" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  stage_name  = aws_api_gateway_stage.prod.stage_name
  method_path = "api/admin/*/POST"

  settings {
    # Admin endpoints: mucho más restrictivos para prevenir spam
    throttling_burst_limit = 10 # Solo 10 burst
    throttling_rate_limit  = 5  # 5 requests/segundo máximo

    logging_level      = "INFO"
    metrics_enabled    = true
  }

  depends_on = [aws_api_gateway_method_settings.prod_settings]
}

# ============================================================================
# Usage Plan - Rate Limiting por Endpoint (SECURITY: HIGH-2)
# ============================================================================
# NOTA: Comentado temporalmente - paths necesitan ajustarse a estructura real del API
# Implementaremos throttling a nivel de Lambda en próxima iteración
#
# resource "aws_api_gateway_usage_plan" "security_plan" {
#   name        = "security-usage-plan"
#   description = "Rate limiting para prevenir abuso y costos excesivos"
#
#   api_stages {
#     api_id = aws_api_gateway_rest_api.tutor_api.id
#     stage  = aws_api_gateway_stage.prod.stage_name
#
#     # Throttling específico para endpoint más costoso (Bedrock)
#     throttle {
#       path        = "/api/tutor/ask"
#       burst_limit = 10 # Solo 10 requests en burst
#       rate_limit  = 2  # 2 requests/segundo (previene cost exhaustion)
#     }
#
#     # Throttling para validación de checkpoints
#     throttle {
#       path        = "/api/tutor/validate"
#       burst_limit = 20
#       rate_limit  = 5
#     }
#
#     # Throttling para admin endpoints
#     throttle {
#       path        = "/api/admin/*"
#       burst_limit = 10
#       rate_limit  = 5
#     }
#   }
#
#   # Quota diaria para prevenir abuso masivo
#   quota_settings {
#     limit  = 10000 # 10k requests por día
#     period = "DAY"
#   }
#
#   depends_on = [aws_api_gateway_stage.prod]
# }

# ============================================================================
# Outputs
# ============================================================================

output "api_gateway_url" {
  description = "URL base del API Gateway"
  value       = "${aws_api_gateway_stage.prod.invoke_url}/api"
}

output "api_gateway_id" {
  description = "ID del REST API"
  value       = aws_api_gateway_rest_api.tutor_api.id
}

output "api_gateway_stage" {
  description = "Stage del API Gateway"
  value       = aws_api_gateway_stage.prod.stage_name
}

output "api_endpoints" {
  description = "Lista de endpoints disponibles"
  value = {
    tutor_ask            = "${aws_api_gateway_stage.prod.invoke_url}/api/tutor/ask"
    tutor_validate       = "${aws_api_gateway_stage.prod.invoke_url}/api/tutor/validate"
    tutor_hint           = "${aws_api_gateway_stage.prod.invoke_url}/api/tutor/hint"
    tutor_progress       = "${aws_api_gateway_stage.prod.invoke_url}/api/tutor/progress"
    courses_list         = "${aws_api_gateway_stage.prod.invoke_url}/api/courses"
    courses_detail       = "${aws_api_gateway_stage.prod.invoke_url}/api/courses/{id}"
    courses_section      = "${aws_api_gateway_stage.prod.invoke_url}/api/courses/{id}/sections/{sectionId}"
    categories_list      = "${aws_api_gateway_stage.prod.invoke_url}/api/categories"
    categories_detail    = "${aws_api_gateway_stage.prod.invoke_url}/api/categories/{category_id}"
    categories_create    = "${aws_api_gateway_stage.prod.invoke_url}/api/categories"
    categories_update    = "${aws_api_gateway_stage.prod.invoke_url}/api/categories/{category_id}"
    categories_delete    = "${aws_api_gateway_stage.prod.invoke_url}/api/categories/{category_id}"
    admin_courses_create = "${aws_api_gateway_stage.prod.invoke_url}/api/admin/courses"
    admin_courses_update = "${aws_api_gateway_stage.prod.invoke_url}/api/admin/courses/{id}"
    admin_courses_delete = "${aws_api_gateway_stage.prod.invoke_url}/api/admin/courses/{id}"
  }
}
