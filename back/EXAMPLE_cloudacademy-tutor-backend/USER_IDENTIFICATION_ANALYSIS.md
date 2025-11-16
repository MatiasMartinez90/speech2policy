# Análisis Completo: Identificación y Gestión de Usuarios en CloudAcademy Backend

## Resumen Ejecutivo

El backend de CloudAcademy utiliza **AWS Cognito** como sistema de autenticación y extrae la identidad del usuario del JWT token proporcionado por API Gateway en el contexto `event.requestContext.authorizer.claims`.

Existen **dos estrategias distintas** de identificación según el tipo de endpoint:
1. **Tutor y Progress handlers**: Usan `email` del claim
2. **Admin, Sections, Upload handlers**: Usan `cognito:username` del claim

---

## 1. CÓMO IDENTIFICA USUARIOS

### 1.1 Flujo de Autenticación

```
Usuario (Frontend) 
  → Cognito Login (Google OAuth)
  → Obtiene JWT Token (ID Token)
  → Envía en Header: Authorization: Bearer <JWT>
  → API Gateway Authorizer valida JWT
  → Extrae claims del token
  → Pasa claims en event.requestContext.authorizer.claims
  → Lambda recibe claims
```

### 1.2 Extracción del JWT/Claims

**Localización en código:**
```python
claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
```

**Ubicaciones donde se usa:**
- `/lambdas/tutor-handler/lambda_function.py` (línea 106)
- `/lambdas/progress-handler/lambda_function.py` (línea 82)
- `/lambdas/sections-handler/lambda_function.py` (línea 106)
- `/lambdas/upload-handler/lambda_function.py` (línea 98)
- `/lambdas/admin-handler/lambda_function.py` (línea 99)

### 1.3 Métodos de Identificación por Tipo de Handler

#### A) Tutor Handler (tutor-handler)
```python
def extract_user_id(event):
    claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
    email = claims.get('email')  # ← Usa 'email'
    
    if email:
        return email
    
    # Fallback para usuarios anónimos
    source_ip = event.get('requestContext', {}).get('identity', {}).get('sourceIp', 'unknown')
    return f"anon_{source_ip}"
```

**User ID: `email` (ej: user@example.com)**

#### B) Progress Handler (progress-handler)
```python
def extract_user_id(event):
    claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
    email = claims.get('email')  # ← Usa 'email'
    
    if email:
        return email
    
    source_ip = event.get('requestContext', {}).get('identity', {}).get('sourceIp', 'unknown')
    return f"anon_{source_ip}"
```

**User ID: `email` (ej: user@example.com)**

#### C) Admin Handler (admin-handler)
```python
def extract_user_id(event):
    claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
    
    # IMPORTANTE: Usar 'cognito:username' en lugar de 'email'
    # Para usuarios de Google OAuth, el username es algo como "Google_111137626603562904354"
    # mientras que el email es "user@example.com"
    # Cognito requiere el username para admin_list_groups_for_user
    username = claims.get('cognito:username')  # ← Usa 'cognito:username'
    
    if username:
        return username
    
    source_ip = event.get('requestContext', {}).get('identity', {}).get('sourceIp', 'unknown')
    return f"anon_{source_ip}"
```

**User ID: `cognito:username` (ej: Google_111137626603562904354)**

#### D) Sections Handler (sections-handler)
```python
def extract_user_id(event):
    claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
    
    # IMPORTANTE: Usar 'cognito:username' en lugar de 'email'
    username = claims.get('cognito:username')  # ← Usa 'cognito:username'
    
    if username:
        return username
    
    source_ip = event.get('requestContext', {}).get('identity', {}).get('sourceIp', 'unknown')
    return f"anon_{source_ip}"
```

**User ID: `cognito:username` (ej: Google_111137626603562904354)**

#### E) Upload Handler (upload-handler)
```python
def extract_user_id(event):
    claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
    
    # IMPORTANTE: Usar 'cognito:username' en lugar de 'email'
    username = claims.get('cognito:username')  # ← Usa 'cognito:username'
    
    if username:
        return username
    
    source_ip = event.get('requestContext', {}).get('identity', {}).get('sourceIp', 'unknown')
    return f"anon_{source_ip}"
```

**User ID: `cognito:username` (ej: Google_111137626603562904354)**

