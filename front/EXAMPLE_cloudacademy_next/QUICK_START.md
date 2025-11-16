# ⚡ Quick Start - Despliegue en 15 Minutos

Para usuarios experimentados que quieren desplegar rápidamente.

---

## 🔥 Comandos Rápidos

### 1. Crear Google OAuth Credentials (5 min)
```bash
# https://console.cloud.google.com/apis/credentials
# Crear OAuth 2.0 Client → Copiar Client ID y Secret
```

### 2. Configurar GitHub Secrets (2 min)
```bash
gh secret set AWS_ACCESS_KEY_ID -b "YOUR_KEY"
gh secret set AWS_SECRET_ACCESS_KEY -b "YOUR_SECRET"
gh secret set GOOGLE_CLIENT_ID -b "NEW_CLIENT_ID"
gh secret set GOOGLE_CLIENT_SECRET -b "NEW_SECRET"
```

### 3. Deploy Backend (3 min)
```bash
cd terraform/backend
cp terraform.tfvars.template terraform.tfvars
# Editar con tus valores
terraform init && terraform apply -auto-approve

# Guardar outputs
export USER_POOL_ID=$(terraform output -raw cognito_user_pool_id)
export CLIENT_ID=$(terraform output -raw cognito_user_pool_web_client_id)
export COGNITO_DOMAIN=$(terraform output -raw cognito_user_pool_domain)
```

### 4. Deploy Frontend (3 min)
```bash
cd ../frontend
cp terraform.tfvars.template terraform.tfvars
terraform init && terraform apply -auto-approve

# Guardar outputs
export BUCKET=$(terraform output -raw website_bucket_name)
export CF_ID=$(terraform output -raw cloudfront_distribution_id)
```

### 5. Actualizar Secrets de Deploy (1 min)
```bash
gh secret set COGNITO_USER_POOL_ID -b "$USER_POOL_ID"
gh secret set COGNITO_CLIENT_ID -b "$CLIENT_ID"
gh secret set COGNITO_DOMAIN -b "$COGNITO_DOMAIN"
gh secret set S3_BUCKET_NAME -b "$BUCKET"
gh secret set CLOUDFRONT_DISTRIBUTION_ID -b "$CF_ID"
```

### 6. Push y Deploy (1 min)
```bash
cd ../..
git add .
git commit -m "feat: Clean deployment for november2025"
git push origin november2025
```

---

## ⏱️ Total: ~15 minutos (+ 15-20 min para CloudFront propagation)

---

## 🆘 Si algo falla

Ver documentación detallada: `DEPLOYMENT_GUIDE.md`
