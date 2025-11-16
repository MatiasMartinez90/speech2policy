# CloudAcademy Tutor IA Backend - Análisis Exhaustivo

Fecha del análisis: 6 de noviembre, 2025

## Resumen Ejecutivo

Se ha completado un análisis exhaustivo del repositorio `cloudacademy-tutor-backend`. Los hallazgos clave son:

**IMPORTANTE: El proyecto NO usa PostgreSQL, sino DynamoDB exclusivamente.**

### Conclusiones Principales

1. **Base de datos:** DynamoDB (4 tablas), NO PostgreSQL
2. **Lambdas:** 6 funciones totales, NINGUNA sincroniza con PostgreSQL
3. **Cognito Triggers:** NO existen - los datos se guardan directamente en DynamoDB
4. **Status:** 90% completado (infraestructura 100% lista)

## Documentación del Análisis

Se han generado dos documentos de análisis exhaustivo:

### 1. CLOUDACADEMY_BACKEND_ANALYSIS.md (26 KB, 938 líneas)

**Contenido:**
- Estructura general del proyecto
- 6 Lambda functions detalladas
- Configuración completa de DynamoDB (4 tablas)
- Modelo de datos con ejemplos reales
- Configuración de Cognito y autenticación
- Infraestructura como código (Terraform)
- Endpoints del API
- Rate limiting por tipo de usuario
- Costos estimados
- Seguridad y encriptación

**Uso:** Referencia técnica completa con ejemplos de código.

### 2. CLOUDACADEMY_VISUAL_SUMMARY.txt (20 KB, 442 líneas)

**Contenido:**
- Arquitectura general con ASCII art
- Flujo de datos con ejemplo completo
- Resumen visual de Lambdas
- Tablas DynamoDB con diagramas
- Cognito & Autenticación (visual)
- Infraestructura Terraform (árbol)
- Costos estimados
- Comparación DynamoDB vs PostgreSQL
- Status del proyecto

**Uso:** Referencia visual rápida, fácil de entender.

## Respuestas Detalladas a tus Preguntas

### 1. Estructura general del proyecto

- **Framework:** AWS Lambda (Python 3.11)
- **API:** REST API con API Gateway
- **Base de datos:** DynamoDB (4 tablas)
- **Autenticación:** AWS Cognito User Pools
- **IA:** Amazon Bedrock (Claude Sonnet 3.5 v2)
- **Infraestructura:** Terraform (IaC)
- **Storage:** S3 (imágenes de cursos)

**Total de código:** 3,000+ líneas (2,405 Python + 600+ Terraform)

### 2. Lambdas existentes

| Lambda | Líneas | Endpoints | Timeout | Memory |
|--------|--------|-----------|---------|--------|
| tutor-handler | 467 | /api/tutor/ask, /validate, /hint | 60s | 512 MB |
| courses-handler | 424 | /api/courses, /api/stats | 30s | 256 MB |
| progress-handler | 232 | /api/tutor/progress | 30s | 256 MB |
| admin-handler | 429 | /api/admin/courses (CRUD) | 30s | 256 MB |
| sections-handler | 518 | /api/admin/sections (CRUD) | 30s | 256 MB |
| upload-handler | 335 | Presigned URLs para S3 | 30s | 256 MB |

**Ninguna Lambda guarda en PostgreSQL.**

### 3. Configuración de PostgreSQL

**NO EXISTE.**
- No hay RDS instance
- No hay migraciones
- No hay connection strings
- No hay Lambda para sincronizar

El proyecto usa **DynamoDB exclusivamente**.

### 4. DynamoDB Configurado

**SÍ, completamente.**

**4 Tablas:**

1. **CourseCatalog**
   - PK: `COURSE#{course_id}`
   - SK: `METADATA | SECTION#{section_id}`
   - Almacena: metadata, contenido, checkpoints, pistas

2. **UserProgress**
   - PK: `USER#{email}`
   - SK: `COURSE#{course_id}`
   - GSI: `course_id-index`
   - Almacena: secciones completadas, scores, estadísticas

3. **TutorSessions**
   - PK: `SESSION#{session_id}`
   - SK: `TIMESTAMP#{iso_timestamp}`
   - TTL: 30 días (auto-delete)
   - Almacena: preguntas, respuestas, tokens

4. **UserUsage**
   - PK: `user_id`
   - SK: `period`
   - TTL: 7 días
   - Almacena: contadores para rate limiting

**Características:**
- On-demand pricing
- AWS-managed encryption (SSE-256)
- Point-in-time recovery (backups)
- TTL para limpieza automática

### 5. Infraestructura como Código

**SÍ, Terraform con 50+ recursos AWS.**

**Archivos:**
- `provider.tf` - AWS provider
- `variables.tf` - 69 líneas de configuración
- `dynamodb.tf` - 197 líneas (4 tablas)
- `lambda.tf` - 323 líneas (6 Lambdas)
- `api-gateway.tf` - 1,200+ líneas (REST API)
- `iam.tf` - 291 líneas (Roles y policies)
- `s3.tf` - 183 líneas (Bucket imágenes)
- `outputs.tf` - 109 líneas

**Status:** Completamente desplegado en AWS (account 982081083386, región us-east-1)

### 6. Cognito Triggers

**NO EXISTEN.**

**Explicación:**
- No hay Lambda trigger configurado en post_confirmation
- No hay sincronización con PostgreSQL (porque no existe)
- Los datos se guardan directamente en DynamoDB

**Flujo real:**
1. Usuario se registra en Cognito
2. Cognito genera JWT token con claims (email, grupos, etc.)
3. Frontend envía JWT en header `Authorization: Bearer {token}`
4. API Gateway valida JWT contra Cognito
5. Lambda extrae `user_id` del JWT: `email = claims['email']`
6. Lambda guarda datos en DynamoDB (si aplica)

