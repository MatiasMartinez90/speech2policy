# ANÁLISIS EXHAUSTIVO: CloudAcademy Tutor IA Backend

**Fecha del análisis:** 2025-11-06
**Repositorio:** `/Users/matiasmartinez/Documents/repos/cloudacademy-tutor-backend`
**Status:** Proyecto completado al 90% (8.35 fases de 9 fases)

---

## CONCLUSIÓN IMPORTANTE: NO USA POSTGRESQL

**PostgreSQL: NO está configurado**
- NO existe integración con RDS/PostgreSQL
- NO hay migraciones de base de datos
- NO hay Lambda que guarde usuarios en PostgreSQL

**Base de datos utilizada: DYNAMODB (exclusivamente)**
- 4 tablas DynamoDB: CourseCatalog, UserProgress, TutorSessions, UserUsage
- On-Demand pricing (sin costo de servidores)
- Encriptación por defecto AWS-managed
- TTL habilitado para limpiar datos automáticamente

---

## 1. ESTRUCTURA GENERAL DEL PROYECTO

### Framework y Lenguaje
- **Backend:** AWS Lambda (Python 3.11)
- **API:** API Gateway REST
- **IaC:** Terraform (HCL)
- **Autenticación:** AWS Cognito User Pools

### Organización del Código

```
cloudacademy-tutor-backend/
├── lambdas/                          # 6 funciones Lambda
│   ├── tutor-handler/                # Tutor IA principal (467 líneas)
│   │   ├── lambda_function.py
│   │   ├── utils/
│   │   │   ├── bedrock_client.py     # Cliente para Claude Sonnet
│   │   │   ├── dynamodb_client.py    # Operaciones DynamoDB
│   │   │   ├── rate_limiter.py       # Rate limiting
│   │   │   └── prompt_builder.py     # Construcción de prompts
│   │   └── validators/
│   │       ├── checkpoint_validator.py
│   │       └── content_validator.py
│   │
│   ├── courses-handler/              # Lectura de cursos (424 líneas)
│   ├── progress-handler/             # Progreso de usuarios (232 líneas)
│   ├── admin-handler/                # CRUD de cursos (429 líneas)
│   ├── sections-handler/             # Editor de secciones (518 líneas)
│   └── upload-handler/               # Manejo de S3 presigned URLs (335 líneas)
│
├── terraform/
│   ├── dynamodb.tf                   # 4 tablas DynamoDB
│   ├── lambda.tf                     # Configuración de Lambdas
│   ├── api-gateway.tf                # Rutas y métodos REST
│   ├── iam.tf                        # Roles y políticas IAM
│   ├── s3.tf                         # Bucket para imágenes
│   ├── variables.tf                  # Variables de configuración
│   └── outputs.tf                    # Outputs de Terraform
│
├── scripts/
│   └── seed-course.py                # Script para cargar curso demo
│
└── docs/
    ├── ARCHITECTURE.md               # Documento maestro (completo)
    └── COGNITO_CONFIG.md             # Configuración de Cognito
```

### Total de Código
- **Lambdas:** ~2,405 líneas de Python
- **Terraform:** ~600 líneas de HCL
- **Total:** ~3,000 líneas de código

---

## 2. LAMBDAS EXISTENTES Y SUS FUNCIONES

### Lambda 1: tutor-handler (Principal)
**Archivo:** `/Users/matiasmartinez/Documents/repos/cloudacademy-tutor-backend/lambdas/tutor-handler/lambda_function.py`

**Endpoints:**
- `POST /api/tutor/ask` - Preguntas libres al tutor
- `POST /api/tutor/validate` - Validar respuestas de checkpoints
- `GET /api/tutor/hint` - Solicitar pistas progresivas (3 niveles)

**Funcionalidades:**
- Integración con Amazon Bedrock (Claude Sonnet 3.5 v2)
- Rate limiting basado en usuario
- Almacenamiento de sesiones en DynamoDB
- Validación de contenido

**Variables de entorno:**
```python
COURSES_TABLE = 'CourseCatalog'
SESSIONS_TABLE = 'TutorSessions'
PROGRESS_TABLE = 'UserProgress'
USAGE_TABLE = 'UserUsage'
BEDROCK_MODEL_ID = 'anthropic.claude-3-5-sonnet-20241022-v2:0'
COGNITO_USER_POOL_ID = 'us-east-1_FbLlcvGLl'
```

