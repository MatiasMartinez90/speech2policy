# IAM Roles y Policies para Lambdas

# ============================================================================
# IAM Role para tutor-handler Lambda
# ============================================================================

# Trust policy para Lambda
data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

# Role principal para tutor-handler
resource "aws_iam_role" "lambda_tutor_role" {
  name               = "cloudacademy-tutor-handler-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Name = "tutor-handler-lambda-role"
  }
}

# ============================================================================
# Policies para tutor-handler
# ============================================================================

# Policy 1: CloudWatch Logs (para logging)
resource "aws_iam_role_policy_attachment" "tutor_lambda_logs" {
  role       = aws_iam_role.lambda_tutor_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Policy 2: DynamoDB Access (lectura y escritura en las 5 tablas)
resource "aws_iam_policy" "tutor_dynamodb_policy" {
  name        = "cloudacademy-tutor-dynamodb-policy"
  description = "Permite a tutor-handler acceder a las 5 tablas DynamoDB"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.courses_catalog.arn,
          aws_dynamodb_table.user_progress.arn,
          aws_dynamodb_table.tutor_sessions.arn,
          aws_dynamodb_table.user_usage.arn,
          aws_dynamodb_table.users.arn,
          "${aws_dynamodb_table.user_progress.arn}/index/*", # GSI course_id
          "${aws_dynamodb_table.users.arn}/index/*"          # GSI email
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "tutor_dynamodb" {
  role       = aws_iam_role.lambda_tutor_role.name
  policy_arn = aws_iam_policy.tutor_dynamodb_policy.arn
}

# Policy 3: Bedrock Access (invocar Claude)
resource "aws_iam_policy" "tutor_bedrock_policy" {
  name        = "cloudacademy-tutor-bedrock-policy"
  description = "Permite a tutor-handler invocar modelos de Bedrock"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = [
          "arn:aws:bedrock:${var.aws_region}::foundation-model/${var.bedrock_model_id}",
          "arn:aws:bedrock:${var.aws_region}::foundation-model/anthropic.claude*",
          "arn:aws:bedrock:${var.aws_region}:${data.aws_caller_identity.current.account_id}:inference-profile/${var.bedrock_model_id}",
          "arn:aws:bedrock:${var.aws_region}:${data.aws_caller_identity.current.account_id}:inference-profile/us.anthropic.claude*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "tutor_bedrock" {
  role       = aws_iam_role.lambda_tutor_role.name
  policy_arn = aws_iam_policy.tutor_bedrock_policy.arn
}

# Policy 4: Cognito (opcional - para verificar grupos de usuarios)
# Por ahora no es necesario porque API Gateway maneja la autenticación
# Pero podría ser útil en el futuro para leer grupos

resource "aws_iam_policy" "tutor_cognito_policy" {
  name        = "cloudacademy-tutor-cognito-policy"
  description = "Permite a tutor-handler leer información de Cognito"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:GetUser",
          "cognito-idp:ListUsersInGroup",
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminListGroupsForUser"
        ]
        Resource = [
          var.cognito_user_pool_arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "tutor_cognito" {
  role       = aws_iam_role.lambda_tutor_role.name
  policy_arn = aws_iam_policy.tutor_cognito_policy.arn
}

# ============================================================================
# IAM Role para courses-handler Lambda
# ============================================================================

resource "aws_iam_role" "lambda_courses_role" {
  name               = "cloudacademy-courses-handler-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Name = "courses-handler-lambda-role"
  }
}

# CloudWatch Logs
resource "aws_iam_role_policy_attachment" "courses_lambda_logs" {
  role       = aws_iam_role.lambda_courses_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# DynamoDB Read-Only Access (solo CourseCatalog)
resource "aws_iam_policy" "courses_dynamodb_policy" {
  name        = "cloudacademy-courses-dynamodb-policy"
  description = "Permite a courses-handler leer de CourseCatalog"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.courses_catalog.arn,
          "${aws_dynamodb_table.courses_catalog.arn}/index/*" # GSI entity_type-created_at-index
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "courses_dynamodb" {
  role       = aws_iam_role.lambda_courses_role.name
  policy_arn = aws_iam_policy.courses_dynamodb_policy.arn
}

# ============================================================================
# IAM Role para progress-handler Lambda
# ============================================================================

resource "aws_iam_role" "lambda_progress_role" {
  name               = "cloudacademy-progress-handler-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Name = "progress-handler-lambda-role"
  }
}

# CloudWatch Logs
resource "aws_iam_role_policy_attachment" "progress_lambda_logs" {
  role       = aws_iam_role.lambda_progress_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# DynamoDB Read-Only Access (solo UserProgress)
resource "aws_iam_policy" "progress_dynamodb_policy" {
  name        = "cloudacademy-progress-dynamodb-policy"
  description = "Permite a progress-handler leer de UserProgress"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Query"
        ]
        Resource = [
          aws_dynamodb_table.user_progress.arn,
          "${aws_dynamodb_table.user_progress.arn}/index/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "progress_dynamodb" {
  role       = aws_iam_role.lambda_progress_role.name
  policy_arn = aws_iam_policy.progress_dynamodb_policy.arn
}

# ============================================================================
# IAM Role para admin-handler Lambda
# ============================================================================

resource "aws_iam_role" "lambda_admin_role" {
  name               = "cloudacademy-admin-handler-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Name = "admin-handler-lambda-role"
  }
}

# CloudWatch Logs
resource "aws_iam_role_policy_attachment" "admin_lambda_logs" {
  role       = aws_iam_role.lambda_admin_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# DynamoDB Read/Write Access (CourseCatalog para CRUD + Categories para actualizar contadores)
resource "aws_iam_policy" "admin_dynamodb_policy" {
  name        = "cloudacademy-admin-dynamodb-policy"
  description = "Permite a admin-handler hacer CRUD en CourseCatalog y actualizar contadores en Categories"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.courses_catalog.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:UpdateItem"
        ]
        Resource = [
          aws_dynamodb_table.categories.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "admin_dynamodb" {
  role       = aws_iam_role.lambda_admin_role.name
  policy_arn = aws_iam_policy.admin_dynamodb_policy.arn
}

# Cognito Access (para verificar grupo Admins)
resource "aws_iam_policy" "admin_cognito_policy" {
  name        = "cloudacademy-admin-cognito-policy"
  description = "Permite a admin-handler verificar grupos de usuarios"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminListGroupsForUser"
        ]
        Resource = [
          var.cognito_user_pool_arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "admin_cognito" {
  role       = aws_iam_role.lambda_admin_role.name
  policy_arn = aws_iam_policy.admin_cognito_policy.arn
}

# ============================================================================
# IAM Role para categories-handler Lambda
# ============================================================================

resource "aws_iam_role" "lambda_categories_role" {
  name               = "cloudacademy-categories-handler-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Name = "categories-handler-lambda-role"
  }
}

# CloudWatch Logs
resource "aws_iam_role_policy_attachment" "categories_lambda_logs" {
  role       = aws_iam_role.lambda_categories_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# DynamoDB Read/Write Access (Categories para CRUD + Courses para recalcular counts)
resource "aws_iam_policy" "categories_dynamodb_policy" {
  name        = "cloudacademy-categories-dynamodb-policy"
  description = "Permite a categories-handler hacer CRUD en Categories y leer Courses"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.categories.arn,
          "${aws_dynamodb_table.categories.arn}/index/*" # GSI display_order-index
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:Scan" # Solo lectura para contar cursos
        ]
        Resource = [
          aws_dynamodb_table.courses_catalog.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "categories_dynamodb" {
  role       = aws_iam_role.lambda_categories_role.name
  policy_arn = aws_iam_policy.categories_dynamodb_policy.arn
}

# Cognito Access (para verificar grupo Admins)
resource "aws_iam_policy" "categories_cognito_policy" {
  name        = "cloudacademy-categories-cognito-policy"
  description = "Permite a categories-handler verificar grupos de usuarios"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminListGroupsForUser"
        ]
        Resource = [
          var.cognito_user_pool_arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "categories_cognito" {
  role       = aws_iam_role.lambda_categories_role.name
  policy_arn = aws_iam_policy.categories_cognito_policy.arn
}

# ============================================================================
# Outputs
# ============================================================================

output "lambda_tutor_role_arn" {
  description = "ARN del role IAM de tutor-handler"
  value       = aws_iam_role.lambda_tutor_role.arn
}

output "lambda_tutor_role_name" {
  description = "Nombre del role IAM de tutor-handler"
  value       = aws_iam_role.lambda_tutor_role.name
}
