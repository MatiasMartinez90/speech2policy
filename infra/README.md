# Speech2Policy - Infrastructure State Backend

This directory contains the Terraform configuration for the **state backend** (S3 + DynamoDB) used by all other Terraform modules in the Speech2Policy project.

## 🎯 Purpose

Creates:
- **S3 Bucket**: Stores Terraform state files with versioning and encryption
- **DynamoDB Table**: Provides state locking to prevent concurrent modifications

## 🚀 Initial Setup (Run Once)

This must be deployed **first**, before any other infrastructure.

```bash
cd infra/

# Initialize Terraform (local state for this module only)
terraform init

# Review the plan
terraform plan

# Apply (creates S3 bucket + DynamoDB table)
terraform apply

# Save the outputs - you'll need them for backend config
terraform output
```

## 📝 Outputs

After applying, you'll get:

```
s3_bucket_name       = "speech2policy-terraform-state-abc12345"
dynamodb_table_name  = "speech2policy-terraform-lock"
```

## 🔧 Using in Other Modules

Copy these values to configure the backend in other Terraform modules:

```hcl
terraform {
  backend "s3" {
    bucket         = "speech2policy-terraform-state-abc12345"  # From output
    key            = "backend/terraform.tfstate"               # Unique per module
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "speech2policy-terraform-lock"            # From output
  }
}
```

## ⚠️ Important Notes

- **Run this only once** per AWS account/region
- The S3 bucket and DynamoDB table have `prevent_destroy = true` for safety
- State versioning is enabled (keeps 90 days of history)
- All objects are encrypted at rest (AES256)
- Public access is completely blocked

## 🗑️ Cleanup

To destroy (only if you're sure):

1. Remove `prevent_destroy = true` from `main.tf`
2. Run `terraform destroy`

**Warning**: This will delete all Terraform state history!
