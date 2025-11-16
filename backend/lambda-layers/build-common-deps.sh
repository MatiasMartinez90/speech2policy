#!/bin/bash
# ================================================================
# Build Common Dependencies Lambda Layer
# ================================================================
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LAYER_DIR="$SCRIPT_DIR/common-dependencies"

echo "🔨 Building Common Dependencies Lambda Layer..."

# Clean previous build
rm -rf "$LAYER_DIR"
mkdir -p "$LAYER_DIR/python"

# Install common dependencies
echo "📦 Installing common dependencies..."
pip install \
  boto3==1.34.0 \
  botocore==1.34.0 \
  requests==2.31.0 \
  python-dateutil==2.8.2 \
  --target "$LAYER_DIR/python/" \
  --upgrade

# Create zip
echo "📦 Creating common-dependencies.zip..."
cd "$LAYER_DIR"
zip -r ../common-dependencies.zip . -q
cd ..

# Cleanup
rm -rf "$LAYER_DIR"

FILE_SIZE=$(du -h common-dependencies.zip | cut -f1)
echo "✅ Common dependencies layer built successfully!"
echo "📊 File size: $FILE_SIZE"
echo "📁 Location: $SCRIPT_DIR/common-dependencies.zip"
