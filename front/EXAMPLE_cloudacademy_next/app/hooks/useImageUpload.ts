import { useState } from 'react'
import { fetchAuthSession } from 'aws-amplify/auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_TUTOR_API_URL || 'https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api'

export interface UploadResult {
  presigned_url: string
  public_url: string
  s3_key: string
  expires_in: number
}

export interface UploadedImage {
  url: string
  key: string
  name: string
}

export function useImageUpload(courseId: string) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
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

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true)
      setProgress(0)
      setError(null)

      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Tipo de archivo no soportado. Usa PNG, JPG, GIF o WEBP')
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) {
        throw new Error('El archivo es muy grande. Tamaño máximo: 5MB')
      }

      setProgress(10)

      // Step 1: Get presigned URL from backend
      const token = await getAuthToken()
      const response = await fetch(`${API_BASE_URL}/admin/upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          course_id: courseId,
          filename: file.name,
          content_type: file.type,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Error getting upload URL: ${response.statusText}`)
      }

      const uploadData: UploadResult = await response.json()
      setProgress(30)

      // Step 2: Upload file to S3 using presigned URL
      const uploadResponse = await fetch(uploadData.presigned_url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      })

      if (!uploadResponse.ok) {
        throw new Error(`Error uploading to S3: ${uploadResponse.statusText}`)
      }

      setProgress(100)

      // Return the public URL
      return uploadData.public_url
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error uploading image'
      setError(message)
      console.error('Error uploading image:', err)
      return null
    } finally {
      setUploading(false)
    }
  }

  const uploadMultipleImages = async (files: File[]): Promise<string[]> => {
    const urls: string[] = []

    for (let i = 0; i < files.length; i++) {
      const url = await uploadImage(files[i])
      if (url) {
        urls.push(url)
      }
      // Update progress for multiple files
      setProgress(Math.round(((i + 1) / files.length) * 100))
    }

    return urls
  }

  return {
    uploading,
    progress,
    error,
    uploadImage,
    uploadMultipleImages,
  }
}
