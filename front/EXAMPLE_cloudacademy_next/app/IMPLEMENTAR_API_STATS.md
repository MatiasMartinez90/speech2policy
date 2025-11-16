# Implementación de /api/stats - Estadísticas Dinámicas

## 📋 Contexto

Actualmente la página `/courses` muestra estadísticas estáticas:
- **Cursos Totales**: 129 (hardcoded)
- **Horas de Contenido**: 150+ (hardcoded)

Necesitamos que estos valores se calculen dinámicamente desde la base de datos.

## 🏗️ Arquitectura Actual

### Backend (cloudacademy-tutor-backend)

**Estructura de Lambdas:**
```
lambdas/
├── admin-handler/          # CRUD cursos (con auth)
├── courses-handler/        # Lectura pública (sin auth)
├── progress-handler/
├── sections-handler/
├── tutor-handler/
└── upload-handler/
```

**Endpoints Públicos Existentes en courses-handler:**
- `GET /api/courses` - Lista cursos (con filtros opcionales)
- `GET /api/courses/{id}` - Detalle de curso
- `GET /api/courses/{id}/sections/{sectionId}` - Sección específica

**DynamoDB Table:**
- Tabla: `CourseCatalog`
- Estructura:
  - `PK`: `COURSE#{course_id}`
  - `SK`: `METADATA` (metadata del curso) o `SECTION#{section_id}` (secciones)

**Campos Relevantes en Metadata:**
```python
{
  'course_id': 'bedrock-rag-intro',
  'course_name': 'Introducción a RAG con Bedrock',
  'category': 'bedrock',
  'difficulty': 'Intermediate',
  'is_published': True,
  'student_count': 45,
  'estimated_time': '2.5',  # en horas (Decimal)
  'cost': 20.0,
  'average_rating': 4.5,
  'completion_rate': 85.5,
  # ... otros campos
}
```

### Frontend (cloudacademy_next)

**Página Actual:** `/pages/courses.tsx`
```typescript
// Stats hardcoded actualmente
<div>Cursos Totales: 129</div>
<div>Horas de Contenido: 150+</div>
```

---

## 🎯 Solución: Agregar Endpoint /api/stats

### Opción Elegida
Agregar un nuevo endpoint a `courses-handler` lambda (ya que es pública y está relacionada con cursos).

---

## 📝 PASO 1: Backend - Modificar courses-handler Lambda

### Ubicación
`/Users/matiasmartinez/Documents/repos/cloudacademy-tutor-backend/lambdas/courses-handler/lambda_function.py`

### Cambio 1.1: Agregar routing para /api/stats

**Ubicación:** Función `lambda_handler()` línea 50-70

**Código Actual:**
```python
# Routing por endpoint
if http_method == 'GET':
    # GET /api/courses/{id}/sections/{sectionId}
    if '/sections/' in path:
        course_id = path_parameters.get('id')
        section_id = path_parameters.get('sectionId')
        return handle_get_section(course_id, section_id)

    # GET /api/courses/{id}
    elif path_parameters.get('id'):
        course_id = path_parameters.get('id')
        return handle_get_course(course_id)

    # GET /api/courses
    else:
        query_params = event.get('queryStringParameters') or {}
        return handle_list_courses(query_params)
```

**Código NUEVO (agregar antes de "GET /api/courses/{id}"):**
```python
# Routing por endpoint
if http_method == 'GET':
    # GET /api/stats (NUEVO)
    if path == '/api/stats':
        return handle_get_stats()

    # GET /api/courses/{id}/sections/{sectionId}
    if '/sections/' in path:
        course_id = path_parameters.get('id')
        section_id = path_parameters.get('sectionId')
        return handle_get_section(course_id, section_id)

    # GET /api/courses/{id}
    elif path_parameters.get('id'):
        course_id = path_parameters.get('id')
        return handle_get_course(course_id)

    # GET /api/courses
    else:
        query_params = event.get('queryStringParameters') or {}
        return handle_list_courses(query_params)
```

### Cambio 1.2: Agregar función handle_get_stats()

**Ubicación:** Agregar DESPUÉS de `handle_get_section()` (línea 262)