**Recursos Lambda:**
- Timeout: 60 segundos
- Memory: 512 MB
- Runtime: Python 3.11

---

### Lambda 2: courses-handler
**Archivo:** `/Users/matiasmartinez/Documents/repos/cloudacademy-tutor-backend/lambdas/courses-handler/lambda_function.py`

**Endpoints:**
- `GET /api/stats` - Estadísticas globales del catálogo
- `GET /api/courses` - Listar todos los cursos
- `GET /api/courses/{id}` - Detalle de un curso
- `GET /api/courses/{id}/sections/{sectionId}` - Contenido de una sección

**Acceso:** Público (sin autenticación requerida)

**Recursos Lambda:**
- Timeout: 30 segundos
- Memory: 256 MB

---

### Lambda 3: progress-handler
**Archivo:** `/Users/matiasmartinez/Documents/repos/cloudacademy-tutor-backend/lambdas/progress-handler/lambda_function.py`

**Endpoints:**
- `GET /api/tutor/progress?course_id=X` - Obtener progreso del usuario

**Autenticación:** Requiere JWT válido (Cognito)

**Recursos Lambda:**
- Timeout: 30 segundos
- Memory: 256 MB

---

### Lambda 4: admin-handler
**Archivo:** `/Users/matiasmartinez/Documents/repos/cloudacademy-tutor-backend/lambdas/admin-handler/lambda_function.py`

**Endpoints:**
- `POST /api/admin/courses` - Crear curso
- `PUT /api/admin/courses/{id}` - Actualizar curso
- `DELETE /api/admin/courses/{id}` - Eliminar curso

**Autenticación:** Requiere grupo Cognito "Admins"

**Validaciones:**
- Extrae user_id de contexto Cognito
- Verifica pertenencia al grupo "Admins"
- Retorna 403 Forbidden si no es admin

**Recursos Lambda:**
- Timeout: 30 segundos
- Memory: 256 MB

---

### Lambda 5: sections-handler
**Archivo:** `/Users/matiasmartinez/Documents/repos/cloudacademy-tutor-backend/lambdas/sections-handler/lambda_function.py`

**Endpoints:**
- `POST /api/admin/sections` - Crear sección
- `PUT /api/admin/sections/{id}` - Actualizar sección
- `GET /api/admin/sections/{courseId}` - Listar secciones de un curso
- `DELETE /api/admin/sections/{id}` - Eliminar sección

**Recursos Lambda:**
- Timeout: 30 segundos
- Memory: 256 MB

---

### Lambda 6: upload-handler
**Archivo:** `/Users/matiasmartinez/Documents/repos/cloudacademy-tutor-backend/lambdas/upload-handler/lambda_function.py`

**Funcionalidad:**
- Genera presigned URLs para upload de imágenes a S3
- Verifica permisos de admin en Cognito

**Recursos Lambda:**
- Timeout: 30 segundos
- Memory: 256 MB

---

## 3. CONFIGURACIÓN DE BASE DE DATOS: DYNAMODB

**Importante:** NO usa PostgreSQL. USA DYNAMODB exclusivamente.

### Archivo de configuración
`/Users/matiasmartinez/Documents/repos/cloudacademy-tutor-backend/terraform/dynamodb.tf`

### Tabla 1: CourseCatalog
**Purpose:** Almacenar metadata de cursos y contenido de secciones

**Estructura de claves:**
```
PK: COURSE#{course_id}         (Partition Key)
SK: METADATA | SECTION#{sectionId}  (Sort Key)
```

