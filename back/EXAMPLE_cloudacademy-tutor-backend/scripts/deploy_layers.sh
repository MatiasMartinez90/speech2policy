#!/bin/bash

#===============================================================================
# Script: deploy_layers.sh
# Purpose: Deploy Lambda layers to AWS
# Usage: ./scripts/deploy_layers.sh [region]
#===============================================================================

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DIST_DIR="$PROJECT_ROOT/dist/layers"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default region
REGION=${1:-us-east-1}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Lambda Layers Deploy Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Region: ${YELLOW}$REGION${NC}\n"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install it first.${NC}"
    exit 1
fi

# Check layer files exist
if [ ! -f "$DIST_DIR/shared-code-layer.zip" ]; then
    echo -e "${RED}❌ shared-code-layer.zip not found. Run build_layers.sh first.${NC}"
    exit 1
fi

if [ ! -f "$DIST_DIR/dependencies-layer.zip" ]; then
    echo -e "${RED}❌ dependencies-layer.zip not found. Run build_layers.sh first.${NC}"
    exit 1
fi

#---------------------------------------
# Deploy shared-code layer
#---------------------------------------
echo -e "${YELLOW}📤 Deploying shared-code layer...${NC}"

SHARED_RESPONSE=$(aws lambda publish-layer-version \
    --layer-name cloudacademy-shared-code \
    --description "Shared code utilities for CloudAcademy backend" \
    --zip-file "fileb://$DIST_DIR/shared-code-layer.zip" \
    --compatible-runtimes python3.11 \
    --region "$REGION" \
    --output json)

SHARED_ARN=$(echo "$SHARED_RESPONSE" | jq -r '.LayerVersionArn')
SHARED_VERSION=$(echo "$SHARED_RESPONSE" | jq -r '.Version')

echo -e "${GREEN}✅ shared-code layer deployed${NC}"
echo -e "   ARN: $SHARED_ARN"
echo -e "   Version: $SHARED_VERSION"

#---------------------------------------
# Deploy dependencies layer
#---------------------------------------
echo -e "\n${YELLOW}📤 Deploying dependencies layer...${NC}"

DEPS_RESPONSE=$(aws lambda publish-layer-version \
    --layer-name cloudacademy-dependencies \
    --description "Python dependencies (boto3, powertools)" \
    --zip-file "fileb://$DIST_DIR/dependencies-layer.zip" \
    --compatible-runtimes python3.11 \
    --region "$REGION" \
    --output json)

DEPS_ARN=$(echo "$DEPS_RESPONSE" | jq -r '.LayerVersionArn')
DEPS_VERSION=$(echo "$DEPS_RESPONSE" | jq -r '.Version')

echo -e "${GREEN}✅ dependencies layer deployed${NC}"
echo -e "   ARN: $DEPS_ARN"
echo -e "   Version: $DEPS_VERSION"

#---------------------------------------
# Summary
#---------------------------------------
echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo -e "${BLUE}========================================${NC}"

echo -e "\nLayer ARNs:"
echo -e "  ${YELLOW}shared-code:${NC}"
echo -e "    $SHARED_ARN"
echo -e ""
echo -e "  ${YELLOW}dependencies:${NC}"
echo -e "    $DEPS_ARN"

# Save ARNs to file for reference
ARNS_FILE="$PROJECT_ROOT/layer_arns.txt"
cat > "$ARNS_FILE" << EOF
# Lambda Layer ARNs
# Generated: $(date)
# Region: $REGION

# shared-code layer
SHARED_CODE_LAYER_ARN=$SHARED_ARN
SHARED_CODE_LAYER_VERSION=$SHARED_VERSION

# dependencies layer
DEPENDENCIES_LAYER_ARN=$DEPS_ARN
DEPENDENCIES_LAYER_VERSION=$DEPS_VERSION

# Terraform variables (copy to terraform.tfvars)
shared_code_layer_arn     = "$SHARED_ARN"
dependencies_layer_arn    = "$DEPS_ARN"
EOF

echo -e "\n${GREEN}✅ ARNs saved to: $ARNS_FILE${NC}"

#---------------------------------------
# Next steps
#---------------------------------------
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Update Lambda functions to use these layers:"
echo ""
echo "   aws lambda update-function-configuration \\"
echo "     --function-name tutor-handler \\"
echo "     --layers \\"
echo "       $SHARED_ARN \\"
echo "       $DEPS_ARN"
echo ""
echo "2. Or add to Terraform:"
echo ""
echo "   resource \"aws_lambda_function\" \"tutor_handler\" {"
echo "     # ..."
echo "     layers = ["
echo "       \"$SHARED_ARN\","
echo "       \"$DEPS_ARN\""
echo "     ]"
echo "   }"
echo ""
echo "3. Reduce Lambda deployment packages (remove shared/ and site-packages/)"
echo ""