### 1.4 Claims Disponibles en Cognito

Los claims extraídos del JWT incluyen:
- `email` - Email del usuario (ej: user@example.com)
- `cognito:username` - Username único de Cognito (ej: Google_111137626603562904354)
- `sub` - Subject claim (no se usa actualmente)
- `aud` - Audience claim
- `iss` - Issuer claim
- Otros claims estándar de OpenID Connect

---

## 2. QUÉS CAMPOS DE USUARIO NECESITA/USA

### 2.1 Campos Actualmente Usados

| Campo | Tipo | Fuente | Usado en |
|-------|------|--------|----------|
| `email` | string | claim | tutor-handler, progress-handler |
| `cognito:username` | string | claim | admin-handler, sections-handler, upload-handler |
| `sourceIp` | string | requestContext.identity | usuarios anónimos |
| `groups` | array | admin_list_groups_for_user | Verificar grupo "Admins" |

### 2.2 Campos NO Actualmente Usados (Pero Disponibles en Cognito)

- `name` - Nombre completo del usuario
- `picture` - URL de foto de perfil
- `given_name` - Nombre
- `family_name` - Apellido
- `phone_number` - Teléfono
- `phone_number_verified` - Verificación de teléfono
- `email_verified` - Verificación de email
- `locale` - Localización
- `updated_at` - Timestamp de última actualización
- `sub` - Subject identificador único en Cognito

### 2.3 Atributos Específicos de Google OAuth (en Cognito)

Cuando el usuario se autentica con Google, Cognito mapea:
```
Google ID → cognito:username (ej: "Google_111137626603562904354")
Google Email → email claim
Google Picture → picture claim (disponible)
Google Name → name claim (disponible)
```

---

## 3. CAMPOS EN USERPROGRESS

### 3.1 Estructura Completa de UserProgress

**Tabla:** `UserProgress`
**Partition Key (PK):** `USER#{email}` (para tutor-handler/progress-handler)
**Sort Key (SK):** `COURSE#{course_id}`

```python
{
    'PK': f'USER#{user_id}',           # ← Identificador del usuario
    'SK': f'COURSE#{course_id}',       # ← Identificador del curso
    'user_id': user_id,                # ← Email o anon_IP (campo duplicado de PK)
    'course_id': course_id,            # ← ID del curso
    
    # Progreso
    'current_section': 0,              # ← Sección actual
    'started_at': timestamp,           # ← Cuando inició el curso
    'last_activity': timestamp,        # ← Última actividad
    
    # Checkpoints
    'checkpoints_completed': {         # ← Diccionario de checkpoints
        '0': {
            'score': Decimal('85.5'),
            'passed': True,
            'completed_at': timestamp,
            'attempts': 2
        },
        '1': {
            'score': Decimal('72.0'),
            'passed': False,
            'completed_at': timestamp,
            'attempts': 1
        }
    },
    'total_checkpoints': 2,            # ← Total de checkpoints hecho
    'checkpoints_passed': 1,           # ← Checkpoints aprobados
    
    # Pistas usadas
    'hints_used': {                    # ← Pistas consultadas por sección
        '0': [1, 2],                   # Usó pistas 1 y 2 de sección 0
        '1': [1]                       # Usó pista 1 de sección 1
    }
}
```

### 3.2 Campos Guardados en UserProgress

