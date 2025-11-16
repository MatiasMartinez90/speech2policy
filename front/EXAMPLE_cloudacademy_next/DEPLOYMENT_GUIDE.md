# 🚀 Guía de Despliegue CloudAcademy - Opción A (Despliegue Limpio)

Esta guía te llevará paso a paso para redesplegar CloudAcademy en AWS con infraestructura completamente nueva.

---

## 📋 Pre-requisitos

### 1. Herramientas Locales
```bash
# Verificar que tienes todo instalado
terraform --version  # >= 1.5.7
aws --version       # AWS CLI v2
node --version      # >= 18
gh --version        # GitHub CLI (opcional)
```

### 2. Credenciales AWS
```bash
# Configurar credenciales AWS locales
aws configure

# Verificar acceso
aws sts get-caller-identity
```

### 3. Google OAuth Credentials (NUEVO)
1. Ve a https://console.cloud.google.com/apis/credentials
2. Crea un nuevo OAuth 2.0 Client ID
3. Tipo: Web application
4. Authorized redirect URIs:
   - `http://localhost:3000`
   - `http://localhost:3000/admin`
   - `https://proyectos.cloudacademy.ar`
   - `https://proyectos.cloudacademy.ar/admin`
   - `https://cloudacademy-prod-auth-XXXXXXXX.auth.us-east-1.amazoncognito.com/oauth2/idpresponse` (agregar después del despliegue)
5. **IMPORTANTE**: Guarda `Client ID` y `Client Secret` en un lugar seguro

---

## 🔐 Configurar GitHub Secrets

Estos secrets son necesarios para CI/CD automático:

```bash
# Navegar a: https://github.com/TU_USERNAME/cloudacademy_next/settings/secrets/actions

# Secrets REQUERIDOS:
AWS_ACCESS_KEY_ID           = <tu_aws_access_key>
AWS_SECRET_ACCESS_KEY       = <tu_aws_secret_key>
GOOGLE_CLIENT_ID            = <nuevo_google_client_id>
GOOGLE_CLIENT_SECRET        = <nuevo_google_client_secret>

# Secrets OPCIONALES (para RDS/Database):
DB_HOST                     = <rds_endpoint>
DB_USER                     = <db_username>
DB_PASSWORD                 = <db_password>
DB_NAME                     = proyecto_cloudacademy
FROM_EMAIL                  = noreply@cloudacademy.ar

# Secrets para DEPLOYMENT (se configuran DESPUÉS del terraform apply):
COGNITO_USER_POOL_ID        = <se_obtiene_del_terraform_output>
COGNITO_CLIENT_ID           = <se_obtiene_del_terraform_output>
COGNITO_DOMAIN              = <se_obtiene_del_terraform_output>
S3_BUCKET_NAME              = <se_obtiene_del_terraform_output>
CLOUDFRONT_DISTRIBUTION_ID  = <se_obtiene_del_terraform_output>
NEXT_PUBLIC_WEB_API_URL     = <url_de_tu_backend_fastapi>
```

---

## 📦 PASO 1: Preparar Configuración Local

### 1.1 Crear archivo terraform.tfvars para Backend

```bash
cd terraform/backend

# Copiar template
cp terraform.tfvars.template terraform.tfvars

# Editar con tus valores reales
nano terraform.tfvars
```

Contenido de `terraform/backend/terraform.tfvars`:
```hcl
# Google OAuth (NUEVO - del paso Pre-requisitos)
google_client_id     = "TU_NUEVO_CLIENT_ID.apps.googleusercontent.com"
google_client_secret = "TU_NUEVO_CLIENT_SECRET"

# URLs de producción
production_callback_url = "https://proyectos.cloudacademy.ar"
production_logout_url   = "https://proyectos.cloudacademy.ar"
```

### 1.2 Crear archivo terraform.tfvars para Frontend

