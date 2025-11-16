/**
 * useCategories Hook
 *
 * Abstraction layer for category data source.
 *
 * CURRENT BEHAVIOR:
 * Fetches categories dynamically from DynamoDB via API Gateway.
 * Falls back to static configuration from categories.ts on error.
 *
 * MIGRATION COMPLETED ✅
 * - Categories are now admin-managed in /admin-panel/categories
 * - Public pages fetch from GET /api/categories (no auth required)
 * - Only active categories are shown to public users
 * - All components continue working without changes ✅
 *
 * Benefits of this approach:
 * - Components are decoupled from data source
 * - Seamless fallback to static config on API errors
 * - Type-safe throughout the application
 * - Consistent API for all category consumers
 */

import { useState, useEffect } from 'react'
import { CATEGORY_CONFIG, CategoryKey, CategoryConfig } from '../utils/categories'

export type { CategoryKey, CategoryConfig }

interface UseCategoriesResult {
  categories: Record<string, CategoryConfig>
  loading: boolean
  error: string | null
  getCategoryConfig: (key: string) => CategoryConfig
}

export default function useCategories(): UseCategoriesResult {
  const [categories, setCategories] = useState<Record<string, CategoryConfig>>({ ...CATEGORY_CONFIG } as Record<string, CategoryConfig>)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ========================================
  // DYNAMIC IMPLEMENTATION: Fetch from API
  // ========================================
  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true)
      setError(null)

      try {
        const API_URL = process.env.NEXT_PUBLIC_TUTOR_API_URL || 'https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api'

        const response = await fetch(`${API_URL}/categories`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch categories: ${response.status}`)
        }

        const data = await response.json()

        // Transform API response to match CategoryConfig structure
        const categoriesMap: Record<string, CategoryConfig> = {}
        data.categories.forEach((cat: any) => {
          // Only include active categories in public view
          if (cat.is_active) {
            categoriesMap[cat.category_id] = {
              label: cat.label,
              emoji: cat.emoji,
              color: cat.color,
              description: cat.description,
              // Include extended metadata from API
              course_count: cat.course_count,
              level: cat.level,
              display_order: cat.display_order,
              featured: cat.featured
            }
          }
        })

        setCategories(categoriesMap)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch categories'
        setError(errorMessage)
        console.error('Error fetching categories:', err)

        // Fallback to static config on error
        setCategories({ ...CATEGORY_CONFIG } as Record<string, CategoryConfig>)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  // Helper function to get config for a specific category
  const getCategoryConfig = (key: string): CategoryConfig => {
    const config = categories[key]

    if (!config) {
      // Fallback for unknown categories
      console.warn(`Category "${key}" not found in configuration`)
      return {
        label: key,
        emoji: '📚',
        color: 'from-gray-500 to-slate-600',
        description: 'Learn new skills with interactive courses'
      }
    }

    return config
  }

  return {
    categories,
    loading,
    error,
    getCategoryConfig,
  }
}
