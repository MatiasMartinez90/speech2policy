# 📋 Resumen de Configuración - CloudAcademy Tutor Backend

**Fecha:** 30 de Octubre, 2025
**Estado:** ✅ Documentación completa - Listo para implementar

---

## ✅ LO QUE YA TENEMOS

### 1. Cognito User Pool (existente)
- **User Pool ID:** `us-east-1_FbLlcvGLl`
- **ARN:** `arn:aws:cognito-idp:us-east-1:982081083386:userpool/us-east-1_FbLlcvGLl`
- **Client ID:** `7k692bp886on11hdqfroo2pp44`
- **Domain:** `cloudacademy-prod-auth-w0porj9z`
- **Grupos creados:** ✅ Admins, ✅ Premium
- **Admin user:** ✅ matias.martinez90@gmail.com (agregado a grupo Admins)

### 2. Documentación
- ✅ **README.md** - Entrada rápida al proyecto (actualizado a 4 tablas)
- ✅ **ARCHITECTURE.md** - Documento maestro (4,370 líneas)
  - Modelo de datos completo (4 tablas DynamoDB)
  - 8 endpoints API especificados
  - 4 Lambdas documentadas
  - Guardrails completos (contenido + rate limiting)
  - Plan de implementación en 7 fases
  - Curso demo completo (6 secciones)
- ✅ **COGNITO_CONFIG.md** - Configuración de Cognito y rate limits
- ✅ **SETUP_SUMMARY.md** - Este documento

### 3. Repositorio GitHub
- **Repo:** `cloudacademy-tutor-backend` (privado)
- **URL:** https://github.com/MatiasMartinez90/cloudacademy-tutor-backend
- **Estructura de carpetas:** ✅ Definida

```
cloudacademy-tutor-backend/
├── lambdas/
│   ├── tutor-handler/       # Principal - Bedrock + Guardrails
│   ├── courses-handler/     # CRUD de cursos
│   ├── progress-handler/    # Gestión de progreso
│   └── admin-handler/       # Panel admin
├── terraform/
│   ├── dynamodb.tf          # 4 tablas
│   ├── lambda.tf            # 4 funciones Lambda
│   ├── api-gateway.tf       # API Gateway con Cognito
│   ├── iam.tf               # Permisos IAM
│   └── variables.tf         # Variables (Cognito ARN, etc)
├── scripts/
│   └── seed-course.py       # Seed del curso demo
├── docs/
│   ├── ARCHITECTURE.md      # Documento maestro
│   └── COGNITO_CONFIG.md    # Config de Cognito
└── README.md
```

---

## 🎯 PRÓXIMOS PASOS

### Fase 1: DynamoDB Tables (2-3 horas)

**Objetivo:** Crear 4 tablas DynamoDB con Terraform

#### Tablas a crear:

1. **CourseCatalog**
   - PK: `COURSE#{course_id}`, SK: `METADATA` | `SECTION#{id}`
   - Billing: On-Demand
   - Contiene: metadata de cursos, secciones, checkpoints, pistas

2. **UserProgress**
   - PK: `USER#{email}`, SK: `COURSE#{course_id}`
   - Billing: On-Demand
   - Contiene: progreso por usuario, scores, respuestas de checkpoints

3. **TutorSessions**
   - PK: `SESSION#{session_id}`, SK: `TIMESTAMP#{iso}`
   - TTL: ✅ 30 días (attribute: `ttl`)
   - Billing: On-Demand
   - Contiene: historial de conversaciones

4. **UserUsage** (nueva - para rate limiting)
   - PK: `user_id`, SK: `period` (formato: "YYYY-MM-DD-HH" o "TOTAL")
   - TTL: ✅ 7 días (attribute: `ttl`)
   - Billing: On-Demand
   - Contiene: contadores de uso por usuario

#### Archivos a crear:

```bash
# 1. Crear terraform/variables.tf
variable "cognito_user_pool_arn" {
  default = "arn:aws:cognito-idp:us-east-1:982081083386:userpool/us-east-1_FbLlcvGLl"
}

variable "cognito_user_pool_id" {
  default = "us-east-1_FbLlcvGLl"
}

# 2. Crear terraform/dynamodb.tf (con las 4 tablas)

# 3. Deploy
cd terraform
terraform init
terraform plan
terraform apply
```