**Código NUEVO:**
```python
def handle_get_stats():
    """
    Maneja GET /api/stats

    Retorna estadísticas globales de todos los cursos publicados:
    - Total de cursos
    - Total de horas de contenido
    - Total de estudiantes
    - Total de categorías únicas
    - Rating promedio

    Returns:
        dict: Response con estadísticas globales
    """
    try:
        logger.info("Getting global stats")

        # Scan de todos los cursos publicados
        response = table.scan(
            FilterExpression='SK = :metadata AND is_published = :published',
            ExpressionAttributeValues={
                ':metadata': 'METADATA',
                ':published': True
            }
        )

        courses = response.get('Items', [])

        # Calcular estadísticas
        total_courses = len(courses)

        # Total de horas (sumar estimated_time)
        total_hours = 0.0
        for course in courses:
            estimated_time = course.get('estimated_time', 0)
            # estimated_time puede ser Decimal, string o número
            try:
                if isinstance(estimated_time, Decimal):
                    total_hours += float(estimated_time)
                elif isinstance(estimated_time, str):
                    # Parsear strings como "2.5 horas" o "2.5"
                    time_str = estimated_time.split()[0]  # Tomar solo el número
                    total_hours += float(time_str)
                else:
                    total_hours += float(estimated_time)
            except (ValueError, TypeError, AttributeError):
                # Si no se puede parsear, ignorar
                logger.warning(f"Could not parse estimated_time: {estimated_time}")
                continue

        # Total de estudiantes
        total_students = sum(int(course.get('student_count', 0)) for course in courses)

        # Categorías únicas
        unique_categories = set(course.get('category', '') for course in courses if course.get('category'))
        total_categories = len(unique_categories)

        # Rating promedio (de cursos que tienen rating)
        ratings = [
            float(course.get('average_rating', 0))
            for course in courses
            if course.get('average_rating') and float(course.get('average_rating', 0)) > 0
        ]
        average_rating = round(sum(ratings) / len(ratings), 1) if ratings else 0.0

        # Preparar response
        stats = {
            'totalCourses': total_courses,
            'totalHours': round(total_hours, 1),
            'totalStudents': total_students,
            'totalCategories': total_categories,
            'averageRating': average_rating,
            'timestamp': datetime.now().isoformat()
        }

        logger.info(f"Stats calculated: {stats}")

        return success_response(stats)

    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}", exc_info=True)
        return error_response(500, f'Error getting stats: {str(e)}')
```

### Cambio 1.3: Agregar import de datetime

**Ubicación:** Top del archivo (línea 10-16)

**Código Actual:**
```python
import json
import os
import logging
import boto3
from boto3.dynamodb.conditions import Key
from decimal import Decimal
```

**Código NUEVO:**
```python
import json
import os
import logging
import boto3
from boto3.dynamodb.conditions import Key
from decimal import Decimal
from datetime import datetime  # NUEVO
```

### Cambio 1.4: Actualizar docstring del módulo

**Ubicación:** Top del archivo (línea 1-9)

**Código Actual:**
```python
"""
Lambda Handler: courses-handler
Maneja lectura de cursos y secciones del catálogo

Endpoints:
- GET /api/courses - Listar todos los cursos
- GET /api/courses/{id} - Detalle de un curso
- GET /api/courses/{id}/sections/{sectionId} - Contenido de una sección
"""
```

**Código NUEVO:**
```python
"""
Lambda Handler: courses-handler
Maneja lectura de cursos y secciones del catálogo

Endpoints:
- GET /api/stats - Estadísticas globales del catálogo
- GET /api/courses - Listar todos los cursos
- GET /api/courses/{id} - Detalle de un curso
- GET /api/courses/{id}/sections/{sectionId} - Contenido de una sección
"""
```

### Cambio 1.5: Deploy de Lambda

**Comandos desde `/Users/matiasmartinez/Documents/repos/cloudacademy-tutor-backend/lambdas/courses-handler`:**

```bash
# 1. Crear zip
zip -r ../courses-handler.zip lambda_function.py

# 2. Deploy con AWS CLI
aws lambda update-function-code \
  --function-name cloudacademy-courses-handler \
  --zip-file fileb://../courses-handler.zip \
  --region us-east-1
```

**Verificar deploy:**
```bash
aws lambda get-function-configuration \
  --function-name cloudacademy-courses-handler \
  --region us-east-1 \
  --query 'LastModified'
```

---

## 📝 PASO 2: Terraform - Agregar Ruta /api/stats en API Gateway

### Ubicación
`/Users/matiasmartinez/Documents/repos/cloudacademy-tutor-backend/terraform/api-gateway.tf`