**Patrón de acceso 1 - Metadata del Curso:**
```python
{
  PK: "COURSE#image-gen-bedrock",
  SK: "METADATA",
  
  # Identificación
  course_id: "image-gen-bedrock",
  course_name: "Generador de Imágenes con IA en AWS",
  course_description: "Construye un API serverless...",
  course_image: "https://cloudacademy-assets.s3.amazonaws.com/courses/...",
  
  # Categorización
  category: "AWS & AI",
  difficulty: "intermediate",
  tags: ["AWS", "Bedrock", "Lambda", "API Gateway", "S3", "IA", "Python"],
  estimated_duration_minutes: 60,
  
  # Configuración
  is_linear: true,              # Progreso lineal
  total_sections: 6,
  
  # Tutor IA
  tutor_personality: {
    style: "amigable y motivador",
    use_emojis: true,
    emoji_frequency: "moderado",
    tone: "pedagógico pero directo"
  },
  
  # Contexto del proyecto
  project_description: "API serverless que genera imágenes...",
  project_goal: "Al final tendrás un API funcional",
  technologies: ["API Gateway", "Lambda", "Amazon Bedrock", "S3", "Python"],
  
  # Errores comunes
  common_errors: [
    {
      error_code: "ERR_001",
      error: "KeyError: 'prompt'",
      cause: "Lambda Proxy Integration deshabilitado",
      solution: "Habilitar 'Use Lambda Proxy Integration'",
      section_id: 4,
      difficulty: "common"
    },
    ...
  ],
  
  # Metadata administrativa
  published: true,
  version: "1.0",
  created_at: "2025-10-30T00:00:00Z",
  updated_at: "2025-10-30T00:00:00Z",
  created_by: "admin@cloudacademy.ar",
  
  # Estadísticas
  student_count: 127,
  average_rating: 4.9,
  completion_rate: 0.73
}
```

**Patrón de acceso 2 - Contenido de Sección:**
```python
{
  PK: "COURSE#image-gen-bedrock",
  SK: "SECTION#0",
  
  section_id: 0,
  title: "Introducción",
  subtitle: "¿Qué vamos a construir?",
  icon: "🚀",
  color_gradient: "from-purple-500 to-purple-600",
  
  # Contenido detallado
  content: {
    introduction: "...",
    key_concepts: ["...", "..."],
    steps: [
      {
        step_id: 0,
        title: "...",
        description: "...",
        code_snippet: "..."
      }
    ]
  },
  
  # Validación de progreso
  checkpoint: {
    type: "multiple_choice" | "code_review" | "essay",
    question: "...",
    correct_answer: "..."
  },
  
  # Pistas progresivas
  hints: [
    { level: 1, text: "Pista básica" },
    { level: 2, text: "Pista intermedia" },
    { level: 3, text: "Solución parcial" }
  ]
}
```

**Configuración Terraform:**
```terraform
resource "aws_dynamodb_table" "courses_catalog" {
  name         = "CourseCatalog"
  billing_mode = "PAY_PER_REQUEST"  # On-Demand
  hash_key     = "PK"
  range_key    = "SK"
  
  point_in_time_recovery {
    enabled = true
  }
  
  server_side_encryption {
    enabled = true  # Usa AWS-managed key
  }
}
```

---

### Tabla 2: UserProgress
**Purpose:** Tracking de progreso individual por usuario y curso

**Estructura de claves:**
```
PK: USER#{email}              (Partition Key)
SK: COURSE#{course_id}        (Sort Key)
```

**GSI (Global Secondary Index):**
```
GSI Name: course_id-index
Hash Key: course_id
Purpose: Queries por curso (obtener todos los usuarios)
```

**Estructura de datos:**
```python
{
  PK: "USER#maria@example.com",
  SK: "COURSE#image-gen-bedrock",
  
  user_email: "maria@example.com",
  course_id: "image-gen-bedrock",
  
  # Progreso
  current_section_id: 2,
  sections_completed: [0, 1],
  
  # Scores de checkpoints
  checkpoint_scores: {
    0: { score: 100, attempts: 1, timestamp: "2025-11-01T10:30:00Z" },
    1: { score: 85, attempts: 2, timestamp: "2025-11-01T11:15:00Z" }
  },
  
  # Estadísticas
  total_questions_asked: 15,
  total_hints_used: 3,
  average_section_completion_time_minutes: 45,
  
  # Timestamps
  started_at: "2025-11-01T08:00:00Z",
  last_accessed_at: "2025-11-06T14:30:00Z",
  completed_at: null  # null si aún no completó
}
```

**Configuración Terraform:**
```terraform
resource "aws_dynamodb_table" "user_progress" {
  name         = "UserProgress"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"
  
  global_secondary_index {
    name            = "course_id-index"
    hash_key        = "course_id"
    projection_type = "ALL"
  }
}
```

---

### Tabla 3: TutorSessions
**Purpose:** Historial de conversaciones del tutor IA

**Estructura de claves:**
```
PK: SESSION#{session_id}           (Partition Key)
SK: TIMESTAMP#{iso_timestamp}      (Sort Key)
```

**TTL:** 30 días (auto-delete)

