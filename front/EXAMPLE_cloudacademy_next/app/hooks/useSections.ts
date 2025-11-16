import { useState, useCallback } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'

export interface Section {
  section_id: number
  title: string
  content: string
  order: number
  estimated_time?: string
  images?: string[]
  agent_config?: {
    system_prompt: string
    validation_criteria: Record<string, any>
    hints: {
      level_1: string
      level_2: string
      level_3: string
    }
  }
  created_at?: string
  updated_at?: string
}

export interface CreateSectionInput {
  title: string
  content: string
  order: number
  estimated_time?: string
  images?: string[]
  agent_config?: {
    system_prompt: string
    validation_criteria: Record<string, any>
    hints: {
      level_1: string
      level_2: string
      level_3: string
    }
  }
}

export interface UpdateSectionInput {
  title?: string
  content?: string
  order?: number
  estimated_time?: string
  images?: string[]
  agent_config?: {
    system_prompt: string
    validation_criteria: Record<string, any>
    hints: {
      level_1: string
      level_2: string
      level_3: string
    }
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_TUTOR_API_URL || 'https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api'

export function useSections(courseId: string) {
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getAuthToken = async () => {
    try {
      const session = await fetchAuthSession()
      return session.tokens?.idToken?.toString() || ''
    } catch (error) {
      console.error('Error getting auth token:', error)
      throw new Error('No authentication token found')
    }
  }

  const fetchSections = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const token = await getAuthToken()
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Error fetching sections: ${response.statusText}`)
      }

      const data = await response.json()
      setSections(data.sections || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error fetching sections'
      setError(message)
      console.error('Error fetching sections:', err)
    } finally {
      setLoading(false)
    }
  }, [courseId])

  const createSection = async (sectionData: CreateSectionInput): Promise<Section | null> => {
    try {
      setLoading(true)
      setError(null)

      const token = await getAuthToken()
      const response = await fetch(`${API_BASE_URL}/admin/courses/${courseId}/sections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(sectionData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error creating section: ${response.statusText}`)
      }

      const data = await response.json()
      const newSection = data.section

      setSections(prev => [...prev, newSection].sort((a, b) => a.order - b.order))
      return newSection
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error creating section'
      setError(message)
      console.error('Error creating section:', err)
      return null
    } finally {
      setLoading(false)
    }
  }

  const updateSection = async (sectionId: number, updates: UpdateSectionInput): Promise<Section | null> => {
    try {
      setLoading(true)
      setError(null)

      const token = await getAuthToken()
      const response = await fetch(`${API_BASE_URL}/admin/courses/${courseId}/sections/${sectionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error updating section: ${response.statusText}`)
      }

      const data = await response.json()
      const updatedSection = data.section

      setSections(prev =>
        prev.map(s => s.section_id === sectionId ? updatedSection : s)
          .sort((a, b) => a.order - b.order)
      )
      return updatedSection
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error updating section'
      setError(message)
      console.error('Error updating section:', err)
      return null
    } finally {
      setLoading(false)
    }
  }

  const deleteSection = async (sectionId: number): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const token = await getAuthToken()
      const response = await fetch(`${API_BASE_URL}/admin/courses/${courseId}/sections/${sectionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error deleting section: ${response.statusText}`)
      }

      setSections(prev => prev.filter(s => s.section_id !== sectionId))
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error deleting section'
      setError(message)
      console.error('Error deleting section:', err)
      return false
    } finally {
      setLoading(false)
    }
  }

  const reorderSections = async (reorderedSections: Array<{ section_id: number; order: number }>): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const token = await getAuthToken()
      const response = await fetch(`${API_BASE_URL}/admin/courses/${courseId}/sections/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sections: reorderedSections }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error reordering sections: ${response.statusText}`)
      }

      // Update local state with new order
      const orderMap = new Map(reorderedSections.map(s => [s.section_id, s.order]))
      setSections(prev =>
        prev.map(s => ({
          ...s,
          order: orderMap.get(s.section_id) ?? s.order
        })).sort((a, b) => a.order - b.order)
      )

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error reordering sections'
      setError(message)
      console.error('Error reordering sections:', err)
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    sections,
    loading,
    error,
    fetchSections,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
  }
}
