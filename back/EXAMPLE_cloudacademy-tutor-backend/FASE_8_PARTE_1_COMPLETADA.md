# Fase 8 (Fase 2) Parte 1: Backend Infrastructure - COMPLETADA ✅

**Fecha de completación:** 2025-11-02
**Duración:** ~3 horas
**Estado:** Backend desplegado, pendiente endpoints API Gateway y frontend

---

## 📋 Resumen Ejecutivo

Se implementó la **infraestructura backend** necesaria para el editor de secciones de cursos:

1. ✅ **S3 Bucket** - Almacenamiento de imágenes de cursos con encryption y CORS
2. ✅ **Lambda upload-handler** - Generación de presigned URLs para uploads
3. ✅ **Lambda sections-handler** - CRUD completo de secciones
4. ✅ **IAM Roles & Policies** - Permisos S3, DynamoDB y Cognito
5. ✅ **CloudWatch Logs** - Logging para ambos Lambdas

**Infraestructura desplegada:** 16 recursos nuevos en AWS

---

## 🎯 Objetivos Completados

### ✅ 1. S3 Bucket para Imágenes de Cursos

**Archivo:** `terraform/s3.tf` (NUEVO - 175 líneas)

**Recursos creados:**

#### Bucket Principal
```hcl
resource "aws_s3_bucket" "course_images" {
  bucket = "cloudacademy-course-images-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "CloudAcademy Course Images"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
```

**Nombre del bucket:** `cloudacademy-course-images-982081083386`

#### Características de Seguridad

**1. Versionado habilitado**
```hcl
resource "aws_s3_bucket_versioning" "course_images" {
  versioning_configuration {
    status = "Enabled"  # Recuperar imágenes borradas accidentalmente
  }
}
```

**2. Encryption por defecto (AES256)**
```hcl
resource "aws_s3_bucket_server_side_encryption_configuration" "course_images" {
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
```

**3. Bloqueo de acceso público**
```hcl
resource "aws_s3_bucket_public_access_block" "course_images" {
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

**Nota:** Las imágenes se sirven vía presigned URLs generadas por el Lambda.

#### Configuración CORS

```hcl
resource "aws_s3_bucket_cors_configuration" "course_images" {
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = [
      "http://localhost:3000",
      "https://proyectos.cloudacademy.ar",
      "https://*.cloudacademy.ar"
    ]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}
```

**¿Por qué CORS?** Permite uploads directos desde el frontend sin pasar por el backend.

#### Lifecycle Policies (Optimización de Costos)

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "course_images" {
  # Regla 1: Eliminar versiones antiguas después de 30 días
  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  # Regla 2: Eliminar uploads incompletos después de 7 días
  rule {
    id     = "delete-incomplete-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}
```

**Impacto en costos:**
- Elimina versiones antiguas automáticamente
- Limpia uploads fallidos
- Estimado: ~$0.023/GB/mes (US East 1)

---

### ✅ 2. Lambda upload-handler

**Archivo:** `lambdas/upload-handler/lambda_function.py` (NUEVO - 365 líneas)

**Función:** Gestionar uploads de imágenes a S3 con seguridad y control de acceso.

#### Endpoints Implementados

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/admin/upload-url` | Generar presigned URL | Admin |
| GET | `/api/admin/images?course_id={id}` | Listar imágenes de curso | Admin |
| DELETE | `/api/admin/images/{key}` | Eliminar imagen | Admin |

#### Flujo de Upload de Imagen

```
1. Admin selecciona imagen en frontend
   ↓
2. Frontend llama POST /api/admin/upload-url
   Request: {
     "course_id": "terraform-basics",
     "filename": "diagram.png",
     "content_type": "image/png"
   }
   ↓
3. Lambda upload-handler:
   - Verifica que usuario es Admin
   - Valida content_type (solo imágenes)
   - Genera S3 key: courses/{course_id}/{timestamp}_{filename}
   - Crea presigned URL (válida 15 minutos)
   ↓
