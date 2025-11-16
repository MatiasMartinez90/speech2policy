# Plan de Implementación: Categorías Dinámicas en CloudAcademy

**Fecha:** 2025-11-08
**Objetivo:** Migrar categorías de hardcoded a dinámicas (almacenadas en DynamoDB)

---

## 📋 TABLA DE CONTENIDOS

1. [Análisis del Estado Actual](#1-análisis-del-estado-actual)
2. [Diseño de Tabla DynamoDB](#2-diseño-de-tabla-dynamodb)
3. [Plan de Implementación](#3-plan-de-implementación)
4. [Cambios por Archivo](#4-cambios-por-archivo)
5. [Backend - Nuevas Lambda](#5-backend---nuevas-lambda)
6. [Frontend - Modificaciones](#6-frontend---modificaciones)
7. [Flujos Completos](#7-flujos-completos)
8. [Testing](#8-testing)
9. [Preguntas y Decisiones](#9-preguntas-y-decisiones)

---

## 1. ANÁLISIS DEL ESTADO ACTUAL

### 1.1 Categorías Hardcodeadas

**Archivo:** `app/utils/categories.ts` (251 líneas)

```typescript
export const CATEGORY_CONFIG = {
  bedrock: {
    label: 'Bedrock',
    emoji: '🤖',
    color: 'from-purple-500 to-blue-600',
    description: 'Amazon Bedrock & RAG - Build AI chatbots...',
    architecture: [
      { icon: '🧠', title: 'Claude 3.5', description: '...', color: 'purple' },
      { icon: '📚', title: 'Knowledge Bases', description: '...', color: 'blue' },
      // ... más componentes
    ]
  },
  security: { /* ... */ },
  networking: { /* ... */ },
  compute: { /* ... */ },
  'aws-cloud-practitioner': { /* ... */ },
  devops: { /* ... */ },
  databases: { /* ... */ }
}
```

**Campos de cada categoría:**
- `label`: Nombre visual ("Bedrock", "Security", etc.)
- `emoji`: Icono (🤖, 🔒, 🌐, etc.)
- `color`: Gradient Tailwind CSS
- `description`: Texto largo descriptivo
- `architecture`: Array de componentes arquitectónicos

### 1.2 Uso Actual

**Panel Admin (`app/pages/admin-panel.tsx`):**
```tsx
<select value={formData.category} onChange={...}>
  {Object.entries(categories).map(([key, config]) => (
    <option key={key} value={key}>
      {config.emoji} {config.label}
    </option>
  ))}
</select>
```

**Página de categorías (`app/pages/courses.tsx`):**
- Muestra grid 3x3 con tarjetas de categorías
- Metadata hardcodeada: courseCount, level

**Página individual (`app/pages/courses/[category].tsx`):**
- Renderiza hero, arquitectura, ruta de aprendizaje
- Filtra cursos por `category` field

### 1.3 Estructura de Curso en DynamoDB

**Tabla:** CourseCatalog
**PK:** `COURSE#{course_id}`
**SK:** `METADATA`

```json
{
  "course_id": "image-gen-bedrock",
  "course_name": "Generador de Imágenes",
  "category": "bedrock",        // ← STRING simple
  "difficulty": "Beginner",
  "is_published": true,
  // ... otros campos
}
```

---

## 2. DISEÑO DE TABLA DYNAMODB

### 2.1 Tabla: Categories

**Nombre:** `Categories`
**Billing Mode:** PAY_PER_REQUEST (on-demand)
**Región:** us-east-1

### 2.2 Esquema de Keys

```
PK: CATEGORY#{category_id}
SK: METADATA
```

**Ejemplo:**
```
PK: "CATEGORY#bedrock"
SK: "METADATA"
```

### 2.3 Atributos

```json
{
  "PK": "CATEGORY#bedrock",
  "SK": "METADATA",

  // Identificación
  "category_id": "bedrock",                    // Slug único (URL-friendly)
  "label": "Bedrock",                           // Nombre visual
  "slug": "bedrock",                            // Para URLs (/courses/bedrock)

  // Visualización
  "emoji": "🤖",                                // Icono
  "icon_url": "",                               // Opcional: URL imagen custom
  "color": "from-purple-500 to-blue-600",      // Gradient Tailwind
  "description": "Amazon Bedrock & RAG...",     // Texto descriptivo largo

  // Metadata de página
  "course_count": 8,                            // Calculado o manual
  "level": "Intermedio-Avanzado",              // Beginner/Intermediate/Advanced/Mixed

  // Arquitectura (JSON string o Map)
  "architecture": [
    {
      "icon": "🧠",
      "title": "Claude 3.5",
      "description": "Modelo de lenguaje avanzado",
      "color": "purple"
    },
    {
      "icon": "📚",
      "title": "Knowledge Bases",
      "description": "Vector databases para RAG",
      "color": "blue"
    }
  ],

  // Ordenamiento y visibilidad
  "display_order": 1,                           // Para ordenar en /courses
  "is_active": true,                            // Mostrar/ocultar categoría
  "featured": false,                            // Destacar en homepage

  // Auditoría
  "created_at": "2025-11-08T10:00:00Z",
  "updated_at": "2025-11-08T10:00:00Z",
  "created_by": "admin@cloudacademy.ar"
}
```

### 2.4 Global Secondary Index (GSI)

**Nombre:** `display_order-index`
**PK:** `is_active` (Boolean → String: "true" o "false")
**SK:** `display_order` (Number)

**Propósito:** Obtener categorías activas ordenadas por display_order

**Query ejemplo:**
```python
response = table.query(
    IndexName='display_order-index',
    KeyConditionExpression='is_active = :active',
    ExpressionAttributeValues={':active': 'true'},
    ScanIndexForward=True  # Orden ascendente por display_order
)
```

### 2.5 Terraform para Tabla Categories

```hcl
resource "aws_dynamodb_table" "categories" {
  name         = "Categories"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "is_active"
    type = "S"
  }

  attribute {
    name = "display_order"
    type = "N"
  }

  global_secondary_index {
    name            = "display_order-index"
    hash_key        = "is_active"
    range_key       = "display_order"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name        = "Categories"
    Description = "Categorías dinámicas de cursos CloudAcademy"
  }
}
```

---

## 3. PLAN DE IMPLEMENTACIÓN

### FASE 1: Backend - Tabla y Lambda (Backend Tutor Repo)

**Repo:** `cloudacademy-tutor-backend`

#### 1.1 Crear Tabla Categories en DynamoDB
- **Archivo:** `terraform/dynamodb.tf`
- **Acción:** Agregar resource `aws_dynamodb_table.categories`
- **Deployment:** `terraform apply`

#### 1.2 Actualizar Outputs de Terraform
- **Archivo:** `terraform/outputs.tf`
- **Acción:** Agregar tabla Categories en outputs

#### 1.3 Crear Lambda categories-handler
- **Ubicación:** `lambdas/categories-handler/`
- **Runtime:** Python 3.11
- **Endpoints:**
  - `GET /api/categories` - Listar todas (públicas)
  - `GET /api/categories/{id}` - Detalle de una categoría
  - `POST /api/admin/categories` - Crear (requiere auth Admin)
  - `PUT /api/admin/categories/{id}` - Actualizar (requiere auth Admin)
  - `DELETE /api/admin/categories/{id}` - Eliminar (requiere auth Admin)

#### 1.4 Actualizar API Gateway
- **Archivo:** `terraform/api-gateway.tf`
- **Acción:** Agregar recursos `/api/categories` y `/api/admin/categories`
- **Integración:** Lambda categories-handler

#### 1.5 Actualizar Permisos IAM
- **Archivo:** `terraform/iam.tf`
- **Acción:** Agregar policy para categories-handler con acceso a tabla Categories

---

### FASE 2: Frontend - Admin Panel (Frontend Repo)

**Repo:** `cloudacademy_next`

#### 2.1 Crear Hook useAdminCategories
- **Ubicación:** `app/hooks/useAdminCategories.ts`
- **Funciones:**
  - `fetchCategories()` - GET /api/categories
  - `createCategory(data)` - POST /api/admin/categories
  - `updateCategory(id, data)` - PUT /api/admin/categories/{id}
  - `deleteCategory(id)` - DELETE /api/admin/categories/{id}

#### 2.2 Crear Componente CategoryForm
- **Ubicación:** `app/components/admin/CategoryForm.tsx`
- **Campos:**
  - category_id (slug)
  - label (nombre)
  - emoji (selector)
  - color (selector de gradientes)
  - description (textarea)
  - level (select)
  - display_order (number)
  - is_active (checkbox)
  - architecture (editor JSON o form dinámico)

#### 2.3 Crear Página Admin de Categorías
- **Ubicación:** `app/pages/admin/categories.tsx`
- **Funcionalidad:**
  - Tabla con lista de categorías
  - Botón "Crear Categoría"
  - Acciones: Editar, Eliminar, Activar/Desactivar
  - Reordenar (drag & drop opcional)

#### 2.4 Agregar Link en Admin Panel
- **Archivo:** `app/pages/admin-panel.tsx`
- **Acción:** Agregar botón/link "Gestionar Categorías"

---

### FASE 3: Frontend - Migración useCategories (Frontend Repo)

#### 3.1 Modificar useCategories Hook
- **Archivo:** `app/hooks/useCategories.ts`
- **Cambios:**
  - Descomentar código de API
  - Fetch dinámico desde `GET /api/categories`
  - Mantener formato compatible con código existente
  - Agregar caché (SWR o React Query opcional)

#### 3.2 Actualizar Admin Panel - Selector de Categoría
- **Archivo:** `app/pages/admin-panel.tsx`
- **Cambios:**
  - Obtener categorías de `useCategories()` (ya dinámico)
  - El select ya funciona, solo cambiar fuente de datos

#### 3.3 Actualizar Página de Categorías
- **Archivo:** `app/pages/courses.tsx`
- **Cambios:**
  - Obtener categorías de `useCategories()` (ya dinámico)
  - Eliminar `categoryMetadata` hardcodeado
  - Usar `course_count` y `level` de DynamoDB

#### 3.4 Verificar Compatibilidad
- **Archivos:**
  - `app/pages/courses/[category].tsx`
  - Cualquier componente que use `CATEGORY_CONFIG`
- **Acción:** Probar que todo sigue funcionando con categorías dinámicas

---

### FASE 4: Migración de Datos

#### 4.1 Script de Migración
- **Ubicación:** `scripts/migrate-categories.py` o `.ts`
- **Función:** Leer `CATEGORY_CONFIG` y crear items en DynamoDB
- **Campos:**
  - Mapear cada categoría hardcodeada a estructura DynamoDB
  - Asignar `display_order` (1, 2, 3, ...)
  - Setear `is_active: true`
  - Copiar architecture JSON

#### 4.2 Ejecución
```bash
# Opción Python
python scripts/migrate-categories.py

# Opción TypeScript + AWS SDK
ts-node scripts/migrate-categories.ts
```

---

### FASE 5: Testing y Validación

#### 5.1 Testing Backend
- Crear categoría desde API
- Listar categorías
- Actualizar categoría
- Eliminar categoría
- Verificar permisos Admin

#### 5.2 Testing Frontend
- Admin puede crear categoría
- Categoría aparece en selector de admin-panel
- Crear curso con nueva categoría
- Categoría aparece en /courses
- Click en categoría → /courses/{slug} funciona
- Arquitectura se renderiza correctamente

#### 5.3 Testing End-to-End
1. Admin crea nueva categoría "Serverless" 🚀
2. Admin crea curso en categoría "Serverless"
3. Usuario ve categoría en /courses
4. Usuario entra a /courses/serverless
5. Ve el curso creado

---

## 4. CAMBIOS POR ARCHIVO

### Backend (cloudacademy-tutor-backend)

#### 4.1 `terraform/dynamodb.tf`

```hcl
# Agregar después de tabla UserUsage

# ============================================================================
# Tabla 6: Categories
# ============================================================================
# Categorías de cursos dinámicas
# PK: CATEGORY#{category_id}
# SK: METADATA
# GSI: is_active + display_order (para ordenamiento)

resource "aws_dynamodb_table" "categories" {
  name         = "Categories"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "is_active"
    type = "S"
  }

  attribute {
    name = "display_order"
    type = "N"
  }

  global_secondary_index {
    name            = "display_order-index"
    hash_key        = "is_active"
    range_key       = "display_order"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name        = "Categories"
    Description = "Categorías dinámicas de cursos CloudAcademy"
  }
}
```

#### 4.2 `terraform/outputs.tf`

```hcl
# Agregar en dynamodb_tables y dynamodb_arns

locals {
  dynamodb_tables = {
    # ... existentes
    categories      = aws_dynamodb_table.categories.name
  }

  dynamodb_arns = {
    # ... existentes
    categories      = aws_dynamodb_table.categories.arn
  }
}
```

#### 4.3 `lambdas/categories-handler/lambda_function.py` (NUEVO)

```python
import json
import logging
import os
from datetime import datetime
import boto3
from decimal import Decimal

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')
categories_table = dynamodb.Table('Categories')

def lambda_handler(event, context):
    """
    Handler para CRUD de categorías
    """
    try:
        http_method = event.get('httpMethod')
        path = event.get('path', '')

        # Rutas públicas
        if http_method == 'GET' and path == '/api/categories':
            return get_categories(event)

        if http_method == 'GET' and '/api/categories/' in path:
            category_id = path.split('/')[-1]
            return get_category(category_id)

        # Rutas Admin (requieren autenticación)
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        username = claims.get('cognito:username')

        if not username:
            return response(401, {'error': 'Unauthorized'})

        # Verificar grupo Admins
        cognito = boto3.client('cognito-idp')
        user_pool_id = os.environ.get('COGNITO_USER_POOL_ID')

        groups_response = cognito.admin_list_groups_for_user(
            Username=username,
            UserPoolId=user_pool_id
        )
        user_groups = [g['GroupName'] for g in groups_response.get('Groups', [])]

        if 'Admins' not in user_groups:
            return response(403, {'error': 'Forbidden - Admin access required'})

        # CRUD Admin
        if http_method == 'POST' and path == '/api/admin/categories':
            return create_category(event, username)

        if http_method == 'PUT' and '/api/admin/categories/' in path:
            category_id = path.split('/')[-1]
            return update_category(category_id, event, username)

        if http_method == 'DELETE' and '/api/admin/categories/' in path:
            category_id = path.split('/')[-1]
            return delete_category(category_id)

        return response(404, {'error': 'Not Found'})

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return response(500, {'error': str(e)})

def get_categories(event):
    """GET /api/categories - Listar todas las categorías activas"""
    try:
        # Query GSI por is_active = true, ordenado por display_order
        result = categories_table.query(
            IndexName='display_order-index',
            KeyConditionExpression='is_active = :active',
            ExpressionAttributeValues={':active': 'true'}
        )

        categories = result.get('Items', [])

        # Convertir a dict con category_id como key (compatible con frontend)
        categories_dict = {}
        for cat in categories:
            cat_id = cat.get('category_id')
            categories_dict[cat_id] = {
                'label': cat.get('label'),
                'emoji': cat.get('emoji'),
                'icon_url': cat.get('icon_url', ''),
                'color': cat.get('color'),
                'description': cat.get('description'),
                'architecture': cat.get('architecture', []),
                'course_count': int(cat.get('course_count', 0)),
                'level': cat.get('level', 'Intermedio'),
                'display_order': int(cat.get('display_order', 999))
            }

        return response(200, categories_dict)

    except Exception as e:
        logger.error(f"Error listing categories: {str(e)}")
        return response(500, {'error': str(e)})

def get_category(category_id):
    """GET /api/categories/{id} - Detalle de categoría"""
    try:
        result = categories_table.get_item(
            Key={'PK': f'CATEGORY#{category_id}', 'SK': 'METADATA'}
        )

        if 'Item' not in result:
            return response(404, {'error': 'Category not found'})

        return response(200, result['Item'])

    except Exception as e:
        logger.error(f"Error getting category: {str(e)}")
        return response(500, {'error': str(e)})

def create_category(event, username):
    """POST /api/admin/categories - Crear categoría"""
    try:
        body = json.loads(event.get('body', '{}'))

        category_id = body.get('category_id')
        if not category_id:
            return response(400, {'error': 'category_id is required'})

        # Verificar que no existe
        existing = categories_table.get_item(
            Key={'PK': f'CATEGORY#{category_id}', 'SK': 'METADATA'}
        )
        if 'Item' in existing:
            return response(400, {'error': 'Category already exists'})

        now = datetime.utcnow().isoformat()

        item = {
            'PK': f'CATEGORY#{category_id}',
            'SK': 'METADATA',
            'category_id': category_id,
            'label': body.get('label', category_id.capitalize()),
            'slug': body.get('slug', category_id),
            'emoji': body.get('emoji', '📚'),
            'icon_url': body.get('icon_url', ''),
            'color': body.get('color', 'from-gray-500 to-gray-600'),
            'description': body.get('description', ''),
            'architecture': body.get('architecture', []),
            'course_count': body.get('course_count', 0),
            'level': body.get('level', 'Intermedio'),
            'display_order': body.get('display_order', 999),
            'is_active': str(body.get('is_active', True)).lower(),  # String para GSI
            'featured': body.get('featured', False),
            'created_at': now,
            'updated_at': now,
            'created_by': username
        }

        categories_table.put_item(Item=item)

        logger.info(f"Category created: {category_id} by {username}")
        return response(201, item)

    except Exception as e:
        logger.error(f"Error creating category: {str(e)}")
        return response(500, {'error': str(e)})

def update_category(category_id, event, username):
    """PUT /api/admin/categories/{id} - Actualizar categoría"""
    try:
        body = json.loads(event.get('body', '{}'))

        # Verificar que existe
        existing = categories_table.get_item(
            Key={'PK': f'CATEGORY#{category_id}', 'SK': 'METADATA'}
        )
        if 'Item' not in existing:
            return response(404, {'error': 'Category not found'})

        # Build update expression
        update_expr = []
        expr_values = {}
        expr_names = {}

        fields = ['label', 'emoji', 'icon_url', 'color', 'description',
                  'architecture', 'course_count', 'level', 'display_order',
                  'is_active', 'featured']

        for field in fields:
            if field in body:
                update_expr.append(f'#{field} = :{field}')
                expr_names[f'#{field}'] = field
                value = body[field]
                if field == 'is_active':
                    value = str(value).lower()  # String para GSI
                expr_values[f':{field}'] = value

        update_expr.append('#updated_at = :updated_at')
        expr_names['#updated_at'] = 'updated_at'
        expr_values[':updated_at'] = datetime.utcnow().isoformat()

        categories_table.update_item(
            Key={'PK': f'CATEGORY#{category_id}', 'SK': 'METADATA'},
            UpdateExpression='SET ' + ', '.join(update_expr),
            ExpressionAttributeNames=expr_names,
            ExpressionAttributeValues=expr_values
        )

        logger.info(f"Category updated: {category_id} by {username}")
        return response(200, {'message': 'Category updated', 'category_id': category_id})

    except Exception as e:
        logger.error(f"Error updating category: {str(e)}")
        return response(500, {'error': str(e)})

def delete_category(category_id):
    """DELETE /api/admin/categories/{id} - Eliminar categoría"""
    try:
        # Verificar que existe
        existing = categories_table.get_item(
            Key={'PK': f'CATEGORY#{category_id}', 'SK': 'METADATA'}
        )
        if 'Item' not in existing:
            return response(404, {'error': 'Category not found'})

        # TODO: Verificar que no tiene cursos asignados
        # Esto requeriría query en CourseCatalog filtrando por category

        categories_table.delete_item(
            Key={'PK': f'CATEGORY#{category_id}', 'SK': 'METADATA'}
        )

        logger.info(f"Category deleted: {category_id}")
        return response(200, {'message': 'Category deleted', 'category_id': category_id})

    except Exception as e:
        logger.error(f"Error deleting category: {str(e)}")
        return response(500, {'error': str(e)})

def response(status_code, body):
    """Helper para respuestas HTTP"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization'
        },
        'body': json.dumps(body, default=str)
    }
```

#### 4.4 `terraform/lambda.tf`

```hcl
# Agregar después de otras lambdas

# ============================================================================
# Lambda: categories-handler
# ============================================================================

data "archive_file" "categories_handler_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../lambdas/categories-handler"
  output_path = "${path.module}/../lambdas/categories-handler.zip"
}

resource "aws_lambda_function" "categories_handler" {
  filename         = data.archive_file.categories_handler_zip.output_path
  function_name    = "cloudacademy-categories-handler"
  role             = aws_iam_role.lambda_categories_role.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.11"
  timeout          = 30
  source_code_hash = data.archive_file.categories_handler_zip.output_base64sha256

  environment {
    variables = {
      CATEGORIES_TABLE     = aws_dynamodb_table.categories.name
      COGNITO_USER_POOL_ID = var.cognito_user_pool_id
      AWS_REGION           = var.aws_region
    }
  }

  tags = {
    Name        = "categories-handler"
    Description = "CRUD de categorías dinámicas"
  }
}

resource "aws_cloudwatch_log_group" "categories_handler_logs" {
  name              = "/aws/lambda/cloudacademy-categories-handler"
  retention_in_days = 14
}
```

#### 4.5 `terraform/iam.tf`

```hcl
# Agregar IAM role para categories-handler

resource "aws_iam_role" "lambda_categories_role" {
  name               = "cloudacademy-categories-handler-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Name = "categories-handler-lambda-role"
  }
}

resource "aws_iam_role_policy_attachment" "categories_lambda_logs" {
  role       = aws_iam_role.lambda_categories_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_policy" "categories_dynamodb_policy" {
  name        = "cloudacademy-categories-dynamodb-policy"
  description = "Permite a categories-handler acceder a tabla Categories"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.categories.arn,
          "${aws_dynamodb_table.categories.arn}/index/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "categories_dynamodb" {
  role       = aws_iam_role.lambda_categories_role.name
  policy_arn = aws_iam_policy.categories_dynamodb_policy.arn
}

resource "aws_iam_policy" "categories_cognito_policy" {
  name        = "cloudacademy-categories-cognito-policy"
  description = "Permite a categories-handler verificar grupos de usuarios"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminListGroupsForUser"
        ]
        Resource = [
          var.cognito_user_pool_arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "categories_cognito" {
  role       = aws_iam_role.lambda_categories_role.name
  policy_arn = aws_iam_policy.categories_cognito_policy.arn
}
```

#### 4.6 `terraform/api-gateway.tf`

```hcl
# Agregar recursos para /api/categories

# Resource: /api/categories
resource "aws_api_gateway_resource" "categories" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "categories"
}

# GET /api/categories (público)
resource "aws_api_gateway_method" "categories_get" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.categories.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "categories_get" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.categories.id
  http_method             = aws_api_gateway_method.categories_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.categories_handler.invoke_arn
  timeout_milliseconds    = 29000
}

# OPTIONS /api/categories (CORS)
resource "aws_api_gateway_method" "categories_options" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.categories.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "categories_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.categories.id
  http_method = aws_api_gateway_method.categories_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = jsonencode({ statusCode = 200 })
  }
}

# Resource: /api/categories/{id}
resource "aws_api_gateway_resource" "categories_id" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_resource.categories.id
  path_part   = "{id}"
}

# GET /api/categories/{id} (público)
resource "aws_api_gateway_method" "categories_id_get" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.categories_id.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "categories_id_get" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.categories_id.id
  http_method             = aws_api_gateway_method.categories_id_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.categories_handler.invoke_arn
  timeout_milliseconds    = 29000
}

# Resource: /api/admin/categories
resource "aws_api_gateway_resource" "admin_categories" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "categories"
}

# POST /api/admin/categories (requiere auth)
resource "aws_api_gateway_method" "admin_categories_post" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.admin_categories.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "admin_categories_post" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.admin_categories.id
  http_method             = aws_api_gateway_method.admin_categories_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.categories_handler.invoke_arn
  timeout_milliseconds    = 29000
}

# Resource: /api/admin/categories/{id}
resource "aws_api_gateway_resource" "admin_categories_id" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_resource.admin_categories.id
  path_part   = "{id}"
}

# PUT /api/admin/categories/{id} (requiere auth)
resource "aws_api_gateway_method" "admin_categories_id_put" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.admin_categories_id.id
  http_method   = "PUT"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "admin_categories_id_put" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.admin_categories_id.id
  http_method             = aws_api_gateway_method.admin_categories_id_put.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.categories_handler.invoke_arn
  timeout_milliseconds    = 29000
}

# DELETE /api/admin/categories/{id} (requiere auth)
resource "aws_api_gateway_method" "admin_categories_id_delete" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.admin_categories_id.id
  http_method   = "DELETE"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "admin_categories_id_delete" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.admin_categories_id.id
  http_method             = aws_api_gateway_method.admin_categories_id_delete.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.categories_handler.invoke_arn
  timeout_milliseconds    = 29000
}

# Lambda permission para categories
resource "aws_lambda_permission" "api_gateway_categories" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.categories_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.tutor_api.execution_arn}/*/*"
}
```

---

### Frontend (cloudacademy_next)

#### 4.7 `app/hooks/useAdminCategories.ts` (NUEVO)

```typescript
import { useState } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'

interface Category {
  category_id: string
  label: string
  emoji: string
  icon_url?: string
  color: string
  description: string
  architecture?: Array<{
    icon: string
    title: string
    description: string
    color: string
  }>
  course_count?: number
  level?: string
  display_order?: number
  is_active?: boolean
  featured?: boolean
}

export function useAdminCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod'

  async function getAuthToken() {
    const session = await fetchAuthSession()
    return session.tokens?.idToken?.toString()
  }

  async function fetchCategories() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/categories`)

      if (!response.ok) {
        throw new Error(`Error fetching categories: ${response.statusText}`)
      }

      const data = await response.json()

      // Convertir dict a array
      const categoriesArray = Object.entries(data).map(([key, value]: [string, any]) => ({
        category_id: key,
        ...value
      }))

      // Ordenar por display_order
      categoriesArray.sort((a, b) => (a.display_order || 999) - (b.display_order || 999))

      setCategories(categoriesArray)
      return categoriesArray
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching categories:', err)
      return []
    } finally {
      setLoading(false)
    }
  }

  async function createCategory(categoryData: Partial<Category>) {
    setLoading(true)
    setError(null)

    try {
      const token = await getAuthToken()

      const response = await fetch(`${API_BASE_URL}/api/admin/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(categoryData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error: ${response.statusText}`)
      }

      const newCategory = await response.json()

      // Refetch para actualizar lista
      await fetchCategories()

      return newCategory
    } catch (err: any) {
      setError(err.message)
      console.error('Error creating category:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  async function updateCategory(categoryId: string, categoryData: Partial<Category>) {
    setLoading(true)
    setError(null)

    try {
      const token = await getAuthToken()

      const response = await fetch(`${API_BASE_URL}/api/admin/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(categoryData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error: ${response.statusText}`)
      }

      const result = await response.json()

      // Refetch para actualizar lista
      await fetchCategories()

      return result
    } catch (err: any) {
      setError(err.message)
      console.error('Error updating category:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  async function deleteCategory(categoryId: string) {
    setLoading(true)
    setError(null)

    try {
      const token = await getAuthToken()

      const response = await fetch(`${API_BASE_URL}/api/admin/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error: ${response.statusText}`)
      }

      // Refetch para actualizar lista
      await fetchCategories()

      return true
    } catch (err: any) {
      setError(err.message)
      console.error('Error deleting category:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    categories,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory
  }
}
```

#### 4.8 `app/hooks/useCategories.ts` (MODIFICAR)

```typescript
import { useState, useEffect } from 'react'
import { CATEGORY_CONFIG } from '../utils/categories'

interface CategoryConfig {
  label: string
  emoji: string
  icon_url?: string
  color: string
  description: string
  architecture?: Array<{
    icon: string
    title: string
    description: string
    color: string
  }>
  course_count?: number
  level?: string
  display_order?: number
}

export function useCategories() {
  const [categories, setCategories] = useState<Record<string, CategoryConfig>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod'

  useEffect(() => {
    fetchCategories()
  }, [])

  async function fetchCategories() {
    setLoading(true)
    setError(null)

    try {
      // CAMBIO: Fetch dinámico de API
      const response = await fetch(`${API_BASE_URL}/api/categories`)

      if (!response.ok) {
        throw new Error(`Error fetching categories: ${response.statusText}`)
      }

      const data = await response.json()
      setCategories(data)

    } catch (err: any) {
      console.error('Error fetching categories:', err)
      setError(err.message)

      // Fallback a categorías hardcodeadas
      console.warn('Using fallback hardcoded categories')
      setCategories(CATEGORY_CONFIG)
    } finally {
      setLoading(false)
    }
  }

  function getCategoryConfig(categoryKey: string): CategoryConfig | undefined {
    return categories[categoryKey]
  }

  return {
    categories,
    loading,
    error,
    getCategoryConfig
  }
}
```

#### 4.9 `app/pages/admin/categories.tsx` (NUEVO)

```typescript
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useUser } from '../../lib/useUser'
import { useAdminCategories } from '../../hooks/useAdminCategories'
import CategoryForm from '../../components/admin/CategoryForm'

export default function AdminCategories() {
  const { user, loading: userLoading } = useUser({ redirect: '/signin' })
  const { categories, loading, error, fetchCategories, createCategory, updateCategory, deleteCategory } = useAdminCategories()

  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)

  useEffect(() => {
    if (user) {
      fetchCategories()
    }
  }, [user])

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    )
  }

  async function handleCreateCategory(data: any) {
    try {
      await createCategory(data)
      setShowForm(false)
    } catch (err) {
      alert('Error al crear categoría')
    }
  }

  async function handleUpdateCategory(categoryId: string, data: any) {
    try {
      await updateCategory(categoryId, data)
      setEditingCategory(null)
      setShowForm(false)
    } catch (err) {
      alert('Error al actualizar categoría')
    }
  }

  async function handleDeleteCategory(categoryId: string) {
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return

    try {
      await deleteCategory(categoryId)
    } catch (err) {
      alert('Error al eliminar categoría')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Gestión de Categorías</h1>
            <p className="text-slate-400">Administra las categorías de cursos</p>
          </div>
          <button
            onClick={() => {
              setEditingCategory(null)
              setShowForm(true)
            }}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg hover:opacity-90 transition"
          >
            + Crear Categoría
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-500 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-slate-900 rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false)
                    setEditingCategory(null)
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <CategoryForm
                category={editingCategory}
                onSubmit={(data) => {
                  if (editingCategory) {
                    handleUpdateCategory(editingCategory.category_id, data)
                  } else {
                    handleCreateCategory(data)
                  }
                }}
                onCancel={() => {
                  setShowForm(false)
                  setEditingCategory(null)
                }}
              />
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-slate-900 rounded-lg border border-slate-800">
          <table className="w-full">
            <thead className="bg-slate-800">
              <tr>
                <th className="text-left px-6 py-4">Orden</th>
                <th className="text-left px-6 py-4">Categoría</th>
                <th className="text-left px-6 py-4">Slug</th>
                <th className="text-left px-6 py-4">Cursos</th>
                <th className="text-left px-6 py-4">Nivel</th>
                <th className="text-left px-6 py-4">Estado</th>
                <th className="text-left px-6 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.category_id} className="border-t border-slate-800 hover:bg-slate-800/50">
                  <td className="px-6 py-4">{category.display_order || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{category.emoji}</span>
                      <span className="font-semibold">{category.label}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400">{category.category_id}</td>
                  <td className="px-6 py-4">{category.course_count || 0}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-800 rounded text-sm">
                      {category.level || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {category.is_active !== false ? (
                      <span className="text-green-400">● Activa</span>
                    ) : (
                      <span className="text-slate-500">○ Inactiva</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingCategory(category)
                          setShowForm(true)
                        }}
                        className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 transition text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.category_id)}
                        className="px-3 py-1 bg-red-600 rounded hover:bg-red-700 transition text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {categories.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              No hay categorías. Crea la primera.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

#### 4.10 `app/components/admin/CategoryForm.tsx` (NUEVO)

```typescript
import { useState, useEffect } from 'react'

interface CategoryFormProps {
  category?: any
  onSubmit: (data: any) => void
  onCancel: () => void
}

export default function CategoryForm({ category, onSubmit, onCancel }: CategoryFormProps) {
  const [formData, setFormData] = useState({
    category_id: '',
    label: '',
    emoji: '📚',
    color: 'from-gray-500 to-gray-600',
    description: '',
    level: 'Intermedio',
    display_order: 999,
    is_active: true,
    featured: false,
    course_count: 0,
    architecture: [] as any[]
  })

  useEffect(() => {
    if (category) {
      setFormData({
        category_id: category.category_id || '',
        label: category.label || '',
        emoji: category.emoji || '📚',
        color: category.color || 'from-gray-500 to-gray-600',
        description: category.description || '',
        level: category.level || 'Intermedio',
        display_order: category.display_order || 999,
        is_active: category.is_active !== false,
        featured: category.featured || false,
        course_count: category.course_count || 0,
        architecture: category.architecture || []
      })
    }
  }, [category])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(formData)
  }

  const emojis = ['🤖', '🔒', '🌐', '⚡', '☁️', '⚙️', '🗄️', '📚', '🚀', '💡', '🎯', '🔥']
  const colors = [
    'from-purple-500 to-blue-600',
    'from-orange-500 to-red-600',
    'from-blue-500 to-cyan-600',
    'from-yellow-500 to-orange-600',
    'from-orange-400 to-amber-500',
    'from-green-500 to-emerald-600',
    'from-purple-500 to-pink-600',
    'from-gray-500 to-gray-600'
  ]
  const levels = ['Principiante', 'Beginner', 'Intermedio', 'Intermediate', 'Avanzado', 'Advanced', 'Básico-Avanzado', 'Intermedio-Avanzado']

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Category ID */}
      <div>
        <label className="block text-sm font-medium mb-2">
          ID de Categoría (Slug) *
        </label>
        <input
          type="text"
          value={formData.category_id}
          onChange={(e) => setFormData({ ...formData, category_id: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
          placeholder="bedrock, security, networking..."
          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
          required
          disabled={!!category}  // No editable si es update
        />
        <p className="text-xs text-slate-400 mt-1">
          Se usa en la URL: /courses/{formData.category_id || 'slug'}
        </p>
      </div>

      {/* Label */}
      <div>
        <label className="block text-sm font-medium mb-2">Nombre Visual *</label>
        <input
          type="text"
          value={formData.label}
          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
          placeholder="Bedrock, Security, Networking..."
          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
          required
        />
      </div>

      {/* Emoji */}
      <div>
        <label className="block text-sm font-medium mb-2">Icono (Emoji) *</label>
        <div className="flex gap-2 flex-wrap">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setFormData({ ...formData, emoji })}
              className={`text-3xl p-3 rounded-lg border-2 transition ${
                formData.emoji === emoji
                  ? 'border-purple-500 bg-purple-900/30'
                  : 'border-slate-700 bg-slate-800 hover:border-slate-600'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={formData.emoji}
          onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
          placeholder="O escribe tu propio emoji..."
          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white mt-2"
        />
      </div>

      {/* Color */}
      <div>
        <label className="block text-sm font-medium mb-2">Gradient de Color *</label>
        <div className="grid grid-cols-4 gap-2">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setFormData({ ...formData, color })}
              className={`h-12 rounded-lg bg-gradient-to-r ${color} border-2 transition ${
                formData.color === color ? 'border-white' : 'border-transparent'
              }`}
            />
          ))}
        </div>
        <input
          type="text"
          value={formData.color}
          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
          placeholder="from-purple-500 to-blue-600"
          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white mt-2"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-2">Descripción *</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descripción detallada de la categoría..."
          rows={4}
          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
          required
        />
      </div>

      {/* Level */}
      <div>
        <label className="block text-sm font-medium mb-2">Nivel de Dificultad</label>
        <select
          value={formData.level}
          onChange={(e) => setFormData({ ...formData, level: e.target.value })}
          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
        >
          {levels.map((level) => (
            <option key={level} value={level}>{level}</option>
          ))}
        </select>
      </div>

      {/* Display Order */}
      <div>
        <label className="block text-sm font-medium mb-2">Orden de Visualización</label>
        <input
          type="number"
          value={formData.display_order}
          onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
        />
        <p className="text-xs text-slate-400 mt-1">
          Números más bajos aparecen primero
        </p>
      </div>

      {/* Course Count */}
      <div>
        <label className="block text-sm font-medium mb-2">Cantidad de Cursos</label>
        <input
          type="number"
          value={formData.course_count}
          onChange={(e) => setFormData({ ...formData, course_count: parseInt(e.target.value) })}
          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
        />
      </div>

      {/* Checkboxes */}
      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-4 h-4"
          />
          <span>Categoría Activa (visible para usuarios)</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.featured}
            onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
            className="w-4 h-4"
          />
          <span>Destacar en Homepage</span>
        </label>
      </div>

      {/* Architecture (simplified) */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Arquitectura (JSON)
          <span className="text-xs text-slate-400 ml-2">(Opcional - Avanzado)</span>
        </label>
        <textarea
          value={JSON.stringify(formData.architecture, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value)
              setFormData({ ...formData, architecture: parsed })
            } catch {
              // Invalid JSON, ignore
            }
          }}
          placeholder='[{"icon": "🧠", "title": "Claude 3.5", "description": "...", "color": "purple"}]'
          rows={6}
          className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 rounded-lg hover:opacity-90 transition font-semibold"
        >
          {category ? 'Actualizar Categoría' : 'Crear Categoría'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
```

---

## 5. BACKEND - NUEVAS LAMBDA

Ver sección 4.3 para código completo de `categories-handler`.

### Endpoints:

**Públicos:**
- `GET /api/categories` - Lista todas las categorías activas
- `GET /api/categories/{id}` - Detalle de una categoría

**Admin (requieren JWT + grupo Admins):**
- `POST /api/admin/categories` - Crear categoría
- `PUT /api/admin/categories/{id}` - Actualizar categoría
- `DELETE /api/admin/categories/{id}` - Eliminar categoría

---

## 6. FRONTEND - MODIFICACIONES

### Cambios Mínimos en Código Existente:

1. **`app/hooks/useCategories.ts`** - Fetch dinámico de API (línea 30-50)
2. **`app/pages/admin-panel.tsx`** - Sin cambios (ya usa `useCategories()`)
3. **`app/pages/courses.tsx`** - Eliminar `categoryMetadata` hardcodeado
4. **`app/pages/courses/[category].tsx`** - Sin cambios necesarios

### Nuevos Archivos:

1. **`app/hooks/useAdminCategories.ts`** - Hook para CRUD admin
2. **`app/pages/admin/categories.tsx`** - Página de gestión
3. **`app/components/admin/CategoryForm.tsx`** - Formulario de categoría

---

## 7. FLUJOS COMPLETOS

### 7.1 Crear Nueva Categoría

```
Admin → /admin/categories
   ↓
Click "Crear Categoría"
   ↓
Formulario aparece (CategoryForm)
   ↓
Admin llena:
  - category_id: "serverless"
  - label: "Serverless"
  - emoji: "🚀"
  - color: "from-yellow-500 to-orange-600"
  - description: "AWS Lambda, API Gateway..."
  - level: "Intermedio"
  - display_order: 8
  - is_active: true
   ↓
Click "Crear Categoría"
   ↓
useAdminCategories.createCategory(data)
   ↓
POST /api/admin/categories
  Headers: { Authorization: Bearer <JWT> }
  Body: { category_id: "serverless", label: "Serverless", ... }
   ↓
Backend (categories-handler)
  - Verifica autenticación
  - Verifica grupo Admins
  - Valida que category_id no existe
  - Crea item en DynamoDB:
    PK: "CATEGORY#serverless"
    SK: "METADATA"
   ↓
Frontend refetch categorías
   ↓
Categoría aparece en lista
```

### 7.2 Crear Curso en Nueva Categoría

```
Admin → /admin-panel
   ↓
Click "Crear Nuevo Curso"
   ↓
useCategories() obtiene categorías dinámicas de API
   ↓
Select de categoría muestra:
  - Bedrock 🤖
  - Security 🔒
  - ...
  - Serverless 🚀  ← Nueva categoría
   ↓
Admin selecciona "Serverless"
   ↓
Llena otros campos del curso
   ↓
Click "Crear Curso"
   ↓
POST /api/admin/courses
  Body: { course_id: "lambda-basics", category: "serverless", ... }
   ↓
Backend guarda en CourseCatalog con category: "serverless"
   ↓
Curso creado
```

### 7.3 Usuario Ve Nueva Categoría

```
Usuario → /courses
   ↓
useCategories() fetch dinámico
   ↓
GET /api/categories
   ↓
Backend retorna categorías activas ordenadas por display_order
   ↓
Frontend renderiza grid con tarjetas:
  - Bedrock (8 cursos)
  - Security (18 cursos)
  - ...
  - Serverless (1 curso) ← Nueva categoría
   ↓
Usuario click "Explorar" en Serverless
   ↓
Router.push('/courses/serverless')
   ↓
Página [category].tsx
   ↓
getCategoryConfig('serverless') → datos de DynamoDB
   ↓
useCourses({ category: 'serverless' })
   ↓
Renderiza hero, arquitectura, cursos
```

---

## 8. TESTING

### 8.1 Testing Backend

```bash
# Crear tabla
cd cloudacademy-tutor-backend/terraform
terraform apply

# Crear categoría de prueba
curl -X POST https://API_URL/prod/api/admin/categories \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": "test-category",
    "label": "Test Category",
    "emoji": "🧪",
    "color": "from-green-500 to-teal-600",
    "description": "Categoría de prueba",
    "level": "Intermedio",
    "display_order": 999,
    "is_active": true
  }'

# Listar categorías
curl https://API_URL/prod/api/categories

# Verificar DynamoDB
aws dynamodb scan --table-name Categories --output table
```

### 8.2 Testing Frontend

1. **Admin Panel:**
   - Login como Admin
   - Ir a /admin/categories
   - Crear categoría "Test"
   - Editar categoría
   - Verificar en lista

2. **Creación de Curso:**
   - Ir a /admin-panel
   - Crear nuevo curso
   - Verificar que categoría "Test" aparece en select
   - Crear curso con categoría "Test"

3. **Visualización Pública:**
   - Ir a /courses
   - Verificar que categoría "Test" aparece
   - Click en categoría
   - Verificar que /courses/test renderiza correctamente
   - Verificar que curso creado aparece

### 8.3 Testing End-to-End

```
1. Admin crea categoría "Machine Learning" con emoji 🤖
2. Admin crea 3 cursos en categoría "Machine Learning"
3. Usuario logout y vuelve a login
4. Usuario ve "Machine Learning" en /courses con "3 cursos"
5. Usuario entra a /courses/machine-learning
6. Ve los 3 cursos creados
7. Todo renderiza correctamente
```

---

## 9. PREGUNTAS Y DECISIONES

### 9.1 ¿Migrar datos existentes?

**Pregunta:** ¿Migramos las 7 categorías actuales hardcodeadas a DynamoDB?

**Opciones:**
- **A) Sí, migrar automáticamente** con script
- **B) No, que Admin las cree manualmente**
- **C) Mixto: migrar automáticamente pero permitir editar**

**Recomendación:** Opción C - Script de migración que lea `CATEGORY_CONFIG` y cree items en DynamoDB, luego Admin puede editar.

---

### 9.2 ¿Qué hacer con `architecture` field?

**Pregunta:** ¿Cómo manejar el campo `architecture` que es un array complejo?

**Opciones:**
- **A) JSON string** en DynamoDB
- **B) DynamoDB List** (nativo)
- **C) Editor visual en frontend**

**Recomendación:** Opción B (DynamoDB List) + editor simple JSON textarea. Opcionalmente hacer editor visual en fase futura.

---

### 9.3 ¿Course count automático o manual?

**Pregunta:** ¿El campo `course_count` debe calcularse automáticamente?

**Opciones:**
- **A) Manual** - Admin lo actualiza
- **B) Automático** - Lambda cuenta cursos en cada query
- **C) Batch job** - Script nightly que actualiza counts

**Recomendación:** Opción A por ahora (manual). Fase futura: agregar botón "Recalcular" que haga query de cursos.

---

### 9.4 ¿Validación de category en cursos?

**Pregunta:** Al crear curso, ¿validar que category existe en DynamoDB?

**Opciones:**
- **A) No validar** - confiar en que Admin selecciona del dropdown
- **B) Validar en backend** - Lambda verifica que category existe

**Recomendación:** Opción B - Agregar validación en admin-handler al crear/editar curso.

---

### 9.5 ¿Soft delete o hard delete?

**Pregunta:** Al eliminar categoría, ¿borrar permanentemente o solo marcar inactiva?

**Opciones:**
- **A) Hard delete** - Eliminar item de DynamoDB
- **B) Soft delete** - Setear `is_active: false`

**Recomendación:** Opción B - Soft delete. Si categoría tiene cursos, solo permitir desactivar, no eliminar.

---

### 9.6 ¿Deprecar CATEGORY_CONFIG?

**Pregunta:** ¿Eliminar archivo `app/utils/categories.ts` después de migrar?

**Opciones:**
- **A) Sí, eliminar** - forzar uso de API
- **B) Mantener como fallback** - si API falla, usar hardcoded
- **C) Mantener por compatibilidad** - durante transición

**Recomendación:** Opción B - Mantener como fallback en `useCategories` hook (ya implementado en código).

---

## 10. RESUMEN DE DECISIONES PENDIENTES

Antes de empezar, necesito confirmar:

1. ✅ **¿Migrar categorías existentes a DynamoDB?** (Opción C recomendada)
2. ✅ **¿Architecture como List o JSON?** (List nativo recomendado)
3. ✅ **¿Course count manual o automático?** (Manual por ahora)
4. ✅ **¿Validar category al crear curso?** (Sí, backend valida)
5. ✅ **¿Soft delete o hard delete?** (Soft delete recomendado)
6. ✅ **¿Mantener CATEGORY_CONFIG como fallback?** (Sí, recomendado)

---

## 11. ORDEN DE IMPLEMENTACIÓN RECOMENDADO

### Sprint 1: Backend (3-4 horas)
1. Crear tabla Categories en DynamoDB (terraform)
2. Crear Lambda categories-handler
3. Configurar API Gateway endpoints
4. Configurar permisos IAM
5. Deploy y testing de API

### Sprint 2: Script de Migración (1 hora)
1. Script para migrar CATEGORY_CONFIG → DynamoDB
2. Ejecutar migración
3. Verificar datos en DynamoDB

### Sprint 3: Frontend Admin (2-3 horas)
1. Crear hook useAdminCategories
2. Crear componente CategoryForm
3. Crear página admin/categories
4. Testing de CRUD

### Sprint 4: Frontend Public (1 hora)
1. Modificar useCategories para usar API
2. Eliminar categoryMetadata hardcodeado
3. Testing de visualización pública

### Sprint 5: Testing End-to-End (1 hora)
1. Testing completo del flujo
2. Fixes de bugs
3. Validación final

**Total estimado: 8-10 horas**

---

## FIN DEL DOCUMENTO

Este plan proporciona una guía completa para implementar categorías dinámicas.

¿Hay algo que quieras aclarar o modificar antes de empezar?
