'use client'

import React, { useState, useEffect } from 'react'

interface Course {
  course_id: string
  progress_percentage: number
  started_at: string
  last_accessed: string
  completed_at: string | null
}

interface UserProgress {
  user: {
    id: string
    name: string
    email: string
  }
  statistics: {
    total_courses_enrolled: number
    courses_completed: number
    average_progress: number
  }
  courses: Course[]
}

interface UserProgressDashboardProps {
  userId: string
}

const UserProgressDashboard: React.FC<UserProgressDashboardProps> = ({ userId }) => {
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        console.log('🚀 Starting fetchProgress with userId:', userId)
        setLoading(true)
        setError(null)
        
        // Llamar al Web APIs microservice
        const webApiUrl = process.env.NEXT_PUBLIC_WEB_API_URL || 'https://api-web.cloudacademy.ar'
        const url = `${webApiUrl}/api/users/me/progress?user_id=${userId}`
        console.log('🌍 Environment Web API URL:', process.env.NEXT_PUBLIC_WEB_API_URL)
        console.log('🌍 Using Web API URL:', webApiUrl)
        console.log('📡 Fetching from URL:', url)
        
        const response = await fetch(url)
        console.log('📥 Response status:', response.status)
        console.log('📥 Response ok:', response.ok)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('❌ Response error:', errorText)
          throw new Error(`Error: ${response.status} - ${errorText}`)
        }
        
        const data = await response.json()
        console.log('✅ Data received:', data)
        setProgress(data)
      } catch (err) {
        console.error('❌ Error fetching user progress:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        console.log('🏁 Setting loading to false')
        setLoading(false)
      }
    }

    if (userId) {
      console.log('👤 userId exists, calling fetchProgress')
      fetchProgress()
    } else {
      console.log('❌ No userId provided')
      setLoading(false)
    }
  }, [userId])

  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return 'bg-green-500'
    if (percentage >= 75) return 'bg-blue-500'
    if (percentage >= 50) return 'bg-yellow-500'
    if (percentage >= 25) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getCourseTitle = (courseId: string) => {
    const titles: { [key: string]: string } = {
      'aws-fundamentals': 'AWS Fundamentals',
      'docker-basics': 'Docker Básico',
      'kubernetes-intro': 'Introducción a Kubernetes',
      'terraform-advanced': 'Terraform Avanzado'
    }
    return titles[courseId] || courseId
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
        <span className="ml-3 text-lg">Cargando progreso...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <strong className="font-bold">Error: </strong>
        <span>{error}</span>
      </div>
    )
  }

  if (!progress) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">No se encontró información de progreso</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header con información del usuario */}
      <div className="bg-slate-800 rounded-lg shadow-md p-6 border border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">{progress.user.name}</h1>
            <p className="text-gray-300">{progress.user.email}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              {progress.statistics.average_progress.toFixed(1)}%
            </div>
            <p className="text-sm text-gray-400">Progreso promedio</p>
          </div>
        </div>
      </div>

      {/* Resumen de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{progress.statistics.total_courses_enrolled}</div>
          <p className="text-sm text-gray-400">Cursos Inscritos</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{progress.statistics.courses_completed}</div>
          <p className="text-sm text-gray-400">Completados</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{progress.statistics.total_courses_enrolled - progress.statistics.courses_completed}</div>
          <p className="text-sm text-gray-400">En Progreso</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">
            {progress.statistics.average_progress.toFixed(0)}%
          </div>
          <p className="text-sm text-gray-400">Promedio</p>
        </div>
      </div>

      {/* Lista de cursos */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Mis Cursos</h2>
        <div className="space-y-4">
          {progress.courses.map((course) => (
            <div key={course.course_id} className="border border-slate-600 rounded-lg p-4 hover:border-slate-500 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">
                  {getCourseTitle(course.course_id)}
                </h3>
                <div className="flex items-center space-x-2">
                  {course.completed_at && (
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                      Completado
                    </span>
                  )}
                  <span className="text-lg font-bold text-white">
                    {course.progress_percentage}%
                  </span>
                </div>
              </div>
              
              {/* Barra de progreso */}
              <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(course.progress_percentage)}`}
                  style={{ width: `${course.progress_percentage}%` }}
                ></div>
              </div>
              
              {/* Información de fechas */}
              <div className="flex justify-between text-sm text-gray-400">
                <span>Iniciado: {formatDate(course.started_at)}</span>
                <span>
                  {course.completed_at 
                    ? `Completado: ${formatDate(course.completed_at)}`
                    : `Último acceso: ${formatDate(course.last_accessed)}`
                  }
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default UserProgressDashboard