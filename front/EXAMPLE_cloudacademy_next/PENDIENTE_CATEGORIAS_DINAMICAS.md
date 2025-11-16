# 🚀 Plan de Implementación: Categorías Dinámicas y Filtros de Cursos

**Fecha de inicio:** 2025-11-03
**Estado:** Fase 1 completada, Fases 2-4 pendientes
**Branch:** agent-fusion
**Tag de seguridad:** stable-pre-categories (commit 6db0f94)

---

## 📋 Índice

1. [Estado Actual](#estado-actual)
2. [Arquitectura Implementada](#arquitectura-implementada)
3. [Fase 1: COMPLETADA ✅](#fase-1-completada-)
4. [Fase 2: Campos Opcionales Backend](#fase-2-campos-opcionales-backend-pendiente)
5. [Fase 3: Filtros por Categoría](#fase-3-filtros-por-categoría-pendiente)
6. [Fase 4: Integración Frontend](#fase-4-integración-frontend-pendiente)
7. [Migración Futura: Admin de Categorías](#migración-futura-admin-de-categorías)
8. [Troubleshooting](#troubleshooting)

---

## Estado Actual

### ✅ Completado

- **Sistema de categorías estático** con 7 categorías estandarizadas
- **Abstraction layer** (`useCategories` hook) preparado para migración a API
- **Admin panel** actualizado con select dinámico de categorías
- **TypeScript types** completos y exportados
- **Tag de seguridad** creado: `stable-pre-categories`

### ⏳ Pendiente

- Agregar campos opcionales al backend (icon, type, featured, color, rating, student_count)
- Implementar filtros por categoría en `courses-handler` Lambda
- Actualizar `useCourses` hook con filtros dinámicos
- Modificar `/rag-bedrock` para usar API en lugar de datos hardcoded
- Deploy y testing completo

### 🎯 Objetivo Final

Portal escalable con:
- **100+ cursos** organizados por categorías
- **Filtrado performante** en backend (no frontend)
- **UX optimizada** con carga selectiva de cursos
- **Admin de categorías** dinámico (migración futura)

---

## Arquitectura Implementada

### Estructura de Archivos

```
app/
├── utils/
│   └── categories.ts          ← Config centralizada de categorías
├── hooks/
│   ├── useCategories.ts       ← Abstraction layer (preparado para API)
│   ├── useCourses.ts          ← Hook público (PENDIENTE: agregar filtros)
│   └── useAdminCourses.ts     ← Hook admin (OK)
└── pages/
    ├── admin-panel.tsx        ← Select dinámico (OK)
    ├── courses.tsx            ← Catálogo público (OK)
    ├── courses/[id].tsx       ← Página individual (OK)
    └── rag-bedrock.tsx        ← PENDIENTE: usar API
```

### Categorías Definidas

| Key Backend | Display Frontend | Emoji | Color |
|------------|------------------|-------|-------|
| `bedrock` | Bedrock | 🤖 | `from-purple-500 to-blue-600` |
| `security` | Security | 🔒 | `from-red-500 to-orange-600` |
| `networking` | Networking | 🌐 | `from-blue-500 to-cyan-600` |
| `compute` | Compute | ⚡ | `from-yellow-500 to-orange-600` |
| `aws-cloud-practitioner` | AWS Cloud Practitioner | ☁️ | `from-orange-500 to-yellow-600` |
| `devops` | DevOps | ⚙️ | `from-green-500 to-teal-600` |
| `databases` | Databases | 🗄️ | `from-indigo-500 to-purple-600` |

---

## Fase 1: COMPLETADA ✅

### Archivos Creados

#### `app/utils/categories.ts` (67 líneas)

**Propósito:** Configuración centralizada de categorías

**Exports principales:**
```typescript
export const CATEGORY_CONFIG = {
  bedrock: {
    label: 'Bedrock',
    emoji: '🤖',
    color: 'from-purple-500 to-blue-600',
    description: 'Amazon Bedrock & RAG - Build AI chatbots'
  },
  // ... 6 categorías más
}

export type CategoryKey = keyof typeof CATEGORY_CONFIG

export interface CategoryConfig {
  label: string
  emoji: string
  color: string
  description: string
}

// Helper functions
export function getCategoryConfig(categoryKey: string): CategoryConfig
export function getAllCategoryKeys(): CategoryKey[]
export function getCategoriesAsOptions()
```

**Ubicación:** `/Users/matiasmartinez/Documents/repos/cloudacademy_next/app/utils/categories.ts`

---

#### `app/hooks/useCategories.ts` (135 líneas)

**Propósito:** Abstraction layer para futura migración a API dinámica

**API actual:**
```typescript
const {
  categories,           // Record<string, CategoryConfig>
  loading,              // boolean
  error,                // string | null
  getCategoryConfig,    // (key: string) => CategoryConfig
} = useCategories()
```

**Migración futura (1 hora):**
1. Descomentar líneas 49-94 (fetch desde API)
2. Comentar líneas 40-46 (config estática)
3. Componentes siguen funcionando sin cambios ✅

**Ubicación:** `/Users/matiasmartinez/Documents/repos/cloudacademy_next/app/hooks/useCategories.ts`

---

#### `app/pages/admin-panel.tsx` (Modificado)

**Cambios realizados:**

1. **Import agregado:**
```typescript
import useCategories from '../hooks/useCategories'
```

2. **Hook usado en componente:**
```typescript
const { categories, getCategoryConfig } = useCategories()
```

3. **Select dinámico (líneas 282-292):**
```tsx
<select value={formData.category} onChange={...}>
  {Object.entries(categories).map(([key, config]) => (
    <option key={key} value={key}>
      {config.emoji} {config.label}
    </option>
  ))}
</select>
```

4. **Tabla con emojis (líneas 482-484):**
```tsx
<span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded-full">
  {getCategoryConfig(course.category).emoji} {getCategoryConfig(course.category).label}
</span>
```

5. **Default category cambiado:**
```typescript
category: 'bedrock'  // antes era 'AWS'
```

**Ubicación:** `/Users/matiasmartinez/Documents/repos/cloudacademy_next/app/pages/admin-panel.tsx`

---

### Commits Creados

1. **Tag de seguridad:**
```bash
Tag: stable-pre-categories
Commit: 6db0f94
Mensaje: "Backup: Estado estable antes de implementar sistema de categorías"
```

2. **Fase 1:**
```bash
Commit: c178956
Mensaje: "Fase 1: Sistema de categorías con abstraction layer para migración futura"
Archivos: utils/categories.ts, hooks/useCategories.ts, pages/admin-panel.tsx
```

---

## Fase 2: Campos Opcionales Backend (PENDIENTE)

**Tiempo estimado:** 1.5 horas
**Objetivo:** Backend flexible que acepta campos opcionales para páginas de categoría

### Paso 2.1: Actualizar Backend Lambda

**Archivo:** `/Users/matiasmartinez/Documents/repos/cloudacademy-tutor-backend/lambdas/admin-handler/lambda_function.py`

**Cambios necesarios:**

```python
# Línea ~20-30: Agregar campos a la lista de actualizables
UPDATABLE_COURSE_FIELDS = [
    # Campos existentes
    'course_name',
    'description',
    'category',
    'difficulty',
    'estimated_time',
    'cost',
    'summary_30s',
    'introduction',
    'is_published',

    # NUEVOS campos opcionales para páginas de categoría
    'icon',              # str: emoji o URL ("🤖" o "https://...")
    'type',              # str: "AI/ML", "Security", "Networking", etc
    'featured',          # bool: destacar en hero section
    'color',             # str: "from-purple-500 to-blue-600"
    'rating',            # float: 0-5 (4.8)
    'student_count',     # int: cantidad de estudiantes
    'completion_rate',   # int: porcentaje 0-100
    'average_rating',    # float: promedio real de reviews

    # FÁCIL AGREGAR MÁS EN EL FUTURO:
    # 'tags',            # list: ["AI", "AWS", "Python"]
    # 'prerequisites',   # list: ["Conocimientos básicos de AWS"]
    # 'learning_outcomes', # list: ["Crear chatbots RAG", ...]
    # 'instructor',      # str: nombre del instructor
]
```

**Función `handle_create_course()` - NO REQUIERE CAMBIOS**

La función ya construye el item dinámicamente:

```python
def handle_create_course(body):
    course_item = {
        'PK': f'COURSE#{course_id}',
        'SK': 'METADATA',
        'course_id': body['course_id'],
        'created_at': timestamp,
        'updated_at': timestamp,
    }

    # ✅ Ya agrega todos los campos presentes en body
    for field in UPDATABLE_COURSE_FIELDS:
        if field in body:
            course_item[field] = body[field]

    table.put_item(Item=course_item)
```

**Función `handle_update_course()` - NO REQUIERE CAMBIOS**

También ya está preparada para campos dinámicos.

---

### Paso 2.2: Actualizar Frontend Types

**Archivo:** `/Users/matiasmartinez/Documents/repos/cloudacademy_next/app/hooks/useAdminCourses.ts`

**Cambios necesarios (líneas ~10-40):**

```typescript
export interface Course {
  // Campos existentes
  PK: string
  SK: string
  course_id: string
  course_name: string
  description: string
  category: string
  difficulty: string
  is_published: boolean
  total_sections: number
  created_at: string
  updated_at: string
  estimated_time?: string
  cost?: number
  summary_30s?: string
  introduction?: string

  // NUEVOS campos opcionales
  icon?: string
  type?: string
  featured?: boolean
  color?: string
  rating?: number
  student_count?: number
  completion_rate?: number
  average_rating?: number

  // Futuro: descomentar según necesidad
  // tags?: string[]
  // prerequisites?: string[]
  // learning_outcomes?: string[]
}

export interface CreateCourseInput {
  course_id: string
  course_name: string
  description: string
  category: string
  difficulty: string
  is_published?: boolean
  estimated_time?: string
  cost?: number
  summary_30s?: string
  introduction?: string

  // NUEVOS campos opcionales
  icon?: string
  type?: string
  featured?: boolean
  color?: string
  rating?: number
  student_count?: number
  completion_rate?: number
  average_rating?: number
}

// UpdateCourseInput usa Partial, no requiere cambios
```

---

### Paso 2.3: Agregar Inputs en Admin Panel

**Archivo:** `/Users/matiasmartinez/Documents/repos/cloudacademy_next/app/pages/admin-panel.tsx`

**Ubicación:** Después del input de "Introduction" (línea ~370)

**Código a agregar:**

```tsx
{/* Sección: Campos Opcionales para Páginas de Categoría */}
<div className="md:col-span-2 mt-6 pt-6 border-t border-slate-700">
  <h3 className="text-lg font-semibold text-white mb-4">
    Campos Opcionales (Páginas de Categoría)
  </h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

    {/* Icon */}
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Icono (Emoji o URL)
      </label>
      <input
        type="text"
        value={formData.icon || ''}
        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
        placeholder="🤖 o https://..."
        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
      />
      <p className="mt-1 text-xs text-gray-500">
        Emoji o URL de imagen. Si vacío, usa emoji de la categoría.
      </p>
    </div>

    {/* Type */}
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Tipo de Curso
      </label>
      <input
        type="text"
        value={formData.type || ''}
        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
        placeholder="AI/ML, Security, Networking..."
        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
      />
      <p className="mt-1 text-xs text-gray-500">
        Categoría secundaria para filtros adicionales
      </p>
    </div>

    {/* Featured */}
    <div>
      <label className="flex items-center space-x-3 cursor-pointer">
        <input
          type="checkbox"
          checked={formData.featured || false}
          onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
          className="w-5 h-5 bg-slate-900 border-slate-700 rounded text-green-500 focus:ring-2 focus:ring-green-500"
        />
        <span className="text-sm font-medium text-gray-300">
          ⭐ Curso Destacado
        </span>
      </label>
      <p className="mt-1 text-xs text-gray-500 ml-8">
        Aparece en hero section de página de categoría
      </p>
    </div>

    {/* Color Gradient */}
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Color de Gradiente
      </label>
      <select
        value={formData.color || ''}
        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
      >
        <option value="">Default (por categoría)</option>
        <option value="from-purple-500 to-blue-600">Purple → Blue</option>
        <option value="from-red-500 to-orange-600">Red → Orange</option>
        <option value="from-green-500 to-teal-600">Green → Teal</option>
        <option value="from-blue-500 to-cyan-600">Blue → Cyan</option>
        <option value="from-yellow-500 to-orange-600">Yellow → Orange</option>
        <option value="from-indigo-500 to-purple-600">Indigo → Purple</option>
      </select>
    </div>

    {/* Rating */}
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Rating (0-5)
      </label>
      <input
        type="number"
        min="0"
        max="5"
        step="0.1"
        value={formData.rating || ''}
        onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || undefined })}
        placeholder="4.8"
        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
      />
      <p className="mt-1 text-xs text-gray-500">
        Rating visual del curso (independiente de reviews reales)
      </p>
    </div>

    {/* Student Count */}
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Cantidad de Estudiantes
      </label>
      <input
        type="number"
        min="0"
        value={formData.student_count || ''}
        onChange={(e) => setFormData({ ...formData, student_count: parseInt(e.target.value) || undefined })}
        placeholder="892"
        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
      />
      <p className="mt-1 text-xs text-gray-500">
        Contador de estudiantes (manual o calculado)
      </p>
    </div>
  </div>
</div>
```

**También actualizar `resetForm()` y estado inicial (líneas ~20-30 y ~40-52):**

```typescript
const [formData, setFormData] = useState<CreateCourseInput>({
  course_id: '',
  course_name: '',
  description: '',
  category: 'bedrock',
  difficulty: 'Beginner',
  is_published: false,
  estimated_time: '',
  cost: 0,
  summary_30s: '',
  introduction: '',
  // NUEVOS campos
  icon: '',
  type: '',
  featured: false,
  color: '',
  rating: undefined,
  student_count: undefined,
})
```

---

### Paso 2.4: Deploy Backend

**Comandos:**

```bash
# Ir al repo backend
cd /Users/matiasmartinez/Documents/repos/cloudacademy-tutor-backend

# Verificar cambios
git diff lambdas/admin-handler/lambda_function.py

# Empaquetar Lambda
cd lambdas/admin-handler
zip -r ../admin-handler.zip . -x "*.pyc" -x "__pycache__/*" -x ".DS_Store"

# Deploy
cd ..
aws lambda update-function-code \
  --function-name cloudacademy-admin-handler \
  --zip-file fileb://admin-handler.zip

# Verificar deployment
aws lambda get-function-configuration \
  --function-name cloudacademy-admin-handler \
  --query 'State' \
  --output text

# Commit
git add lambdas/admin-handler/lambda_function.py
git commit -m "Fase 2: Agregar campos opcionales para páginas de categoría

Campos nuevos:
- icon, type, featured, color, rating, student_count

Backend preparado para extensión fácil de campos adicionales."
git push origin main
```

---

### Paso 2.5: Testing

**Crear curso de prueba con campos opcionales:**

```bash
# Via admin panel:
1. Ir a https://proyectos.cloudacademy.ar/admin-panel
2. Crear curso:
   - Course ID: "test-bedrock-rag"
   - Nombre: "RAG with Bedrock"
   - Categoría: 🤖 Bedrock
   - Icon: 🚀
   - Type: "AI/ML"
   - Featured: ✓
   - Color: Purple → Blue
   - Rating: 4.9
   - Student Count: 1250

3. Verificar en DynamoDB:
aws dynamodb get-item \
  --table-name CourseCatalog \
  --key '{"PK":{"S":"COURSE#test-bedrock-rag"},"SK":{"S":"METADATA"}}'
```

**Esperado:**
```json
{
  "course_id": "test-bedrock-rag",
  "category": "bedrock",
  "icon": "🚀",
  "type": "AI/ML",
  "featured": true,
  "color": "from-purple-500 to-blue-600",
  "rating": 4.9,
  "student_count": 1250
}
```

---

## Fase 3: Filtros por Categoría (PENDIENTE)

**Tiempo estimado:** 1 hora
**Objetivo:** Backend filtra cursos por categoría, difficulty, is_published

### Paso 3.1: Modificar courses-handler Lambda

**Archivo:** `/Users/matiasmartinez/Documents/repos/cloudacademy-tutor-backend/lambdas/courses-handler/lambda_function.py`

**Función a modificar:** `handle_list_courses()` (líneas 74-112)

**Cambios necesarios:**

```python
def handle_list_courses(event):  # ← Agregar event como parámetro
    """
    Maneja GET /api/courses?category=bedrock&difficulty=Beginner&is_published=true

    Query Parameters opcionales:
    - category: Filtrar por categoría (bedrock, security, networking, etc)
    - difficulty: Filtrar por dificultad (Beginner, Intermediate, Advanced)
    - is_published: Filtrar por estado publicación (true/false)

    Returns:
        dict: Response con cursos filtrados
    """
    try:
        # Extraer query parameters
        query_params = event.get('queryStringParameters') or {}
        category = query_params.get('category')
        difficulty = query_params.get('difficulty')
        is_published = query_params.get('is_published')

        logger.info(f"Listing courses with filters: category={category}, difficulty={difficulty}, is_published={is_published}")

        # Construir FilterExpression dinámicamente
        filter_expression = 'SK = :metadata'
        expression_values = {':metadata': 'METADATA'}

        # Agregar filtro de categoría
        if category:
            filter_expression += ' AND category = :category'
            expression_values[':category'] = category

        # Agregar filtro de dificultad
        if difficulty:
            filter_expression += ' AND difficulty = :difficulty'
            expression_values[':difficulty'] = difficulty

        # Agregar filtro de publicación
        if is_published:
            is_pub_value = is_published.lower() == 'true'
            filter_expression += ' AND is_published = :is_published'
            expression_values[':is_published'] = is_pub_value

        # Scan con filtros aplicados
        response = table.scan(
            FilterExpression=filter_expression,
            ExpressionAttributeValues=expression_values
        )

        courses = response.get('Items', [])
        courses_clean = [convert_decimals(course) for course in courses]
        courses_clean.sort(key=lambda x: x.get('created_at', ''), reverse=True)

        logger.info(f"Found {len(courses_clean)} courses matching filters")

        return success_response({
            'courses': courses_clean,
            'count': len(courses_clean),
            'filters_applied': {
                'category': category,
                'difficulty': difficulty,
                'is_published': is_published
            }
        })

    except Exception as e:
        logger.error(f"Error listing courses: {str(e)}", exc_info=True)
        return error_response(500, f'Error listing courses: {str(e)}')
```

**También actualizar lambda_handler (línea ~62):**

```python
# Línea 62-64 (aproximadamente)
else:
    return handle_list_courses(event)  # ← Pasar event aquí
```

---

### Paso 3.2: Deploy courses-handler

**Comandos:**

```bash
cd /Users/matiasmartinez/Documents/repos/cloudacademy-tutor-backend/lambdas/courses-handler

# Empaquetar
zip -r ../courses-handler.zip . -x "*.pyc" -x "__pycache__/*" -x ".DS_Store"

# Deploy
cd ..
aws lambda update-function-code \
  --function-name cloudacademy-courses-handler \
  --zip-file fileb://courses-handler.zip

# Commit
cd /Users/matiasmartinez/Documents/repos/cloudacademy-tutor-backend
git add lambdas/courses-handler/lambda_function.py
git commit -m "Fase 3: Implementar filtros por categoría en GET /api/courses

Query params:
- category: bedrock, security, networking, etc
- difficulty: Beginner, Intermediate, Advanced
- is_published: true/false

Performance: Optimizado con FilterExpression en DynamoDB"
git push origin main
```

---

### Paso 3.3: Testing Manual

**Test 1: Filtro por categoría**
```bash
curl -s "https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api/courses?category=bedrock" | jq '.count'
# Esperado: Número de cursos de Bedrock
```

**Test 2: Filtro por categoría + publicados**
```bash
curl -s "https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api/courses?category=bedrock&is_published=true" | jq '.courses[].course_name'
# Esperado: Solo cursos publicados de Bedrock
```

**Test 3: Múltiples filtros**
```bash
curl -s "https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api/courses?category=security&difficulty=Advanced&is_published=true" | jq '.'
# Esperado: Cursos de Security, nivel Advanced, publicados
```

**Test 4: Sin filtros (todos los cursos)**
```bash
curl -s "https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api/courses" | jq '.count'
# Esperado: Total de cursos
```

---

## Fase 4: Integración Frontend (PENDIENTE)

**Tiempo estimado:** 1.5 horas
**Objetivo:** Frontend usa filtros del backend, `/rag-bedrock` consume API

### Paso 4.1: Actualizar useCourses Hook

**Archivo:** `/Users/matiasmartinez/Documents/repos/cloudacademy_next/app/hooks/useCourses.ts`

**Cambios necesarios (líneas 1-40):**

```typescript
import { useState, useEffect, useCallback } from 'react'

export interface Course {
  // Campos existentes
  PK: string
  SK: string
  course_id: string
  course_name: string
  description: string
  category: string
  difficulty: string
  is_published: boolean
  total_sections: number
  created_at: string
  updated_at: string
  estimated_time?: string
  cost?: number
  summary_30s?: string
  introduction?: string

  // NUEVOS campos opcionales
  icon?: string
  type?: string
  featured?: boolean
  color?: string
  rating?: number
  student_count?: number
  completion_rate?: number
  average_rating?: number
}

// NUEVO: Filtros para el hook
export interface CourseFilters {
  category?: string        // "bedrock", "security", etc
  difficulty?: string      // "Beginner", "Intermediate", "Advanced"
  is_published?: boolean   // true/false
}

export interface CourseDetail extends Course {
  sections: Section[]
}

export interface Section {
  section_id: number
  title: string
  content: string
  estimated_time: string
  order: number
  images?: string[]
  agent_config?: {
    system_prompt?: string
    validation_criteria?: any
    hints?: any
  }
}

export default function useCourses(filters?: CourseFilters) {  // ← Agregar filtros
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCourses = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const API_URL = process.env.NEXT_PUBLIC_TUTOR_API_URL || 'https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api'

      // NUEVO: Construir query string
      const queryParams = new URLSearchParams()

      if (filters?.category) {
        queryParams.append('category', filters.category)
      }

      if (filters?.difficulty) {
        queryParams.append('difficulty', filters.difficulty)
      }

      if (filters?.is_published !== undefined) {
        queryParams.append('is_published', String(filters.is_published))
      }

      const queryString = queryParams.toString()
      const url = `${API_URL}/courses${queryString ? `?${queryString}` : ''}`

      console.log('Fetching courses:', url)  // Para debugging

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch courses: ${response.status}`)
      }

      const data = await response.json()

      // Ya no filtramos is_published en frontend si se usa en backend
      setCourses(data.courses || [])

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch courses'
      setError(errorMessage)
      console.error('Error fetching courses:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])  // ← Re-fetch si cambian los filtros

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  // fetchCourseDetail permanece igual...

  return {
    courses,
    loading,
    error,
    refetch: fetchCourses,  // Por si se necesita refrescar manualmente
    fetchCourseDetail,
  }
}
```

---

### Paso 4.2: Actualizar /rag-bedrock Page

**Archivo:** `/Users/matiasmartinez/Documents/repos/cloudacademy_next/app/pages/rag-bedrock.tsx`

**Cambios necesarios:**

**1. Reemplazar imports (línea 1-5):**

```typescript
import type { NextPage } from 'next'
import Router from 'next/router'
import { useState } from 'react'
import useUser from '../lib/useUser'
import AuthenticatedHeader from '../components/AuthenticatedHeader'
import useCourses from '../hooks/useCourses'  // ← AGREGAR
import useCategories from '../hooks/useCategories'  // ← AGREGAR
```

**2. Reemplazar contenido del componente (líneas 7-93):**

```typescript
const RAGBedrockCategoryContent = ({ user, signOut }: { user: any; signOut: any }) => {
  const [selectedLevel, setSelectedLevel] = useState('all')
  const [selectedType, setSelectedType] = useState('all')

  // ✅ NUEVO: Usar API en lugar de array hardcoded
  const { courses: bedrockCourses, loading, error } = useCourses({
    category: 'bedrock',
    is_published: true
  })

  // NUEVO: Obtener config de categoría
  const { getCategoryConfig } = useCategories()
  const bedrockConfig = getCategoryConfig('bedrock')

  // Filtros locales adicionales (nivel y tipo)
  const filteredCourses = bedrockCourses.filter(course => {
    const levelMatch = selectedLevel === 'all' || course.difficulty === selectedLevel
    const typeMatch = selectedType === 'all' || course.type === selectedType
    return levelMatch && typeMatch
  })

  const featuredCourses = filteredCourses.filter(course => course.featured)

  // NUEVO: Calcular stats dinámicamente
  const totalDuration = filteredCourses.reduce((acc, course) => {
    // Parsear "2 horas" → 2
    const hours = parseFloat(course.estimated_time || '0')
    return acc + (isNaN(hours) ? 0 : hours)
  }, 0)

  const avgCost = filteredCourses.length > 0
    ? filteredCourses.reduce((acc, c) => acc + (c.cost || 0), 0) / filteredCourses.length
    : 0

  const totalStudents = filteredCourses.reduce((acc, c) => acc + (c.student_count || 0), 0)

  // Estados de carga
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <AuthenticatedHeader user={user} signOut={signOut} />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="text-white text-xl">Cargando cursos de Bedrock...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900">
        <AuthenticatedHeader user={user} signOut={signOut} />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="text-red-400 text-xl">Error: {error}</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (bedrockCourses.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900">
        <AuthenticatedHeader user={user} signOut={signOut} />
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="text-gray-400 text-xl">
            No hay cursos de Bedrock disponibles aún.
          </div>
          <p className="text-gray-500 mt-2">
            Ve al <a href="/admin-panel" className="text-blue-400 hover:underline">Admin Panel</a> para crear cursos.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <AuthenticatedHeader user={user} signOut={signOut} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section - ACTUALIZAR stats dinámicos */}
        <div className="mb-12">
          {/* ... hero content igual pero stats dinámicos ... */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div className="flex items-center space-x-3">
              {/* ... */}
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">DURACIÓN TOTAL</div>
                <div className="text-sm text-white">{totalDuration.toFixed(1)} horas</div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* ... */}
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">COSTO PROMEDIO</div>
                <div className="text-sm text-white">${avgCost.toFixed(2)}</div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* ... */}
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">ESTUDIANTES</div>
                <div className="text-sm text-white">{totalStudents.toLocaleString()}</div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* ... */}
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">CURSOS</div>
                <div className="text-sm text-white">{bedrockCourses.length} disponibles</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros - MANTENER igual */}

        {/* Cursos Destacados */}
        {featuredCourses.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
              <span>🌟</span>
              <span>Cursos Esenciales de RAG & Bedrock</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {featuredCourses.map((course) => (
                <div
                  key={course.course_id}  {/* ← Cambiar de 'id' a 'course_id' */}
                  onClick={() => Router.push(`/courses/${course.course_id}`)}
                  className="group bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-700/50 hover:border-purple-500/30 transition-all duration-300 hover:transform hover:scale-[1.02] cursor-pointer relative overflow-hidden"
                >
                  {/* ... renderizar curso usando fields del backend ... */}
                  <div className={`w-20 h-20 bg-gradient-to-r ${course.color || bedrockConfig.color} rounded-2xl flex items-center justify-center text-3xl`}>
                    {course.icon || bedrockConfig.emoji}
                  </div>
                  <h3 className="text-white font-bold text-2xl">
                    {course.course_name}
                  </h3>
                  <p className="text-gray-400 text-base mb-4">
                    {course.description}
                  </p>
                  <div className="flex items-center space-x-6 text-sm mb-4">
                    <span className="px-3 py-1 bg-slate-700/50 rounded-full text-purple-400 font-medium">
                      {course.difficulty}
                    </span>
                    <span className="text-gray-400">{course.estimated_time}</span>
                    <span className="text-gray-400">${course.cost || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <span>⭐</span>
                        <span>{course.rating || 0}</span>
                      </div>
                      <span>{course.student_count || 0} estudiantes</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Todos los Cursos */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">
            Todos los Cursos de RAG Bedrock ({filteredCourses.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCourses.map((course) => (
              <div
                key={course.course_id}
                onClick={() => Router.push(`/courses/${course.course_id}`)}
                className="group bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-700/50 hover:border-purple-500/30 transition-all duration-300 hover:transform hover:scale-105 cursor-pointer"
              >
                {/* Similar al featured pero más compacto */}
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`w-16 h-16 bg-gradient-to-r ${course.color || bedrockConfig.color} rounded-xl flex items-center justify-center text-2xl`}>
                    {course.icon || bedrockConfig.emoji}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg">
                      {course.course_name}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="px-2 py-1 bg-slate-700/50 rounded-full text-purple-400">
                        {course.difficulty}
                      </span>
                      <span className="text-gray-400">{course.estimated_time}</span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  {course.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>⭐ {course.rating || 0}</span>
                    <span>•</span>
                    <span>{course.student_count || 0} estudiantes</span>
                  </div>
                  {course.type && (
                    <span className="px-2 py-1 bg-purple-600/20 rounded text-purple-300 text-xs">
                      {course.type}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero sections finales - MANTENER igual */}
      </div>
    </div>
  )
}
```

**3. Actualizar selects de filtros (líneas ~250-260):**

```tsx
<select
  value={selectedLevel}
  onChange={(e) => setSelectedLevel(e.target.value)}
  className="..."
>
  <option value="all">Todos los niveles</option>
  <option value="Beginner">Principiante</option>
  <option value="Intermediate">Intermedio</option>
  <option value="Advanced">Avanzado</option>
</select>

<select
  value={selectedType}
  onChange={(e) => setSelectedType(e.target.value)}
  className="..."
>
  <option value="all">Todos los tipos</option>
  <option value="AI/ML">AI/ML</option>
  <option value="Data Processing">Data Processing</option>
  <option value="MLOps">MLOps</option>
  <option value="Security">Security</option>
</select>
```

---

### Paso 4.3: Deploy Frontend

**Comandos:**

```bash
cd /Users/matiasmartinez/Documents/repos/cloudacademy_next/app

# Verificar cambios
git status

# Commit
git add hooks/useCourses.ts pages/rag-bedrock.tsx
git commit -m "Fase 4: Integrar filtros de categoría en frontend

Cambios:
- useCourses hook acepta filtros (category, difficulty, is_published)
- /rag-bedrock usa API en lugar de datos hardcoded
- Stats calculados dinámicamente desde backend
- Campos opcionales (icon, color, featured) renderizados

Performance: 1 request filtrado vs traer todos los cursos

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push (trigger deployment)
git push origin agent-fusion
```

---

### Paso 4.4: Testing Completo

**Test 1: Admin Panel**
```
1. Ir a https://proyectos.cloudacademy.ar/admin-panel
2. Crear curso de prueba:
   - Course ID: bedrock-advanced
   - Nombre: Advanced RAG Patterns
   - Categoría: 🤖 Bedrock
   - Difficulty: Advanced
   - Icon: 🚀
   - Type: AI/ML
   - Featured: ✓
   - Color: Purple → Blue
   - Rating: 4.9
   - Student Count: 450
   - Publicado: ✓
```

**Test 2: Página de Bedrock**
```
1. Ir a https://proyectos.cloudacademy.ar/rag-bedrock
2. Verificar:
   ✓ Hero section muestra stats actualizados
   ✓ Cursos destacados (featured=true) en sección superior
   ✓ Todos los cursos en grid inferior
   ✓ Filtros de nivel funcionan
   ✓ Click en curso redirige a /courses/{id}
   ✓ Iconos y colores custom se muestran correctamente
```

**Test 3: Performance**
```bash
# Test de carga con filtros
time curl -s "https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api/courses?category=bedrock&is_published=true"

# Esperado: < 500ms con 10 cursos
# Esperado: < 1s con 100 cursos
```

**Test 4: Diferentes categorías**
```
Crear página similar para otras categorías:
- /security (🔒)
- /networking (🌐)
- /compute (⚡)
- etc.

Usar mismo código, solo cambiar:
useCourses({ category: 'security', is_published: true })
```

---

## Migración Futura: Admin de Categorías

**Cuándo:** Cuando necesites crear/editar/eliminar categorías desde el frontend

**Tiempo estimado:** 1-1.5 horas (gracias al abstraction layer)

### Paso Futuro 1: Backend

**Crear Lambda `categories-handler`:**

```python
# lambdas/categories-handler/lambda_function.py

def handle_list_categories():
    """GET /api/categories"""
    response = table.scan(
        FilterExpression='SK = :sk',
        ExpressionAttributeValues={':sk': 'CATEGORY_METADATA'}
    )
    categories = response.get('Items', [])
    return success_response({'categories': categories})

def handle_create_category(body):
    """POST /api/categories"""
    table.put_item(Item={
        'PK': f'CATEGORY#{body["category_key"]}',
        'SK': 'CATEGORY_METADATA',
        'category_key': body['category_key'],
        'label': body['label'],
        'emoji': body['emoji'],
        'color': body['color'],
        'description': body['description']
    })

def handle_update_category(category_key, body):
    """PUT /api/categories/{key}"""
    # Similar a handle_update_course

def handle_delete_category(category_key):
    """DELETE /api/categories/{key}"""
    # Similar a handle_delete_course
```

**Agregar a API Gateway:**

```hcl
# terraform/api-gateway.tf

resource "aws_api_gateway_resource" "categories" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_resource.admin.id
  path_part   = "categories"
}

resource "aws_api_gateway_method" "categories_get" {
  # GET /api/admin/categories
}

resource "aws_api_gateway_method" "categories_post" {
  # POST /api/admin/categories
}

# etc...
```

---

### Paso Futuro 2: Frontend

**1. Actualizar `useCategories` hook:**

```typescript
// app/hooks/useCategories.ts

// Línea 40-46: Comentar config estática
/*
useEffect(() => {
  setLoading(true)
  setCategories(CATEGORY_CONFIG)
  setLoading(false)
}, [])
*/

// Líneas 49-94: Descomentar API fetch
useEffect(() => {
  const fetchCategories = async () => {
    setLoading(true)
    setError(null)

    try {
      const API_URL = process.env.NEXT_PUBLIC_TUTOR_API_URL || '...'

      const response = await fetch(`${API_URL}/categories`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status}`)
      }

      const data = await response.json()

      const categoriesMap: Record<string, CategoryConfig> = {}
      data.categories.forEach((cat: any) => {
        categoriesMap[cat.category_key] = {
          label: cat.label,
          emoji: cat.emoji,
          color: cat.color,
          description: cat.description
        }
      })

      setCategories(categoriesMap)
    } catch (err) {
      console.error('Error fetching categories:', err)
      setError(err.message)
      // Fallback a config estática si falla
      setCategories(CATEGORY_CONFIG)
    } finally {
      setLoading(false)
    }
  }

  fetchCategories()
}, [])
```

**✅ LISTO: Todos los componentes siguen funcionando sin cambios**

---

**2. Crear Admin UI de Categorías:**

```tsx
// app/pages/admin-panel/categories.tsx (NUEVO archivo)

import { useState } from 'react'
import useCategories from '../../hooks/useCategories'

export default function CategoriesAdmin() {
  const { categories, loading, error, createCategory, updateCategory, deleteCategory } = useCategories()
  const [formData, setFormData] = useState({
    category_key: '',
    label: '',
    emoji: '',
    color: '',
    description: ''
  })

  const handleCreate = async () => {
    await createCategory(formData)
    // Reset form
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <h1>Administrar Categorías</h1>

      {/* Form para crear/editar categoría */}
      <form onSubmit={handleCreate}>
        <input
          placeholder="Key (bedrock, security...)"
          value={formData.category_key}
          onChange={e => setFormData({...formData, category_key: e.target.value})}
        />
        <input
          placeholder="Label (Bedrock)"
          value={formData.label}
          onChange={e => setFormData({...formData, label: e.target.value})}
        />
        <input
          placeholder="Emoji (🤖)"
          value={formData.emoji}
          onChange={e => setFormData({...formData, emoji: e.target.value})}
        />
        {/* ... más inputs ... */}
        <button type="submit">Crear Categoría</button>
      </form>

      {/* Lista de categorías existentes */}
      <div>
        {Object.entries(categories).map(([key, config]) => (
          <div key={key}>
            <span>{config.emoji} {config.label}</span>
            <button onClick={() => deleteCategory(key)}>Eliminar</button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

### Paso Futuro 3: Migrar Data

**Script one-time para migrar `categories.ts` → DynamoDB:**

```python
# scripts/migrate_categories.py

import boto3
from datetime import datetime, timezone

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('CourseCatalog')

categories = [
    {
        'category_key': 'bedrock',
        'label': 'Bedrock',
        'emoji': '🤖',
        'color': 'from-purple-500 to-blue-600',
        'description': 'Amazon Bedrock & RAG'
    },
    # ... otras 6 categorías
]

for cat in categories:
    table.put_item(Item={
        'PK': f'CATEGORY#{cat["category_key"]}',
        'SK': 'CATEGORY_METADATA',
        **cat,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat()
    })
    print(f"✓ Migrated {cat['label']}")
```

**Ejecutar una sola vez:**
```bash
python3 scripts/migrate_categories.py
```

---

## Troubleshooting

### Error: "Category not found in configuration"

**Síntoma:** Warning en consola: `Category "xxx" not found in configuration`

**Causa:** Curso tiene category que no existe en `categories.ts`

**Solución:**
```typescript
// utils/categories.ts ya tiene fallback
export function getCategoryConfig(categoryKey: string): CategoryConfig {
  const config = CATEGORY_CONFIG[categoryKey as CategoryKey]

  if (!config) {
    return {
      label: categoryKey,
      emoji: '📚',
      color: 'from-gray-500 to-slate-600',
      description: 'Learn new skills'
    }
  }

  return config
}
```

---

### Error: Backend no filtra correctamente

**Síntoma:** GET `/api/courses?category=bedrock` retorna todos los cursos

**Diagnóstico:**
```bash
# Ver logs de Lambda
aws logs tail /aws/lambda/cloudacademy-courses-handler --follow

# Testear endpoint
curl -v "https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api/courses?category=bedrock"
```

**Posibles causas:**
1. `handle_list_courses()` no recibe `event` como parámetro
2. `lambda_handler` no pasa `event` a `handle_list_courses()`
3. Query params no se extraen correctamente

**Solución:** Verificar línea 62 del courses-handler:
```python
# INCORRECTO:
return handle_list_courses()

# CORRECTO:
return handle_list_courses(event)
```

---

### Error: TypeScript "Type error" en build

**Síntoma:** Build falla con error de tipos

**Solución:**
```bash
# Verificar types
cd /Users/matiasmartinez/Documents/repos/cloudacademy_next/app
npm run type-check

# Ver errores específicos
npx tsc --noEmit
```

**Fix común:**
```typescript
// ANTES (error):
const courses = useCourses()

// DESPUÉS (correcto):
const { courses, loading, error } = useCourses({ category: 'bedrock' })
```

---

### Performance: Scan muy lento con muchos cursos

**Síntoma:** Con 100+ cursos, GET `/api/courses` tarda >2 segundos

**Solución:** Crear GSI (Global Secondary Index) en DynamoDB

**Terraform:**
```hcl
# terraform/dynamodb.tf

resource "aws_dynamodb_table" "courses" {
  # ... config existente ...

  global_secondary_index {
    name            = "category-index"
    hash_key        = "category"
    range_key       = "created_at"
    projection_type = "ALL"

    read_capacity  = 5
    write_capacity = 5
  }
}
```

**Lambda (actualizar query):**
```python
# ANTES (scan lento):
response = table.scan(
    FilterExpression='category = :category',
    ExpressionAttributeValues={':category': 'bedrock'}
)

# DESPUÉS (query rápido):
response = table.query(
    IndexName='category-index',
    KeyConditionExpression='category = :category',
    ExpressionAttributeValues={':category': 'bedrock'}
)
```

**Performance:**
- Scan: ~500ms-2s con 100 cursos
- Query con GSI: ~50-100ms con 100 cursos

---

## Comandos Útiles

### Git

```bash
# Ver diferencias desde el tag de seguridad
git diff stable-pre-categories..HEAD

# Rollback si algo falla
git checkout stable-pre-categories
git checkout -b hotfix-rollback
git push origin agent-fusion --force

# Ver tags
git tag -l
git show stable-pre-categories
```

### Backend Testing

```bash
# Test filtro por categoría
curl -s "https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api/courses?category=bedrock" | jq '.count'

# Test múltiples filtros
curl -s "https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api/courses?category=security&difficulty=Advanced&is_published=true" | jq '.courses[].course_name'

# Ver logs de Lambda
aws logs tail /aws/lambda/cloudacademy-courses-handler --follow

# Verificar estado de Lambda
aws lambda get-function-configuration --function-name cloudacademy-courses-handler
```

### DynamoDB

```bash
# Ver curso específico
aws dynamodb get-item \
  --table-name CourseCatalog \
  --key '{"PK":{"S":"COURSE#bedrock-rag"},"SK":{"S":"METADATA"}}'

# Query cursos de una categoría
aws dynamodb scan \
  --table-name CourseCatalog \
  --filter-expression "SK = :sk AND category = :cat" \
  --expression-attribute-values '{":sk":{"S":"METADATA"},":cat":{"S":"bedrock"}}'
```

### Frontend

```bash
# Build local
cd /Users/matiasmartinez/Documents/repos/cloudacademy_next/app
npm run build

# Type check
npm run type-check

# Dev server
npm run dev
```

---

## Referencias

### Documentos Relacionados

- **CLAUDE.md:** Contexto completo del proyecto
- **FASE_7_COMPLETADA.md:** Detalles de Fase 1-2 (catálogo + metadata)
- **cloudacademy-tutor-backend/FASE_7_COMPLETADA.md:** Backend correspondiente

### Archivos Clave

**Frontend:**
- `app/utils/categories.ts`
- `app/hooks/useCategories.ts`
- `app/hooks/useCourses.ts`
- `app/pages/admin-panel.tsx`
- `app/pages/rag-bedrock.tsx`

**Backend:**
- `lambdas/admin-handler/lambda_function.py`
- `lambdas/courses-handler/lambda_function.py`
- `terraform/api-gateway.tf`
- `terraform/dynamodb.tf`

### URLs

- Admin Panel: https://proyectos.cloudacademy.ar/admin-panel
- Bedrock Category: https://proyectos.cloudacademy.ar/rag-bedrock
- API Endpoint: https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api/courses
- GitHub: https://github.com/MatiasMartinez90/cloudacademy_next
- GitHub Actions: https://github.com/MatiasMartinez90/cloudacademy_next/actions

---

## Checklist de Progreso

### ✅ Fase 1: Sistema de Categorías (COMPLETADO)
- [x] Crear `categories.ts` con 7 categorías
- [x] Crear `useCategories` hook con abstraction layer
- [x] Actualizar admin panel con select dinámico
- [x] Commit y tag de seguridad
- [x] Deploy a producción

### ⏳ Fase 2: Campos Opcionales Backend (PENDIENTE)
- [ ] Actualizar `admin-handler` con lista de campos extensible
- [ ] Actualizar interfaces TypeScript en `useAdminCourses`
- [ ] Agregar inputs opcionales en admin panel
- [ ] Actualizar estado inicial del formulario
- [ ] Deploy Lambda
- [ ] Testing: crear curso con todos los campos
- [ ] Commit cambios

### ⏳ Fase 3: Filtros por Categoría (PENDIENTE)
- [ ] Modificar `handle_list_courses()` con query params
- [ ] Actualizar `lambda_handler` para pasar event
- [ ] Deploy `courses-handler`
- [ ] Testing: curl con diferentes filtros
- [ ] Verificar performance
- [ ] Commit cambios

### ⏳ Fase 4: Integración Frontend (PENDIENTE)
- [ ] Actualizar `useCourses` con filtros
- [ ] Modificar `/rag-bedrock` para usar API
- [ ] Calcular stats dinámicamente
- [ ] Agregar estados de loading/error/empty
- [ ] Deploy frontend
- [ ] Testing end-to-end
- [ ] Commit cambios

### 🔮 Futuro: Admin de Categorías Dinámicas
- [ ] Crear `categories-handler` Lambda
- [ ] Agregar endpoints a API Gateway
- [ ] Actualizar `useCategories` hook (descomentar API)
- [ ] Crear UI de admin (`/admin-panel/categories`)
- [ ] Migrar data de `categories.ts` a DynamoDB
- [ ] Testing completo
- [ ] Deprecar `categories.ts`

---

**Última actualización:** 2025-11-03
**Próximo paso:** Fase 2 - Campos Opcionales Backend
**Tiempo estimado restante:** 4 horas (1.5h + 1h + 1.5h)
**Tag de seguridad:** `stable-pre-categories` (commit 6db0f94)
