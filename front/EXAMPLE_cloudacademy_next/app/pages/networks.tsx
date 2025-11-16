import type { NextPage } from 'next'
import Router from 'next/router'
import { useState, useEffect } from 'react'
import { useAuthenticator } from '@aws-amplify/ui-react'
import AuthenticatedHeader from '../components/AuthenticatedHeader'

const Networks: NextPage = () => {
  const { user, authStatus, signOut } = useAuthenticator()
  const [selectedLevel, setSelectedLevel] = useState('all')
  const [selectedType, setSelectedType] = useState('all')

  // DEBUG: Log auth status
  useEffect(() => {
    console.log('🔍 [/networks] authStatus:', authStatus)
    console.log('🔍 [/networks] user:', user ? 'PRESENT' : 'NULL')
  }, [authStatus, user])

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      console.log('🚪 [/networks] Redirecting to /signin (unauthenticated)')
      Router.push('/signin')
    }
  }, [authStatus])

  const goBack = () => {
    Router.push('/admin')
  }

  const goToCourse = (courseId: string) => {
    if (courseId === 'bedrock') {
      Router.push('/bedrock')
    } else if (courseId === 'build-vpc') {
      Router.push('/build-vpc')
    } else {
      // Para otros cursos, redirigir a una página genérica o mostrar "próximamente"
      alert(`Curso "${courseId}" próximamente disponible`)
    }
  }

  const courses = [
    {
      id: 'build-vpc',
      title: 'Build a Virtual Private Cloud',
      description: 'Construye tu primera VPC desde cero. Aprende subnets, route tables, internet gateways y fundamentos de redes privadas en AWS.',
      icon: '🏗️',
      level: 'Básico',
      duration: '45 min',
      cost: '$0.05',
      difficulty: 'VPC Fundamentals',
      type: 'VPC Basics',
      color: 'from-blue-500 to-cyan-600',
      students: 567,
      rating: 4.8,
      featured: true
    },
    {
      id: 'vpc-traffic-security',
      title: 'VPC Traffic Flow and Security',
      description: 'Domina security groups, NACLs, traffic routing y políticas de red. Protege tu VPC con configuraciones avanzadas de seguridad.',
      icon: '🔒',
      level: 'Intermedio',
      duration: '60 min',
      cost: '$0.08',
      difficulty: 'Network Security',
      type: 'Security',
      color: 'from-red-500 to-pink-600',
      students: 423,
      rating: 4.9,
      featured: true
    },
    {
      id: 'private-subnet',
      title: 'Creating a Private Subnet',
      description: 'Diseña subnets privadas seguras. NAT gateways, route tables privadas y configuración de conectividad outbound controlada.',
      icon: '🔐',
      level: 'Básico',
      duration: '35 min',
      cost: '$0.12',
      difficulty: 'Subnet Design',
      type: 'VPC Basics',
      color: 'from-green-500 to-emerald-600',
      students: 334,
      rating: 4.7,
      featured: true
    },
    {
      id: 'launch-vpc-resources',
      title: 'Launching VPC Resources',
      description: 'Despliega EC2, RDS, Load Balancers y otros recursos dentro de tu VPC. Placement groups y configuración multi-AZ.',
      icon: '🚀',
      level: 'Intermedio',
      duration: '50 min',
      cost: '$0.15',
      difficulty: 'Resource Deployment',
      type: 'Resource Management',
      color: 'from-purple-500 to-violet-600',
      students: 289,
      rating: 4.8,
      featured: true
    },
    {
      id: 'test-vpc-connectivity',
      title: 'Testing VPC Connectivity',
      description: 'Troubleshooting de conectividad en VPC. Ping, traceroute, VPC Reachability Analyzer y herramientas de diagnóstico de red.',
      icon: '🔍',
      level: 'Intermedio',
      duration: '40 min',
      cost: '$0.06',
      difficulty: 'Network Testing',
      type: 'Troubleshooting',
      color: 'from-orange-500 to-yellow-600',
      students: 256,
      rating: 4.6,
      featured: false
    },
    {
      id: 'vpc-peering',
      title: 'VPC Peering',
      description: 'Conecta VPCs con peering connections. Cross-region peering, route tables, DNS resolution y comunicación inter-VPC.',
      icon: '🔗',
      level: 'Avanzado',
      duration: '55 min',
      cost: '$0.18',
      difficulty: 'VPC Interconnection',
      type: 'Advanced Networking',
      color: 'from-teal-500 to-blue-600',
      students: 198,
      rating: 4.9,
      featured: true
    },
    {
      id: 'vpc-flow-logs',
      title: 'VPC Monitoring with Flow Logs',
      description: 'Monitorea tráfico de red con VPC Flow Logs. CloudWatch integration, S3 delivery, análisis de patrones y security insights.',
      icon: '📊',
      level: 'Avanzado',
      duration: '45 min',
      cost: '$0.10',
      difficulty: 'Network Monitoring',
      type: 'Monitoring',
      color: 'from-indigo-500 to-purple-600',
      students: 167,
      rating: 4.8,
      featured: false
    },
    {
      id: 'access-s3-vpc',
      title: 'Access S3 from a VPC',
      description: 'Acceso seguro a S3 desde VPC privada. S3 gateway endpoints, políticas de bucket, private subnet access sin internet gateway.',
      icon: '🪣',
      level: 'Intermedio',
      duration: '40 min',
      cost: 'Gratis',
      difficulty: 'S3 VPC Integration',
      type: 'VPC Endpoints',
      color: 'from-amber-500 to-orange-600',
      students: 145,
      rating: 4.7,
      featured: false
    },
    {
      id: 'vpc-endpoints',
      title: 'VPC Endpoints',
      description: 'Interface y Gateway endpoints para servicios AWS. Private connectivity a DynamoDB, S3, EC2, Lambda sin internet routing.',
      icon: '🔌',
      level: 'Avanzado',
      duration: '50 min',
      cost: '$0.02',
      difficulty: 'Private Connectivity',
      type: 'VPC Endpoints',
      color: 'from-rose-500 to-pink-600',
      students: 234,
      rating: 4.9,
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
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  • CATEGORÍA
                </span>
                <h1 className="text-4xl font-bold text-white mt-4 mb-2">
                  Networks
                </h1>
                <p className="text-gray-300 text-lg">
                  Domina AWS VPC, Route 53, CloudFront y arquitectura de redes. Diseña infraestructuras resilientes, seguras y escalables en la nube.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 border-2 border-slate-800"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-500 border-2 border-slate-800"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-teal-400 to-teal-500 border-2 border-slate-800"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-500 border-2 border-slate-800"></div>
                </div>
                <span className="text-gray-400 text-sm ml-2">2.6k+ estudiantes</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">DURACIÓN TOTAL</div>
                  <div className="text-sm text-white">7+ horas</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">DIFICULTAD</div>
                  <div className="text-sm text-white">Básico a Avanzado</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-teal-500/20">
                  <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">COSTO PROMEDIO</div>
                  <div className="text-sm text-white">~$0.09</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-indigo-500/20">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">CURSOS</div>
                  <div className="text-sm text-white">9 disponibles</div>
                </div>
              </div>
            </div>

            {/* VPC Architecture Showcase */}
            <div className="mt-8 bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-teal-500/10 border border-blue-500/30 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">🌐</span>
                <h3 className="text-white font-bold text-lg">AWS VPC Architecture</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-400 text-xl">🏗️</span>
                  </div>
                  <span className="text-gray-300 text-sm font-medium">VPC</span>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-cyan-400 text-xl">🔗</span>
                  </div>
                  <span className="text-gray-300 text-sm font-medium">Subnets</span>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-teal-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-teal-400 text-xl">🔒</span>
                  </div>
                  <span className="text-gray-300 text-sm font-medium">Security</span>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-indigo-400 text-xl">🔌</span>
                  </div>
                  <span className="text-gray-300 text-sm font-medium">Endpoints</span>
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
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400 transition-colors"
            >
              <option value="all">Todos los niveles</option>
              <option value="Básico">Básico</option>
              <option value="Intermedio">Intermedio</option>
              <option value="Avanzado">Avanzado</option>
            </select>
            
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-400 transition-colors"
            >
              <option value="all">Todos los tipos</option>
              <option value="VPC Basics">VPC Basics</option>
              <option value="Security">Security</option>
              <option value="Advanced Networking">Advanced Networking</option>
              <option value="VPC Endpoints">VPC Endpoints</option>
              <option value="Monitoring">Monitoring</option>
              <option value="Troubleshooting">Troubleshooting</option>
            </select>
          </div>
        </div>

        {/* Cursos Destacados */}
        {featuredCourses.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
              <span>🌟</span>
              <span>Cursos Destacados de Networking</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featuredCourses.map((course) => (
                <div 
                  key={course.id}
                  onClick={() => goToCourse(course.id)}
                  className="group bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-700/50 hover:border-blue-500/30 transition-all duration-300 hover:transform hover:scale-105 cursor-pointer relative overflow-hidden"
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
                      <h3 className="text-white font-bold text-xl leading-tight group-hover:text-blue-300 transition-colors mb-2">
                        {course.title}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="px-2 py-1 bg-slate-700/50 rounded-full text-blue-400 font-medium">
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
                    <div className="flex items-center space-x-1 text-blue-400 group-hover:text-blue-300 transition-colors text-sm font-medium">
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

        {/* Learning Path */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
            <span>🗺️</span>
            <span>Ruta de Aprendizaje VPC</span>
          </h2>
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold">Build a Virtual Private Cloud</h4>
                  <p className="text-gray-400 text-sm">Construye tu primera VPC y comprende los fundamentos de networking en AWS</p>
                </div>
                <span className="text-gray-500 text-sm">45 min</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold">Creating a Private Subnet</h4>
                  <p className="text-gray-400 text-sm">Diseña subnets privadas y configura NAT gateways para conectividad controlada</p>
                </div>
                <span className="text-gray-500 text-sm">35 min</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold">VPC Traffic Flow and Security</h4>
                  <p className="text-gray-400 text-sm">Implementa security groups y NACLs para proteger tu infraestructura</p>
                </div>
                <span className="text-gray-500 text-sm">60 min</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm">4</div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold">VPC Peering & Endpoints</h4>
                  <p className="text-gray-400 text-sm">Conecta VPCs y servicios AWS con peering y endpoints avanzados</p>
                </div>
                <span className="text-gray-500 text-sm">105 min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Todos los Cursos */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
            <span>🌐</span>
            <span>Todos los Cursos de Networking ({filteredCourses.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div 
                key={course.id}
                onClick={() => goToCourse(course.id)}
                className="group bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-700/50 hover:border-blue-500/30 transition-all duration-300 hover:transform hover:scale-105 cursor-pointer"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-r ${course.color} rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-300`}>
                    {course.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-sm leading-tight group-hover:text-blue-300 transition-colors mb-1">
                      {course.title}
                    </h3>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="px-2 py-1 bg-slate-700/50 rounded-full text-blue-400 font-medium">
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

        {/* VPC Benefits Section */}
        <div className="bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-teal-500/10 border border-blue-500/30 rounded-2xl p-8 text-center">
          <div className="mb-4">
            <span className="text-4xl">🚀</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Domina AWS Networking</h3>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Conviértete en experto en VPC y arquitectura de redes. Diseña infraestructuras resilientes que escalan con tu negocio.
          </p>
          <button className="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 transform hover:scale-105">
            Comenzar con VPC
          </button>
        </div>
      </div>
    </div>
  )
}

export default Networks