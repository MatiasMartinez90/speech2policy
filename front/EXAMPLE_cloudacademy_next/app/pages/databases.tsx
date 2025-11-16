import type { NextPage } from 'next'
import Router from 'next/router'
import { useState, useEffect } from 'react'
import { useAuthenticator } from '@aws-amplify/ui-react'
import AuthenticatedHeader from '../components/AuthenticatedHeader'

const Databases: NextPage = () => {
  const { user, authStatus, signOut } = useAuthenticator()
  const [selectedLevel, setSelectedLevel] = useState('all')
  const [selectedType, setSelectedType] = useState('all')

  // DEBUG: Log auth status
  useEffect(() => {
    console.log('🔍 [/databases] authStatus:', authStatus)
    console.log('🔍 [/databases] user:', user ? 'PRESENT' : 'NULL')
  }, [authStatus, user])

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      console.log('🚪 [/databases] Redirecting to /signin (unauthenticated)')
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
      id: 'aws-databases-hands-on',
      title: 'Get Hands On with AWS Databases!',
      description: 'Explora los diferentes servicios de bases de datos de AWS con ejercicios prácticos. Aprende RDS, DynamoDB, ElastiCache y más.',
      icon: '🛠️',
      level: 'Intermedio',
      duration: '45 min',
      cost: '$0.05',
      difficulty: 'Práctico',
      type: 'AWS',
      color: 'from-blue-500 to-blue-600',
      students: 89,
      rating: 4.7,
      featured: false
    },
    {
      id: 'visualize-relational-db',
      title: 'Visualize a Relational Database',
      description: 'Aprende a crear diagramas ER, modelar datos relacionales y visualizar la estructura de bases de datos complejas.',
      icon: '📊',
      level: 'Básico',
      duration: '30 min',
      cost: 'Gratis',
      difficulty: 'Conceptual',
      type: 'Relacional',
      color: 'from-green-500 to-green-600',
      students: 156,
      rating: 4.8,
      featured: false
    },
    {
      id: 'aurora-database-ec2',
      title: 'Aurora Database with EC2',
      description: 'Configura Amazon Aurora con instancias EC2. Alta disponibilidad, replicación y optimización de rendimiento.',
      icon: '⚡',
      level: 'Avanzado',
      duration: '60 min',
      cost: '$0.12',
      difficulty: 'Técnico',
      type: 'AWS',
      color: 'from-purple-500 to-purple-600',
      students: 67,
      rating: 4.9,
      featured: true
    },
    {
      id: 'webapp-aurora-connect',
      title: 'Connect a Web App with Aurora',
      description: 'Integra una aplicación web con Amazon Aurora. Conexiones seguras, pool de conexiones y mejores prácticas.',
      icon: '🔗',
      level: 'Intermedio',
      duration: '50 min',
      cost: '$0.08',
      difficulty: 'Práctico',
      type: 'AWS',
      color: 'from-indigo-500 to-indigo-600',
      students: 92,
      rating: 4.6,
      featured: false
    },
    {
      id: 'dynamodb-load-data',
      title: 'Load Data into DynamoDB',
      description: 'Carga masiva de datos en DynamoDB. Batch operations, import/export y estrategias de particionado eficientes.',
      icon: '📥',
      level: 'Intermedio',
      duration: '40 min',
      cost: '$0.03',
      difficulty: 'Práctico',
      type: 'NoSQL',
      color: 'from-orange-500 to-orange-600',
      students: 134,
      rating: 4.5,
      featured: false
    },
    {
      id: 'dynamodb-query-data',
      title: 'Query Data with DynamoDB',
      description: 'Domina las consultas en DynamoDB. Query vs Scan, índices secundarios, filtros y optimización de queries.',
      icon: '🔍',
      level: 'Avanzado',
      duration: '55 min',
      cost: '$0.06',
      difficulty: 'Técnico',
      type: 'NoSQL',
      color: 'from-teal-500 to-teal-600',
      students: 78,
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
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  • CATEGORÍA
                </span>
                <h1 className="text-4xl font-bold text-white mt-4 mb-2">
                  Bases de Datos
                </h1>
                <p className="text-gray-300 text-lg">
                  Domina bases de datos relacionales y NoSQL con AWS. Desde conceptos básicos hasta implementaciones avanzadas en la nube.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-teal-400 to-teal-500 border-2 border-slate-800"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 border-2 border-slate-800"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-purple-500 border-2 border-slate-800"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 border-2 border-slate-800"></div>
                </div>
                <span className="text-gray-400 text-sm ml-2">600+ estudiantes</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-teal-500/20">
                  <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">DURACIÓN TOTAL</div>
                  <div className="text-sm text-white">4.5 horas</div>
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
                <div className="p-2 rounded-lg bg-green-500/20">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">COSTO PROMEDIO</div>
                  <div className="text-sm text-white">~$0.06</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">CURSOS</div>
                  <div className="text-sm text-white">6 disponibles</div>
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
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-400 transition-colors"
            >
              <option value="all">Todos los niveles</option>
              <option value="Básico">Básico</option>
              <option value="Intermedio">Intermedio</option>
              <option value="Avanzado">Avanzado</option>
            </select>
            
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-teal-400 transition-colors"
            >
              <option value="all">Todos los tipos</option>
              <option value="AWS">AWS</option>
              <option value="Relacional">Relacional</option>
              <option value="NoSQL">NoSQL</option>
            </select>
          </div>
        </div>

        {/* Cursos Destacados */}
        {featuredCourses.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
              <span>⭐</span>
              <span>Cursos Destacados</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featuredCourses.map((course) => (
                <div 
                  key={course.id}
                  onClick={() => goToCourse(course.id)}
                  className="group bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-700/50 hover:border-teal-500/30 transition-all duration-300 hover:transform hover:scale-105 cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                      DESTACADO
                    </span>
                  </div>

                  <div className="flex items-start space-x-4 mb-4">
                    <div className={`w-16 h-16 bg-gradient-to-r ${course.color} rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300`}>
                      {course.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-xl leading-tight group-hover:text-teal-300 transition-colors mb-2">
                        {course.title}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="px-2 py-1 bg-slate-700/50 rounded-full text-teal-400 font-medium">
                          {course.level}
                        </span>
                        <span className="text-gray-400">{course.duration}</span>
                        <span className="text-gray-400">{course.cost}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                    {course.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <span>⭐</span>
                        <span>{course.rating}</span>
                      </div>
                      <span>{course.students} estudiantes</span>
                    </div>
                    <div className="flex items-center space-x-1 text-teal-400 group-hover:text-teal-300 transition-colors text-sm font-medium">
                      <span>Comenzar</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Todos los Cursos */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
            <span>📚</span>
            <span>Todos los Cursos ({filteredCourses.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div 
                key={course.id}
                onClick={() => goToCourse(course.id)}
                className="group bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-700/50 hover:border-teal-500/30 transition-all duration-300 hover:transform hover:scale-105 cursor-pointer"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-r ${course.color} rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-300`}>
                    {course.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-sm leading-tight group-hover:text-teal-300 transition-colors mb-1">
                      {course.title}
                    </h3>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="px-2 py-1 bg-slate-700/50 rounded-full text-teal-400 font-medium">
                        {course.level}
                      </span>
                      <span className="text-gray-500">{course.duration}</span>
                    </div>
                  </div>
                </div>

                <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                  {course.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>⭐ {course.rating}</span>
                    <span>•</span>
                    <span>{course.students}</span>
                  </div>
                  <span className="text-gray-500 text-xs">{course.cost}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Databases