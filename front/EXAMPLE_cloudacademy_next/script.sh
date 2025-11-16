#!/bin/bash

set -e

echo "🔒 Fixing secrets exposure in Git commit..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Reset the last commit (keep changes)
echo -e "${YELLOW}Step 1: Resetting last commit (keeping changes)...${NC}"
git reset HEAD~1

# Step 2: Create backup of files
echo -e "${YELLOW}Step 2: Creating backup of files...${NC}"
mkdir -p /tmp/git_backup_$(date +%s)
BACKUP_DIR=$(ls -td /tmp/git_backup_* | head -1)

if [ -f "front/EXAMPLE_cloudacademy_next/fastapi-backend/k8s/secret.yaml" ]; then
    cp "front/EXAMPLE_cloudacademy_next/fastapi-backend/k8s/secret.yaml" "$BACKUP_DIR/secret.yaml.bak"
fi

if [ -f "front/EXAMPLE_cloudacademy_next/DEPLOYMENT_SUMMARY.md" ]; then
    cp "front/EXAMPLE_cloudacademy_next/DEPLOYMENT_SUMMARY.md" "$BACKUP_DIR/DEPLOYMENT_SUMMARY.md.bak"
fi

echo -e "${GREEN}✓ Backup created in: $BACKUP_DIR${NC}"

# Step 3: Fix secret.yaml
echo -e "${YELLOW}Step 3: Fixing secret.yaml...${NC}"
if [ -f "front/EXAMPLE_cloudacademy_next/fastapi-backend/k8s/secret.yaml" ]; then
    cat > "front/EXAMPLE_cloudacademy_next/fastapi-backend/k8s/secret.yaml" << 'EOF'
# Kubernetes Secret for AWS Credentials
# 
# DO NOT commit real credentials to Git!
# 
# To create this secret in your cluster, use:
# kubectl create secret generic aws-credentials \
#   --from-literal=AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
#   --from-literal=AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
#   --namespace=your-namespace

apiVersion: v1
kind: Secret
metadata:
  name: aws-credentials
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: "PLACEHOLDER_AWS_ACCESS_KEY_ID"
  AWS_SECRET_ACCESS_KEY: "PLACEHOLDER_AWS_SECRET_ACCESS_KEY"
EOF
    echo -e "${GREEN}✓ secret.yaml fixed${NC}"
fi

# Step 4: Fix DEPLOYMENT_SUMMARY.md
echo -e "${YELLOW}Step 4: Fixing DEPLOYMENT_SUMMARY.md...${NC}"
if [ -f "front/EXAMPLE_cloudacademy_next/DEPLOYMENT_SUMMARY.md" ]; then
    # Replace Google OAuth credentials with placeholders
    sed -i.bak 's/GOOGLE_CLIENT_ID=.*/GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com/' "front/EXAMPLE_cloudacademy_next/DEPLOYMENT_SUMMARY.md"
    sed -i.bak 's/GOOGLE_CLIENT_SECRET=.*/GOOGLE_CLIENT_SECRET=your-google-client-secret/' "front/EXAMPLE_cloudacademy_next/DEPLOYMENT_SUMMARY.md"
    
    # Remove backup file
    rm -f "front/EXAMPLE_cloudacademy_next/DEPLOYMENT_SUMMARY.md.bak"
    echo -e "${GREEN}✓ DEPLOYMENT_SUMMARY.md fixed${NC}"
fi

# Step 5: Add .gitignore rules
echo -e "${YELLOW}Step 5: Updating .gitignore...${NC}"
cat >> .gitignore << 'EOF'

# Secrets and credentials
.env
.env.local
.env.*.local
secrets.yaml
**/secret.yaml
**/*secret*.yaml
credentials.json
EOF

echo -e "${GREEN}✓ .gitignore updated${NC}"

# Step 6: Stage and commit changes
echo -e "${YELLOW}Step 6: Staging and committing changes...${NC}"
git add .
git commit -m "Fix: Remove hardcoded secrets and use placeholders

- Replace AWS credentials with placeholders in secret.yaml
- Replace Google OAuth credentials with placeholders in DEPLOYMENT_SUMMARY.md
- Add secrets patterns to .gitignore
- Add instructions for proper secrets management"

echo ""
echo -e "${GREEN}✅ All done!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Push the fixed branch:"
echo "   git push origin $(git branch --show-current)"
echo ""
echo -e "${RED}⚠️  IMPORTANT: If those were real credentials, rotate them immediately!${NC}"
echo "   - AWS: Delete old keys in IAM Console and create new ones"
echo "   - Google: Generate new OAuth credentials in Google Cloud Console"
echo ""
echo -e "${YELLOW}Backup location: $BACKUP_DIR${NC}"
