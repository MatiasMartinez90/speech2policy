import type { NextPage } from 'next'
import Router from 'next/router'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import useCategories from '../hooks/useCategories'
import useUser from '../lib/useUser'
import useFeaturedCourse from '../hooks/useFeaturedCourse'
import SEO from '../components/SEO'

const Home: NextPage = () => {
  const { user, signOut } = useUser() // No redirect, solo detectar autenticación
  const { categories, loading: categoriesLoading } = useCategories()
  const { featuredCourse, loading: featuredLoading } = useFeaturedCourse()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const moveToRequireAuthenticationPage = () => {
    Router.push('/admin')
  }

  const moveToExamplePage = () => {
    Router.push('/example')
  }

  const moveToCategory = (categoryKey: string) => {
    // Navigate to category page
    Router.push(`/courses/${categoryKey}`)
  }

  // Prefetch important routes for better UX
  useEffect(() => {
    // Always prefetch signin page (high probability next page)
    Router.prefetch('/signin')

    // If user is logged in, prefetch authenticated pages
    if (user) {
      Router.prefetch('/admin')
      Router.prefetch('/bedrock')
      Router.prefetch('/courses')
    }

    // Prefetch featured course if available
    if (featuredCourse?.course_id) {
      Router.prefetch(`/${featuredCourse.course_id}`)
    }
  }, [user, featuredCourse])

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

  // Convert categories from API to array format for display
  // Show featured categories first, or all if none are featured
  const categoriesArray = Object.entries(categories)
    .map(([key, config]) => ({
      key,
      title: config.label,
      description: config.description,
      icon: config.emoji,
      color: `bg-gradient-to-r ${config.color}`,
      courseCount: config.course_count || 0,
      level: formatLevel(config.level),
      category: config.label,
      featured: config.featured
    }))
    .sort((a, b) => {
      // Featured first, then by display order
      if (a.featured && !b.featured) return -1
      if (!a.featured && b.featured) return 1
      return 0
    })
    .slice(0, 8) // Show max 8 categories on home page

  // Loading state
  if (categoriesLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
      </div>
    )
  }

  // Structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": "CloudAcademy",
    "description": "Plataforma educativa de cursos de AWS, DevOps y Cloud Computing con proyectos reales",
    "url": "https://proyectos.cloudacademy.ar",
    "logo": "https://proyectos.cloudacademy.ar/logo.png",
    "sameAs": [
      "https://twitter.com/cloudacademy",
      "https://linkedin.com/company/cloudacademy"
    ],
    "offers": {
      "@type": "AggregateOffer",
      "offerCount": categoriesArray.length,
      "lowPrice": "0",
      "highPrice": "0",
      "priceCurrency": "USD"
    }
  }

  return (
    <>
      <SEO
        title="CloudAcademy - Aprende AWS, DevOps y Cloud Computing con Proyectos Reales"
        description="Domina Amazon Web Services (AWS), DevOps, seguridad cloud, redes, bases de datos y más. +1000 cursos prácticos con proyectos reales. RAG con Amazon Bedrock, VPC, EC2, Lambda y mucho más."
        canonical="https://proyectos.cloudacademy.ar"
        keywords="AWS, Amazon Web Services, DevOps, Cloud Computing, Bedrock, RAG, seguridad cloud, redes AWS, VPC, EC2, Lambda, cursos AWS, aprender DevOps"
        structuredData={structuredData}
      />

      <div className="min-h-screen bg-slate-900">
      {/* Header estilo Platzi */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-8">
              <div className="flex-shrink-0">
                <button 
                  onClick={() => Router.push('/')}
                  className="flex items-center hover:opacity-80 transition-opacity"
                >
                  <span className="text-2xl font-bold text-green-400">CloudAcademy</span>
                  <span className="ml-2 text-xs bg-red-500 text-white px-2 py-1 rounded uppercase font-bold">PROYECTS</span>
                </button>
              </div>
              
            </div>

            {/* Navegación derecha */}
            <div className="flex items-center space-x-6">
              {user ? (
                /* User Menu - Authenticated */
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center space-x-2 p-2 rounded-xl hover:bg-slate-700/50 transition-all duration-200 group"
                  >
                    {/* User Avatar */}
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-600 group-hover:border-green-400/70 transition-colors">
                      {user?.picture ? (
                        <Image
                          src={user.picture}
                          alt="Profile"
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-lg">
                          {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Dropdown Arrow - Hidden on mobile */}
                    <svg
                      className={`hidden md:block w-4 h-4 text-gray-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Desktop Sidebar */}
                  {isMenuOpen && (
                    <div className="fixed inset-0 z-50">
                      {/* Backdrop */}
                      <div className="absolute inset-0 bg-black/30" onClick={() => setIsMenuOpen(false)} />

                      {/* Sidebar Panel */}
                      <div className="absolute right-0 top-0 h-full w-80 bg-slate-900/95 backdrop-blur-xl border-l border-slate-700 shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-700">
                          <h3 className="text-white font-semibold text-lg">Menu</h3>
                          <button
                            onClick={() => setIsMenuOpen(false)}
                            className="text-gray-400 hover:text-white transition-colors p-1"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {/* User Info */}
                        <div className="p-6 border-b border-slate-700">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-green-400/30">
                              {user?.picture ? (
                                <Image
                                  src={user.picture}
                                  alt="Profile"
                                  width={48}
                                  height={48}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-xl">
                                  {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-semibold text-sm truncate">
                                {user?.name || user?.given_name || user?.email?.split('@')[0]}
                              </div>
                              <div className="text-gray-400 text-xs truncate">
                                {user?.email}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Menu Items */}
                        <div className="p-4">
                          <div className="space-y-2">
                            <button
                              onClick={() => {
                                setIsMenuOpen(false)
                                Router.push('/admin')
                              }}
                              className="w-full flex items-center space-x-4 px-4 py-3 rounded-lg transition-colors text-gray-300 hover:text-white hover:bg-slate-700/50"
                            >
                              <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
                                <span className="text-xl">📚</span>
                              </div>
                              <div className="flex-1 text-left">
                                <div className="font-medium">Cursos</div>
                                <div className="text-xs text-gray-500">Accede a todos los cursos</div>
                              </div>
                            </button>

                            <button
                              onClick={() => {
                                setIsMenuOpen(false)
                                Router.push('/dashboard')
                              }}
                              className="w-full flex items-center space-x-4 px-4 py-3 rounded-lg transition-colors text-gray-300 hover:text-white hover:bg-slate-700/50"
                            >
                              <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
                                <span className="text-xl">📊</span>
                              </div>
                              <div className="flex-1 text-left">
                                <div className="font-medium">Mi Progreso</div>
                                <div className="text-xs text-gray-500">Ve tu avance y estadísticas</div>
                              </div>
                            </button>

                            <button
                              onClick={() => {
                                setIsMenuOpen(false)
                                signOut({ redirect: '/' })
                              }}
                              className="w-full flex items-center space-x-4 px-4 py-3 rounded-lg transition-colors text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
                                <span className="text-xl">🚪</span>
                              </div>
                              <div className="flex-1 text-left">
                                <div className="font-medium">Cerrar Sesión</div>
                                <div className="text-xs text-gray-500">Salir de la aplicación</div>
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Acceder Button - Not Authenticated */
                <button
                  onClick={moveToRequireAuthenticationPage}
                  className="group relative px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-xl hover:shadow-2xl hover:shadow-green-500/25 transition-all duration-300 transform hover:scale-105 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative z-10 flex items-center space-x-2">
                    <span>Acceder</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </button>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section estilo Platzi */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Proyectos REALES para aprender
            <br />
            <span className="text-green-400">Cloud y Devops</span>
          </h1>
          <p className="text-xl text-gray-300 mb-16 max-w-4xl mx-auto">
            Creemos que en la práctica es donde realmente se aprende. Por eso creamos esta serie de proyectos, para que los hagas guiado por una asistente virtual con IA.
          </p>
        </div>

        {/* Sección de categorías */}
        <div className="mb-8">
          <div className="flex flex-col items-center text-center mb-12">
            <div className="flex items-center space-x-3 mb-4">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h2 className="text-2xl font-bold text-white">Chequea las categorías</h2>
            </div>
            <p className="text-gray-400 max-w-2xl">
              Vas a encontrar proyectos desde lo básico, a lo avanzado hasta lo último que que está sonando.
            </p>
          </div>

          {/* Hero Course - Dinámico desde DynamoDB */}
          {!featuredLoading && featuredCourse && (
            <div className="mb-16 relative">
              {/* Glow effect background */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-green-600/20 rounded-3xl blur-xl"></div>

              <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-800/95 to-slate-900/90 backdrop-blur-sm border-2 border-purple-500/30 rounded-3xl p-10 overflow-hidden">
                {/* Background pattern */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full blur-3xl"></div>

                <div className="relative z-10">
                  <div className="flex flex-col lg:flex-row items-start justify-between mb-8">
                    <div className="flex-1 lg:pr-8">
                      {/* Badge con animación */}
                      <div className="flex items-center space-x-3 mb-6">
                        <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg animate-pulse">
                          🔥 CURSO ESTRELLA
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                          ✨ MÁS POPULAR
                        </span>
                      </div>

                      {/* Título dinámico */}
                      <h2 className="text-4xl lg:text-5xl font-black text-white mb-4 leading-tight">
                        {featuredCourse.course_name.split(' ')[0]}{' '}
                        <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-green-400 bg-clip-text text-transparent">
                          {featuredCourse.course_name.split(' ').slice(1).join(' ')}
                        </span>
                      </h2>

                      {/* Subtítulo dinámico */}
                      <p className="text-xl text-purple-200 font-semibold mb-4">
                        {featuredCourse.summary_30s || featuredCourse.description}
                      </p>

                      {/* Descripción dinámica */}
                      <p className="text-lg text-gray-300 mb-6 leading-relaxed">
                        {featuredCourse.introduction || featuredCourse.description}
                      </p>

                      {/* Beneficios clave - dinámicos */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                            ⚡
                          </div>
                          <span className="text-gray-300 font-medium">{featuredCourse.estimated_time || 'Proyecto práctico'}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                            🧠
                          </div>
                          <span className="text-gray-300 font-medium">IA + Amazon Bedrock</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                            💰
                          </div>
                          <span className="text-gray-300 font-medium">
                            Costo: {featuredCourse.cost === 0 ? 'Gratis' : `~$${featuredCourse.cost?.toFixed(2)}`}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                            🎯
                          </div>
                          <span className="text-gray-300 font-medium">Nivel {featuredCourse.difficulty.toLowerCase()}</span>
                        </div>
                      </div>

                      {/* CTA principal - dinámico */}
                      <div className="flex flex-col sm:flex-row gap-4">
                        <button
                          onClick={() => Router.push(`/${featuredCourse.course_id}`)}
                          className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 via-blue-600 to-green-600 text-white font-bold text-lg rounded-2xl hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105 overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-blue-400 to-green-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <span className="relative z-10 flex items-center justify-center space-x-2">
                            <span>🚀 Comenzar Proyecto Ahora</span>
                          </span>
                        </button>

                        <button className="px-6 py-4 border-2 border-purple-400/50 text-purple-300 rounded-2xl font-semibold hover:bg-purple-500/20 hover:border-purple-400 transition-all duration-300">
                          📋 Ver Demo Completo
                        </button>
                      </div>
                    </div>

                    {/* Sidebar con social proof - dinámico */}
                    <div className="lg:w-80 mt-8 lg:mt-0">
                      {/* Estudiantes activos */}
                      <div className="bg-slate-700/50 rounded-2xl p-6 mb-6 border border-slate-600/30">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-gray-400 text-sm font-medium">ESTUDIANTES ACTIVOS</span>
                          <div className="flex -space-x-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-purple-500 border-2 border-slate-800"></div>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 border-2 border-slate-800"></div>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-green-500 border-2 border-slate-800"></div>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 border-2 border-slate-800"></div>
                            <div className="w-8 h-8 rounded-full bg-slate-600 border-2 border-slate-800 flex items-center justify-center">
                              <span className="text-xs text-gray-300 font-bold">+50</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-2xl font-bold text-white mb-1">{featuredCourse.student_count} estudiantes</div>
                        <div className="text-green-400 text-sm font-medium">+23 esta semana</div>
                      </div>

                      {/* Rating */}
                      <div className="bg-slate-700/50 rounded-2xl p-6 border border-slate-600/30">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="flex space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className="text-yellow-400 text-lg">⭐</span>
                            ))}
                          </div>
                          <span className="text-white font-bold text-lg">{featuredCourse.average_rating.toFixed(1)}</span>
                        </div>
                        <p className="text-gray-400 text-sm">&quot;Increíble curso de IA práctica&quot;</p>
                        <p className="text-gray-500 text-xs mt-1">- María González, Data Scientist</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Placeholder si no hay curso featured */}
          {!featuredLoading && !featuredCourse && (
            <div className="mb-16 text-center">
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-12">
                <p className="text-gray-400 text-lg">No hay curso destacado en este momento</p>
              </div>
            </div>
          )}

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
                  <div className={`w-14 h-14 ${category.color} rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300`}>
                    {category.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-lg leading-tight group-hover:text-purple-300 transition-colors mb-1">
                      {category.title}
                    </h3>
                    <div className="flex items-center space-x-3 text-xs">
                      <span className="px-2 py-1 bg-slate-700/50 rounded-full text-green-400 font-medium">
                        {category.courseCount} cursos
                      </span>
                      <span className="text-gray-500">
                        {category.level}
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

        {/* Stats section */}
        <div className="mt-20 text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <div className="text-3xl font-bold text-green-400 mb-2">1000+</div>
              <div className="text-gray-300">Cursos disponibles</div>
            </div>
            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <div className="text-3xl font-bold text-green-400 mb-2">50k+</div>
              <div className="text-gray-300">Estudiantes activos</div>
            </div>
            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <div className="text-3xl font-bold text-green-400 mb-2">95%</div>
              <div className="text-gray-300">Tasa de satisfacción</div>
            </div>
          </div>
        </div>
      </main>
    </div>
    </>
  )
}

export default Home