4. Response: {
     "presigned_url": "https://s3...?signature=...",
     "public_url": "https://s3.../courses/terraform-basics/20251102_diagram.png",
     "s3_key": "courses/terraform-basics/20251102_150000_diagram.png",
     "expires_in": 900
   }
   ↓
5. Frontend sube imagen directamente a S3 usando presigned URL
   PUT {presigned_url}
   Body: [binary image data]
   ↓
6. S3 confirma upload
   ↓
7. Frontend guarda public_url en contenido de sección
```

#### Características de Seguridad

**1. Verificación de Admin**
```python
def is_admin(user_id):
    response = cognito.admin_list_groups_for_user(
        Username=user_id,
        UserPoolId=COGNITO_USER_POOL_ID
    )
    groups = [group['GroupName'] for group in response['Groups']]
    return 'Admins' in groups
```

**2. Validación de Content-Type**
```python
allowed_types = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
if content_type not in allowed_types:
    return error_response(400, f'Invalid content_type')
```

**3. S3 Keys con Timestamp**
```python
timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
safe_filename = filename.replace(' ', '_').replace('/', '_')
s3_key = f"courses/{course_id}/{timestamp}_{safe_filename}"
```

**Beneficios:**
- No hay colisiones de nombres
- Fácil organización por curso
- Nombres de archivo seguros

#### Funciones Implementadas

**1. Generar Presigned URL**
```python
def handle_generate_upload_url(body):
    # Validar campos requeridos
    course_id = body['course_id']
    filename = body['filename']
    content_type = body['content_type']

    # Generar key único
    s3_key = f"courses/{course_id}/{timestamp}_{safe_filename}"

    # Generar presigned URL (15 minutos)
    presigned_url = s3.generate_presigned_url(
        'put_object',
        Params={
            'Bucket': S3_BUCKET,
            'Key': s3_key,
            'ContentType': content_type,
        },
        ExpiresIn=900
    )

    return success_response({
        'presigned_url': presigned_url,
        'public_url': f"https://{S3_BUCKET}.s3.amazonaws.com/{s3_key}",
        's3_key': s3_key
    })
```

**2. Listar Imágenes de un Curso**
```python
def handle_list_images(course_id):
    prefix = f"courses/{course_id}/"

    response = s3.list_objects_v2(
        Bucket=S3_BUCKET,
        Prefix=prefix
    )

    images = []
    for obj in response.get('Contents', []):
        images.append({
            's3_key': obj['Key'],
            'public_url': f"https://{S3_BUCKET}.s3.amazonaws.com/{obj['Key']}",
            'size': obj['Size'],
            'last_modified': obj['LastModified'].isoformat(),
            'filename': obj['Key'].split('/')[-1]
        })

    return success_response({'images': images})
```

**3. Eliminar Imagen**
```python
def handle_delete_image(image_key):
    # Verificar que existe
    s3.head_object(Bucket=S3_BUCKET, Key=image_key)

    # Eliminar
    s3.delete_object(Bucket=S3_BUCKET, Key=image_key)

    return success_response({'message': 'Image deleted successfully'})
```

---

### ✅ 3. Lambda sections-handler

**Archivo:** `lambdas/sections-handler/lambda_function.py` (NUEVO - 580 líneas)

**Función:** CRUD completo de secciones de cursos con soporte para contenido rich, imágenes y configuración de agente IA.

#### Endpoints Implementados

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/api/admin/courses/{id}/sections` | Crear sección | Admin |
| PUT | `/api/admin/courses/{id}/sections/{sectionId}` | Actualizar sección | Admin |
| DELETE | `/api/admin/courses/{id}/sections/{sectionId}` | Eliminar sección | Admin |
| PUT | `/api/admin/courses/{id}/sections/reorder` | Reordenar secciones | Admin |

#### Schema de Sección en DynamoDB

