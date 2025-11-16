import { useState, useCallback } from 'react'

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
  // Campos opcionales para páginas de categoría
  icon?: string
  type?: string
  featured?: boolean
  color?: string
  rating?: number
}

export interface CourseDetail extends Course {
  sections?: Section[]
}

export interface Section {
  section_id: number
  title: string
  estimated_time: string
  order: number
  content?: string
  learning_objectives?: string[]
  steps?: string[]
  checkpoint?: {
    question: string
    validation_criteria: string[]
  }
}

export interface CourseFilters {
  category?: string
  difficulty?: string
  is_published?: boolean
}

export const useCourses = () => {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCourses = useCallback(async (filters?: CourseFilters) => {
    setLoading(true)
    setError(null)

    try {
      const API_URL = process.env.NEXT_PUBLIC_TUTOR_API_URL || 'https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api'

      // Build query string from filters
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
      const url = queryString ? `${API_URL}/courses?${queryString}` : `${API_URL}/courses`

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

      // Si no se especificó filtro is_published, filtrar solo publicados por defecto
      let coursesData = data.courses || []
      if (filters?.is_published === undefined) {
        coursesData = coursesData.filter((course: Course) => course.is_published)
      }

      setCourses(coursesData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch courses'
      setError(errorMessage)
      console.error('Error fetching courses:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchCourseDetail = useCallback(async (courseId: string): Promise<CourseDetail | null> => {
    setLoading(true)
    setError(null)

    try {
      const API_URL = process.env.NEXT_PUBLIC_TUTOR_API_URL || 'https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api'

      const response = await fetch(`${API_URL}/courses/${courseId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Course "${courseId}" not found`)
        }
        throw new Error(`Failed to fetch course: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch course'
      setError(errorMessage)
      console.error('Error fetching course:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSection = useCallback(async (courseId: string, sectionId: number): Promise<Section | null> => {
    setLoading(true)
    setError(null)

    try {
      const API_URL = process.env.NEXT_PUBLIC_TUTOR_API_URL || 'https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api'

      const response = await fetch(`${API_URL}/courses/${courseId}/sections/${sectionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Section ${sectionId} not found`)
        }
        throw new Error(`Failed to fetch section: ${response.status}`)
      }

      const data = await response.json()
      return data.section
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch section'
      setError(errorMessage)
      console.error('Error fetching section:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    courses,
    loading,
    error,
    fetchCourses,
    fetchCourseDetail,
    fetchSection,
  }
}
