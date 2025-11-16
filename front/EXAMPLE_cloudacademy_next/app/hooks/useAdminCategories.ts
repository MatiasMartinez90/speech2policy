import { useState, useCallback } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'

export interface Category {
  category_id: string
  label: string
  emoji: string
  color: string
  description: string
  architecture: any[]
  course_count: number
  level: 'beginner' | 'intermediate' | 'advanced'
  display_order: number
  is_active: boolean
  featured: boolean
  created_at: string
  updated_at: string
}

export interface CreateCategoryInput {
  label: string
  emoji: string
  color: string
  description: string
  architecture?: any[]
  level?: 'beginner' | 'intermediate' | 'advanced'
  display_order?: number
  featured?: boolean
  course_count?: number
}

export interface UpdateCategoryInput {
  label?: string
  emoji?: string
  color?: string
  description?: string
  architecture?: any[]
  level?: 'beginner' | 'intermediate' | 'advanced'
  display_order?: number
  featured?: boolean
  is_active?: boolean
  course_count?: number
}

export const useAdminCategories = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getAuthToken = useCallback(async (): Promise<string> => {
    try {
      // Try to get from Amplify session
      const session = await fetchAuthSession()

      if (session.tokens?.idToken) {
        return session.tokens.idToken.toString()
      }

      throw new Error('No ID token in session')
    } catch (authError) {
      // Fallback to localStorage
      const clientId = process.env.NEXT_PUBLIC_AUTH_WEB_CLIENT_ID || '7k692bp886on11hdqfroo2pp44'
      const lastAuthUser = localStorage.getItem(`CognitoIdentityServiceProvider.${clientId}.LastAuthUser`)

      if (lastAuthUser) {
        const idTokenKey = `CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.idToken`
        const token = localStorage.getItem(idTokenKey)

        if (token) return token
      }

      throw new Error('No authentication token found')
    }
  }, [])

  const fetchCategories = useCallback(async (includeInactive = false) => {
    setLoading(true)
    setError(null)

    try {
      const token = await getAuthToken()
      const API_URL = process.env.NEXT_PUBLIC_TUTOR_API_URL || 'https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api'

      const url = includeInactive
        ? `${API_URL}/categories?include_inactive=true`
        : `${API_URL}/categories`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication expired. Please log in again.')
        } else if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.')
        } else {
          throw new Error(`Failed to fetch categories: ${response.status}`)
        }
      }

      const data = await response.json()
      setCategories(data.categories || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch categories'
      setError(errorMessage)
      console.error('Error fetching categories:', err)
    } finally {
      setLoading(false)
    }
  }, [getAuthToken])

  const createCategory = useCallback(async (categoryData: CreateCategoryInput): Promise<Category | null> => {
    setLoading(true)
    setError(null)

    try {
      const token = await getAuthToken()
      const API_URL = process.env.NEXT_PUBLIC_TUTOR_API_URL || 'https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api'

      const response = await fetch(`${API_URL}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(categoryData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        if (response.status === 401) {
          throw new Error('Authentication expired. Please log in again.')
        } else if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.')
        } else if (response.status === 409) {
          throw new Error(`Category "${categoryData.label}" already exists`)
        } else {
          throw new Error(errorData.error || `Failed to create category: ${response.status}`)
        }
      }

      const newCategory = await response.json()

      // Add to local state
      setCategories(prev => [newCategory, ...prev].sort((a, b) => a.display_order - b.display_order))

      return newCategory
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create category'
      setError(errorMessage)
      console.error('Error creating category:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [getAuthToken])

  const updateCategory = useCallback(async (categoryId: string, updates: UpdateCategoryInput): Promise<Category | null> => {
    setLoading(true)
    setError(null)

    try {
      const token = await getAuthToken()
      const API_URL = process.env.NEXT_PUBLIC_TUTOR_API_URL || 'https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api'

      const response = await fetch(`${API_URL}/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        if (response.status === 401) {
          throw new Error('Authentication expired. Please log in again.')
        } else if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.')
        } else if (response.status === 404) {
          throw new Error(`Category "${categoryId}" not found`)
        } else {
          throw new Error(errorData.error || `Failed to update category: ${response.status}`)
        }
      }

      const updatedCategory = await response.json()

      // Update local state
      setCategories(prev => prev.map(cat =>
        cat.category_id === categoryId ? updatedCategory : cat
      ).sort((a, b) => a.display_order - b.display_order))

      return updatedCategory
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update category'
      setError(errorMessage)
      console.error('Error updating category:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [getAuthToken])

  const deleteCategory = useCallback(async (categoryId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const token = await getAuthToken()
      const API_URL = process.env.NEXT_PUBLIC_TUTOR_API_URL || 'https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api'

      const response = await fetch(`${API_URL}/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        if (response.status === 401) {
          throw new Error('Authentication expired. Please log in again.')
        } else if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.')
        } else if (response.status === 404) {
          throw new Error(`Category "${categoryId}" not found`)
        } else {
          throw new Error(errorData.error || `Failed to delete category: ${response.status}`)
        }
      }

      // Remove from local state (soft delete marca como inactiva)
      setCategories(prev => prev.map(cat =>
        cat.category_id === categoryId ? { ...cat, is_active: false } : cat
      ))

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete category'
      setError(errorMessage)
      console.error('Error deleting category:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [getAuthToken])

  return {
    categories,
    loading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  }
}