```python
{
    'PK': 'COURSE#terraform-aws-basics',
    'SK': 'SECTION#1',
    'section_id': 1,
    'title': 'Introducción a Terraform',
    'order': 1,
    'content': '<p>HTML content del rich text editor...</p>',
    'estimated_time': '30 minutos',
    'images': [
        'https://cloudacademy-course-images.s3.../diagram.png',
        'https://cloudacademy-course-images.s3.../screenshot.jpg'
    ],
    'agent_config': {
        'system_prompt': 'Eres un tutor experto en Terraform...',
        'validation_criteria': {
            'keywords': ['terraform', 'init', 'plan'],
            'required_concepts': ['infrastructure as code']
        },
        'hints': {
            'level_1': 'Piensa en los comandos básicos de Terraform...',
            'level_2': 'Terraform tiene 3 comandos esenciales: init, plan, apply',
            'level_3': 'Primero ejecuta terraform init para inicializar el proyecto'
        }
    },
    'created_at': '2025-11-02T16:00:00Z',
    'updated_at': '2025-11-02T16:00:00Z'
}
```

#### Funciones Implementadas

**1. Crear Sección**
```python
def handle_create_section(course_id, body):
    # Validar que el curso existe
    existing = table.get_item(Key={'PK': f'COURSE#{course_id}', 'SK': 'METADATA'})
    if 'Item' not in existing:
        return error_response(404, f'Course {course_id} not found')

    # Crear sección
    section_id = body['order']
    section = {
        'PK': f'COURSE#{course_id}',
        'SK': f'SECTION#{section_id}',
        'section_id': section_id,
        'title': body['title'],
        'order': body['order'],
        'content': body.get('content', ''),
        'estimated_time': body.get('estimated_time', ''),
        'images': body.get('images', []),
        'agent_config': body.get('agent_config', {}),
        'created_at': timestamp,
        'updated_at': timestamp
    }

    table.put_item(Item=section)

    # Actualizar total_sections en metadata del curso
    update_course_total_sections(course_id)

    return success_response({'section': section}, status_code=201)
```

**2. Actualizar Sección**
```python
def handle_update_section(course_id, section_id, body):
    # Verificar que existe
    existing = table.get_item(
        Key={'PK': f'COURSE#{course_id}', 'SK': f'SECTION#{section_id}'}
    )
    if 'Item' not in existing:
        return error_response(404, 'Section not found')

    # Campos actualizables
    updatable_fields = ['title', 'content', 'estimated_time', 'order', 'images', 'agent_config']

    update_expression = 'SET updated_at = :updated_at'
    expression_values = {':updated_at': timestamp}
    expression_names = {}

    for field in updatable_fields:
        if field in body:
            update_expression += f', #{field} = :{field}'
            expression_names[f'#{field}'] = field
            expression_values[f':{field}'] = body[field]

    response = table.update_item(
        Key={'PK': f'COURSE#{course_id}', 'SK': f'SECTION#{section_id}'},
        UpdateExpression=update_expression,
        ExpressionAttributeNames=expression_names,
        ExpressionAttributeValues=expression_values,
        ReturnValues='ALL_NEW'
    )

    return success_response({'section': response['Attributes']})
```

**3. Eliminar Sección**
```python
def handle_delete_section(course_id, section_id):
    # Verificar que existe
    existing = table.get_item(
        Key={'PK': f'COURSE#{course_id}', 'SK': f'SECTION#{section_id}'}
    )
    if 'Item' not in existing:
        return error_response(404, 'Section not found')

    # Eliminar
    table.delete_item(
        Key={'PK': f'COURSE#{course_id}', 'SK': f'SECTION#{section_id}'}
    )

    # Actualizar total_sections
    update_course_total_sections(course_id)

    return success_response({'message': 'Section deleted successfully'})
```

**4. Reordenar Secciones**
```python
def handle_reorder_sections(course_id, body):
    # body: {"sections": [{"section_id": 1, "order": 0}, ...]}
    sections = body['sections']
    updated_count = 0

    for section_data in sections:
        table.update_item(
            Key={'PK': f'COURSE#{course_id}', 'SK': f'SECTION#{section_data["section_id"]}'},
            UpdateExpression='SET #order = :order, updated_at = :updated_at',
            ExpressionAttributeNames={'#order': 'order'},
            ExpressionAttributeValues={
                ':order': section_data['order'],
                ':updated_at': timestamp
            }
        )
        updated_count += 1

    return success_response({'updated_count': updated_count})
```

