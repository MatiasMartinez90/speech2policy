import { NextPage } from 'next'
import Router from 'next/router'
import { useEffect } from 'react'
import useCategories from '../hooks/useCategories'
import useUser from '../lib/useUser'
import AuthenticatedHeader from '../components/AuthenticatedHeader'

const Courses: NextPage = () => {
  const { user, loading: userLoading, loggedOut, signOut } = useUser({ redirect: '/signin' })
  const { categories, loading: categoriesLoading } = useCategories()

  // DEBUG LOGS
  useEffect(() => {
    console.group('📄 [/courses] Page State')
    console.log('user:', user ? 'PRESENT ✅' : 'NULL ❌')
    console.log('userLoading:', userLoading)
    console.log('loggedOut:', loggedOut)
    console.log('categoriesLoading:', categoriesLoading)
    console.log('Current URL:', typeof window !== 'undefined' ? window.location.href : 'SSR')
    console.groupEnd()
  }, [user, userLoading, loggedOut, categoriesLoading])

  const moveToCategory = (categoryKey: string) => {
    Router.push(`/courses/${categoryKey}`)
  }

  // Helper to format level display
  const formatLevel = (level?: string) => {
    if (!level) return 'Todos los niveles'
    const levelMap: Record<string, string> = {
      beginner: 'Principiante',
      intermediate: 'Intermedio',
      advanced: 'Avanzado'
    }
    return levelMap[level] || level
  }

  if (userLoading || categoriesLoading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
    </div>
  )

  if (loggedOut) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-gray-400">Redirecting...</div>
    </div>
  )

  // Convertir categories object a array para mapear
  // Ahora incluye course_count y level desde el API
  const categoriesArray = Object.entries(categories)
    .map(([key, config]) => ({
      key,
      ...config,
      courseCount: config.course_count || 0,
      level: config.level || 'beginner'
    }))
    .sort((a, b) => (a.display_order || 999) - (b.display_order || 999))

  // Calcular totales desde los datos del API
  const totalCourses = categoriesArray.reduce((acc, cat) => acc + cat.courseCount, 0)

  return (
    <div className="min-h-screen bg-slate-900">
      <AuthenticatedHeader user={user} signOut={signOut} />

      {/* Hero Section estilo Platzi */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Catálogo de Cursos
            <br />
            <span className="text-green-400">CloudAcademy</span>
          </h1>
          <p className="text-xl text-gray-300 mb-16 max-w-4xl mx-auto">
            Descubre todos los cursos disponibles en CloudAcademy
          </p>
        </div>

        {/* Stats Overview */}
        <div className="mb-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">Categorías Disponibles</dt>
                    <dd className="text-lg font-medium text-white">{categoriesArray.length}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">Cursos Totales</dt>
                    <dd className="text-lg font-medium text-white">{totalCourses}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">Especialidades AWS</dt>
                    <dd className="text-lg font-medium text-white">7</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-400 truncate">Horas de Contenido</dt>
                    <dd className="text-lg font-medium text-white">150+</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sección de categorías */}
        <div className="mb-8">
          <div className="flex flex-col items-center text-center mb-12">
            <div className="flex items-center space-x-3 mb-4">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h2 className="text-2xl font-bold text-white">Explora por Categorías</h2>
            </div>
            <p className="text-gray-400 max-w-2xl">
              Descubre cursos organizados por especialidad. Cada categoría contiene múltiples cursos diseñados para llevarte desde principiante hasta experto.
            </p>
          </div>

          {/* Grid de categorías */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoriesArray.map((category) => (
              <div
                key={category.key}
                onClick={() => moveToCategory(category.key)}
                className="group bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-700/50 hover:border-purple-500/30 transition-all duration-300 hover:transform hover:scale-105 cursor-pointer relative overflow-hidden"
              >
                {/* Indicador de categoría */}
                <div className="absolute top-4 right-4">
                  <div className="flex items-center space-x-1 text-xs text-gray-400">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* Header de la categoría */}
                <div className="flex items-start space-x-4 mb-4">
                  <div className={`w-14 h-14 bg-gradient-to-r ${category.color} rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300`}>
                    {category.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-lg leading-tight group-hover:text-purple-300 transition-colors mb-1">
                      {category.label}
                    </h3>
                    <div className="flex items-center space-x-3 text-xs">
                      <span className="px-2 py-1 bg-slate-700/50 rounded-full text-green-400 font-medium">
                        {category.courseCount || 0} cursos
                      </span>
                      <span className="text-gray-500">
                        {formatLevel(category.level)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Descripción */}
                <p className="text-gray-400 text-sm mb-4 leading-relaxed line-clamp-3">
                  {category.description}
                </p>

                {/* Footer con CTA */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span>Categoría</span>
                  </div>
                  <div className="flex items-center space-x-1 text-purple-400 group-hover:text-purple-300 transition-colors text-sm font-medium">
                    <span>Explorar</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>

                {/* Hover effect overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Courses
