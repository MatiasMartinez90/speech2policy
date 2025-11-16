# Lambda Layers - IAM Copilot

Lambda Layers contain shared dependencies used across multiple Lambda functions.

## Layers

### 1. Powertools Layer
- **Package:** aws-lambda-powertools
- **Version:** 2.28.0
- **Purpose:** Structured logging, tracing, and utilities for Lambda functions
- **Used by:** All IAM Copilot Lambdas

### 2. Common Dependencies Layer
- **Packages:** boto3, botocore, requests, python-dateutil
- **Purpose:** Common Python dependencies
- **Used by:** All IAM Copilot Lambdas

## Building Layers

### Prerequisites
- Python 3.11+
- pip
- zip utility

### Build All Layers
```bash
chmod +x build-all.sh
./build-all.sh
```

### Build Individual Layers
```bash
# Powertools only
chmod +x build-powertools.sh
./build-powertools.sh

# Common dependencies only
chmod +x build-common-deps.sh
./build-common-deps.sh
```

## Deployment

After building, the layers are automatically referenced in Terraform:

```hcl
resource "aws_lambda_layer_version" "powertools" {
  filename            = "${path.module}/../lambda-layers/powertools.zip"
  layer_name          = "iam-copilot-powertools"
  compatible_runtimes = ["python3.11"]
}
```

Lambda functions reference the layers:

```hcl
resource "aws_lambda_function" "aws_sync_handler" {
  # ...
  layers = [aws_lambda_layer_version.powertools.arn]
}
```

## Alternative: AWS Managed Layers

For quick start, you can use AWS-managed Powertools layer instead:

1. Edit `terraform/lambda-layers.tf`
2. Comment out `aws_lambda_layer_version.powertools` resource
3. Uncomment the `data "aws_lambda_layer_version" "powertools"` block
4. Update Lambda functions to use `data.aws_lambda_layer_version.powertools.arn`

AWS managed layer ARN format:
```
arn:aws:lambda:us-east-1:017000801446:layer:AWSLambdaPowertoolsPythonV2:59
```

## Layer Structure

Layers must follow this directory structure:

```
powertools.zip
└── python/
    └── (packages)

common-dependencies.zip
└── python/
    └── (packages)
```

Lambda runtime adds `/opt/python` to the Python path automatically.

## Troubleshooting

### Import errors in Lambda
- Verify layer is attached to Lambda function in Terraform
- Check layer compatibility with runtime (Python 3.11)
- Ensure layer zip has correct directory structure (`python/`)

### Build fails
- Install dependencies: `pip install --upgrade pip setuptools wheel`
- Use virtual environment to avoid conflicts
- Check Python version matches Lambda runtime

### Layer size too large (>50 MB)
- Remove unnecessary dependencies
- Use slim versions of packages
- Consider using Docker-based builds for smaller size

## References
- [AWS Lambda Powertools Documentation](https://docs.powertools.aws.dev/lambda/python/)
- [AWS Lambda Layers](https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html)