### Cambio 2.1: Buscar la sección de /api/courses

**Buscar línea que contiene:**
```terraform
resource "aws_api_gateway_resource" "courses" {
```

**Agregar DESPUÉS de todos los recursos de /api/courses (antes de /api/admin):**

### Cambio 2.2: Crear recurso /api/stats

```terraform
# ============================================================================
# Resources: /api/stats (Estadísticas globales - público)
# ============================================================================

resource "aws_api_gateway_resource" "stats" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  parent_id   = aws_api_gateway_resource.api.id
  path_part   = "stats"
}

# GET /api/stats (público - sin auth)
resource "aws_api_gateway_method" "stats_get" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.stats.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "stats_get" {
  rest_api_id             = aws_api_gateway_rest_api.tutor_api.id
  resource_id             = aws_api_gateway_resource.stats.id
  http_method             = aws_api_gateway_method.stats_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.courses_handler.invoke_arn
}

# OPTIONS /api/stats (CORS preflight)
resource "aws_api_gateway_method" "stats_options" {
  rest_api_id   = aws_api_gateway_rest_api.tutor_api.id
  resource_id   = aws_api_gateway_resource.stats.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "stats_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.stats.id
  http_method = aws_api_gateway_method.stats_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "stats_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.stats.id
  http_method = aws_api_gateway_method.stats_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "stats_options" {
  rest_api_id = aws_api_gateway_rest_api.tutor_api.id
  resource_id = aws_api_gateway_resource.stats.id
  http_method = aws_api_gateway_method.stats_options.http_method
  status_code = aws_api_gateway_method_response.stats_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}
```

### Cambio 2.3: Deploy de Terraform

**Comandos desde `/Users/matiasmartinez/Documents/repos/cloudacademy-tutor-backend/terraform`:**

```bash
# 1. Formatear código
terraform fmt

# 2. Validar
terraform validate

# 3. Plan (revisar cambios)
terraform plan

# 4. Apply (desplegar)
terraform apply
```

**Nota:** Terraform va a crear los recursos de API Gateway para /api/stats y vincularlos con la lambda `courses_handler` existente.

---

## 📝 PASO 3: Frontend - Crear Hook useStats

### Ubicación
`/Users/matiasmartinez/Documents/repos/cloudacademy_next/app/hooks/useStats.ts` (NUEVO ARCHIVO)

### Código Completo

```typescript
/**
 * useStats Hook
 *
 * Hook para obtener estadísticas globales del catálogo de cursos
 * desde el endpoint público /api/stats
 *
 * Uso:
 * const { stats, loading, error } = useStats()
 */

import { useState, useEffect } from 'react'

export interface Stats {
  totalCourses: number
  totalHours: number
  totalStudents: number
  totalCategories: number
  averageRating: number
  timestamp?: string
}

interface UseStatsResult {
  stats: Stats
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const DEFAULT_STATS: Stats = {
  totalCourses: 0,
  totalHours: 0,
  totalStudents: 0,
  totalCategories: 0,
  averageRating: 0
}

export default function useStats(): UseStatsResult {
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    setLoading(true)
    setError(null)

    try {
      const API_URL = process.env.NEXT_PUBLIC_TUTOR_API_URL ||
                      'https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api'

      const response = await fetch(`${API_URL}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`)
      }

      const data = await response.json()
      setStats(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stats'
      setError(errorMessage)
      console.error('Error fetching stats:', err)

      // Mantener stats por defecto en caso de error
      setStats(DEFAULT_STATS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  }
}
```

---

## 📝 PASO 4: Frontend - Integrar en /pages/courses.tsx

### Ubicación
`/Users/matiasmartinez/Documents/repos/cloudacademy_next/app/pages/courses.tsx`

### Cambio 4.1: Agregar import

**Ubicación:** Top del archivo (línea 1-5)

**Código Actual:**
```typescript
import { NextPage } from 'next'
import Router from 'next/router'
import useUser from '../lib/useUser'
import AuthenticatedHeader from '../components/AuthenticatedHeader'
import useCategories from '../hooks/useCategories'
```

**Código NUEVO:**
```typescript
import { NextPage } from 'next'
import Router from 'next/router'
import useUser from '../lib/useUser'
import AuthenticatedHeader from '../components/AuthenticatedHeader'
import useCategories from '../hooks/useCategories'
import useStats from '../hooks/useStats'  // NUEVO
```