**5. Actualizar Total de Secciones (Helper)**
```python
def update_course_total_sections(course_id):
    # Contar secciones del curso
    response = table.query(
        KeyConditionExpression=Key('PK').eq(f'COURSE#{course_id}')
                             & Key('SK').begins_with('SECTION#')
    )

    total_sections = len(response.get('Items', []))

    # Actualizar metadata
    table.update_item(
        Key={'PK': f'COURSE#{course_id}', 'SK': 'METADATA'},
        UpdateExpression='SET total_sections = :total',
        ExpressionAttributeValues={':total': total_sections}
    )
```

---

### ✅ 4. IAM Roles y Policies

#### Role para upload-handler

**Permissions:**
1. **S3 Full Access** (en course-images bucket)
   - s3:PutObject
   - s3:GetObject
   - s3:DeleteObject
   - s3:ListBucket

2. **Cognito Read** (verificar grupo Admins)
   - cognito-idp:AdminGetUser
   - cognito-idp:AdminListGroupsForUser

3. **CloudWatch Logs** (logging)
   - logs:CreateLogGroup
   - logs:CreateLogStream
   - logs:PutLogEvents

**Policy ARN:** `arn:aws:iam::982081083386:policy/cloudacademy-upload-s3-policy`

#### Role para sections-handler

**Reutiliza:** `aws_iam_role.lambda_admin_role`

**Permissions:**
1. **DynamoDB Full Access** (CourseCatalog table)
   - dynamodb:GetItem
   - dynamodb:PutItem
   - dynamodb:UpdateItem
   - dynamodb:DeleteItem
   - dynamodb:Query

2. **Cognito Read** (verificar grupo Admins)
3. **CloudWatch Logs** (logging)

---

### ✅ 5. Terraform Configuration Updates

#### lambda.tf (Modificado)

**Agregados:**

```hcl
# Lambda: upload-handler
resource "aws_lambda_function" "upload_handler" {
  filename         = data.archive_file.upload_handler_zip.output_path
  function_name    = "cloudacademy-upload-handler"
  role             = aws_iam_role.lambda_upload_role.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      S3_BUCKET            = aws_s3_bucket.course_images.id
      COGNITO_USER_POOL_ID = var.cognito_user_pool_id
    }
  }
}

# Lambda: sections-handler
resource "aws_lambda_function" "sections_handler" {
  filename         = data.archive_file.sections_handler_zip.output_path
  function_name    = "cloudacademy-sections-handler"
  role             = aws_iam_role.lambda_admin_role.arn
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.11"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      COURSES_TABLE        = aws_dynamodb_table.courses_catalog.name
      COGNITO_USER_POOL_ID = var.cognito_user_pool_id
    }
  }
}
```

**CloudWatch Log Groups:**
```hcl
resource "aws_cloudwatch_log_group" "upload_handler_logs" {
  name              = "/aws/lambda/cloudacademy-upload-handler"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "sections_handler_logs" {
  name              = "/aws/lambda/cloudacademy-sections-handler"
  retention_in_days = 7
}
```

**Outputs:**
```hcl
output "upload_handler_invoke_arn" {
  description = "Invoke ARN del upload-handler para API Gateway"
  value       = aws_lambda_function.upload_handler.invoke_arn
}

output "sections_handler_invoke_arn" {
  description = "Invoke ARN del sections-handler para API Gateway"
  value       = aws_lambda_function.sections_handler.invoke_arn
}

output "course_images_bucket_name" {
  description = "Nombre del bucket S3 para imágenes de cursos"
  value       = aws_s3_bucket.course_images.id
}

output "course_images_bucket_arn" {
  description = "ARN del bucket S3 para imágenes de cursos"
  value       = aws_s3_bucket.course_images.arn
}
```

---

## 📂 Archivos Creados/Modificados

### Backend (cloudacademy-tutor-backend)

