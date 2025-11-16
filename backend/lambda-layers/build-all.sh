#!/bin/bash
# ================================================================
# Build All Lambda Layers
# ================================================================
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🚀 Building all Lambda Layers..."
echo ""

# Build Powertools layer
bash "$SCRIPT_DIR/build-powertools.sh"
echo ""

# Build Common Dependencies layer
bash "$SCRIPT_DIR/build-common-deps.sh"
echo ""

echo "✅ All Lambda layers built successfully!"
echo ""
echo "Next steps:"
echo "1. Deploy infrastructure: cd ../terraform && terraform apply"
echo "2. Lambda functions will use these layers automatically"
