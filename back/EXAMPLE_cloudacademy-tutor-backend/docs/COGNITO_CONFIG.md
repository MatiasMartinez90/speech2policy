# 🔐 Configuración de Cognito

## User Pool Existente

Usaremos el mismo User Pool que el frontend de CloudAcademy:

### Información del User Pool

```
User Pool ID:     us-east-1_FbLlcvGLl
User Pool ARN:    arn:aws:cognito-idp:us-east-1:982081083386:userpool/us-east-1_FbLlcvGLl
Client ID:        7k692bp886on11hdqfroo2pp44
Domain:           cloudacademy-prod-auth-w0porj9z
Region:           us-east-1
```

### Grupos Configurados

| Grupo | Descripción | Usuarios |
|-------|-------------|----------|
| `Admins` | Administradores con acceso total al panel admin | matias.martinez90@gmail.com |
| `Premium` | Usuarios premium con límites extendidos | (vacío - para futuro) |
| `us-east-1_FbLlcvGLl_Google` | Usuarios autenticados con Google OAuth | (autogenerado) |

### Proveedores de Identidad

- ✅ **Google OAuth** (configurado)
- Callback URL: `https://cloudacademy-prod-auth-w0porj9z.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`

---

## Rate Limits por Tipo de Usuario

### Usuarios Anónimos (sin login)
```javascript
{
  total_questions: 1,        // Solo 1 pregunta TOTAL sin login
  questions_per_day: 1,
  questions_per_hour: 1,
  checkpoints_per_day: 0,    // No puede validar checkpoints
  hints_per_day: 0           // No puede pedir pistas
}
```

**Mensaje:** "🔒 Has usado tu pregunta gratuita. Regístrate para continuar aprendiendo."

### Usuarios Autenticados (con login)
```javascript
{
  total_questions: null,               // Sin límite total
  questions_per_day: 50,
  questions_per_hour: 10,
  checkpoints_per_day: 20,
  hints_per_day: 15,
  checkpoint_attempts_per_section: 5   // 5 intentos por checkpoint
}
```

**Mensaje:** "⏰ Has alcanzado tu límite. Espera {reset_time} para continuar."

### Usuarios Premium (grupo Premium)
```javascript
{
  total_questions: null,
  questions_per_day: 200,
  questions_per_hour: 50,
  checkpoints_per_day: 100,
  hints_per_day: 50,
  checkpoint_attempts_per_section: 10
}
```

**Mensaje:** "Premium: límites extendidos"

---

## Configuración en Terraform

### Variables necesarias:

```terraform
variable "cognito_user_pool_arn" {
  description = "ARN del Cognito User Pool existente"
  type        = string
  default     = "arn:aws:cognito-idp:us-east-1:982081083386:userpool/us-east-1_FbLlcvGLl"
}

variable "cognito_user_pool_id" {
  description = "ID del Cognito User Pool"
  type        = string
  default     = "us-east-1_FbLlcvGLl"
}
```

### API Gateway Authorizer:

```terraform
resource "aws_api_gateway_authorizer" "cognito" {
  name            = "CognitoAuthorizer"
  rest_api_id     = aws_api_gateway_rest_api.tutor_api.id
  type            = "COGNITO_USER_POOLS"
  provider_arns   = [var.cognito_user_pool_arn]
  identity_source = "method.request.header.Authorization"
}
```

---

## Environment Variables para Lambdas

```bash
# Lambda: tutor-handler, progress-handler, admin-handler
COGNITO_USER_POOL_ID=us-east-1_FbLlcvGLl
COGNITO_REGION=us-east-1
```

---

## Verificación de Grupos en Lambda