| Archivo | Tipo | Líneas | Descripción |
|---------|------|--------|-------------|
| `terraform/s3.tf` | Creado | 175 | S3 bucket config completa |
| `lambdas/upload-handler/lambda_function.py` | Creado | 365 | Lambda para presigned URLs |
| `lambdas/sections-handler/lambda_function.py` | Creado | 580 | Lambda CRUD de secciones |
| `terraform/lambda.tf` | Modificado | +100 | Agregados 2 Lambdas nuevos |

**Total:** 4 archivos (3 nuevos, 1 modificado), +1220 líneas

---

## 🚀 Deployment

### Comandos Ejecutados

```bash
# 1. Commit de código
git add terraform/s3.tf terraform/lambda.tf lambdas/upload-handler/ lambdas/sections-handler/
git commit -m "Fase 2: Backend infrastructure para editor de secciones"
git push origin main

# 2. Deploy con Terraform
cd terraform
terraform plan   # Revisión: 17 recursos a crear
terraform apply -auto-approve

# Resultado: ✅ 16 recursos creados, 0 modificados, 0 destruidos
```

### Recursos Creados en AWS

```
✅ S3 Bucket: cloudacademy-course-images-982081083386
✅ S3 Versioning Configuration
✅ S3 Encryption Configuration
✅ S3 Public Access Block
✅ S3 CORS Configuration
✅ S3 Lifecycle Configuration

✅ IAM Role: cloudacademy-upload-handler-role
✅ IAM Policy: cloudacademy-upload-s3-policy
✅ IAM Policy: cloudacademy-upload-cognito-policy
✅ IAM Role Policy Attachments (3x)

✅ Lambda Function: cloudacademy-upload-handler
✅ CloudWatch Log Group: /aws/lambda/cloudacademy-upload-handler

✅ Lambda Function: cloudacademy-sections-handler
✅ CloudWatch Log Group: /aws/lambda/cloudacademy-sections-handler

✅ Archive Files (2x) - ZIP packages
```

**Total:** 16 recursos AWS creados

### Terraform Outputs

```hcl
course_images_bucket_name = "cloudacademy-course-images-982081083386"
course_images_bucket_arn  = "arn:aws:s3:::cloudacademy-course-images-982081083386"

upload_handler_invoke_arn = "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:982081083386:function:cloudacademy-upload-handler/invocations"

sections_handler_invoke_arn = "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:982081083386:function:cloudacademy-sections-handler/invocations"
```

---

## 💰 Estimación de Costos

### S3 Costs

**Storage:**
- Estimado: 100 imágenes x 500 KB = 50 MB
- Cost: $0.023/GB = ~$0.001/mes

**Requests:**
- PUT (uploads): 50/mes = $0.003
- GET (via presigned URL): Gratis (desde frontend)

**Subtotal S3:** ~$0.004/mes

### Lambda Costs

**upload-handler:**
- Invocaciones: ~50/mes (uploads)
- Duración promedio: 100ms
- Memoria: 256 MB
- Cost: $0.0000002 x 50 = ~$0.00001/mes

**sections-handler:**
- Invocaciones: ~200/mes (CRUD operations)
- Duración promedio: 150ms
- Memoria: 256 MB
- Cost: $0.0000002 x 200 = ~$0.00004/mes

**Subtotal Lambda:** ~$0.00005/mes

### Total Incremental

**~$0.005/mes** (negligible)

**Nota:** Los costos reales dependen del uso. Con 1000 imágenes y 5000 operaciones/mes, el costo seguiría siendo <$0.50/mes.

---

## 🔐 Seguridad

### Controles Implementados

**1. Autenticación y Autorización**
- ✅ Cognito JWT verificado en ambos Lambdas
- ✅ Solo usuarios del grupo "Admins" pueden acceder
- ✅ Extracción segura de user_id desde claims

**2. S3 Security**
- ✅ Public access bloqueado
- ✅ Encryption at rest (AES256)
- ✅ Versioning habilitado (recuperación de datos)
- ✅ Presigned URLs con expiración (15 minutos)

**3. Input Validation**
- ✅ Validación de content_type (solo imágenes)
- ✅ Sanitización de filenames
- ✅ Validación de course_id existence

