import type { NextPage } from 'next'
import Router from 'next/router'
import { useState, useEffect } from 'react'
import { useAuthenticator } from '@aws-amplify/ui-react'
import AuthenticatedHeader from '../components/AuthenticatedHeader'

const Computo: NextPage = () => {
  const { user, authStatus, signOut } = useAuthenticator()
  const [selectedLevel, setSelectedLevel] = useState('all')
  const [selectedType, setSelectedType] = useState('all')

  // DEBUG: Log auth status
  useEffect(() => {
    console.log('🔍 [/computo] authStatus:', authStatus)
    console.log('🔍 [/computo] user:', user ? 'PRESENT' : 'NULL')
  }, [authStatus, user])

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      console.log('🚪 [/computo] Redirecting to /signin (unauthenticated)')
      Router.push('/signin')
    }
  }, [authStatus])

  const goBack = () => {
    Router.push('/admin')
  }

  const goToCourse = (courseId: string) => {
    if (courseId === 'bedrock') {
      Router.push('/bedrock')
    } else {
      // Para otros cursos, redirigir a una página genérica o mostrar "próximamente"
      alert(`Curso "${courseId}" próximamente disponible`)
    }
  }

  const courses = [
    {
      id: 'apis-lambda-gateway',
      title: 'APIs with Lambda + API Gateway',
      description: 'Construye APIs serverless robustas con AWS Lambda y API Gateway. Aprende routing, autenticación, throttling, CORS y deploy automatizado.',
      icon: '⚡',
      level: 'Intermedio',
      duration: '75 min',
      cost: '$0.15',
      difficulty: 'Serverless APIs',
      type: 'Serverless',
      color: 'from-yellow-500 to-orange-600',
      students: 456,
      rating: 4.9,
      featured: true
    },
    {
      id: 'fetch-data-lambda',
      title: 'Fetch Data with AWS Lambda',
      description: 'Procesamiento de datos con AWS Lambda. Triggers, event sources, DynamoDB integration, S3 processing y data pipelines serverless.',
      icon: '📥',
      level: 'Básico',
      duration: '50 min',
      cost: '$0.08',
      difficulty: 'Data Processing',
      type: 'Lambda Functions',
      color: 'from-blue-500 to-cyan-600',
      students: 234,
      rating: 4.7,
      featured: true
    },
    {
      id: 'three-tier-webapp',
      title: 'Build a Three-Tier Web App',
      description: 'Arquitectura completa de 3 capas en AWS. Frontend (S3/CloudFront), Backend (Lambda/API Gateway), Database (RDS/DynamoDB). Proyecto end-to-end.',
      icon: '🏗️',
      level: 'Avanzado',
      duration: '120 min',
      cost: '$0.25',
      difficulty: 'Full Stack Architecture',
      type: 'Architecture',
      color: 'from-purple-500 to-pink-600',
      students: 189,
      rating: 4.8,
      featured: true
    }
  ]

  const filteredCourses = courses.filter(course => {
    const levelMatch = selectedLevel === 'all' || course.level === selectedLevel
    const typeMatch = selectedType === 'all' || course.type === selectedType
    return levelMatch && typeMatch
  })

  const featuredCourses = courses.filter(course => course.featured)

  // Show loading while authenticating
  if (authStatus === 'configuring') return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
    </div>
  )

  // Don't render content if not authenticated (will redirect)
  if (authStatus !== 'authenticated') return null

  return (
    <div className="min-h-screen bg-slate-900">
      <AuthenticatedHeader user={user} signOut={signOut} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-300 border border-gray-500/30">
                  • CATEGORÍA
                </span>
                <h1 className="text-4xl font-bold text-white mt-4 mb-2">
                  Computo
                </h1>
                <p className="text-gray-300 text-lg">
                  Domina servicios de compute de AWS. Desde Lambda serverless hasta arquitecturas completas de 3 capas con EC2, ECS y Fargate.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-400 to-gray-500 border-2 border-slate-800"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 border-2 border-slate-800"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-purple-500 border-2 border-slate-800"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 border-2 border-slate-800"></div>
                </div>
                <span className="text-gray-400 text-sm ml-2">879+ estudiantes</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-gray-500/20">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">DURACIÓN TOTAL</div>
                  <div className="text-sm text-white">4+ horas</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">DIFICULTAD</div>
                  <div className="text-sm text-white">Básico a Avanzado</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">COSTO PROMEDIO</div>
                  <div className="text-sm text-white">~$0.16</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">CURSOS</div>
                  <div className="text-sm text-white">3 disponibles</div>
                </div>
              </div>
            </div>

            {/* Compute Services Showcase */}
            <div className="mt-8 bg-gradient-to-r from-gray-500/10 via-blue-500/10 to-purple-500/10 border border-gray-500/30 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">💻</span>
                <h3 className="text-white font-bold text-lg">AWS Compute Services</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-yellow-400 text-xl">⚡</span>
                  </div>
                  <span className="text-gray-300 text-sm font-medium">Lambda</span>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-400 text-xl">🖥️</span>
                  </div>
                  <span className="text-gray-300 text-sm font-medium">EC2</span>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-purple-400 text-xl">📦</span>
                  </div>
                  <span className="text-gray-300 text-sm font-medium">ECS</span>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-green-400 text-xl">🚀</span>
                  </div>
                  <span className="text-gray-300 text-sm font-medium">Fargate</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-4">
            <select 
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gray-400 transition-colors"
            >
              <option value="all">Todos los niveles</option>
              <option value="Básico">Básico</option>
              <option value="Intermedio">Intermedio</option>
              <option value="Avanzado">Avanzado</option>
            </select>
            
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gray-400 transition-colors"
            >
              <option value="all">Todos los tipos</option>
              <option value="Serverless">Serverless</option>
              <option value="Lambda Functions">Lambda Functions</option>
              <option value="Architecture">Architecture</option>
            </select>
          </div>
        </div>

        {/* Cursos Destacados */}
        {featuredCourses.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
              <span>💻</span>
              <span>Cursos de Compute Destacados</span>
            </h2>
            <div className="grid grid-cols-1 gap-8">
              {featuredCourses.map((course) => (
                <div 
                  key={course.id}
                  onClick={() => goToCourse(course.id)}
                  className="group bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-700/50 hover:border-gray-500/30 transition-all duration-300 hover:transform hover:scale-[1.02] cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-6 right-6">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                      DESTACADO
                    </span>
                  </div>

                  <div className="flex items-start space-x-6">
                    <div className={`w-20 h-20 bg-gradient-to-r ${course.color} rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300`}>
                      {course.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-2xl leading-tight group-hover:text-gray-300 transition-colors mb-3">
                        {course.title}
                      </h3>
                      <p className="text-gray-400 text-base mb-4 leading-relaxed">
                        {course.description}
                      </p>
                      <div className="flex items-center space-x-6 text-sm mb-4">
                        <span className="px-3 py-1 bg-slate-700/50 rounded-full text-gray-300 font-medium">
                          {course.level}
                        </span>
                        <span className="text-gray-400">{course.duration}</span>
                        <span className="text-gray-400">{course.cost}</span>
                        <span className="px-2 py-1 bg-gray-600/30 rounded text-gray-400 text-xs">
                          {course.difficulty}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <span>⭐</span>
                            <span>{course.rating}</span>
                          </div>
                          <span>{course.students} estudiantes</span>
                        </div>
                        <div className="flex items-center space-x-2 text-gray-400 group-hover:text-gray-300 transition-colors text-base font-medium">
                          <span>Comenzar Curso</span>
                          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Learning Path */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
            <span>🎯</span>
            <span>Ruta de Aprendizaje Recomendada</span>
          </h2>
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold">Fetch Data with AWS Lambda</h4>
                  <p className="text-gray-400 text-sm">Aprende los fundamentos de AWS Lambda y procesamiento de datos</p>
                </div>
                <span className="text-gray-500 text-sm">50 min</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold">APIs with Lambda + API Gateway</h4>
                  <p className="text-gray-400 text-sm">Construye APIs serverless robustas con integración completa</p>
                </div>
                <span className="text-gray-500 text-sm">75 min</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold">Build a Three-Tier Web App</h4>
                  <p className="text-gray-400 text-sm">Proyecto final: arquitectura completa de 3 capas end-to-end</p>
                </div>
                <span className="text-gray-500 text-sm">120 min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Architecture Diagram */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
            <span>🏗️</span>
            <span>Arquitectura que Aprenderás</span>
          </h2>
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-2xl">🌐</span>
                </div>
                <h4 className="text-white font-semibold mb-2">Frontend Layer</h4>
                <p className="text-gray-400 text-sm">S3 Static Hosting, CloudFront CDN, Route 53 DNS</p>
              </div>
              <div>
                <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-2xl">⚡</span>
                </div>
                <h4 className="text-white font-semibold mb-2">API Layer</h4>
                <p className="text-gray-400 text-sm">Lambda Functions, API Gateway, IAM Authentication</p>
              </div>
              <div>
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-2xl">🗄️</span>
                </div>
                <h4 className="text-white font-semibold mb-2">Data Layer</h4>
                <p className="text-gray-400 text-sm">DynamoDB NoSQL, RDS Relational, S3 Object Storage</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Computo