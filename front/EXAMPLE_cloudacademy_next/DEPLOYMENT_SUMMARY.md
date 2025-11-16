# 📋 Resumen de Preparación para Despliegue Limpio

**Fecha:** 2025-10-25
**Branch:** november2025
**Tipo de Despliegue:** Opción A - Despliegue Limpio (Infraestructura Nueva)

---

## ✅ Tareas Completadas

### 1. ✅ Workflows Actualizados

Archivos modificados para soportar branch `november2025`:

- `.github/workflows/terraform-backend.yml`
- `.github/workflows/terraform-frontend.yml`
- `.github/workflows/terraform-bedrock.yml`
- `.github/workflows/terraform-api-gateway.yml`
- `.github/workflows/deploy-nextjs.yml`

**Cambios realizados:**
- ✅ Agregado `november2025` a triggers de push y pull_request
- ✅ Removidos valores hardcodeados de `deploy-nextjs.yml`
- ✅ Implementado uso de GitHub Secrets para valores dinámicos
- ✅ Agregado invalidación de caché de CloudFront

### 2. ✅ Configuración de Seguridad Mejorada

**Archivo `.gitignore` actualizado:**
```gitignore
# Secrets y credenciales protegidos
.env.local
*.tfvars (excepto *.tfvars.template)
bedrock_credentials.txt
credentials.json
secrets.json
```

**Templates creados (seguros para versionamiento):**
- `terraform/backend/terraform.tfvars.template`
- `terraform/frontend/terraform.tfvars.template`
- `terraform/api-gateway/terraform.tfvars.template`
- `terraform-bedrock/terraform.tfvars.template`

### 3. ✅ Terraform Refactorizado

**Nuevas variables agregadas:**

`terraform/frontend/variables.tf`:
```hcl
variable "environment" {
  default = "prod"
}

variable "project_name" {
  default = "cloudacademy"
}
```

`terraform/backend/variables.tf`:
```hcl
variable "project_name" {
  default = "cloudacademy"
}

variable "environment" {
  default = "prod"
}
```

**Nombres de recursos actualizados:**

| Recurso Viejo | Recurso Nuevo |
|---------------|---------------|
| `website-bucket-XXXXX` | `cloudacademy-prod-website-XXXXX` |
| `cloudacademy-auth-XXXXX` | `cloudacademy-prod-auth-XXXXX` |
| `PostConfirmationFn` | `cloudacademy-prod-post-confirmation` |
| `post_confirmation_lambda_role` | `cloudacademy-prod-lambda-role` |
| `UserPool` | `cloudacademy-prod-user-pool` |
| `RewriteFunction` | `cloudacademy-prod-rewrite` |

**Ventajas:**
- ✅ Nombres únicos que no colisionan con recursos viejos
- ✅ Fácil identificación del environment (prod, staging, dev)
- ✅ Mejor organización y trazabilidad

### 4. ✅ Documentación Creada

**Archivos nuevos:**

1. **`DEPLOYMENT_GUIDE.md`** (Guía completa de 9 pasos)
   - Pre-requisitos
   - Configuración de Google OAuth
   - GitHub Secrets necesarios
   - Comandos paso a paso
   - Troubleshooting
   - Verificación final

2. **`scripts/cleanup-old-resources.sh`** (Script de limpieza)
   - Modo dry-run seguro
   - Detección automática de recursos actuales
   - Confirmación individual de eliminaciones
   - Estimación de costos ahorrados

3. **`scripts/README.md`** (Documentación de scripts)
   - Uso detallado
   - Ejemplos
   - Advertencias de seguridad

---

## 🔐 GitHub Secrets Requeridos

### Secrets CRÍTICOS (configurar ANTES del despliegue):

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY

# Google OAuth (NUEVOS - crear en Google Cloud Console)
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET

# Database (opcional si usas RDS)
DB_HOST
DB_USER
DB_PASSWORD
DB_NAME
FROM_EMAIL
```

### Secrets de DEPLOYMENT (configurar DESPUÉS de terraform apply):

```bash
# Obtenidos de terraform output
COGNITO_USER_POOL_ID
COGNITO_CLIENT_ID
COGNITO_DOMAIN
S3_BUCKET_NAME
CLOUDFRONT_DISTRIBUTION_ID

