# Provider de AWS para CloudAcademy Tutor Backend

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }

  # Backend para guardar el estado de Terraform
  # Comentado inicialmente - descomentar después de crear el bucket S3
  # backend "s3" {
  #   bucket         = "cloudacademy-terraform-state"
  #   key            = "tutor-backend/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-state-lock"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = var.common_tags
  }
}

# Data source para obtener la cuenta AWS actual
data "aws_caller_identity" "current" {}

# Data source para obtener la región actual
data "aws_region" "current" {}