### Cambio 4.2: Usar hook en componente

**Ubicación:** Dentro del componente `Courses` (línea 8-10)

**Código Actual:**
```typescript
const Courses: NextPage = () => {
  const { user, loading: userLoading, loggedOut, signOut } = useUser({ redirect: '/signin' })
  const { categories, loading: categoriesLoading } = useCategories()
```

**Código NUEVO:**
```typescript
const Courses: NextPage = () => {
  const { user, loading: userLoading, loggedOut, signOut } = useUser({ redirect: '/signin' })
  const { categories, loading: categoriesLoading } = useCategories()
  const { stats, loading: statsLoading } = useStats()  // NUEVO
```

### Cambio 4.3: Actualizar valores hardcoded

**Buscar en el archivo las líneas con valores hardcoded:**

**ANTES:**
```typescript
<div className="text-lg font-medium text-white">129</div>  // Cursos Totales
```

**DESPUÉS:**
```typescript
<div className="text-lg font-medium text-white">
  {statsLoading ? '...' : stats.totalCourses}
</div>
```

**ANTES:**
```typescript
<div className="text-lg font-medium text-white">150+</div>  // Horas de Contenido
```

**DESPUÉS:**
```typescript
<div className="text-lg font-medium text-white">
  {statsLoading ? '...' : `${Math.round(stats.totalHours)}+`}
</div>
```

### Cambio 4.4: Actualizar loading state

**Buscar la condición de loading:**

**ANTES:**
```typescript
if (userLoading || categoriesLoading) return (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
  </div>
)
```

**DESPUÉS:**
```typescript
if (userLoading || categoriesLoading) return (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
  </div>
)

// Nota: statsLoading NO bloquea el render, solo muestra "..." mientras carga
```

---

## 🧪 PASO 5: Testing

### Test 1: Verificar Lambda Localmente

Si tenés Python instalado, podés testear la función handle_get_stats() localmente:

```python
# test_stats.py
import boto3
from decimal import Decimal

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('CourseCatalog')

response = table.scan(
    FilterExpression='SK = :metadata AND is_published = :published',
    ExpressionAttributeValues={
        ':metadata': 'METADATA',
        ':published': True
    }
)

courses = response.get('Items', [])
total_hours = sum(float(c.get('estimated_time', 0)) for c in courses)

print(f"Total cursos: {len(courses)}")
print(f"Total horas: {total_hours}")
```

### Test 2: Verificar Endpoint con curl

```bash
# Una vez desplegado terraform
curl https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api/stats
```

**Response esperado:**
```json
{
  "totalCourses": 129,
  "totalHours": 450.5,
  "totalStudents": 1234,
  "totalCategories": 7,
  "averageRating": 4.3,
  "timestamp": "2025-01-04T12:34:56.789123"
}
```

### Test 3: Verificar Frontend

1. Ejecutar `npm run dev` en el frontend
2. Abrir http://localhost:3000/courses
3. Verificar que los números cambien de "..." a los valores reales
4. Abrir DevTools → Network → Verificar llamada a `/api/stats`

---

## 📦 PASO 6: Deployment Completo

### Orden de Deployment

1. **Backend Lambda** (primero)
   ```bash
   cd /Users/matiasmartinez/Documents/repos/cloudacademy-tutor-backend/lambdas/courses-handler
   zip -r ../courses-handler.zip lambda_function.py
   aws lambda update-function-code \
     --function-name cloudacademy-courses-handler \
     --zip-file fileb://../courses-handler.zip \
     --region us-east-1
   ```

2. **Terraform** (segundo - crea ruta API Gateway)
   ```bash
   cd /Users/matiasmartinez/Documents/repos/cloudacademy-tutor-backend/terraform
   terraform fmt
   terraform validate
   terraform apply
   ```

3. **Frontend** (tercero - usa el nuevo endpoint)
   ```bash
   cd /Users/matiasmartinez/Documents/repos/cloudacademy_next/app
   npm run build
   # Push a git para que GitHub Actions despliegue
   git add hooks/useStats.ts pages/courses.tsx
   git commit -m "feat: Agregar estadísticas dinámicas con /api/stats"
   git push origin agent-fusion
   ```

### Verificar Deployment

