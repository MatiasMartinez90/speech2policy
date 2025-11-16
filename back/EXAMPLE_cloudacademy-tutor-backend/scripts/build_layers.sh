#!/bin/bash

#===============================================================================
# Script: build_layers.sh
# Purpose: Build Lambda layers (shared-code + dependencies)
# Usage: ./scripts/build_layers.sh [shared|deps|all]
#===============================================================================

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LAYERS_DIR="$PROJECT_ROOT/layers"
DIST_DIR="$PROJECT_ROOT/dist/layers"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Lambda Layers Build Script${NC}"
echo -e "${BLUE}========================================${NC}"

# Create directories
mkdir -p "$LAYERS_DIR/shared-code/python"
mkdir -p "$LAYERS_DIR/dependencies/python"
mkdir -p "$DIST_DIR"

#---------------------------------------
# Build shared-code layer
#---------------------------------------
build_shared_layer() {
    echo -e "\n${YELLOW}📦 Building shared-code layer...${NC}"

    cd "$LAYERS_DIR/shared-code"

    # Clean old python dir
    rm -rf python/shared

    # Copy shared module
    echo "Copying lambdas/shared/ to layer..."
    cp -r "$PROJECT_ROOT/lambdas/shared" python/

    # Clean Python cache
    find python/ -name "*.pyc" -delete
    find python/ -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

    # Create ZIP
    echo "Creating ZIP..."
    rm -f "$DIST_DIR/shared-code-layer.zip"
    zip -rq "$DIST_DIR/shared-code-layer.zip" python/

    SIZE=$(du -h "$DIST_DIR/shared-code-layer.zip" | cut -f1)
    echo -e "${GREEN}✅ shared-code-layer.zip created ($SIZE)${NC}"
}

#---------------------------------------
# Build dependencies layer
#---------------------------------------
build_dependencies_layer() {
    echo -e "\n${YELLOW}📦 Building dependencies layer...${NC}"

    cd "$LAYERS_DIR/dependencies"

    # Clean old python dir
    rm -rf python/

    # Create virtualenv
    echo "Creating virtualenv..."
    python3.11 -m venv venv 2>/dev/null || python3 -m venv venv

    # Activate virtualenv
    source venv/bin/activate

    # Install dependencies
    echo "Installing dependencies..."
    pip install -q --upgrade pip
    pip install -q boto3==1.34.162 botocore==1.34.162 aws-lambda-powertools==2.32.0

    # Copy site-packages to layer structure
    echo "Copying site-packages to layer..."
    mkdir -p python/lib/python3.11/site-packages
    cp -r venv/lib/python*/site-packages/* python/lib/python3.11/site-packages/

    # Clean unnecessary files
    echo "Cleaning unnecessary files..."
    find python/ -name "*.pyc" -delete
    find python/ -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
    rm -rf python/lib/python3.11/site-packages/*.dist-info
    rm -rf python/lib/python3.11/site-packages/pip*
    rm -rf python/lib/python3.11/site-packages/setuptools*

    # Deactivate virtualenv
    deactivate

    # Create ZIP
    echo "Creating ZIP..."
    rm -f "$DIST_DIR/dependencies-layer.zip"
    zip -rq "$DIST_DIR/dependencies-layer.zip" python/

    SIZE=$(du -h "$DIST_DIR/dependencies-layer.zip" | cut -f1)
    echo -e "${GREEN}✅ dependencies-layer.zip created ($SIZE)${NC}"
}

#---------------------------------------
# Main
#---------------------------------------
ACTION=${1:-all}

case "$ACTION" in
    shared)
        build_shared_layer
        ;;
    deps|dependencies)
        build_dependencies_layer
        ;;
    all)
        build_shared_layer
        build_dependencies_layer
        ;;
    *)
        echo -e "${RED}❌ Invalid option: $ACTION${NC}"
        echo "Usage: $0 [shared|deps|all]"
        exit 1
        ;;
esac

#---------------------------------------
# Summary
#---------------------------------------
echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Build completed!${NC}"
echo -e "${BLUE}========================================${NC}"

echo -e "\nOutputs:"
if [ -f "$DIST_DIR/shared-code-layer.zip" ]; then
    SIZE=$(du -h "$DIST_DIR/shared-code-layer.zip" | cut -f1)
    echo -e "  📦 shared-code-layer.zip: ${GREEN}$SIZE${NC}"
fi

if [ -f "$DIST_DIR/dependencies-layer.zip" ]; then
    SIZE=$(du -h "$DIST_DIR/dependencies-layer.zip" | cut -f1)
    echo -e "  📦 dependencies-layer.zip: ${GREEN}$SIZE${NC}"
fi

echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Deploy layers to AWS:"
echo "   ./scripts/deploy_layers.sh"
echo ""
echo "2. Or manually via AWS CLI:"
echo "   aws lambda publish-layer-version \\"
echo "     --layer-name cloudacademy-shared-code \\"
echo "     --zip-file fileb://dist/layers/shared-code-layer.zip \\"
echo "     --compatible-runtimes python3.11"
echo ""