# Backend API
NEXT_PUBLIC_WEB_API_URL
```

---

## 🚨 Problemas Identificados en Infraestructura Actual

### 1. Recursos Duplicados/Huérfanos

**S3 Buckets:**
- `website-bucket-5d2io74t` ✅ EN USO
- `website-bucket-6xyva0pq` ❌ Huérfano
- `website-bucket-p03l6ar1` ❌ Huérfano
- `website-bucket-xhel8jes` ❌ Huérfano

**Cognito User Pools:**
- `us-east-1_kbBZ0w9sf` ✅ EN USO
- `us-east-1_8V0hE099p` ❌ Huérfano
- `us-east-1_MeClCiUAC` ❌ Huérfano

**Costo estimado de recursos huérfanos:** ~$8-12/mes

### 2. Credenciales Expuestas (CRÍTICO)

**Archivo:** `terraform/backend/terraform.tfvars`

```hcl
# ⚠️ ESTOS VALORES NUNCA DEBEN VERSIONARSE EN GIT
# Usar placeholders en lugar de valores reales
google_client_id     = "YOUR_GOOGLE_CLIENT_ID_HERE"
google_client_secret = "YOUR_GOOGLE_CLIENT_SECRET_HERE"
```

**Acción requerida:**
1. ✅ Revocar estas credenciales en Google Cloud Console
2. ✅ Crear nuevas credenciales
3. ✅ Usar solo GitHub Secrets (NUNCA versionarlas)

### 3. Valores Hardcodeados

**Archivos afectados:**
- `app/.env.local` (User Pool ID, Client ID, Domain)
- `.github/workflows/deploy-nextjs.yml` (env.json, S3 bucket)

**Estado:** ✅ CORREGIDO en los commits preparados

---

## 📊 Comparación: Antes vs Después

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Secrets en Git** | ❌ Sí (google_client_secret) | ✅ No (GitHub Secrets) |
| **Valores hardcodeados** | ❌ Sí (workflows, env) | ✅ No (dinámicos) |
| **Nombres de recursos** | ⚠️ Genéricos | ✅ Con environment prefix |
| **Recursos duplicados** | ❌ 7 recursos huérfanos | ✅ Limpios (post-cleanup) |
| **Branch support** | ⚠️ Solo vpc, retorno | ✅ + november2025 |
| **Documentación** | ⚠️ Básica | ✅ Completa (guides + scripts) |
| **Seguridad .gitignore** | ⚠️ Parcial | ✅ Completa |
| **CloudFront cache** | ❌ Sin invalidación | ✅ Auto-invalidación |

---

## 🎯 Próximos Pasos

### Paso 1: Configurar Google OAuth (INMEDIATO)

```bash
# 1. Ve a Google Cloud Console
https://console.cloud.google.com/apis/credentials

# 2. Crea NUEVO OAuth 2.0 Client ID
#    - Tipo: Web application
#    - Authorized redirect URIs:
#      * http://localhost:3000
#      * http://localhost:3000/admin
#      * https://proyectos.cloudacademy.ar
#      * https://proyectos.cloudacademy.ar/admin

# 3. GUARDA Client ID y Client Secret (los necesitarás)

# 4. REVOCA las credenciales viejas expuestas en Git
```

### Paso 2: Configurar GitHub Secrets

```bash
gh secret set AWS_ACCESS_KEY_ID -b "YOUR_KEY"
gh secret set AWS_SECRET_ACCESS_KEY -b "YOUR_SECRET"
gh secret set GOOGLE_CLIENT_ID -b "NUEVO_CLIENT_ID"
gh secret set GOOGLE_CLIENT_SECRET -b "NUEVO_CLIENT_SECRET"
```

### Paso 3: Crear terraform.tfvars Local

```bash
cd terraform/backend
cp terraform.tfvars.template terraform.tfvars
# Editar con valores reales
nano terraform.tfvars

cd ../frontend
cp terraform.tfvars.template terraform.tfvars
```

### Paso 4: Desplegar Infraestructura

Seguir la guía completa en: **`DEPLOYMENT_GUIDE.md`**

```bash
# Backend (Cognito)
cd terraform/backend
terraform init
terraform plan
terraform apply