```bash
# 1. Verificar Lambda actualizada
aws lambda get-function-configuration \
  --function-name cloudacademy-courses-handler \
  --region us-east-1

# 2. Verificar API Gateway
curl https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api/stats

# 3. Verificar Frontend
# Abrir https://proyectos.cloudacademy.ar/courses
# Ver que los números sean dinámicos
```

---

## 🚨 Troubleshooting

### Error: Lambda no encuentra el endpoint

**Síntoma:** `curl /api/stats` devuelve 404

**Solución:**
1. Verificar que terraform apply ejecutó exitosamente
2. Verificar que el recurso existe:
   ```bash
   aws apigateway get-resources \
     --rest-api-id <API_ID> \
     --region us-east-1
   ```

### Error: CORS en frontend

**Síntoma:** Error en browser console: "CORS policy blocked"

**Solución:**
1. Verificar que terraform creó el método OPTIONS
2. Verificar headers CORS en lambda `success_response()`

### Error: Stats retorna valores incorrectos

**Síntoma:** totalHours = 0 o valores extraños

**Solución:**
1. Revisar formato de `estimated_time` en DynamoDB (puede ser string, Decimal o número)
2. Agregar logging en lambda para debug
3. Ejecutar script de test local (test_stats.py)

### Error: Frontend muestra "..." permanentemente

**Síntoma:** Los stats nunca cargan

**Solución:**
1. Abrir DevTools → Network
2. Verificar que la llamada a `/api/stats` se hace
3. Verificar response de la API
4. Revisar console errors

---

## 📊 Métricas de Éxito

- ✅ Endpoint `/api/stats` responde en < 2 segundos
- ✅ Stats se actualizan automáticamente cuando se crean/publican cursos
- ✅ Frontend muestra valores correctos sin hardcoding
- ✅ No hay errores CORS
- ✅ Build de Next.js exitoso sin TypeScript errors

---

## 🔄 Mejoras Futuras (Opcional)

### Cacheo en CloudFront
Agregar header `Cache-Control` en lambda para cachear stats por 5 minutos:

```python
return {
    'statusCode': 200,
    'headers': {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'max-age=300'  # 5 minutos
    },
    'body': json.dumps(stats)
}
```

### Stats por Categoría
Agregar query param opcional para filtrar stats:
```
GET /api/stats?category=bedrock
```

### Dashboard de Admin
Reutilizar el hook `useStats` en el admin panel para mostrar métricas.

---

## 📝 Checklist de Implementación

### Backend
- [ ] Modificar `lambda_function.py` - agregar routing para /api/stats
- [ ] Agregar función `handle_get_stats()`
- [ ] Agregar import `from datetime import datetime`
- [ ] Actualizar docstring del módulo
- [ ] Crear zip y deploy lambda
- [ ] Verificar deploy con AWS CLI

### Terraform
- [ ] Agregar recurso `aws_api_gateway_resource.stats`
- [ ] Agregar método GET
- [ ] Agregar integración con lambda
- [ ] Agregar método OPTIONS (CORS)
- [ ] Ejecutar `terraform fmt`
- [ ] Ejecutar `terraform validate`
- [ ] Ejecutar `terraform plan` (revisar)
- [ ] Ejecutar `terraform apply`

### Frontend
- [ ] Crear archivo `hooks/useStats.ts`
- [ ] Implementar función `fetchStats()`
- [ ] Agregar interfaces TypeScript
- [ ] Importar hook en `pages/courses.tsx`
- [ ] Usar hook: `const { stats, loading } = useStats()`
- [ ] Reemplazar valores hardcoded con `stats.totalCourses` y `stats.totalHours`
- [ ] Manejar loading state (mostrar "...")
- [ ] Build: `npm run build`
- [ ] Commit y push

### Testing
- [ ] Test endpoint con curl
- [ ] Test frontend en localhost
- [ ] Verificar Network tab en DevTools
- [ ] Verificar valores correctos
- [ ] Verificar sin errores CORS
- [ ] Test en producción después de deploy

---

## 🎯 Resultado Final

**Antes:**
```typescript
<div>Cursos Totales: 129</div>  // hardcoded
<div>Horas de Contenido: 150+</div>  // hardcoded
```

**Después:**
```typescript
<div>Cursos Totales: {stats.totalCourses}</div>  // dinámico desde DB
<div>Horas de Contenido: {Math.round(stats.totalHours)}+</div>  // dinámico desde DB
```

---

**Documento creado:** 2025-01-04
**Autor:** Claude Code
**Versión:** 1.0