```python
# Extraer grupos del JWT token en Lambda
def get_user_groups(event):
    """
    Extrae los grupos Cognito del JWT token

    Returns:
        list: ['Admins', 'Premium', ...]
    """

    # El Authorizer de API Gateway agrega claims al requestContext
    if 'requestContext' in event and 'authorizer' in event['requestContext']:
        claims = event['requestContext']['authorizer']['claims']

        # Obtener grupos (viene como string separado por comas)
        groups_str = claims.get('cognito:groups', '')

        if groups_str:
            return groups_str.split(',')

    return []

# Verificar si es Admin
def is_admin(event):
    groups = get_user_groups(event)
    return 'Admins' in groups

# Verificar si es Premium
def is_premium(event):
    groups = get_user_groups(event)
    return 'Premium' in groups

# Ejemplo de uso en admin-handler
def lambda_handler(event, context):
    if not is_admin(event):
        return {
            'statusCode': 403,
            'body': json.dumps({
                'error': 'Forbidden',
                'message': 'Solo administradores pueden acceder a este endpoint'
            })
        }

    # Continuar con operaciones de admin...
```

---

## Agregar Usuario a Grupo (AWS CLI)

```bash
# Listar usuarios
aws cognito-idp list-users --user-pool-id us-east-1_FbLlcvGLl

# Agregar usuario al grupo Admins
aws cognito-idp admin-add-user-to-group \
  --user-pool-id us-east-1_FbLlcvGLl \
  --username Google_111137626603562904354 \
  --group-name Admins

# Agregar usuario al grupo Premium
aws cognito-idp admin-add-user-to-group \
  --user-pool-id us-east-1_FbLlcvGLl \
  --username Google_111137626603562904354 \
  --group-name Premium

# Verificar grupos de un usuario
aws cognito-idp admin-list-groups-for-user \
  --user-pool-id us-east-1_FbLlcvGLl \
  --username Google_111137626603562904354
```

---

## Testing con Token JWT

### 1. Obtener Token desde Frontend

```javascript
// En el frontend Next.js
import { fetchAuthSession } from 'aws-amplify/auth'

const session = await fetchAuthSession()
const token = session.tokens.idToken.toString()

console.log('JWT Token:', token)
```

### 2. Verificar Claims del Token

Pega el token en: https://jwt.io

Verás algo como:

```json
{
  "sub": "c4c81478-d051-704e-93a3-efe1c175197a",
  "cognito:groups": [
    "us-east-1_FbLlcvGLl_Google",
    "Admins"
  ],
  "email_verified": true,
  "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_FbLlcvGLl",
  "cognito:username": "Google_111137626603562904354",
  "origin_jti": "...",
  "aud": "7k692bp886on11hdqfroo2pp44",
  "token_use": "id",
  "auth_time": 1730329876,
  "exp": 1730333476,
  "iat": 1730329876,
  "email": "matias.martinez90@gmail.com"
}
```

### 3. Test con cURL

```bash
# Obtener token (desde frontend o AWS CLI)
TOKEN="eyJraWQiOiJ..."

# Test endpoint público
curl -X GET "https://xxx.execute-api.us-east-1.amazonaws.com/prod/api/courses"

# Test endpoint autenticado
curl -X POST "https://xxx.execute-api.us-east-1.amazonaws.com/prod/api/tutor/ask" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "image-gen-bedrock",
    "section_id": 0,
    "question": "¿Qué es Lambda?"
  }'

# Test endpoint admin (requiere grupo Admins)
curl -X POST "https://xxx.execute-api.us-east-1.amazonaws.com/prod/api/admin/courses" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "new-course",
    "course_name": "Nuevo Curso"
  }'
```

---

## Seguridad

### ✅ Configurado
- Autenticación con Google OAuth
- Grupos de permisos (Admins, Premium)
- JWT tokens con expiración
- Rate limiting por tipo de usuario

### 🔒 Best Practices
- Los tokens expiran cada hora
- Nunca almacenar tokens en localStorage sin encriptar
- Validar grupos en cada Lambda
- Rate limiting estricto para anónimos (1 pregunta total)
- Logs de accesos en CloudWatch

---

## Referencias

- [AWS Cognito User Pools](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)
- [Cognito Groups](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-user-groups.html)
- [API Gateway Cognito Authorizer](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-integrate-with-cognito.html)
- [JWT.io - Decode Tokens](https://jwt.io/)
