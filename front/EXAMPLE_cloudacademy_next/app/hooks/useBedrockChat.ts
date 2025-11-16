import { useState, useCallback } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'

export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
}

export interface BedrockChatResponse {
  success: boolean
  message: string
  timestamp: string
  user_id?: string
  course_id?: string
  step_id?: number
}

export interface BedrockErrorResponse {
  success: boolean
  error: string
  detail?: string
  timestamp: string
}

export const useBedrockChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addMessage = useCallback((content: string, role: 'user' | 'assistant') => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      role,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
    return newMessage
  }, [])

  const sendMessage = useCallback(async (content: string, courseContext?: string, stepId?: number) => {
    if (!content.trim()) return

    setLoading(true)
    setError(null)

    // Add user message immediately
    addMessage(content, 'user')

    try {
      // Get authentication token from localStorage
      let token: string | null = null
      
      console.log('Attempting to get authentication token...')
      
      // First try to get from Amplify session
      try {
        console.log('Calling fetchAuthSession()...')
        const session = await fetchAuthSession()
        console.log('Session obtained:', session)

        // In Amplify v6, tokens are in session.tokens
        if (session.tokens?.idToken) {
          token = session.tokens.idToken.toString()
          console.log('Token obtained successfully from Amplify session, length:', token?.length)
        } else {
          throw new Error('No ID token in session')
        }
      } catch (authError) {
        console.error('fetchAuthSession() failed:', authError)
        
        // Fallback: get from localStorage directly
        console.log('Trying localStorage fallback...')
        const clientId = process.env.NEXT_PUBLIC_AUTH_WEB_CLIENT_ID || '7ho22jco9j63c3hmsrsp4bj0ti'
        const lastAuthUser = localStorage.getItem(`CognitoIdentityServiceProvider.${clientId}.LastAuthUser`)
        
        if (lastAuthUser) {
          const idTokenKey = `CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.idToken`
          token = localStorage.getItem(idTokenKey)
          console.log('Token obtained from localStorage, length:', token?.length)
        } else {
          console.error('No LastAuthUser found in localStorage')
        }
      }
      
      if (!token) {
        throw new Error('No authentication token found. Please log in.')
      }

      // Call the new AWS API Gateway backend
      const API_URL = process.env.NEXT_PUBLIC_TUTOR_API_URL || 'https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api'

      const response = await fetch(`${API_URL}/tutor/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          course_id: courseContext || 'image-gen-bedrock',
          section_id: stepId || 0,
          question: content,
          session_id: `session_${Date.now()}` // Generate unique session ID
        })
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid, redirect to login
          localStorage.removeItem('accessToken')
          throw new Error('Authentication expired. Please log in again.')
        } else if (response.status === 403) {
          throw new Error('Access denied. You do not have permission to use this feature.')
        } else {
          throw new Error(`API error! status: ${response.status}`)
        }
      }

      const data = await response.json()

      // Handle new Lambda response format
      if (data.answer) {
        addMessage(data.answer, 'assistant')
      } else if (data.error) {
        throw new Error(data.error || 'Unknown error occurred')
      } else {
        throw new Error('Invalid response format from server')
      }

    } catch (err) {
      let errorMessage = 'Failed to send message'
      
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'string' && err.includes('not authenticated')) {
        errorMessage = 'Authentication expired. Please log in again.'
      }
      
      setError(errorMessage)
      
      // Add error message as assistant response
      addMessage(
        `Lo siento, hubo un error al procesar tu mensaje: ${errorMessage}. Por favor, intenta nuevamente.`,
        'assistant'
      )
    } finally {
      setLoading(false)
    }
  }, [messages, addMessage])

  const clearChat = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return {
    messages,
    loading,
    error,
    sendMessage,
    clearChat
  }
}