**Estructura de datos:**
```python
{
  PK: "SESSION#maria@example.com#s123",
  SK: "TIMESTAMP#2025-11-06T14:30:00Z",
  
  session_id: "maria@example.com#s123",
  user_email: "maria@example.com",
  course_id: "image-gen-bedrock",
  section_id: 2,
  
  # Conversación
  user_question: "¿Cómo configuro el bucket de S3?",
  ai_response: "Para configurar S3...",
  response_type: "free_question" | "checkpoint_validation" | "hint",
  
  # Metadata de la respuesta
  tokens_used: 142,
  latency_ms: 1200,
  
  # TTL (auto-delete después de 30 días)
  ttl: 1730534400,
  
  timestamp: "2025-11-06T14:30:00Z"
}
```

**Configuración Terraform:**
```terraform
resource "aws_dynamodb_table" "tutor_sessions" {
  name         = "TutorSessions"
  billing_mode = "PAY_PER_REQUEST"
  
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
}
```

---

### Tabla 4: UserUsage
**Purpose:** Rate limiting y tracking de uso por usuario

**Estructura de claves:**
```
PK: user_id                   (Email o anon_IP) (Partition Key)
SK: period                    (YYYY-MM-DD-HH o YYYY-MM-DD o TOTAL)
```

**TTL:** 7 días (excepto registros con period="TOTAL")

**Estructura de datos:**
```python
{
  user_id: "maria@example.com",
  period: "2025-11-06",        # Día específico
  
  # Contadores
  questions_today: 12,
  checkpoints_today: 5,
  hints_today: 2,
  
  # Límites por tipo de usuario
  # Usuario autenticado: 50 preguntas/día
  # Usuario anónimo: 1 pregunta total
  
  ttl: 1730880000,             # Auto-delete después de 7 días
  
  timestamp: "2025-11-06T14:30:00Z"
}
```

**Rate Limits por tipo de usuario:**

**Usuarios Anónimos:**
```
total_questions: 1             # Solo 1 pregunta TOTAL
questions_per_day: 1
questions_per_hour: 1
checkpoints_per_day: 0
hints_per_day: 0
Mensaje: "🔒 Has usado tu pregunta gratuita. Regístrate para continuar aprendiendo."
```

**Usuarios Autenticados (login regular):**
```
total_questions: null          # Sin límite total
questions_per_day: 50
questions_per_hour: 10
checkpoints_per_day: 20
hints_per_day: 15
checkpoint_attempts_per_section: 5
Mensaje: "⏰ Has alcanzado tu límite. Espera {reset_time} para continuar."
```

**Usuarios Premium (grupo "Premium"):**
```
total_questions: null
questions_per_day: 200
questions_per_hour: 50
checkpoints_per_day: 100
hints_per_day: 50
checkpoint_attempts_per_section: 10
```

---

### Resumen DynamoDB

| Tabla | Propósito | PK | SK | TTL | Tamaño Estimado |
|-------|-----------|----|----|-----|-----------------|
| CourseCatalog | Metadata de cursos | COURSE#{id} | METADATA/SECTION#{id} | No | ~2 MB (metadata) + ~10 MB (secciones) |
| UserProgress | Progreso de usuarios | USER#{email} | COURSE#{id} | No | ~1 KB por usuario-curso |
| TutorSessions | Historial conversaciones | SESSION#{id} | TIMESTAMP#{ts} | 30 días | ~500 B por sesión |
| UserUsage | Rate limiting | user_id | period | 7 días | ~200 B por registro |

**Costos estimados (on-demand):**
- Para 100 usuarios activos/mes: ~$1.38/mes
- Escrituras: ~$0.69 por millón
- Lecturas: ~$0.14 por millón

---

## 4. CONFIGURACIÓN DE DYNAMODB (RESPUESTA DETALLADA)

**¿Ya existe DynamoDB? SÍ, está completamente configurado y desplegado**

**Status:** 4 tablas creadas y operativas

**Cómo se creó:**
- Mediante Terraform en `/terraform/dynamodb.tf`
- Configuración como código (IaC)
- Deployed en AWS account: 982081083386

**Características de seguridad:**
1. **Encriptación:** AWS-managed encryption (SSE-256)
2. **Backups:** Point-in-time recovery habilitado
3. **TTL:** Limpeza automática de datos antiguos (TutorSessions: 30 días, UserUsage: 7 días)
4. **Billing:** On-Demand (pagas solo por lo que usas)