#### Verificación:

```bash
# Listar tablas creadas
aws dynamodb list-tables

# Verificar TTL en TutorSessions
aws dynamodb describe-time-to-live --table-name TutorSessions

# Verificar TTL en UserUsage
aws dynamodb describe-time-to-live --table-name UserUsage
```

#### Seed del curso demo:

```bash
# Crear scripts/seed-course.py
# Cargar curso "image-gen-bedrock" con 6 secciones

python scripts/seed-course.py

# Verificar
aws dynamodb get-item \
  --table-name CourseCatalog \
  --key '{"PK": {"S": "COURSE#image-gen-bedrock"}, "SK": {"S": "METADATA"}}'
```

---

### Fase 2: Lambda tutor-handler (4-6 horas)

**Objetivo:** Implementar Lambda principal con Bedrock + Guardrails

#### Archivos a crear:

```
lambdas/tutor-handler/
├── lambda_function.py          # Handler principal
├── requirements.txt            # boto3
├── utils/
│   ├── __init__.py
│   ├── bedrock_client.py      # Invocación de Claude con guardrails
│   ├── dynamodb_client.py     # Operaciones DynamoDB
│   ├── prompt_builder.py      # Constructor de prompts contextuales
│   └── rate_limiter.py        # Rate limiting
└── validators/
    ├── __init__.py
    ├── content_validator.py   # Guardrails de contenido
    └── checkpoint_validator.py # Validación de checkpoints
```

#### Environment Variables (Lambda):

```bash
COURSES_TABLE=CourseCatalog
SESSIONS_TABLE=TutorSessions
PROGRESS_TABLE=UserProgress
USAGE_TABLE=UserUsage
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
BEDROCK_GUARDRAIL_ID=<obtener después de crear guardrail en console>
COGNITO_USER_POOL_ID=us-east-1_FbLlcvGLl
```

#### Endpoints a implementar:

- POST `/api/tutor/ask` - Preguntas libres al tutor
- POST `/api/tutor/validate` - Validar respuesta de checkpoint
- GET `/api/tutor/hint` - Solicitar pista (nivel 1-3)

---

### Fase 3: Lambdas de Soporte ✅ (2-3 horas) - COMPLETADA

1. **courses-handler** - Lectura de cursos y secciones
   - GET `/api/courses` - Lista todos los cursos
   - GET `/api/courses/{id}` - Detalle de curso + secciones
   - GET `/api/courses/{id}/sections/{sectionId}` - Contenido de sección

2. **progress-handler** - Lectura de progreso de usuarios
   - GET `/api/tutor/progress?course_id=X` - Progreso del usuario (requiere auth)

3. **admin-handler** - CRUD de cursos (requiere grupo Admins)
   - POST `/api/admin/courses` - Crear curso
   - PUT `/api/admin/courses/{id}` - Actualizar curso
   - DELETE `/api/admin/courses/{id}` - Eliminar curso

---

### Fase 4: API Gateway (3-4 horas)

**Objetivo:** Crear REST API con Cognito Authorizer

#### Configuración:

```terraform
resource "aws_api_gateway_rest_api" "tutor_api" {
  name = "cloudacademy-tutor-api"
}

resource "aws_api_gateway_authorizer" "cognito" {
  name            = "CognitoAuthorizer"
  rest_api_id     = aws_api_gateway_rest_api.tutor_api.id
  type            = "COGNITO_USER_POOLS"
  provider_arns   = [var.cognito_user_pool_arn]
  identity_source = "method.request.header.Authorization"
}
```

#### Endpoints:

- POST `/api/tutor/ask` - Autenticado
- POST `/api/tutor/validate` - Autenticado
- GET `/api/tutor/hint` - Autenticado
- GET `/api/tutor/progress` - Autenticado
- GET `/api/courses` - Público
- GET `/api/courses/{id}` - Público
- GET `/api/courses/{id}/sections/{sectionId}` - Autenticado
- POST/PUT/DELETE `/api/admin/courses` - Autenticado + Admin

