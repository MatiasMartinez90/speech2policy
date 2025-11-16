# ✅ FASE 1 COMPLETADA - DynamoDB Tables

**Fecha de completación:** 30 de Octubre, 2025
**Duración:** ~2.5 horas
**Estado:** ✅ COMPLETADA EXITOSAMENTE

---

## 📊 Resumen Ejecutivo

La Fase 1 del proyecto CloudAcademy Tutor Backend ha sido completada exitosamente. Se creó toda la infraestructura de base de datos con Terraform y se cargó el curso demo completo.

---

## ✅ Objetivos Completados

### 1. Infraestructura con Terraform

**Archivos creados:**
```
terraform/
├── provider.tf      ✅ - AWS provider configurado
├── variables.tf     ✅ - Variables y configuración de Cognito
├── dynamodb.tf      ✅ - 4 tablas DynamoDB
└── outputs.tf       ✅ - Outputs para uso en Lambdas
```

**Comandos ejecutados:**
```bash
cd terraform
terraform init        ✅ - Provider inicializado
terraform plan        ✅ - 4 recursos a crear verificados
terraform apply       ✅ - 4 tablas creadas exitosamente
```

---

### 2. Tablas DynamoDB Creadas

| # | Tabla | Keys | TTL | Items | Estado |
|---|-------|------|-----|-------|--------|
| 1 | **CourseCatalog** | PK, SK | ❌ No | 7 | ✅ Operacional |
| 2 | **UserProgress** | PK, SK + GSI | ❌ No | 0 | ✅ Operacional |
| 3 | **TutorSessions** | PK, SK | ✅ 30 días | 0 | ✅ Operacional |
| 4 | **UserUsage** | user_id, period | ✅ 7 días | 0 | ✅ Operacional |

**Detalles de las tablas:**

#### CourseCatalog
- **Purpose:** Almacenar metadata de cursos y contenido de secciones
- **Partition Key:** PK (String) = `COURSE#{course_id}`
- **Sort Key:** SK (String) = `METADATA` | `SECTION#{id}`
- **Billing Mode:** PAY_PER_REQUEST (On-Demand)
- **Point-in-Time Recovery:** ✅ Enabled
- **Items cargados:** 7 (1 METADATA + 6 SECTIONS)

#### UserProgress
- **Purpose:** Tracking de progreso individual por usuario y curso
- **Partition Key:** PK (String) = `USER#{email}`
- **Sort Key:** SK (String) = `COURSE#{course_id}`
- **GSI:** course_id-index (para queries por curso)
- **Billing Mode:** PAY_PER_REQUEST
- **Point-in-Time Recovery:** ✅ Enabled

#### TutorSessions
- **Purpose:** Historial de conversaciones del tutor IA
- **Partition Key:** PK (String) = `SESSION#{session_id}`
- **Sort Key:** SK (String) = `TIMESTAMP#{iso_timestamp}`
- **TTL:** ✅ Enabled - 30 días (attribute: `ttl`)
- **Billing Mode:** PAY_PER_REQUEST
- **Point-in-Time Recovery:** ✅ Enabled

#### UserUsage
- **Purpose:** Rate limiting y tracking de uso por usuario
- **Partition Key:** user_id (String) = email o `anon_IP`
- **Sort Key:** period (String) = `YYYY-MM-DD-HH` | `YYYY-MM-DD` | `TOTAL`
- **TTL:** ✅ Enabled - 7 días (attribute: `ttl`)
- **Billing Mode:** PAY_PER_REQUEST
- **Point-in-Time Recovery:** ✅ Enabled

---

### 3. Curso Demo Cargado

**Script creado:** `scripts/seed-course.py`

**Curso:** `image-gen-bedrock` - "Generador de Imágenes con IA en AWS"

**Items cargados en CourseCatalog:**