```bash
cd ../frontend

# Copiar template
cp terraform.tfvars.template terraform.tfvars

# Editar si necesitas
nano terraform.tfvars
```

Contenido de `terraform/frontend/terraform.tfvars`:
```hcl
domain_name = "proyectos.cloudacademy.ar"
```

---

## 🏗️ PASO 2: Desplegar Backend (Cognito)

```bash
cd terraform/backend

# Inicializar Terraform
terraform init

# Revisar el plan (verificar que creará recursos NUEVOS)
terraform plan

# Revisar cuidadosamente:
# - Debe decir "Plan: X to add, 0 to change, 0 to destroy"
# - Verifica nombres de recursos: cloudacademy-prod-*

# Aplicar (crear recursos)
terraform apply

# Responder 'yes' cuando pregunte

# ⏱️ Tiempo estimado: 2-3 minutos
```

### 2.1 Capturar Outputs IMPORTANTES

```bash
# Ejecutar después del apply exitoso:
terraform output

# Guardar estos valores (los necesitarás):
cognito_user_pool_id           = us-east-1_XXXXXXX
cognito_user_pool_web_client_id = XXXXXXXXXXXXXXXXXXXXX
cognito_user_pool_domain        = cloudacademy-prod-auth-XXXXXXXX
```

### 2.2 Actualizar Google OAuth Redirect URIs

1. Ve a Google Cloud Console: https://console.cloud.google.com/apis/credentials
2. Edita tu OAuth Client
3. Agrega el nuevo redirect URI:
   ```
   https://cloudacademy-prod-auth-XXXXXXXX.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
   ```
   (Usar el valor de `cognito_user_pool_domain` del output)

---

## 🌐 PASO 3: Desplegar Frontend (S3 + CloudFront)

```bash
cd ../frontend

# Inicializar Terraform
terraform init

# Revisar el plan
terraform plan

# Aplicar
terraform apply

# Responder 'yes'

# ⏱️ Tiempo estimado: 15-20 minutos (CloudFront distribution es lento)
```

### 3.1 Capturar Outputs del Frontend

```bash
terraform output

# Guardar estos valores:
website_bucket_name          = cloudacademy-prod-website-XXXXXXXX
cloudfront_distribution_id   = E1XXXXXXXXXX
frontend_endpoint            = d1xxxxx.cloudfront.net
certificate_arn              = arn:aws:acm:us-east-1:...
certificate_validation_records = {
  "proyectos.cloudacademy.ar" = {
    name  = "_xxxxx.proyectos.cloudacademy.ar"
    type  = "CNAME"
    value = "_xxxxx.acm-validations.aws."
  }
}
```

### 3.2 Validar Certificado SSL (DNS)

**IMPORTANTE**: El certificado SSL necesita validación DNS.

1. Copia los valores de `certificate_validation_records`
2. Ve a tu proveedor DNS (Route53, Cloudflare, etc.)
3. Crea el registro CNAME:
   - Name: `_xxxxx.proyectos.cloudacademy.ar`
   - Type: `CNAME`
   - Value: `_xxxxx.acm-validations.aws.`

4. Esperar validación (5-30 minutos):
```bash
aws acm describe-certificate \
  --certificate-arn <certificate_arn_del_output> \
  --region us-east-1 \
  --query 'Certificate.Status'

# Debe responder: "ISSUED"
```

---

## 🔧 PASO 4: Configurar GitHub Secrets (Deployment)

Ahora que tienes los outputs de Terraform, configura estos secrets:

```bash
# Opción 1: GitHub UI
# https://github.com/TU_USERNAME/cloudacademy_next/settings/secrets/actions

# Opción 2: GitHub CLI
gh secret set COGNITO_USER_POOL_ID -b "us-east-1_XXXXXXX"
gh secret set COGNITO_CLIENT_ID -b "XXXXXXXXXXXXXXXXXXXXX"
gh secret set COGNITO_DOMAIN -b "cloudacademy-prod-auth-XXXXXXXX"
gh secret set S3_BUCKET_NAME -b "cloudacademy-prod-website-XXXXXXXX"
gh secret set CLOUDFRONT_DISTRIBUTION_ID -b "E1XXXXXXXXXX"
```

