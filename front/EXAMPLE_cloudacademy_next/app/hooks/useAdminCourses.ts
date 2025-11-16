import { useState, useCallback } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'

export interface KeyConcept {
  emoji: string
  name: string
}

export interface Course {
  PK: string
  SK: string
  course_id: string
  course_name: string
  title?: string
  description: string
  category: string
  difficulty: string
  total_sections: number
  student_count: number
  average_rating: number
  completion_rate: number
  created_at: string
  updated_at: string
  is_published: boolean
  // Campos de metadata (Fase 1)
  estimated_time?: string
  cost?: number
  summary_30s?: string
  introduction?: string
  subtitle?: string
  what_youll_need?: string[]
  key_concepts?: KeyConcept[]
  // Campos opcionales para páginas de categoría (Fase 2)
  icon?: string
  type?: string
  featured?: boolean
  color?: string
  rating?: number
  // Campo para curso estrella del home
  is_featured?: boolean
}

export interface CreateCourseInput {
  course_id: string
  course_name: string
  title?: string
  description: string
  category?: string
  difficulty?: string
  is_published?: boolean
  // Campos de metadata (Fase 1)
  estimated_time?: string
  cost?: number
  summary_30s?: string
  introduction?: string
  subtitle?: string
  what_youll_need?: string[]
  key_concepts?: KeyConcept[]
  // Campos opcionales para páginas de categoría (Fase 2)
  icon?: string
  type?: string
  featured?: boolean
  color?: string
  rating?: number
  student_count?: number
  average_rating?: number
  completion_rate?: number
}

export interface UpdateCourseInput {
  course_name?: string
  title?: string
  description?: string
  category?: string
  difficulty?: string
  is_published?: boolean
  // Campos de metadata (Fase 1)
  estimated_time?: string
  cost?: number
  summary_30s?: string
  introduction?: string
  subtitle?: string
  what_youll_need?: string[]
  key_concepts?: KeyConcept[]
  // Campos opcionales para páginas de categoría (Fase 2)
  icon?: string
  type?: string
  featured?: boolean
  color?: string
  rating?: number
  student_count?: number
  average_rating?: number
  completion_rate?: number
  // Campo para curso estrella del home
  is_featured?: boolean
}

export const useAdminCourses = () => {
  const [courses, setCourses] = useState<Course[]>([])
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

  const fetchCourses = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const token = await getAuthToken()
      const API_URL = process.env.NEXT_PUBLIC_TUTOR_API_URL || 'https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api'

      const response = await fetch(`${API_URL}/courses`, {
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
          throw new Error(`Failed to fetch courses: ${response.status}`)
        }
      }

      const data = await response.json()
      setCourses(data.courses || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch courses'
      setError(errorMessage)
      console.error('Error fetching courses:', err)
    } finally {
      setLoading(false)
    }
  }, [getAuthToken])

  const createCourse = useCallback(async (courseData: CreateCourseInput): Promise<Course | null> => {
    setLoading(true)
    setError(null)

    try {
      const token = await getAuthToken()
      const API_URL = process.env.NEXT_PUBLIC_TUTOR_API_URL || 'https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api'

      const response = await fetch(`${API_URL}/admin/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(courseData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        if (response.status === 401) {
          throw new Error('Authentication expired. Please log in again.')
        } else if (response.status === 403) {
          throw new Error('Access denied. Admin privileges required.')
        } else if (response.status === 409) {
          throw new Error(`Course "${courseData.course_id}" already exists`)
        } else {
          throw new Error(errorData.error || `Failed to create course: ${response.status}`)
        }
      }

      const data = await response.json()
      const newCourse = data.course

      // Add to local state
      setCourses(prev => [newCourse, ...prev])

      return newCourse
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create course'
      setError(errorMessage)
      console.error('Error creating course:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [getAuthToken])

  const updateCourse = useCallback(async (courseId: string, updates: UpdateCourseInput): Promise<Course | null> => {
    setLoading(true)
    setError(null)

    try {
      const token = await getAuthToken()
      const API_URL = process.env.NEXT_PUBLIC_TUTOR_API_URL || 'https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api'

      const response = await fetch(`${API_URL}/admin/courses/${courseId}`, {
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
          throw new Error(`Course "${courseId}" not found`)
        } else {
          throw new Error(errorData.error || `Failed to update course: ${response.status}`)
        }
      }

      const data = await response.json()
      const updatedCourse = data.course

      // Update local state
      setCourses(prev => prev.map(course =>
        course.course_id === courseId ? updatedCourse : course
      ))

      return updatedCourse
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update course'
      setError(errorMessage)
      console.error('Error updating course:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [getAuthToken])

  const deleteCourse = useCallback(async (courseId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const token = await getAuthToken()
      const API_URL = process.env.NEXT_PUBLIC_TUTOR_API_URL || 'https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api'

      const response = await fetch(`${API_URL}/admin/courses/${courseId}`, {
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
          throw new Error(`Course "${courseId}" not found`)
        } else {
          throw new Error(errorData.error || `Failed to delete course: ${response.status}`)
        }
      }

      // Remove from local state
      setCourses(prev => prev.filter(course => course.course_id !== courseId))

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete course'
      setError(errorMessage)
      console.error('Error deleting course:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [getAuthToken])

  return {
    courses,
    loading,
    error,
    fetchCourses,
    createCourse,
    updateCourse,
    deleteCourse,
  }
}