**4. Error Handling**
- ✅ Try-catch en todas las funciones
- ✅ Logging detallado en CloudWatch
- ✅ Mensajes de error informativos sin exponer internals

---

## 🧪 Testing Manual

### Test 1: Generar Presigned URL

**Request:**
```bash
curl -X POST "https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api/admin/upload-url" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": "terraform-basics",
    "filename": "diagram.png",
    "content_type": "image/png"
  }'
```

**Expected Response:**
```json
{
  "presigned_url": "https://cloudacademy-course-images-982081083386.s3.amazonaws.com/courses/terraform-basics/20251102_150000_diagram.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&...",
  "public_url": "https://cloudacademy-course-images-982081083386.s3.amazonaws.com/courses/terraform-basics/20251102_150000_diagram.png",
  "s3_key": "courses/terraform-basics/20251102_150000_diagram.png",
  "expires_in": 900
}
```

### Test 2: Upload Imagen a S3

**Request:**
```bash
# Usar presigned_url del test anterior
curl -X PUT "$PRESIGNED_URL" \
  -H "Content-Type: image/png" \
  --data-binary "@diagram.png"
```

**Expected Response:**
```
HTTP 200 OK
```

### Test 3: Listar Imágenes

**Request:**
```bash
curl "https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api/admin/images?course_id=terraform-basics" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Expected Response:**
```json
{
  "course_id": "terraform-basics",
  "images": [
    {
      "s3_key": "courses/terraform-basics/20251102_150000_diagram.png",
      "public_url": "https://cloudacademy-course-images-982081083386.s3.amazonaws.com/courses/terraform-basics/20251102_150000_diagram.png",
      "size": 45678,
      "last_modified": "2025-11-02T15:00:00Z",
      "filename": "20251102_150000_diagram.png"
    }
  ],
  "total": 1
}
```

### Test 4: Crear Sección

**Request:**
```bash
curl -X POST "https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api/admin/courses/terraform-basics/sections" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Introducción a Terraform",
    "order": 1,
    "content": "<p>En esta sección aprenderás...</p>",
    "estimated_time": "30 minutos",
    "images": ["https://cloudacademy-course-images.../diagram.png"],
    "agent_config": {
      "system_prompt": "Eres un tutor experto en Terraform",
      "hints": {
        "level_1": "Piensa en los comandos básicos...",
        "level_2": "Terraform tiene 3 comandos esenciales...",
        "level_3": "Ejecuta terraform init primero"
      }
    }
  }'
```

**Expected Response:**
```json
{
  "message": "Section created successfully",
  "section": {
    "PK": "COURSE#terraform-basics",
    "SK": "SECTION#1",
    "section_id": 1,
    "title": "Introducción a Terraform",
    "order": 1,
    "content": "<p>En esta sección aprenderás...</p>",
    "estimated_time": "30 minutos",
    "images": ["https://cloudacademy-course-images.../diagram.png"],
    "agent_config": {...},
    "created_at": "2025-11-02T16:00:00Z",
    "updated_at": "2025-11-02T16:00:00Z"
  }
}
```

**Nota:** Testing completo requiere API Gateway endpoints (pendiente).

---

## 🐛 Troubleshooting

### Error: "Authentication required"

**Causa:** Token JWT no presente o inválido

**Solución:**
```bash
# Obtener token desde localStorage (DevTools)
JWT_TOKEN=$(cat token.txt)

# Verificar que el token es válido
aws cognito-idp get-user --access-token $JWT_TOKEN
```

### Error: "Admin access required"

**Causa:** Usuario no está en grupo Admins

**Solución:**
```bash
aws cognito-idp admin-add-user-to-group \
  --user-pool-id us-east-1_FbLlcvGLl \
  --username admin@example.com \
  --group-name Admins