| # | PK | SK | Tipo | Título |
|---|----|----|------|--------|
| 1 | COURSE#image-gen-bedrock | METADATA | Metadata | - |
| 2 | COURSE#image-gen-bedrock | SECTION#0 | Sección | Introducción |
| 3 | COURSE#image-gen-bedrock | SECTION#1 | Sección | Configurar Lambda Function |
| 4 | COURSE#image-gen-bedrock | SECTION#2 | Sección | Amazon Bedrock - Generación de Imágenes |
| 5 | COURSE#image-gen-bedrock | SECTION#3 | Sección | Almacenamiento en S3 |
| 6 | COURSE#image-gen-bedrock | SECTION#4 | Sección | API Gateway Setup |
| 7 | COURSE#image-gen-bedrock | SECTION#5 | Sección | Testing y Debugging |

**Contenido por sección:**
- ✅ Learning objectives (objetivos de aprendizaje)
- ✅ Content data (pasos, conceptos clave, puntos importantes)
- ✅ Checkpoint con pregunta de validación
- ✅ Criterios de validación con pesos (para Claude)
- ✅ 3 niveles de pistas progresivas
- ✅ Metadata (orden, tiempo estimado, navegación)

---

## 📋 Comandos de Verificación

### Verificar tablas creadas:
```bash
aws dynamodb list-tables
# Output esperado: CourseCatalog, UserProgress, TutorSessions, UserUsage
```

### Verificar TTL en TutorSessions:
```bash
aws dynamodb describe-time-to-live --table-name TutorSessions
# Output: TimeToLiveStatus: "ENABLED", AttributeName: "ttl"
```

### Verificar TTL en UserUsage:
```bash
aws dynamodb describe-time-to-live --table-name UserUsage
# Output: TimeToLiveStatus: "ENABLED", AttributeName: "ttl"
```

### Contar items del curso:
```bash
aws dynamodb query --table-name CourseCatalog \
  --key-condition-expression "PK = :pk" \
  --expression-attribute-values '{":pk":{"S":"COURSE#image-gen-bedrock"}}' \
  --select COUNT
# Output: Count: 7
```

### Ver metadata del curso:
```bash
aws dynamodb get-item --table-name CourseCatalog \
  --key '{"PK": {"S": "COURSE#image-gen-bedrock"}, "SK": {"S": "METADATA"}}' \
  --query 'Item.course_name.S'
# Output: "Generador de Imágenes con IA en AWS"
```

### Ver secciones del curso:
```bash
aws dynamodb query --table-name CourseCatalog \
  --key-condition-expression "PK = :pk AND begins_with(SK, :sk)" \
  --expression-attribute-values '{":pk":{"S":"COURSE#image-gen-bedrock"}, ":sk":{"S":"SECTION#"}}' \
  --projection-expression "section_id, title" \
  --output table
```

---

## 🎯 Terraform Outputs

Al ejecutar `terraform output` obtenemos:

```hcl
aws_account_id = "982081083386"
aws_region = "us-east-1"
bedrock_model_id = "anthropic.claude-3-5-sonnet-20241022-v2:0"

cognito_user_pool_arn = "arn:aws:cognito-idp:us-east-1:982081083386:userpool/us-east-1_FbLlcvGLl"
cognito_user_pool_client_id = "7k692bp886on11hdqfroo2pp44"
cognito_user_pool_id = "us-east-1_FbLlcvGLl"

dynamodb_tables = {
  courses_catalog = "CourseCatalog"
  tutor_sessions  = "TutorSessions"
  user_progress   = "UserProgress"
  user_usage      = "UserUsage"
}

lambda_environment_variables = {
  AWS_REGION           = "us-east-1"
  BEDROCK_MODEL_ID     = "anthropic.claude-3-5-sonnet-20241022-v2:0"
  COGNITO_USER_POOL_ID = "us-east-1_FbLlcvGLl"
  COURSES_TABLE        = "CourseCatalog"
  PROGRESS_TABLE       = "UserProgress"
  SESSIONS_TABLE       = "TutorSessions"
  USAGE_TABLE          = "UserUsage"
}
```

Estos outputs serán utilizados en las siguientes fases para configurar las funciones Lambda.

