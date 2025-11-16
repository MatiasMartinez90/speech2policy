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
  backend "s3" {
    # Estos valores se configurarán al inicializar el backend
    bucket         = "terraform-state-bucket-vz26twi7"
    key            = "frontend-november2025/terraform.tfstate" # Nuevo path
    region         = "us-east-1"
    dynamodb_table = "terraform-lock-table"
  }
}

provider "aws" {
  region = "us-east-1"
}

# Provider AWS para US-East-1 (requerido para certificados de CloudFront)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

provider "random" {}

# Data source para obtener outputs del backend
data "terraform_remote_state" "backend" {
  backend = "s3"
  config = {
    bucket = "terraform-state-bucket-vz26twi7"
    key    = "backend-november2025/terraform.tfstate" # Nuevo path
    region = "us-east-1"
  }
}

# Random string para el nombre del bucket
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# S3 bucket para el sitio web
resource "aws_s3_bucket" "website_bucket" {
  bucket = "${var.project_name}-${var.environment}-website-${random_string.suffix.result}"
}

# Configuración del sitio web del bucket
resource "aws_s3_bucket_website_configuration" "website_configuration" {
  bucket = aws_s3_bucket.website_bucket.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "404.html"
  }
}

# Versionado del bucket
resource "aws_s3_bucket_versioning" "versioning" {
  bucket = aws_s3_bucket.website_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Encriptación del bucket
resource "aws_s3_bucket_server_side_encryption_configuration" "encryption" {
  bucket = aws_s3_bucket.website_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Bloquear acceso público (excepto a través de CloudFront)
resource "aws_s3_bucket_public_access_block" "website_bucket_pab" {
  bucket = aws_s3_bucket.website_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# SSL enforcement
resource "aws_s3_bucket_policy" "ssl_enforcement" {
  bucket = aws_s3_bucket.website_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyInsecureConnections"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.website_bucket.arn,
          "${aws_s3_bucket.website_bucket.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.origin_access_identity.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.website_bucket.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.website_bucket_pab]
}

# CloudFront Origin Access Identity
resource "aws_cloudfront_origin_access_identity" "origin_access_identity" {
  comment = "Website Identity"
}

# ACM Certificate para proyectos.cloudacademy.ar
resource "aws_acm_certificate" "website_cert" {
  provider          = aws.us_east_1 # Los certificados de CloudFront deben estar en us-east-1
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# CloudFront Function para rewrite
resource "aws_cloudfront_function" "rewrite_function" {
  name    = "${var.project_name}-${var.environment}-rewrite-${random_string.suffix.result}"
  runtime = "cloudfront-js-1.0"
  publish = true
  code    = file("../../cloudfrontfunction/rewrite.js")
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "website_distribution" {
  enabled             = true
  is_ipv6_enabled     = true
  price_class         = "PriceClass_All"
  default_root_object = "index.html"
  aliases             = [var.domain_name]

  origin {
    domain_name = aws_s3_bucket.website_bucket.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.website_bucket.bucket}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.origin_access_identity.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.website_bucket.bucket}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite_function.arn
    }
  }

  # Handle 404 errors - return 404 page
  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 10
  }

  # Handle 403 errors (S3 AccessDenied) - fallback to index.html for SPA routing
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.website_cert.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  depends_on = [aws_acm_certificate.website_cert]
}

# Nota: El deployment de archivos se maneja con GitHub Actions
# No necesitamos recursos de Terraform para subir archivos

# Outputs
output "frontend_endpoint" {
  description = "Frontend Endpoint"
  value       = aws_cloudfront_distribution.website_distribution.domain_name
}

output "website_bucket_name" {
  description = "Website S3 Bucket Name"
  value       = aws_s3_bucket.website_bucket.bucket
}

output "cloudfront_distribution_id" {
  description = "CloudFront Distribution ID"
  value       = aws_cloudfront_distribution.website_distribution.id
}

output "certificate_arn" {
  description = "ACM Certificate ARN"
  value       = aws_acm_certificate.website_cert.arn
}

output "certificate_validation_records" {
  description = "DNS validation records for the certificate"
  value = {
    for record in aws_acm_certificate.website_cert.domain_validation_options : record.domain_name => {
      name  = record.resource_record_name
      type  = record.resource_record_type
      value = record.resource_record_value
    }
  }
}