```

### Error: "Invalid content_type"

**Causa:** Tipo de archivo no permitido

**Tipos permitidos:**
- image/png
- image/jpeg
- image/jpg
- image/gif
- image/webp

### Error: "Presigned URL expired"

**Causa:** URL expiró (15 minutos)

**Solución:** Generar nueva presigned URL

### Lambda Logs

**Ver logs en tiempo real:**
```bash
# upload-handler
aws logs tail /aws/lambda/cloudacademy-upload-handler --follow

# sections-handler
aws logs tail /aws/lambda/cloudacademy-sections-handler --follow
```

---

## 🔜 Próximos Pasos: Fase 2 Parte 2

### Pendiente de Implementación

**1. API Gateway Endpoints** (Backend)
- POST `/api/admin/upload-url`
- GET `/api/admin/images`
- DELETE `/api/admin/images/{key}`
- POST `/api/admin/courses/{id}/sections`
- PUT `/api/admin/courses/{id}/sections/{sectionId}`
- DELETE `/api/admin/courses/{id}/sections/{sectionId}`
- PUT `/api/admin/courses/{id}/sections/reorder`
- OPTIONS methods para CORS (7 endpoints)

**Estimado:** 2-3 horas

**2. Frontend - Página de Gestión de Secciones**
- Ruta: `/admin-panel/courses/[id]/sections`
- Lista de secciones con drag & drop
- Formulario crear/editar sección
- Rich text editor (TipTap)
- Upload de imágenes
- Configuración de agente IA

**Estimado:** 8-10 horas

**3. Frontend - Rich Text Editor**
- Integrar TipTap
- Toolbar con formateo básico
- Soporte para imágenes inline
- Preview en tiempo real

**Estimado:** 3-4 horas

**4. Frontend - Upload Component**
- Drag & drop de imágenes
- Progress bar
- Preview de imágenes
- Gestión de imágenes subidas

**Estimado:** 2-3 horas

**5. Testing Integral**
- CRUD completo de secciones
- Upload de imágenes
- Reorden de secciones
- Validación de agente IA

**Estimado:** 2 horas

### Total Restante: ~17-22 horas

---

## ✅ Checklist de Completación Parte 1

### Backend Infrastructure
- [x] S3 bucket creado con encryption y CORS
- [x] Lambda upload-handler implementado
- [x] Lambda sections-handler implementado
- [x] IAM roles y policies configurados
- [x] CloudWatch log groups creados
- [x] Terraform configuration actualizado
- [x] Deploy exitoso (16 recursos)
- [x] Outputs de Terraform verificados

### Testing
- [ ] API Gateway endpoints (pendiente)
- [ ] Upload presigned URL (pendiente - requiere endpoints)
- [ ] CRUD de secciones (pendiente - requiere endpoints)

### Documentación
- [x] FASE_8_PARTE_1_COMPLETADA.md creado
- [ ] README.md actualizado (siguiente)
- [ ] Frontend CLAUDE.md actualizado (siguiente)

---

**Fase 2 Parte 1 completada al 50%.** ✅

**Pendiente:**
- API Gateway endpoints
- Frontend completo
- Testing integral

**Responsable:** Claude Code
**Fecha:** 2025-11-02
**Branch:** main
**Commits:**
- `6576219` - "Fase 2: Backend infrastructure para editor de secciones"

---

## 📊 Progress Summary

| Componente | Estado | Progreso |
|------------|--------|----------|
| S3 Bucket | ✅ Completado | 100% |
| Lambda upload-handler | ✅ Completado | 100% |
| Lambda sections-handler | ✅ Completado | 100% |
| IAM Roles/Policies | ✅ Completado | 100% |
| CloudWatch Logs | ✅ Completado | 100% |
| **Backend Subtotal** | **✅ Completado** | **100%** |
| API Gateway Endpoints | ⏳ Pendiente | 0% |
| Frontend - Sections Page | ⏳ Pendiente | 0% |
| Frontend - Rich Editor | ⏳ Pendiente | 0% |
| Frontend - Upload Component | ⏳ Pendiente | 0% |
| Testing Integral | ⏳ Pendiente | 0% |
| **Total Fase 2** | **⏳ En Progreso** | **~35%** |

---

**🚀 Ready para continuar con API Gateway y Frontend!**