**Cómo acceden los Lambdas:**
- Mediante boto3 (`dynamodb = boto3.resource('dynamodb')`)
- IAM roles permiten operaciones: GetItem, PutItem, UpdateItem, Query, Scan
- Variables de entorno con nombres de tablas

**Cómo verificar que está funcionando:**
```bash
# Listar tablas
aws dynamodb list-tables --region us-east-1

# Ver metadata de una tabla
aws dynamodb describe-table --table-name CourseCatalog --region us-east-1

# Consultar un item
aws dynamodb get-item \
  --table-name CourseCatalog \
  --key '{"PK":{"S":"COURSE#image-gen-bedrock"},"SK":{"S":"METADATA"}}' \
  --region us-east-1
```

---

## 5. AUTENTICACIÓN Y COGNITO TRIGGERS

### Configuración de Cognito
**Archivo:** `/Users/matiasmartinez/Documents/repos/cloudacademy-tutor-backend/docs/COGNITO_CONFIG.md`

**User Pool existente (reutilizado del frontend):**
```
User Pool ID:       us-east-1_FbLlcvGLl
User Pool ARN:      arn:aws:cognito-idp:us-east-1:982081083386:userpool/us-east-1_FbLlcvGLl
Client ID:          7k692bp886on11hdqfroo2pp44
Domain:             cloudacademy-prod-auth-w0porj9z
Region:             us-east-1
```

**Grupos Cognito configurados:**
1. **Admins** - Acceso completo al panel admin
   - Usuarios: matias.martinez90@gmail.com
2. **Premium** - Límites extendidos
3. **us-east-1_FbLlcvGLl_Google** - Usuarios con Google OAuth

**Proveedores de identidad:**
- ✅ Google OAuth (configurado)
- Callback URL: `https://cloudacademy-prod-auth-w0porj9z.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`

### ¿HAY UN TRIGGER DE COGNITO PARA GUARDAR USUARIOS EN POSTGRESQL?

**RESPUESTA: NO**

**Razón:** El proyecto NO usa PostgreSQL. Usa DynamoDB exclusivamente.

**¿Cómo se manejan los usuarios entonces?**

1. **Al registrarse en Cognito:**
   - Usuario se crea en Cognito User Pool
   - Cognito almacena: email, nombre, contraseña (hash), atributos personalizados
   - NO hay trigger de Lambda para sincronizar con base de datos