| Campo | Descripción | Tipo |
|-------|-------------|------|
| `PK` | Partition key (USER#email) | string |
| `SK` | Sort key (COURSE#course_id) | string |
| `user_id` | Email del usuario | string |
| `course_id` | ID del curso | string |
| `current_section` | Número de sección actual | int |
| `started_at` | Timestamp ISO cuando inició | string |
| `last_activity` | Último timestamp de actividad | string |
| `checkpoints_completed` | Map con resultados de checkpoints | map |
| `total_checkpoints` | Total de checkpoints realizados | int |
| `checkpoints_passed` | Cantidad de checkpoints aprobados | int |
| `hints_used` | Map de pistas usadas por sección | map |

### 3.3 Información del Checkpoint (Dentro de checkpoints_completed)

```python
{
    'score': Decimal('85.5'),      # Score 0-100
    'passed': True,                # Aprobó o no
    'completed_at': timestamp,     # Cuándo se validó
    'attempts': 2                  # Número de intentos
}
```

---

## 4. CAMPOS EN TUTORSESSIONS

### 4.1 Estructura Completa de TutorSessions

**Tabla:** `TutorSessions`
**Partition Key (PK):** `SESSION#{session_id}`
**Sort Key (SK):** `TIMESTAMP#{timestamp}`
**TTL:** 30 días

```python
{
    'PK': f'SESSION#{session_id}',     # ← Identificador de sesión
    'SK': f'TIMESTAMP#{timestamp}',    # ← Ordenamiento por timestamp
    
    # Usuario y contexto
    'user_id': user_id,                # ← Email o anon_IP (para tracking)
    'course_id': course_id,            # ← ID del curso
    'section_id': section_id,          # ← ID de la sección
    
    # Tipo de mensaje
    'message_type': 'question',        # ← 'question' | 'checkpoint' | 'hint'
    
    # Contenido
    'user_message': content,           # ← Pregunta del usuario
    'assistant_response': response,    # ← Respuesta de Claude (opcional)
    
    # Timing
    'timestamp': timestamp,            # ← ISO format timestamp
    'ttl': ttl_epoch                   # ← Unix timestamp para expiración
}
```

### 4.2 Campos Guardados en TutorSessions

| Campo | Descripción | Tipo |
|-------|-------------|------|
| `PK` | Partition key (SESSION#uuid) | string |
| `SK` | Sort key (TIMESTAMP#iso) | string |
| `user_id` | Email o anon_IP | string |
| `course_id` | ID del curso | string |
| `section_id` | ID de la sección | int |
| `message_type` | Tipo de mensaje | string |
| `user_message` | Mensaje del usuario | string |
| `assistant_response` | Respuesta de Claude | string |
| `timestamp` | Timestamp ISO con Z | string |
| `ttl` | Unix epoch para expiración | int |

### 4.3 Datos Generados al Guardar un Mensaje

En `dynamodb_client.save_session_message()`:

```python
timestamp = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
ttl = int((datetime.now(timezone.utc) + timedelta(days=30)).timestamp())

item = {
    'PK': f'SESSION#{session_id}',
    'SK': f'TIMESTAMP#{timestamp}',
    'user_id': user_id,                    # ← Recibe como parámetro
    'course_id': course_id,                # ← Recibe como parámetro
    'section_id': section_id,              # ← Recibe como parámetro
    'message_type': message_type,          # ← 'question'|'checkpoint'|'hint'
    'user_message': content,               # ← Pregunta/respuesta del usuario
    'timestamp': timestamp,
    'ttl': ttl                             # ← Auto-expira después de 30 días
}

if response:
    item['assistant_response'] = response  # ← Respuesta de Claude
```

---

## 5. CAMPOS EN USERUSAGE

### 5.1 Estructura Completa de UserUsage

**Tabla:** `UserUsage`
**Partition Key:** `user_id` (email o anon_IP)
**Sort Key:** `period` (TOTAL, YYYY-MM-DD, YYYY-MM-DD-HH)
**TTL:** 7 días (excepto para periodo TOTAL)

```python
{
    'user_id': user_id,                    # ← Email o anon_IP
    'period': 'YYYY-MM-DD',                # ← TOTAL, YYYY-MM-DD, o YYYY-MM-DD-HH
    
    # Contadores generales
    'count': 42,                           # ← Total de requests en período
    'last_request': timestamp,             # ← Timestamp del último request
    
    # Contadores por tipo de acción
    'question_count': 25,                  # ← Preguntas (POST /api/tutor/ask)
    'checkpoint_count': 10,                # ← Validaciones (POST /api/tutor/validate)
    'hint_count': 7,                       # ← Pistas (GET /api/tutor/hint)
    
    # TTL (solo para periodos diarios/horarios)
    'ttl': ttl_epoch                       # ← Unix epoch, auto-expira después
}
```

### 5.2 Campos Guardados en UserUsage

| Campo | Descripción | Tipo | TTL |
|-------|-------------|------|-----|
| `user_id` | Email o anon_IP | string | N/A |
| `period` | TOTAL, YYYY-MM-DD, o YYYY-MM-DD-HH | string | N/A |
| `count` | Total de requests en período | int | N/A |
| `question_count` | Requests a /api/tutor/ask | int | N/A |
| `checkpoint_count` | Requests a /api/tutor/validate | int | N/A |
| `hint_count` | Requests a /api/tutor/hint | int | N/A |
| `last_request` | Timestamp ISO del último request | string | N/A |
| `ttl` | Unix timestamp para expiración | int | 7 días (excepto TOTAL) |

### 5.3 Períodos Usados

```python
from datetime import datetime, timezone

now = datetime.now(timezone.utc)

# Tres períodos diferentes:
'TOTAL'                           # ← Para límite total (anónimos: 1)
now.strftime('%Y-%m-%d')          # ← Ej: '2025-11-06' (límite diario)
now.strftime('%Y-%m-%d-%H')       # ← Ej: '2025-11-06-14' (límite horario)
```

### 5.4 Incremento de Contadores

Cada vez que `increment_usage()` se llama:

```python
def increment_usage(self, user_id, period, action_type='question'):
    # Por ejemplo, si action_type='question'
    # Se incrementan:
    # - count (contador general)
    # - question_count (contador específico)
    # - last_request (timestamp)
    # - ttl (solo si period != 'TOTAL')
```

### 5.5 Límites Configurados (Rate Limiting)

**En `rate_limiter.py`:**

```python
LIMITS = {
    'anonymous': {
        'total': 1,              # Anónimos: 1 total
        'daily': 1,
        'hourly': 1,
        'checkpoints_daily': 0,  # No pueden validar
        'hints_daily': 0         # No pueden pedir pistas
    },
    'authenticated': {
        'total': None,           # Sin límite
        'daily': 50,             # 50 requests/día
        'hourly': 10,            # 10 requests/hora
        'checkpoints_daily': 20, # 20 validaciones/día
        'hints_daily': 15        # 15 pistas/día
    },
    'premium': {
        'total': None,
        'daily': 200,
        'hourly': 50,
        'checkpoints_daily': 100,
        'hints_daily': 50
    }
}
```

---

## 6. RESUMEN: CAMPOS POR TABLA

### UserProgress
```
PK: USER#{email}
SK: COURSE#{course_id}

Información guardada:
- user_id (email)
- course_id
- current_section
- started_at, last_activity
- checkpoints_completed (con score, passed, completed_at, attempts)
- total_checkpoints, checkpoints_passed
- hints_used (por sección)
```

### TutorSessions
```
PK: SESSION#{session_id}
SK: TIMESTAMP#{timestamp}

Información guardada:
- user_id (email o anon_IP)
- course_id, section_id
- message_type (question/checkpoint/hint)
- user_message, assistant_response
- timestamp, ttl (30 días)
```

### UserUsage
```
PK: user_id (email o anon_IP)
SK: period (TOTAL, YYYY-MM-DD, YYYY-MM-DD-HH)

Información guardada:
- count (total requests)
- question_count, checkpoint_count, hint_count
- last_request
- ttl (7 días, excepto TOTAL)
```

---

## 7. DIFERENCIAS IMPORTANTES

### Email vs cognito:username

**INCONSISTENCIA CRÍTICA:**

- **tutor-handler**: Usa `email` como user_id
- **progress-handler**: Usa `email` como user_id
- **admin-handler**: Usa `cognito:username` como user_id
- **sections-handler**: Usa `cognito:username` como user_id
- **upload-handler**: Usa `cognito:username` como user_id

**Razón documentada en el código:**
```python
# IMPORTANTE: Usar 'cognito:username' en lugar de 'email'
# Para usuarios de Google OAuth, el username es algo como "Google_111137626603562904354"
# mientras que el email es "user@example.com"
# Cognito requiere el username para admin_list_groups_for_user
```

**Implicación:**
- Usuarios anónimos o sin email: Se usa `anon_{sourceIp}`
- Para verificar grupos en Cognito: Necesita `cognito:username`
- Para guardar sesiones: Puede ser `email` o `anon_{IP}`

---

## 8. CÓMO SE IDENTIFICA AL USUARIO EN CADA OPERACIÓN

### A) Hacer una pregunta al tutor
```
POST /api/tutor/ask
Headers: Authorization: Bearer <JWT>

Flow:
1. API Gateway valida JWT → extrae claims
2. Lambda tutor-handler recibe event.requestContext.authorizer.claims
3. Extrae: email = claims.get('email')
4. Usa email como user_id
5. Guarda en UserProgress con PK=USER#{email}, SK=COURSE#{course_id}
6. Guarda en TutorSessions con user_id=email
7. Incrementa contadores en UserUsage con user_id=email
```

### B) Crear un curso (Admin)
```
POST /api/admin/courses
Headers: Authorization: Bearer <JWT>

Flow:
1. API Gateway valida JWT → extrae claims
2. Lambda admin-handler recibe event.requestContext.authorizer.claims
3. Extrae: username = claims.get('cognito:username')
4. Verifica admin status con: cognito.admin_list_groups_for_user(Username=username, ...)
5. Si es admin, crea el curso
```

### C) Obtener progreso
```
GET /api/tutor/progress?course_id=X
Headers: Authorization: Bearer <JWT>

Flow:
1. API Gateway valida JWT → extrae claims
2. Lambda progress-handler recibe claims
3. Extrae: email = claims.get('email')
4. Query en UserProgress: PK=USER#{email}, SK=COURSE#{course_id}
5. Retorna progreso
```

---

## 9. FLUJO COMPLETO DE IDENTIFICACIÓN

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                       │
│  User clicks "Hacer pregunta"                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ 1. fetch() con Authorization header
                       │    Authorization: Bearer <ID Token>
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  COGNITO USER POOL                          │
│  Emitió el ID Token durante login                           │
│  Token contiene claims: email, cognito:username, etc.       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ 2. Token en request header
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  API GATEWAY AUTHORIZER                     │
│  1. Verifica firma del JWT
│  2. Extrae claims del token
│  3. Agrega a event.requestContext.authorizer.claims
│  4. Pasa event a Lambda
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ 3. event con claims
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           LAMBDA HANDLER (tutor-handler, etc.)              │
│  1. Lee: claims = event.get('requestContext').get...       │
│  2. Extrae: email = claims.get('email')  O                 │
│             username = claims.get('cognito:username')      │
│  3. Usa como identificador único del usuario                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ 4. user_id = email o username
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      DYNAMODB                               │
│  UserProgress: PK=USER#{email}, SK=COURSE#{course_id}      │
│  TutorSessions: user_id=email                              │
│  UserUsage: user_id=email                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. CAMPOS ADICIONALES RECOMENDADOS PARA FUTURO

Si se necesita enriquecer el perfil de usuario, se podrían agregar:

**De Cognito (disponibles actualmente):**
- `picture` - URL de foto de perfil
- `name` - Nombre completo
- `email_verified` - Si el email está verificado
- `updated_at` - Cuándo se actualizó el perfil

**Nueva tabla (recomendado):**
```python
{
    'PK': f'USER#{email}',
    'SK': 'PROFILE',
    'email': email,
    'name': claims.get('name'),
    'picture': claims.get('picture'),
    'cognito_sub': claims.get('sub'),  # Sub único de Cognito
    'cognito_username': claims.get('cognito:username'),
    'email_verified': claims.get('email_verified'),
    'created_at': timestamp,
    'updated_at': timestamp,
    'last_login': timestamp,
    'total_courses_started': 0,
    'total_checkpoints_passed': 0,
    'total_hints_used': 0,
    'user_type': 'anonymous' | 'authenticated' | 'premium'
}
```

---

## 11. CONCLUSIÓN

### Identificadores Usados:
1. **Email** - Para tutor y progress handlers (almacenado en DynamoDB)
2. **cognito:username** - Para admin, sections, upload handlers
3. **anon_IP** - Para usuarios no autenticados

### Información Almacenada por Usuario:
- En **UserProgress**: Progreso del curso, checkpoints, pistas
- En **TutorSessions**: Historial de conversaciones (30 días)
- En **UserUsage**: Contadores para rate limiting

### Claims Disponibles (No Todos Usados):
- email, cognito:username, sub, name, picture, phone_number, locale, etc.

### Recomendaciones:
1. Unificar a usar `email` para tutor-handler o crear tabla UserProfile
2. Considerar agregar `picture` y `name` para perfil de usuario
3. Documentar la inconsistencia entre handlers (email vs username)
4. Agregar tabla UserProfile para información de perfil enriquecida
