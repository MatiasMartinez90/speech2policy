#!/bin/bash

# ================================================================
# Build AWS Lambda Powertools Layer
# ================================================================
# This script creates a Lambda layer with:
# - AWS Lambda Powertools
# - Shared utilities
# ================================================================

set -e

echo "🔨 Building Lambda Powertools Layer..."

# Clean previous builds
rm -rf python powertools.zip

# Create directory structure
mkdir -p python

# Install AWS Lambda Powertools
echo "📦 Installing AWS Lambda Powertools..."
pip install \
  aws-lambda-powertools==3.2.0 \
  -t python/ \
  --platform manylinux2014_x86_64 \
  --only-binary=:all:

# Copy shared utilities
echo "📋 Copying shared utilities..."
cp -r ../lambdas/shared python/

# Create ZIP
echo "📦 Creating ZIP file..."
zip -r powertools.zip python/

# Clean up
rm -rf python/

echo "✅ Layer built successfully: powertools.zip"
echo "📊 Size: $(du -h powertools.zip | cut -f1)"