---

## 📁 Archivos Creados

```
cloudacademy-tutor-backend/
├── terraform/
│   ├── .terraform/                    ✅ (initialized)
│   ├── .terraform.lock.hcl            ✅
│   ├── terraform.tfstate              ✅
│   ├── provider.tf                    ✅
│   ├── variables.tf                   ✅
│   ├── dynamodb.tf                    ✅
│   └── outputs.tf                     ✅
├── scripts/
│   └── seed-course.py                 ✅
├── docs/
│   ├── ARCHITECTURE.md                ✅ (actualizado)
│   ├── COGNITO_CONFIG.md              ✅
│   └── SETUP_SUMMARY.md               ✅ (actualizado)
├── README.md                          ✅ (actualizado)
├── SETUP_SUMMARY.md                   ✅ (actualizado)
└── FASE_1_COMPLETADA.md               ✅ (este documento)
```

---

## 🐛 Problemas Encontrados y Soluciones

### Problema 1: Tags con caracteres especiales
**Error:** `ValidationException: The Tag Value provided is invalid`

**Causa:** DynamoDB no acepta caracteres especiales como paréntesis o acentos en los tags.

**Solución:** Cambiamos los tags de:
- ❌ `"Historial de conversaciones con el tutor IA (TTL: 30 días)"`
- ✅ `"Historial de conversaciones con tutor IA - TTL 30 dias"`

### Problema 2: Float types en DynamoDB
**Error:** `TypeError: Float types are not supported. Use Decimal types instead.`

**Causa:** DynamoDB requiere tipo `Decimal` para números con decimales, no `float`.

**Solución:**
```python
from decimal import Decimal

# Antes:
'average_rating': 0.0

# Después:
'average_rating': Decimal('0.0')
```

### Problema 3: datetime.utcnow() deprecado
**Warning:** `datetime.datetime.utcnow() is deprecated`

**Solución:**
```python
from datetime import datetime, timezone

# Antes:
datetime.utcnow().isoformat() + 'Z'

# Después:
datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
```

---

## 💰 Costos Estimados (Fase 1)

**Recursos creados:**
- 4 tablas DynamoDB en modo On-Demand
- Point-in-Time Recovery habilitado en 4 tablas

**Costo mensual estimado (con 0-100 usuarios):**
- DynamoDB On-Demand (4 tablas, uso mínimo): ~$0.50/mes
- Point-in-Time Recovery (4 tablas): ~$0.20/mes
- **Total Fase 1:** ~$0.70/mes

Nota: Los costos reales dependerán del volumen de uso. El costo principal vendrá de Bedrock (Claude) en la Fase 2.

---

## 🚀 Próximos Pasos

### Fase 2: Lambda tutor-handler (4-6 horas)

**Objetivo:** Implementar la función Lambda principal que:
- Se conecta a Bedrock (Claude Sonnet 3.5 v2)
- Aplica guardrails de contenido y rate limiting
- Valida checkpoints con criterios y pesos
- Maneja sistema de pistas progresivas
- Responde preguntas con contexto del curso

**Archivos a crear:**
```
lambdas/tutor-handler/
├── lambda_function.py          # Handler principal
├── requirements.txt            # boto3
├── utils/
│   ├── bedrock_client.py      # Invocación de Claude
│   ├── dynamodb_client.py     # Operaciones DynamoDB
│   ├── prompt_builder.py      # Constructor de prompts
│   └── rate_limiter.py        # Rate limiting
└── validators/
    ├── content_validator.py   # Guardrails de contenido
    └── checkpoint_validator.py # Validación de checkpoints
```

---

## 📞 Información de Contacto

**Proyecto:** CloudAcademy Tutor Backend
**Repositorio:** https://github.com/MatiasMartinez90/cloudacademy-tutor-backend
**Desarrollador:** Matias Martinez
**Email:** matias@cloudacademy.ar

---

**Última actualización:** 30 de Octubre, 2025
**Estado del proyecto:** Fase 1 completada, listo para Fase 2
