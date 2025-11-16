# ============================================================================
# S3 Bucket para Imágenes de Cursos
# ============================================================================

# Bucket principal para imágenes
resource "aws_s3_bucket" "course_images" {
  bucket = "cloudacademy-course-images-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "CloudAcademy Course Images"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Versionado del bucket (para recuperar imágenes borradas accidentalmente)
resource "aws_s3_bucket_versioning" "course_images" {
  bucket = aws_s3_bucket.course_images.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Encryption por defecto (AES256)
resource "aws_s3_bucket_server_side_encryption_configuration" "course_images" {
  bucket = aws_s3_bucket.course_images.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Configuración de acceso público
# - Bloqueamos ACLs públicos (seguridad)
# - Permitimos bucket policy público (para servir imágenes)
resource "aws_s3_bucket_public_access_block" "course_images" {
  bucket = aws_s3_bucket.course_images.id

  block_public_acls       = true
  block_public_policy     = false # Permitir bucket policy pública
  ignore_public_acls      = true
  restrict_public_buckets = false # Permitir lectura pública via bucket policy
}

# CORS configuration para permitir uploads desde el frontend
resource "aws_s3_bucket_cors_configuration" "course_images" {
  bucket = aws_s3_bucket.course_images.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = [
      "http://localhost:3000",
      "https://proyectos.cloudacademy.ar",
      "https://*.cloudacademy.ar"
    ]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# ============================================================================
# Bucket Policy - Control Granular de Acceso (SECURITY: HIGH-3)
# ============================================================================

resource "aws_s3_bucket_policy" "course_images" {
  bucket = aws_s3_bucket.course_images.id

  # Depende del public_access_block para asegurar que esté configurado primero
  depends_on = [aws_s3_bucket_public_access_block.course_images]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Statement 1: Permitir lectura pública (GetObject) para servir imágenes
      {
        Sid    = "PublicReadGetObject"
        Effect = "Allow"
        Principal = "*"
        Action = "s3:GetObject"
        Resource = "${aws_s3_bucket.course_images.arn}/*"
      },

      # Statement 2: Permitir escritura SOLO al rol upload-handler Lambda
      {
        Sid    = "AllowUploadHandlerWrite"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.lambda_upload_role.arn
        }
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.course_images.arn}/*"
      },

      # Statement 3: Permitir listar objetos SOLO al rol upload-handler
      {
        Sid    = "AllowUploadHandlerList"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.lambda_upload_role.arn
        }
        Action = "s3:ListBucket"
        Resource = aws_s3_bucket.course_images.arn
      },

      # Statement 4: DENEGAR eliminación del bucket (protección extra)
      {
        Sid    = "DenyBucketDeletion"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:DeleteBucket"
        Resource = aws_s3_bucket.course_images.arn
      }
    ]
  })
}

# Lifecycle policy para eliminar versiones antiguas y optimizar costos
resource "aws_s3_bucket_lifecycle_configuration" "course_images" {
  bucket = aws_s3_bucket.course_images.id

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    filter {
      prefix = ""
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  rule {
    id     = "delete-incomplete-uploads"
    status = "Enabled"

    filter {
      prefix = ""
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# ============================================================================
# IAM Role para upload-handler Lambda
# ============================================================================

resource "aws_iam_role" "lambda_upload_role" {
  name               = "cloudacademy-upload-handler-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Name = "upload-handler-lambda-role"
  }
}

# CloudWatch Logs
resource "aws_iam_role_policy_attachment" "upload_lambda_logs" {
  role       = aws_iam_role.lambda_upload_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# S3 Access Policy (generar presigned URLs y listar objetos)
resource "aws_iam_policy" "upload_s3_policy" {
  name        = "cloudacademy-upload-s3-policy"
  description = "Permite a upload-handler generar presigned URLs y gestionar imágenes en S3"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "${aws_s3_bucket.course_images.arn}",
          "${aws_s3_bucket.course_images.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "upload_s3" {
  role       = aws_iam_role.lambda_upload_role.name
  policy_arn = aws_iam_policy.upload_s3_policy.arn
}

# Cognito Access (para verificar que el usuario es Admin)
resource "aws_iam_policy" "upload_cognito_policy" {
  name        = "cloudacademy-upload-cognito-policy"
  description = "Permite a upload-handler verificar grupos de usuarios"

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

resource "aws_iam_role_policy_attachment" "upload_cognito" {
  role       = aws_iam_role.lambda_upload_role.name
  policy_arn = aws_iam_policy.upload_cognito_policy.arn
}

# ============================================================================
# Outputs
# ============================================================================

output "course_images_bucket_name" {
  description = "Nombre del bucket S3 para imágenes de cursos"
  value       = aws_s3_bucket.course_images.id
}

output "course_images_bucket_arn" {
  description = "ARN del bucket S3 para imágenes de cursos"
  value       = aws_s3_bucket.course_images.arn
}

output "lambda_upload_role_arn" {
  description = "ARN del role IAM de upload-handler"
  value       = aws_iam_role.lambda_upload_role.arn
}
