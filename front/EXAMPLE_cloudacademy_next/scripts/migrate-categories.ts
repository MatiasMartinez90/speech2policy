/**
 * Script de Migración de Categorías a DynamoDB
 *
 * Este script migra las categorías hardcoded de CATEGORY_CONFIG
 * a la tabla Categories en DynamoDB a través del endpoint de API.
 *
 * Uso:
 *   ts-node scripts/migrate-categories.ts
 *
 * Variables de entorno requeridas:
 *   NEXT_PUBLIC_TUTOR_API_URL - URL del API Gateway
 *   MIGRATION_AUTH_TOKEN - JWT token de un usuario admin
 */

import { CATEGORY_CONFIG } from '../app/utils/categories'

// Configuración
const API_URL = process.env.NEXT_PUBLIC_TUTOR_API_URL || 'https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api'
const AUTH_TOKEN = process.env.MIGRATION_AUTH_TOKEN

// Metadata adicional para cada categoría
// Este mapping será migrado también
const CATEGORY_METADATA: Record<string, {
  level: 'beginner' | 'intermediate' | 'advanced'
  display_order: number
  featured: boolean
  course_count: number
}> = {
  bedrock: {
    level: 'advanced',
    display_order: 1,
    featured: true,
    course_count: 8
  },
  security: {
    level: 'intermediate',
    display_order: 2,
    featured: true,
    course_count: 18
  },
  networking: {
    level: 'intermediate',
    display_order: 3,
    featured: true,
    course_count: 16
  },
  compute: {
    level: 'intermediate',
    display_order: 4,
    featured: false,
    course_count: 20
  },
  'aws-cloud-practitioner': {
    level: 'beginner',
    display_order: 5,
    featured: true,
    course_count: 24
  },
  devops: {
    level: 'advanced',
    display_order: 6,
    featured: true,
    course_count: 28
  },
  databases: {
    level: 'intermediate',
    display_order: 7,
    featured: false,
    course_count: 15
  }
}

interface MigrationResult {
  categoryId: string
  success: boolean
  error?: string
}

async function migrateCategory(categoryId: string): Promise<MigrationResult> {
  const category = CATEGORY_CONFIG[categoryId as keyof typeof CATEGORY_CONFIG]
  const metadata = CATEGORY_METADATA[categoryId]

  if (!category) {
    return {
      categoryId,
      success: false,
      error: `Category ${categoryId} not found in CATEGORY_CONFIG`
    }
  }

  if (!metadata) {
    return {
      categoryId,
      success: false,
      error: `Metadata for ${categoryId} not found`
    }
  }

  // Preparar datos para la API
  const categoryData = {
    label: category.label,
    emoji: category.emoji,
    color: category.color,
    description: category.description,
    architecture: category.architecture || [],
    level: metadata.level,
    display_order: metadata.display_order,
    featured: metadata.featured,
    course_count: metadata.course_count
  }

  try {
    console.log(`\n📤 Migrando categoría: ${category.label} (${categoryId})`)
    console.log(`   Emoji: ${category.emoji}`)
    console.log(`   Level: ${metadata.level}`)
    console.log(`   Display Order: ${metadata.display_order}`)
    console.log(`   Featured: ${metadata.featured}`)
    console.log(`   Courses: ${metadata.course_count}`)

    const response = await fetch(`${API_URL}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify(categoryData)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))

      // Si el error es 409 (ya existe), considerarlo éxito parcial
      if (response.status === 409) {
        console.log(`   ⚠️  Categoría ya existe, saltando...`)
        return {
          categoryId,
          success: true,
          error: 'Already exists (skipped)'
        }
      }

      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    console.log(`   ✅ Migrada exitosamente! ID: ${result.category_id}`)

    return {
      categoryId,
      success: true
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`   ❌ Error: ${errorMessage}`)

    return {
      categoryId,
      success: false,
      error: errorMessage
    }
  }
}

async function main() {
  console.log('🚀 Iniciando migración de categorías a DynamoDB\n')
  console.log(`📍 API URL: ${API_URL}`)
  console.log(`🔑 Auth Token: ${AUTH_TOKEN ? '✓ Configurado' : '✗ NO CONFIGURADO'}\n`)

  if (!AUTH_TOKEN) {
    console.error('❌ ERROR: MIGRATION_AUTH_TOKEN no está configurado')
    console.error('\nPara obtener el token:')
    console.error('1. Inicia sesión en la aplicación como admin')
    console.error('2. Abre DevTools > Application > Local Storage')
    console.error('3. Busca: CognitoIdentityServiceProvider.{clientId}.{user}.idToken')
    console.error('4. Copia el valor del token')
    console.error('5. Ejecuta: MIGRATION_AUTH_TOKEN="tu-token" ts-node scripts/migrate-categories.ts\n')
    process.exit(1)
  }

  // Obtener todas las categorías a migrar
  const categoryIds = Object.keys(CATEGORY_CONFIG)
  console.log(`📋 Categorías a migrar: ${categoryIds.length}\n`)

  const results: MigrationResult[] = []

  // Migrar cada categoría secuencialmente
  for (const categoryId of categoryIds) {
    const result = await migrateCategory(categoryId)
    results.push(result)

    // Pequeña pausa entre requests para no saturar la API
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Resumen
  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMEN DE MIGRACIÓN')
  console.log('='.repeat(60) + '\n')

  const successful = results.filter(r => r.success && !r.error)
  const skipped = results.filter(r => r.success && r.error?.includes('Already exists'))
  const failed = results.filter(r => !r.success)

  console.log(`✅ Exitosas:    ${successful.length}`)
  console.log(`⚠️  Saltadas:    ${skipped.length}`)
  console.log(`❌ Fallidas:    ${failed.length}`)
  console.log(`📊 Total:       ${results.length}\n`)

  if (failed.length > 0) {
    console.log('❌ Categorías fallidas:')
    failed.forEach(r => {
      console.log(`   - ${r.categoryId}: ${r.error}`)
    })
    console.log('')
  }

  if (skipped.length > 0) {
    console.log('⚠️  Categorías saltadas (ya existen):')
    skipped.forEach(r => {
      console.log(`   - ${r.categoryId}`)
    })
    console.log('')
  }

  console.log('✨ Migración completada!\n')

  if (failed.length > 0) {
    process.exit(1)
  }
}

// Ejecutar migración
main().catch(error => {
  console.error('\n💥 Error fatal durante la migración:')
  console.error(error)
  process.exit(1)
})