---

## 📱 PASO 5: Actualizar Configuración Local de la App

```bash
cd ../../app

# Editar .env.local
nano .env.local
```

Contenido de `app/.env.local`:
```bash
NEXT_PUBLIC_AUTH_USER_POOL_ID=us-east-1_XXXXXXX
NEXT_PUBLIC_AUTH_WEB_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_COGNITO_DOMAIN=cloudacademy-prod-auth-XXXXXXXX.auth.us-east-1.amazoncognito.com
```

(Usar los valores del `terraform output` del backend)

---

## 🚢 PASO 6: Hacer Push y Desplegar

```bash
# Volver a raíz del proyecto
cd ..

# Verificar branch
git branch  # Debe ser: november2025

# Ver cambios
git status

# Agregar cambios (EXCEPTO terraform.tfvars con secrets)
git add .github/workflows/
git add terraform/backend/variables.tf
git add terraform/backend/main.tf
git add terraform/backend/terraform.tfvars.template
git add terraform/frontend/variables.tf
git add terraform/frontend/main.tf
git add terraform/frontend/terraform.tfvars.template
git add .gitignore
git add DEPLOYMENT_GUIDE.md

# Commit
git commit -m "feat: Configure clean deployment for november2025

- Update workflows to support november2025 branch
- Add dynamic resource naming with environment variables
- Remove hardcoded secrets from workflows
- Create terraform.tfvars.template files
- Update .gitignore for better security
- Add deployment guide"

# Push
git push origin november2025

# ⏱️ Los workflows de GitHub Actions se ejecutarán automáticamente
```

### 6.1 Monitorear GitHub Actions

1. Ve a: https://github.com/TU_USERNAME/cloudacademy_next/actions
2. Verifica que los workflows se ejecuten exitosamente:
   - ✅ Terraform Backend CI/CD Pipeline
   - ✅ Terraform Frontend CI/CD Pipeline
   - ⏳ Build and Deploy to S3 (esperando a que los anteriores terminen)

---

## 🧪 PASO 7: Probar el Despliegue

### 7.1 Probar con CloudFront URL

```bash
# Obtener URL de CloudFront
cd terraform/frontend
terraform output frontend_endpoint

# Abrir en navegador:
# https://d1xxxxx.cloudfront.net
```

### 7.2 Probar Autenticación

1. Navega a: `https://d1xxxxx.cloudfront.net/signin`
2. Haz clic en "Continue with Google"
3. Autoriza con tu cuenta Google
4. Deberías ser redirigido a `/admin`

### 7.3 Verificar Funcionalidad

- ✅ Home page carga correctamente
- ✅ Login con Google funciona
- ✅ Redirect a /admin después de login
- ✅ Header muestra avatar de Google
- ✅ Todos los cursos son accesibles
- ✅ Sign out funciona

---

## 🌍 PASO 8: Configurar DNS para Dominio Custom

**Solo cuando el certificado SSL esté validado (ISSUED)**

### Opción A: Con Route53 (AWS)

```bash
# Crear Hosted Zone (si no existe)
aws route53 create-hosted-zone \
  --name cloudacademy.ar \
  --caller-reference $(date +%s)

# Obtener CloudFront URL
CLOUDFRONT_DOMAIN=$(cd terraform/frontend && terraform output -raw frontend_endpoint)

# Crear registro A (Alias a CloudFront)
# Ve a Route53 Console y crea:
# Type: A
# Alias: Yes
# Alias Target: <cloudfront_distribution_id>.cloudfront.net
```

### Opción B: Con Cloudflare u otro proveedor

