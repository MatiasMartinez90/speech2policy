# 🛠️ Scripts de CloudAcademy

Este directorio contiene scripts de utilidad para gestión del proyecto.

---

## 📜 Scripts Disponibles

### migrate-categories.sh / migrate-categories.ts

Scripts para migrar categorías hardcoded a DynamoDB.

**Uso (Bash - Recomendado):**

```bash
# Obtener JWT token desde DevTools > Application > Local Storage
# Buscar: CognitoIdentityServiceProvider.{clientId}.{user}.idToken

# Ejecutar migración
./scripts/migrate-categories.sh "tu-jwt-token-aqui"

# O con variable de entorno
export MIGRATION_AUTH_TOKEN="tu-token"
./scripts/migrate-categories.sh
```

**Uso (TypeScript):**

```bash
npm install -g ts-node
export MIGRATION_AUTH_TOKEN="tu-token"
ts-node scripts/migrate-categories.ts
```

**Qué hace:**

1. ✅ Lee las 7 categorías hardcoded de `CATEGORY_CONFIG`
2. ✅ Las transforma al formato de DynamoDB
3. ✅ Hace POST a `/api/categories` para cada una
4. ✅ Salta categorías que ya existen (idempotente)
5. ✅ Muestra resumen detallado de la migración

**Categorías migradas:**

| Categoría | Emoji | Level | Featured | Courses |
|-----------|-------|-------|----------|---------|
| Bedrock | 🤖 | Advanced | ✓ | 8 |
| Security | 🔒 | Intermediate | ✓ | 18 |
| Networking | 🌐 | Intermediate | ✓ | 16 |
| Compute | ⚡ | Intermediate | ✗ | 20 |
| AWS Cloud Practitioner | ☁️ | Beginner | ✓ | 24 |
| DevOps | ⚙️ | Advanced | ✓ | 28 |
| Databases | 🗄️ | Intermediate | ✗ | 15 |

**Output esperado:**

```bash
$ ./scripts/migrate-categories.sh "tu-token"

🚀 Iniciando migración de categorías a DynamoDB
📍 API URL: https://...amazonaws.com/prod/api
🔑 Token: Configurado ✓
📋 Categorías a migrar: 7

📤 Migrando: Bedrock
   ✅ Migrada exitosamente
📤 Migrando: Security
   ✅ Migrada exitosamente
...

================================================================
📊 RESUMEN DE MIGRACIÓN
================================================================
✅ Exitosas:    7
⚠️  Saltadas:    0
❌ Fallidas:    0
📊 Total:       7

✨ Migración completada exitosamente!
```

**Recalcular course_count:**

Después de migrar, sincroniza los contadores:

```bash
# Via API
curl -X POST https://YOUR_API_URL/api/categories/recalculate-counts \
  -H "Authorization: Bearer YOUR_TOKEN"

# Via Admin Panel
# /admin-panel/categories > Click "Recalcular" en cada categoría
```

**Troubleshooting:**

| Error | Causa | Solución |
|-------|-------|----------|
| 401 Unauthorized | Token expiró | Obtener nuevo token desde LocalStorage |
| 403 Forbidden | Usuario no es admin | Verificar grupo "Admins" en Cognito |
| 409 Conflict | Categoría ya existe | Normal, el script la salta |
| 500 Internal | Error en Lambda | Revisar logs: `aws logs tail /aws/lambda/cloudacademy-categories-handler` |

**Seguridad:**

- ⚠️ Nunca commitees tokens JWT en el repositorio
- ⚠️ Solo usuarios admin pueden crear categorías
- ⚠️ Los tokens expiran en ~1 hora

---

### cleanup-old-resources.sh

Script para limpiar recursos huérfanos de AWS después de un nuevo deployment.

**Uso:**

```bash
# Ver qué se eliminaría (sin eliminar nada)
./scripts/cleanup-old-resources.sh --dry-run

# Eliminar recursos realmente (DESTRUCTIVO)
./scripts/cleanup-old-resources.sh --confirm
```

**Qué hace:**

1. ✅ Lista todos los recursos AWS del proyecto
2. ✅ Identifica recursos viejos vs recursos actuales (usando Terraform state)
3. ✅ Muestra qué se eliminaría
4. ✅ Pide confirmación antes de eliminar (en modo --confirm)
5. ✅ Elimina recursos de forma segura:
   - S3 Buckets viejos (vacía primero)
   - Cognito User Pools viejos
   - Lambda Functions viejas
   - IAM Roles viejos
   - CloudFront Distributions (instrucciones manuales)

**Seguridad:**

- ⚠️ NUNCA elimina recursos que están en uso según Terraform state
- ⚠️ Pide confirmación individual para cada recurso
- ⚠️ Modo `--dry-run` por defecto (no elimina nada)

**Cuándo usarlo:**

Solo después de verificar que el nuevo deployment funciona correctamente:

- ✅ Nuevo Cognito funciona con Google OAuth
- ✅ Nueva S3 + CloudFront sirven la aplicación
- ✅ Autenticación funciona
- ✅ Todos los tests pasan

**Ejemplo:**

```bash
# Paso 1: Ver qué se eliminaría
$ ./scripts/cleanup-old-resources.sh --dry-run

============================================
🧹 CloudAcademy - Limpieza de Recursos Viejos
============================================

[INFO] 🗑️  Buscando S3 buckets viejos...
Buckets encontrados:
website-bucket-5d2io74t
website-bucket-6xyva0pq
website-bucket-p03l6ar1

[INFO] Bucket actual en uso: cloudacademy-prod-website-abc123

[DRY-RUN] Se eliminaría: S3 Bucket: website-bucket-5d2io74t
[DRY-RUN] Se eliminaría: S3 Bucket: website-bucket-6xyva0pq
[DRY-RUN] Se eliminaría: S3 Bucket: website-bucket-p03l6ar1

...

✅ DRY-RUN completado - Nada fue eliminado

💰 Estimación de costos reducidos:
   - S3 buckets: ~$1-2/mes por bucket eliminado
   - Cognito User Pools: ~$2/mes por pool eliminado

# Paso 2: Si todo se ve bien, eliminar realmente
$ ./scripts/cleanup-old-resources.sh --confirm

⚠️  MODO DESTRUCTIVO ACTIVADO

[INFO] 🗑️  Buscando S3 buckets viejos...
¿Eliminar S3 Bucket: website-bucket-5d2io74t? (y/N): y
[INFO] Eliminando bucket: website-bucket-5d2io74t
[SUCCESS] ✓ Bucket eliminado: website-bucket-5d2io74t

...

✅ Limpieza completada
```

---

## 🚨 Advertencias

- **NO ejecutar en producción sin verificar primero con --dry-run**
- **NO ejecutar si no estás seguro de qué recursos están en uso**
- **Siempre tener backups antes de eliminar recursos**
- **CloudFront distributions requieren deshabilitarse manualmente primero** (el script da instrucciones)

---

## 💡 Mejoras Futuras

Posibles scripts adicionales:

- `backup-terraform-state.sh` - Backup del estado de Terraform
- `restore-from-backup.sh` - Restaurar desde backup
- `migrate-dns.sh` - Migración automática de DNS
- `health-check.sh` - Verificar salud de todos los recursos
- `cost-report.sh` - Reporte de costos AWS actual

---

## 📚 Referencias

- [AWS CLI Reference](https://docs.aws.amazon.com/cli/)
- [Terraform State Management](https://www.terraform.io/docs/state/)