# Frontend (S3 + CloudFront)
cd ../frontend
terraform init
terraform plan
terraform apply
```

### Paso 5: Actualizar Secrets de Deployment

```bash
# Usar outputs de terraform
gh secret set COGNITO_USER_POOL_ID -b "$(cd terraform/backend && terraform output -raw cognito_user_pool_id)"
gh secret set COGNITO_CLIENT_ID -b "$(cd terraform/backend && terraform output -raw cognito_user_pool_web_client_id)"
# ... etc
```

### Paso 6: Hacer Push y Deploy

```bash
git add <archivos_preparados>
git commit -m "feat: Clean deployment configuration for november2025"
git push origin november2025
```

### Paso 7: Limpiar Recursos Viejos (DESPUÉS de verificar)

```bash
# Solo cuando TODO funcione perfectamente
./scripts/cleanup-old-resources.sh --dry-run
./scripts/cleanup-old-resources.sh --confirm
```

---

## 💰 Costos Estimados

### Costo Mensual Nuevo Deployment

| Servicio | Costo Mensual |
|----------|---------------|
| Cognito User Pool | ~$2.00 |
| S3 (1 bucket) | ~$5.00 |
| CloudFront | ~$10.00 |
| Lambda | <$1.00 |
| ACM Certificate | $0.00 (gratis) |
| **TOTAL** | **~$17-20/mes** |

### Ahorro Después de Limpieza

| Recurso Eliminado | Ahorro Mensual |
|-------------------|----------------|
| 3 S3 buckets viejos | ~$3-6 |
| 2 Cognito pools viejos | ~$4 |
| Lambdas viejas | ~$1 |
| **TOTAL AHORRO** | **~$8-12/mes** |

---

## 📁 Archivos Modificados (Listos para Commit)

```bash
# Workflows actualizados
.github/workflows/terraform-backend.yml
.github/workflows/terraform-frontend.yml
.github/workflows/terraform-bedrock.yml
.github/workflows/terraform-api-gateway.yml
.github/workflows/deploy-nextjs.yml

# Terraform refactorizado
terraform/backend/main.tf
terraform/backend/variables.tf
terraform/frontend/main.tf
terraform/frontend/variables.tf

# Configuración segura
.gitignore
terraform/backend/terraform.tfvars.template
terraform/frontend/terraform.tfvars.template
terraform/api-gateway/terraform.tfvars.template
terraform-bedrock/terraform.tfvars.template

# Documentación nueva
DEPLOYMENT_GUIDE.md
DEPLOYMENT_SUMMARY.md
scripts/cleanup-old-resources.sh
scripts/README.md
```

---

## ⚠️ ADVERTENCIAS IMPORTANTES

1. **NO hacer commit de `terraform.tfvars`** con valores reales
2. **NO reutilizar credenciales expuestas** (crear nuevas)
3. **Verificar que certificate SSL se valide** antes de cambiar DNS
4. **Probar COMPLETAMENTE** antes de limpiar recursos viejos
5. **Backup del estado de Terraform** antes de cambios destructivos

---

## ✅ Checklist Final Antes de Desplegar

- [ ] Google OAuth credentials creadas (NUEVAS)
- [ ] Credenciales viejas revocadas en Google Cloud Console
- [ ] GitHub Secrets configurados (AWS + Google)
- [ ] terraform.tfvars creados localmente (NO versionados)
- [ ] Terraform state backend accesible (S3 + DynamoDB)
- [ ] AWS CLI configurado y autenticado
- [ ] Dominio DNS accesible para validación SSL
- [ ] Backup del estado actual (por si acaso)
- [ ] Plan de rollback definido

---

## 🆘 Soporte y Troubleshooting

**Guía detallada:** Ver sección "Troubleshooting" en `DEPLOYMENT_GUIDE.md`

**Problemas comunes:**
- Certificate not validated → Verificar DNS CNAME
- OAuth redirect mismatch → Agregar URI en Google Console
- CloudFront 403 → Re-aplicar bucket policy
- Workflows no se ejecutan → Verificar branch y paths

---

## 📚 Documentación de Referencia

- **Guía de Despliegue Completa:** `DEPLOYMENT_GUIDE.md`
- **Scripts de Limpieza:** `scripts/README.md`
- **Contexto del Proyecto:** `app/CLAUDE.md`
- **Arquitectura:** `app/ARCHITECTURE.md`

---

**¡Listo para desplegar! 🚀**

Sigue los pasos en `DEPLOYMENT_GUIDE.md` en orden y verifica cada paso antes de continuar.