**Código de extracción:**
```python
def extract_user_id(event):
    if 'requestContext' in event and 'authorizer' in event['requestContext']:
        claims = event['requestContext']['authorizer']['claims']
        email = claims.get('email')
        if email:
            return email
    
    # Si no está autenticado, genera ID anónimo
    source_ip = event.get('requestContext', {}).get('identity', {}).get('sourceIp', 'unknown')
    return f"anon_{source_ip}"
```

### 7. Datos de Usuario - Qué se Guarda

**En Cognito (gestiona Cognito):**
- Email
- Nombre
- Contraseña (hash bcrypt)
- Atributos personalizados
- Grupos de permisos (Admins, Premium)

**En DynamoDB - UserProgress:**
- Secciones completadas
- Scores de checkpoints
- Total de preguntas realizadas
- Pistas utilizadas
- Tiempo promedio por sección
- Timestamps: started_at, last_accessed_at, completed_at

**En DynamoDB - TutorSessions:**
- Preguntas formuladas por usuario
- Respuestas del tutor (de Claude)
- Tipo de respuesta (free, checkpoint, hint)
- Tokens consumidos
- Latencia de respuesta
- Timestamp de la conversación

**En DynamoDB - UserUsage:**
- Contador de preguntas hoy
- Contador de checkpoints hoy
- Contador de pistas hoy
- TTL para limpieza automática

### 8. Estructura de Tablas Actual

| Tabla | Propósito | PK | SK | TTL | Tamaño Est. |
|-------|-----------|----|----|-----|-------------|
| CourseCatalog | Metadata de cursos | COURSE#{id} | METADATA/SECTION#{id} | No | ~12 MB |
| UserProgress | Progreso de usuarios | USER#{email} | COURSE#{id} | No | ~1 KB/usuario-curso |
| TutorSessions | Historial conversaciones | SESSION#{id} | TIMESTAMP#{ts} | 30 días | ~500 B/sesión |
| UserUsage | Rate limiting | user_id | period | 7 días | ~200 B/registro |

## Archivos Locales

Ubicación: `/Users/matiasmartinez/Documents/repos/cloudacademy-tutor-backend/`

- `CLOUDACADEMY_BACKEND_ANALYSIS.md` - Análisis técnico completo (26 KB)
- `CLOUDACADEMY_VISUAL_SUMMARY.txt` - Resumen visual (20 KB)
- `ANALYSIS_INDEX.md` - Este archivo

## Endpoints del API

### Públicos (sin autenticación)
```
GET  /api/stats
GET  /api/courses
GET  /api/courses/{id}
GET  /api/courses/{id}/sections/{sectionId}
```

### Autenticados (JWT válido)
```
POST /api/tutor/ask
POST /api/tutor/validate
GET  /api/tutor/hint
GET  /api/tutor/progress
```

### Admin (JWT + grupo "Admins")
```
POST   /api/admin/courses
PUT    /api/admin/courses/{id}
DELETE /api/admin/courses/{id}
POST   /api/admin/sections
PUT    /api/admin/sections/{id}
DELETE /api/admin/sections/{id}
```

## Rate Limits

**Anónimos:**
- 1 pregunta TOTAL (sin más límites)
- Sin checkpoints, sin pistas

**Autenticados:**
- 50 preguntas/día
- 10 preguntas/hora
- 20 checkpoints/día
- 15 pistas/día
- 5 intentos por checkpoint por sección

**Premium:**
- 200 preguntas/día
- 50 preguntas/hora
- 100 checkpoints/día
- 50 pistas/día
- 10 intentos por checkpoint por sección

## Costos Estimados (100 usuarios activos/mes)

| Servicio | Costo |
|----------|-------|
| DynamoDB | ~$1.38/mes |
| Lambda | ~$5.20/mes |
| API Gateway | ~$0.35/mes |
| Bedrock (Claude) | ~$67.50/mes |
| S3 | ~$1.12/mes |
| Otros | ~$0.02/mes |
| **TOTAL** | **~$75.57/mes** |

Costo por usuario: ~$0.76/mes

## Status del Proyecto

**Completado: 90% (8.35 de 9 fases)**

✅ FASE 1-8 Parte 1: Completadas
⏳ FASE 8 Parte 2-3: Pendientes

**Infraestructura:** 100% Completa y Operativa
**Backend:** 100% Completo y Funcional
**Documentación:** 100% Completa

## Cómo Usar Este Análisis

1. **Para una visión rápida:** Lee `CLOUDACADEMY_VISUAL_SUMMARY.txt`
2. **Para detalles técnicos:** Lee `CLOUDACADEMY_BACKEND_ANALYSIS.md`
3. **Para búsquedas específicas:** Usa Ctrl+F en cualquiera de los documentos
4. **Para preguntas sobre:** Consulta la sección correspondiente en este INDEX

## Términos Clave

- **PK/SK:** Partition Key / Sort Key (en DynamoDB)
- **GSI:** Global Secondary Index
- **TTL:** Time to Live (para auto-delete)
- **JWT:** JSON Web Token
- **Cognito:** AWS Identity and Access Management
- **Bedrock:** AWS AI/ML service (usamos Claude)
- **Lambda:** AWS Serverless Computing
- **IaC:** Infrastructure as Code (Terraform)

## Referencias

- README.md - Descripción general del proyecto
- docs/ARCHITECTURE.md - Documento maestro de arquitectura
- docs/COGNITO_CONFIG.md - Configuración de Cognito
- FASE_1-8_COMPLETADA.md - Historial de implementación

---

**Análisis completado:** 6 de noviembre, 2025
**Duración:** Análisis exhaustivo del repositorio
**Archivos:** 2 documentos generados (46 KB total)