#### CORS:

```terraform
# Habilitar OPTIONS para todos los endpoints
# Headers: Authorization, Content-Type
# Methods: GET, POST, PUT, DELETE, OPTIONS
# Origin: *
```

---

### Fase 5: Frontend Integration (4-6 horas)

**Objetivo:** Conectar frontend Next.js con nuevo backend

#### Variables de entorno (.env.local):

```bash
NEXT_PUBLIC_TUTOR_API_URL=https://xxx.execute-api.us-east-1.amazonaws.com/prod
```

#### Componentes a crear:

- `CheckpointQuestion.tsx` - Pregunta de checkpoint con textarea
- `CourseLayout.tsx` - Layout de curso con progreso
- `SectionContent.tsx` - Renderiza contenido por tipo
- `ProgressTracker.tsx` - Barra de progreso
- `RateLimitBanner.tsx` - Mostrar límites de uso

#### Hook a actualizar:

```typescript
// app/hooks/useBedrockChat.ts
const API_URL = process.env.NEXT_PUBLIC_TUTOR_API_URL

const response = await fetch(`${API_URL}/api/tutor/ask`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    user_id: user.email,
    course_id: courseId,
    section_id: sectionId,
    question: content,
    session_id: sessionId
  })
})
```

---

## 🛡️ Guardrails Configurados

### Triple Capa de Validación:

1. **Bedrock Native Guardrails** (AWS)
   - Content filters (hate, violence, sexual)
   - Topic filters (politics, religion, off-topic)
   - Word filters (spam, profanity)
   - PII filters (credit cards, SSN)

2. **Custom Pre-validation** (Lambda)
   - Keywords por curso (must contain AWS terms)
   - Blocked topics (bitcoin, medical, legal)
   - Spam patterns (URLs, phone numbers)

3. **Prompt-level Rules** (System prompt)
   - "Solo responder sobre el contenido del curso"
   - "No dar respuestas directas a checkpoints"
   - "Redirigir preguntas off-topic"

### Rate Limits:

| Usuario | Total | Día | Hora | Checkpoints | Pistas |
|---------|-------|-----|------|-------------|--------|
| **Anónimo** | 1 | 1 | 1 | 0 | 0 |
| **Autenticado** | ∞ | 50 | 10 | 20 | 15 |
| **Premium** | ∞ | 200 | 50 | 100 | 50 |

---

## 💰 Costos Estimados

Para **100 usuarios activos/mes**:

| Servicio | Costo mensual |
|----------|---------------|
| DynamoDB (4 tablas) | $1.38 |
| Lambda (4 funciones) | $5.20 |
| API Gateway | $0.35 |
| Bedrock (Claude) | $67.50 |
| Otros | $1.12 |
| **TOTAL** | **~$75.57/mes** |

**Costo por usuario:** $0.76/mes

---

## 📊 Checklist de Implementación

### Fase 1: DynamoDB ✅ COMPLETADA
- [x] Crear `terraform/variables.tf` con Cognito ARN
- [x] Crear `terraform/provider.tf` con AWS provider
- [x] Crear `terraform/dynamodb.tf` (4 tablas)
- [x] Crear `terraform/outputs.tf` con outputs
- [x] `terraform init`
- [x] `terraform plan`
- [x] `terraform apply` - 4 tablas creadas exitosamente
- [x] Verificar TTL en TutorSessions (30 días) y UserUsage (7 días)
- [x] Crear `scripts/seed-course.py`
- [x] Seed del curso "image-gen-bedrock" - 7 items cargados
- [x] Verificar datos en DynamoDB - 6 secciones confirmadas

**Fecha completada:** 30 de Octubre, 2025
**Tablas creadas:**
- CourseCatalog (7 items: 1 METADATA + 6 SECTIONS)
- UserProgress
- TutorSessions (TTL: 30 días)
- UserUsage (TTL: 7 días)

