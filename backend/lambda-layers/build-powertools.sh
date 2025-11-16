#!/bin/bash
# ================================================================
# Build AWS Lambda Powertools Layer
# ================================================================
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LAYER_DIR="$SCRIPT_DIR/powertools"

echo "🔨 Building Powertools Lambda Layer..."

# Clean previous build
rm -rf "$LAYER_DIR"
mkdir -p "$LAYER_DIR/python"

# Install Powertools
echo "📦 Installing aws-lambda-powertools..."
pip install \
  aws-lambda-powertools==2.28.0 \
  --target "$LAYER_DIR/python/" \
  --upgrade

# Create zip
echo "📦 Creating powertools.zip..."
cd "$LAYER_DIR"
zip -r ../powertools.zip . -q
cd ..

# Cleanup
rm -rf "$LAYER_DIR"

FILE_SIZE=$(du -h powertools.zip | cut -f1)
echo "✅ Powertools layer built successfully!"
echo "📊 File size: $FILE_SIZE"
echo "📁 Location: $SCRIPT_DIR/powertools.zip"
