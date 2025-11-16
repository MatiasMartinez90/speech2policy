#!/bin/bash
# Script de recuperación urgente para website-bucket-xhel8jes

BUCKET="website-bucket-xhel8jes"

echo "🔄 Restaurando archivos de $BUCKET..."

# Listar todos los delete markers y eliminarlos
aws s3api list-object-versions \
  --bucket $BUCKET \
  --query 'DeleteMarkers[].{Key:Key,VersionId:VersionId}' \
  --output json | \
jq -r '.[] | "aws s3api delete-object --bucket '$BUCKET' --key \"\(.Key)\" --version-id \"\(.VersionId)\""' | \
bash

echo "✅ Delete markers eliminados. Los archivos deberían estar visibles ahora."
echo "🌐 Probando: https://agent.cloud-it.com.ar"