1. Ve a tu DNS provider
2. Crea registro CNAME:
   - Name: `proyectos` (o `@` para apex)
   - Target: `d1xxxxx.cloudfront.net` (del output)
   - Proxy: OFF (importante para SSL de AWS)

### 8.1 Verificar DNS

```bash
# Esperar propagación DNS (5-30 minutos)
dig proyectos.cloudacademy.ar

# O usar:
nslookup proyectos.cloudacademy.ar

# Debe apuntar a CloudFront
```

### 8.2 Probar Dominio Final

```bash
# Abrir en navegador:
https://proyectos.cloudacademy.ar

# ✅ Debe cargar con SSL válido (candado verde)
```

---

## ✅ PASO 9: Verificación Final

### Checklist de Verificación

- [ ] Cognito User Pool creado con nuevo nombre
- [ ] Lambda post-confirmation deployada
- [ ] Google OAuth configurado con nuevas credenciales
- [ ] S3 bucket creado con nuevo nombre
- [ ] CloudFront distribution activa
- [ ] Certificado SSL validado y en estado ISSUED
- [ ] GitHub Secrets configurados
- [ ] Workflow de deploy ejecuta correctamente
- [ ] App desplegada en S3
- [ ] CloudFront sirve la app
- [ ] Login con Google funciona
- [ ] DNS apunta a CloudFront (si aplica)
- [ ] Dominio custom funciona con HTTPS

---

## 📊 Monitoreo y Costos

### Ver Costos en AWS

```bash
# Costo estimado mensual: ~$17-20/mes

# Breakdown:
# - Cognito: ~$2/mes
# - S3: ~$5/mes
# - CloudFront: ~$10/mes
# - Lambda: <$1/mes
# - ACM Certificate: Gratis
```

### CloudWatch Logs

```bash
# Ver logs de Lambda
aws logs tail /aws/lambda/cloudacademy-prod-post-confirmation --follow

# Ver métricas de CloudFront
aws cloudfront get-distribution-config \
  --id E1XXXXXXXXXX
```

---

## 🆘 Troubleshooting

### Error: "Bucket already exists"
```bash
# El nombre aleatorio ya existe (muy raro)
# Solución: Cambiar el sufijo manualmente o ejecutar terraform apply de nuevo
```

### Error: "Certificate not validated"
```bash
# El certificado SSL no se ha validado
# Solución:
1. Verificar registro DNS CNAME está creado correctamente
2. Esperar 5-30 minutos para propagación DNS
3. Verificar con:
   aws acm describe-certificate --certificate-arn <arn> --region us-east-1
```

### Error: "Google OAuth redirect mismatch"
```bash
# El redirect URI no está configurado en Google
# Solución:
1. Ve a Google Cloud Console
2. Agrega todas las redirect URIs necesarias
3. Incluye el dominio de Cognito: cloudacademy-prod-auth-XXXXXXXX.auth.us-east-1.amazoncognito.com
```

### Error: "CloudFront 403 Forbidden"
```bash
# El bucket policy no permite acceso a CloudFront OAI
# Solución:
cd terraform/frontend
terraform apply  # Re-aplicar para arreglar bucket policy
```

### Los workflows no se ejecutan automáticamente
```bash
# Verificar que estás en branch november2025
git branch

# Verificar que los cambios están en las rutas correctas
git log --oneline --decorate

# Trigger manual:
# Ve a GitHub Actions y usa "Run workflow" manualmente
```

---

## 🧹 Próximo Paso: Limpieza de Recursos Viejos

Una vez que TODO funcione correctamente, puedes limpiar recursos viejos para reducir costos.

Ver: `scripts/cleanup-old-resources.sh`

---

## 📚 Referencias

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Cognito](https://docs.aws.amazon.com/cognito/)
- [CloudFront](https://docs.aws.amazon.com/cloudfront/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

¡Listo! 🎉 Tu aplicación CloudAcademy está desplegada con infraestructura completamente nueva.