### Fase 2: Lambda tutor-handler ✅ COMPLETADA
- [x] Crear estructura de carpetas
- [x] Implementar `lambda_function.py` (450 líneas)
- [x] Implementar `bedrock_client.py` (220 líneas)
- [x] Implementar `dynamodb_client.py` (350 líneas)
- [x] Implementar `prompt_builder.py` (200 líneas)
- [x] Implementar `rate_limiter.py` (180 líneas)
- [x] Implementar `content_validator.py` (250 líneas)
- [x] Implementar `checkpoint_validator.py` (220 líneas)
- [x] Crear `requirements.txt`
- [x] Crear `terraform/lambda.tf`
- [x] Crear `terraform/iam.tf` (10 recursos IAM)
- [x] Deploy con Terraform - Lambda desplegada exitosamente
- [x] Test directo en Lambda console - Funcionando correctamente

**Fecha completada:** 1 de Noviembre, 2025
**Duración real:** ~4 horas
**Recursos creados:**
- 1 Lambda function (512 MB, 60s timeout)
- 1 IAM Role + 3 Policies custom
- 1 CloudWatch Log Group (7 días retention)
- Total: ~1,900 líneas de código Python

**Modelo Bedrock:** `anthropic.claude-3-haiku-20240307-v1:0` (testing)

### Fase 3: Lambdas Soporte ✅
- [x] Implementar `courses-handler` (260 líneas)
- [x] Implementar `progress-handler` (233 líneas)
- [x] Implementar `admin-handler` (396 líneas)
- [x] Crear IAM roles y policies para las 3 Lambdas
- [x] Deploy con Terraform - 3 Lambdas + 3 IAM roles + 6 policies
- [x] Tests básicos - courses-handler y progress-handler verificados

**Fecha completada:** 1 de Noviembre, 2025
**Duración real:** ~2 horas
**Recursos creados:**
- 3 Lambda functions (256 MB, 30s timeout cada una)
- 3 IAM Roles + 6 Policies (3 DynamoDB + 1 Cognito)
- 3 CloudWatch Log Groups (7 días retention)
- Total: ~890 líneas de código Python

**Funcionalidad verificada:**
- courses-handler: Listar cursos (148ms), obtener detalles (79ms)
- progress-handler: Autenticación funcionando, progreso vacío para nuevos usuarios
- admin-handler: Desplegado, requiere grupo Cognito "Admins"

### Fase 4: API Gateway ✅
- [x] Crear `terraform/api-gateway.tf` (415 líneas)
- [x] Configurar Cognito Authorizer
- [x] Crear 10 endpoints (4 tutor + 3 courses + 3 admin)
- [x] Configurar CORS a nivel de Lambda (AWS_PROXY)
- [x] Deploy stage "prod"
- [x] Obtener URL base
- [x] Test con cURL endpoints públicos

**Fecha completada:** 1 de Noviembre, 2025
**Duración real:** ~1.5 horas
**Recursos creados:**
- 1 REST API + 1 Cognito Authorizer
- 13 Resources + 10 Methods + 10 Integrations
- 4 Lambda Permissions
- 1 Deployment + 1 Stage "prod"
- Total: 41 recursos

**URL API:** https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api

**Endpoints verificados:**
- GET /api/courses - ✅ Funcionando (~200ms)
- GET /api/courses/{id} - ✅ Funcionando (~150ms)
- Endpoints autenticados requieren JWT de Cognito

### Fase 5: Frontend ✅
- [x] Crear tag de seguridad `funciona-octubre` en frontend repo
- [x] Agregar `NEXT_PUBLIC_TUTOR_API_URL` a .env.local
- [x] Actualizar `useBedrockChat.ts` para API Gateway
- [x] Cambiar endpoint de `/api/bedrock/chat` a `/tutor/ask`
- [x] Actualizar formato request (course_id, section_id, question)
- [x] Actualizar formato response (answer en lugar de message)
- [x] Commit y push cambios a branch `agent-fusion`

**Fecha completada:** 1 de Noviembre, 2025
**Duración real:** ~30 minutos
**Branch:** agent-fusion
**Commit:** `0428117`

**Cambios realizados:**
- Hook migrado a nuevo API Gateway
- Variable de entorno configurada
- Template .env.example creado
- Interfaz pública del hook sin cambios (componentes compatibles)