2. **Cuando el usuario accede a la API:**
   - El Lambda extrae `user_id` del JWT token de Cognito
   - El JWT contiene: email, grupos (cognito:groups), claims personalizados
   - Este user_id se usa como PK en DynamoDB (USER#{email})

3. **Progreso del usuario:**
   - Se guarda directamente en tabla UserProgress de DynamoDB
   - Se crea automáticamente al primer acceso
   - No requiere sincronización con otra BD

### Cómo extrae el Lambda el user_id del JWT

**Código en tutor-handler:**
```python
def extract_user_id(event):
    """
    Extrae el user_id del contexto de Cognito o genera ID anónimo
    """
    try:
        # El Authorizer de API Gateway agrega claims al requestContext
        if 'requestContext' in event and 'authorizer' in event['requestContext']:
            claims = event['requestContext']['authorizer']['claims']
            
            # Obtener email (stored en 'email' claim del JWT)
            email = claims.get('email')
            if email:
                return email  # user_id = email
        
        # Si no está autenticado, genera ID anónimo
        source_ip = event.get('requestContext', {}).get('identity', {}).get('sourceIp', 'unknown')
        return f"anon_{source_ip}"
        
    except Exception as e:
        logger.error(f"Error extracting user_id: {str(e)}")
        return None
```

### Cómo verifica permisos de Admin

**Código en admin-handler:**
```python
def get_user_groups(event):
    """
    Extrae los grupos Cognito del JWT token
    
    Returns:
        list: ['Admins', 'Premium', ...]
    """
    if 'requestContext' in event and 'authorizer' in event['requestContext']:
        claims = event['requestContext']['authorizer']['claims']
        
        # Obtener grupos (viene como string separado por comas)
        groups_str = claims.get('cognito:groups', '')
        
        if groups_str:
            return groups_str.split(',')
    
    return []

def is_admin(event):
    groups = get_user_groups(event)
    return 'Admins' in groups
```

### API Gateway Authorizer

**Configuración Terraform:**
```terraform
resource "aws_api_gateway_authorizer" "cognito" {
  name            = "CognitoAuthorizer"
  rest_api_id     = aws_api_gateway_rest_api.tutor_api.id
  type            = "COGNITO_USER_POOLS"
  provider_arns   = [var.cognito_user_pool_arn]
  identity_source = "method.request.header.Authorization"
}
```

**Cómo funciona:**
1. Client envía JWT en header `Authorization: Bearer {token}`
2. API Gateway valida el token contra Cognito
3. Si es válido, agrega `requestContext.authorizer.claims` al evento de Lambda
4. Si es inválido, retorna 401 Unauthorized

### Endpoints protegidos vs públicos

**PÚBLICO (sin autenticación):**
- GET `/api/stats` - Estadísticas globales
- GET `/api/courses` - Listar cursos
- GET `/api/courses/{id}` - Detalle de curso
- GET `/api/courses/{id}/sections/{sectionId}` - Sección específica

**PROTEGIDO (requiere JWT + autenticado):**
- POST `/api/tutor/ask` - Preguntas al tutor
- POST `/api/tutor/validate` - Validar checkpoints
- GET `/api/tutor/hint` - Pistas progresivas
- GET `/api/tutor/progress` - Ver progreso personal

**ADMIN (requiere JWT + grupo "Admins"):**
- POST `/api/admin/courses` - Crear curso
- PUT `/api/admin/courses/{id}` - Editar curso
- DELETE `/api/admin/courses/{id}` - Eliminar curso
- POST `/api/admin/sections` - Crear sección
- PUT `/api/admin/sections/{id}` - Editar sección
- DELETE `/api/admin/sections/{id}` - Eliminar sección

---

## 6. INFRAESTRUCTURA COMO CÓDIGO (TERRAFORM)

### Estructura de archivos

**Archivo:** `/Users/matiasmartinez/Documents/repos/cloudacademy-tutor-backend/terraform/`

```
terraform/
├── provider.tf               # AWS provider configuration
├── variables.tf              # Variables de configuración (69 líneas)
├── dynamodb.tf              # 4 tablas DynamoDB (197 líneas)
├── lambda.tf                # 6 funciones Lambda (323 líneas)
├── api-gateway.tf           # REST API y endpoints (1,200+ líneas)
├── iam.tf                   # Roles y políticas (291 líneas)
├── s3.tf                    # S3 bucket para imágenes (183 líneas)
├── outputs.tf               # Outputs (109 líneas)
├── .terraform/              # Directorio de Terraform
├── terraform.tfstate        # Estado actual de infraestructura
├── terraform.tfstate.backup # Backup del estado
└── tfplan                   # Plan guardado para auditoría
```

### Principales recursos Terraform

**Total de recursos definidos:** ~50+ recursos AWS

**Desglose:**
- 4 tablas DynamoDB
- 6 funciones Lambda
- 6 IAM roles
- 15+ IAM policies
- 1 S3 bucket
- 1 API Gateway REST API
- 1 Cognito Authorizer
- ~25+ recursos API Gateway (resources, methods, integrations)
- 6 CloudWatch Log Groups

### Cómo desplegar

```bash
# 1. Inicializar Terraform
cd terraform
terraform init

# 2. Ver plan de cambios
terraform plan

# 3. Aplicar cambios
terraform apply

# 4. Ver outputs
terraform output

# 5. Para futuras actualizaciones
terraform plan -out=tfplan
terraform apply tfplan
```

### Variables de configuración clave

**Archivo:** `variables.tf`

```terraform
variable "aws_region" {
  default = "us-east-1"
}

variable "cognito_user_pool_arn" {
  default = "arn:aws:cognito-idp:us-east-1:982081083386:userpool/us-east-1_FbLlcvGLl"
}

variable "cognito_user_pool_id" {
  default = "us-east-1_FbLlcvGLl"
}

variable "bedrock_model_id" {
  default = "anthropic.claude-3-5-sonnet-20241022-v2:0"
}
```

---

## 7. RESUMEN: ¿DÓNDE ESTÁ LA LAMBDA QUE GUARDA EN POSTGRESQL?

### RESPUESTA DIRECTA

**NO EXISTE una Lambda que guarde usuarios en PostgreSQL**

### Razones:

1. **PostgreSQL NO está configurado**
   - No hay RDS instance
   - No hay connection strings
   - No hay migraciones

2. **Se usa DynamoDB en su lugar**
   - Más barato (on-demand pricing)
   - Serverless (sin servidores que gestionar)
   - Escalable automáticamente
   - Cumple perfectamente con los requisitos

3. **El flujo de datos es:**
   ```
   Usuario → Cognito → JWT Token → Lambda
                              ↓
                       DynamoDB (UserProgress)
   ```

4. **Los datos se guardan en:**
   - **Cognito:** Email, contraseña, atributos de usuario (gestiona Cognito)
   - **DynamoDB UserProgress:** Progreso del usuario en cursos (guarda Lambda)
   - **DynamoDB TutorSessions:** Historial de conversaciones (guarda Lambda)
   - **DynamoDB UserUsage:** Rate limiting (guarda Lambda)

### ¿Qué datos de usuario se guardan?

**En Cognito (gestión de identidad):**
- Email
- Nombre
- Contraseña (hash)
- Atributos personalizados
- Grupo de permisos (Admins, Premium, etc.)

**En DynamoDB UserProgress (progreso académico):**
- Secciones completadas
- Scores de checkpoints
- Preguntas totales realizadas
- Pistas utilizadas
- Tiempo en cada sección

**En DynamoDB TutorSessions (historial):**
- Preguntas formuladas
- Respuestas del tutor
- Tokens consumidos
- Latencia de respuesta

---

## 8. TABLA COMPARATIVA: ESTRUCTURA ACTUAL

| Componente | Implementado | Ubicación | Status |
|------------|--------------|-----------|--------|
| **Backend Framework** | AWS Lambda + Python 3.11 | lambdas/ | ✅ Completo |
| **Base de Datos** | DynamoDB (4 tablas) | terraform/dynamodb.tf | ✅ Completo |
| **API** | API Gateway REST | terraform/api-gateway.tf | ✅ Completo |
| **Autenticación** | Cognito User Pools | docs/COGNITO_CONFIG.md | ✅ Completo |
| **IA** | Amazon Bedrock (Claude) | lambdas/tutor-handler/ | ✅ Completo |
| **Storage** | S3 (imágenes) | terraform/s3.tf | ✅ Completo |
| **IaC** | Terraform | terraform/ | ✅ Completo |
| **PostgreSQL** | NO EXISTE | - | ❌ No aplica |
| **Lambda Trigger Cognito** | NO EXISTE | - | ❌ No necesario |

---

## 9. ENDPOINTS DEL API (RESUMEN)

### Públicos (GET)
```
GET  /api/stats
GET  /api/courses
GET  /api/courses/{id}
GET  /api/courses/{id}/sections/{sectionId}
```

### Autenticados (POST/GET)
```
POST /api/tutor/ask
POST /api/tutor/validate
GET  /api/tutor/hint
GET  /api/tutor/progress
```

### Admin (POST/PUT/DELETE)
```
POST   /api/admin/courses
PUT    /api/admin/courses/{id}
DELETE /api/admin/courses/{id}
POST   /api/admin/sections
PUT    /api/admin/sections/{id}
DELETE /api/admin/sections/{id}
```

---

## 10. CÓMO VERIFICAR LA INFRAESTRUCTURA

```bash
# Ver tablas DynamoDB creadas
aws dynamodb list-tables --region us-east-1

# Ver funciones Lambda
aws lambda list-functions --region us-east-1 | grep cloudacademy

# Ver API Gateway
aws apigateway get-rest-apis --region us-east-1 | grep cloudacademy

# Ver status de Cognito
aws cognito-idp describe-user-pool \
  --user-pool-id us-east-1_FbLlcvGLl \
  --region us-east-1

# Ver S3 bucket
aws s3 ls | grep cloudacademy-course-images
```

---

## CONCLUSIÓN

Este es un **backend completamente serverless** que:

1. ✅ **No usa PostgreSQL** - Usa DynamoDB
2. ✅ **No tiene triggers de Cognito** - Los datos se sincronizan mediante extracción de JWT
3. ✅ **Está completamente desplegado** - Infraestructura operativa en AWS
4. ✅ **Es escalable** - DynamoDB on-demand escala automáticamente
5. ✅ **Es económico** - Pagas solo por lo que usas
6. ✅ **Es seguro** - Cognito + IAM + Encriptación AWS-managed

El modelo de datos está bien diseñado para las necesidades del proyecto:
- Metadata de cursos: CourseCatalog
- Progreso de usuarios: UserProgress
- Historial de conversaciones: TutorSessions
- Rate limiting: UserUsage