**Testing pendiente:**
```bash
cd cloudacademy_next
npm run dev
# Ir a http://localhost:3000/bedrock
# Login y probar el chat IA
```
- [ ] Test end-to-end
- [ ] Verificar progreso se guarda

### Fase 6: Admin Panel ⏳
- [ ] Crear `/admin/courses`
- [ ] Formulario crear curso
- [ ] Verificar grupo Admins
- [ ] Test CRUD completo

### Fase 7: Testing ⏳
- [ ] Test rate limiting (anónimo = 1 pregunta)
- [ ] Test guardrails (preguntas off-topic)
- [ ] Test checkpoints (validación con Claude)
- [ ] Test pistas progresivas
- [ ] Test progreso lineal
- [ ] Documentación final

---

## 🚀 Comando para Empezar

```bash
# Ir al proyecto backend
cd /Users/matiasmartinez/Documents/repos/cloudacademy-tutor-backend

# Crear estructura de carpetas
mkdir -p lambdas/tutor-handler/utils
mkdir -p lambdas/tutor-handler/validators
mkdir -p lambdas/courses-handler
mkdir -p lambdas/progress-handler
mkdir -p lambdas/admin-handler
mkdir -p terraform
mkdir -p scripts

# Empezar con Terraform
cd terraform
terraform init
```

---

## 📞 Información de Contacto

**Desarrollador:** Matias Martinez
**Email:** matias@cloudacademy.ar
**GitHub:** [@MatiasMartinez90](https://github.com/MatiasMartinez90)

---

## ✅ FASE 1 COMPLETADA - 30 de Octubre, 2025

### Resumen de lo completado:

**Infraestructura:**
- ✅ 4 archivos Terraform creados y aplicados
- ✅ 4 tablas DynamoDB desplegadas en us-east-1
- ✅ TTL configurado correctamente en 2 tablas

**Datos:**
- ✅ Script de seed creado (`scripts/seed-course.py`)
- ✅ Curso "image-gen-bedrock" cargado con 6 secciones completas
- ✅ 7 items totales en CourseCatalog verificados

**Comandos de verificación:**
```bash
# Verificar tablas
aws dynamodb list-tables

# Contar items del curso
aws dynamodb query --table-name CourseCatalog \
  --key-condition-expression "PK = :pk" \
  --expression-attribute-values '{":pk":{"S":"COURSE#image-gen-bedrock"}}' \
  --select COUNT

# Ver secciones
aws dynamodb query --table-name CourseCatalog \
  --key-condition-expression "PK = :pk AND begins_with(SK, :sk)" \
  --expression-attribute-values '{":pk":{"S":"COURSE#image-gen-bedrock"}, ":sk":{"S":"SECTION#"}}' \
  --projection-expression "section_id, title"
```

---

## ✅ FASE 2 COMPLETADA - 1 de Noviembre, 2025

### Resumen de lo completado:

**Lambda tutor-handler:**
- ✅ 8 archivos Python creados (~1,900 líneas)
- ✅ Lambda desplegada con Terraform (512 MB, 60s timeout)
- ✅ 10 recursos IAM configurados
- ✅ Integración con Bedrock (Claude Haiku para testing)
- ✅ Rate limiting funcionando (3 niveles: anónimo, autenticado, premium)
- ✅ Triple capa de guardrails de contenido
- ✅ Validación de checkpoints con Claude
- ✅ Test exitoso en Lambda console

**Comandos de verificación:**
```bash
# Ver Lambda creada
aws lambda list-functions --query "Functions[?FunctionName=='cloudacademy-tutor-handler'].{Name:FunctionName,Runtime:Runtime,Memory:MemorySize}" --output table

# Ver logs de Lambda
aws logs tail /aws/lambda/cloudacademy-tutor-handler --since 1h --follow

# Test de invocación
aws lambda invoke \
  --function-name cloudacademy-tutor-handler \
  --payload file://test-events/ask-question.json \
  /tmp/response.json
```

---

**⚡ Siguiente paso:** Empezar con Fase 3 - Lambdas de soporte (2-3 horas)

¿Listo para continuar? 🚀
