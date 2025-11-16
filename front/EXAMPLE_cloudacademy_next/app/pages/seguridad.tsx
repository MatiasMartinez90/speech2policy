import type { NextPage } from 'next'
import Router from 'next/router'
import { useState } from 'react'
import useUser from '../lib/useUser'
import AuthenticatedHeader from '../components/AuthenticatedHeader'

const SeguridadCategoryContent = () => {
  const { user, loading, loggedOut, signOut } = useUser({ redirect: '/signin' })
  const [selectedLevel, setSelectedLevel] = useState('all')
  const [selectedType, setSelectedType] = useState('all')

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
      id: 'encrypt-data-kms',
      title: 'Encrypt Data with AWS KMS',
      description: 'Domina AWS Key Management Service para cifrar datos en reposo y en tránsito. Customer keys, automatic rotation, cross-account access y compliance.',
      icon: '🔐',
      level: 'Intermedio',
      duration: '55 min',
      cost: '$0.08',
      difficulty: 'Data Encryption',
      type: 'Encryption',
      color: 'from-red-500 to-orange-600',
      students: 487,
      rating: 4.9,
      featured: true
    },
    {
      id: 'threat-detection-guardduty',
      title: 'Threat Detection with GuardDuty',
      description: 'Detecta amenazas automáticamente con Amazon GuardDuty. Machine learning, threat intelligence, incident response y integración con Security Hub.',
      icon: '🛡️',
      level: 'Avanzado',
      duration: '65 min',
      cost: '$0.15',
      difficulty: 'Threat Detection',
      type: 'Monitoring',
      color: 'from-purple-500 to-pink-600',
      students: 356,
      rating: 4.8,
      featured: true
    },
    {
      id: 'secure-secrets-manager',
      title: 'Secure Secrets with Secrets Manager',
      description: 'Gestiona secretos de forma segura con AWS Secrets Manager. Automatic rotation, cross-service integration, database credentials y API keys.',
      icon: '🔑',
      level: 'Intermedio',
      duration: '45 min',
      cost: '$0.06',
      difficulty: 'Secret Management',
      type: 'IAM & Access',
      color: 'from-blue-500 to-cyan-600',
      students: 298,
      rating: 4.7,
      featured: true
    },
    {
      id: 'security-monitoring-system',
      title: 'Build a Security Monitoring System',
      description: 'Construye un sistema completo de monitoreo de seguridad. CloudTrail, Config, Security Hub, SNS alerts y dashboard centralizado de eventos.',
      icon: '📊',
      level: 'Avanzado',
      duration: '85 min',
      cost: '$0.25',
      difficulty: 'Security Operations',
      type: 'Monitoring',
      color: 'from-green-500 to-teal-600',
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

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-400"></div>
    </div>
  )
  if (loggedOut) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-gray-400">Redirecting...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900">
      <AuthenticatedHeader user={user} signOut={signOut} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
                  • CATEGORÍA
                </span>
                <h1 className="text-4xl font-bold text-white mt-4 mb-2">
                  Seguridad
                </h1>
                <p className="text-gray-300 text-lg">
                  Protege tu infraestructura con AWS Security. KMS, GuardDuty, Secrets Manager, IAM y mejores prácticas de ciberseguridad en la nube.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-400 to-red-500 border-2 border-slate-800"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 border-2 border-slate-800"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-purple-500 border-2 border-slate-800"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 border-2 border-slate-800"></div>
                </div>
                <span className="text-gray-400 text-sm ml-2">1.4k+ estudiantes</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">DURACIÓN TOTAL</div>
                  <div className="text-sm text-white">4+ horas</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">DIFICULTAD</div>
                  <div className="text-sm text-white">Intermedio a Avanzado</div>
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
                  <div className="text-sm text-white">~$0.14</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">CURSOS</div>
                  <div className="text-sm text-white">4 disponibles</div>
                </div>
              </div>
            </div>

            {/* Security Services Showcase */}
            <div className="mt-8 bg-gradient-to-r from-red-500/10 via-orange-500/10 to-purple-500/10 border border-red-500/30 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-2xl">🔒</span>
                <h3 className="text-white font-bold text-lg">AWS Security Services</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-red-400 text-xl">🔐</span>
                  </div>
                  <span className="text-gray-300 text-sm font-medium">KMS</span>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-purple-400 text-xl">🛡️</span>
                  </div>
                  <span className="text-gray-300 text-sm font-medium">GuardDuty</span>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-blue-400 text-xl">🔑</span>
                  </div>
                  <span className="text-gray-300 text-sm font-medium">Secrets Manager</span>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-green-400 text-xl">📊</span>
                  </div>
                  <span className="text-gray-300 text-sm font-medium">Security Hub</span>
                </div>
              </div>
            </div>

            {/* Security Principles */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-3 p-3 bg-slate-700/30 rounded-lg">
                <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                  <span className="text-red-400 text-sm">🔒</span>
                </div>
                <span className="text-gray-300 font-medium">Defense in Depth</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-slate-700/30 rounded-lg">
                <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
                  <span className="text-orange-400 text-sm">⚡</span>
                </div>
                <span className="text-gray-300 font-medium">Zero Trust Architecture</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-slate-700/30 rounded-lg">
                <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <span className="text-purple-400 text-sm">👁️</span>
                </div>
                <span className="text-gray-300 font-medium">Continuous Monitoring</span>
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
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-400 transition-colors"
            >
              <option value="all">Todos los niveles</option>
              <option value="Intermedio">Intermedio</option>
              <option value="Avanzado">Avanzado</option>
            </select>
            
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-400 transition-colors"
            >
              <option value="all">Todos los tipos</option>
              <option value="Encryption">Encryption</option>
              <option value="Monitoring">Monitoring</option>
              <option value="IAM & Access">IAM & Access</option>
            </select>
          </div>
        </div>

        {/* Cursos Destacados */}
        {featuredCourses.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
              <span>🔥</span>
              <span>Cursos Esenciales de Seguridad</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {featuredCourses.map((course) => (
                <div 
                  key={course.id}
                  onClick={() => goToCourse(course.id)}
                  className="group bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 hover:bg-slate-700/50 hover:border-red-500/30 transition-all duration-300 hover:transform hover:scale-[1.02] cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-6 right-6">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                      ESENCIAL
                    </span>
                  </div>

                  <div className="flex items-start space-x-6">
                    <div className={`w-20 h-20 bg-gradient-to-r ${course.color} rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300`}>
                      {course.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-2xl leading-tight group-hover:text-red-300 transition-colors mb-3">
                        {course.title}
                      </h3>
                      <p className="text-gray-400 text-base mb-4 leading-relaxed">
                        {course.description}
                      </p>
                      <div className="flex items-center space-x-6 text-sm mb-4">
                        <span className="px-3 py-1 bg-slate-700/50 rounded-full text-red-400 font-medium">
                          {course.level}
                        </span>
                        <span className="text-gray-400">{course.duration}</span>
                        <span className="text-gray-400">{course.cost}</span>
                        <span className="px-2 py-1 bg-red-600/30 rounded text-red-300 text-xs">
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
                        <div className="flex items-center space-x-2 text-red-400 group-hover:text-red-300 transition-colors text-base font-medium">
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

        {/* Security Framework */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
            <span>🏛️</span>
            <span>AWS Security Framework</span>
          </h2>
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-white font-semibold mb-4 flex items-center space-x-2">
                  <span className="text-red-400">🔐</span>
                  <span>Data Protection</span>
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <span className="text-gray-300 text-sm">Encryption at Rest & in Transit</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                    <span className="text-gray-300 text-sm">Key Management with KMS</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <span className="text-gray-300 text-sm">Secrets Management</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4 flex items-center space-x-2">
                  <span className="text-purple-400">🛡️</span>
                  <span>Threat Detection</span>
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span className="text-gray-300 text-sm">GuardDuty Threat Intelligence</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-gray-300 text-sm">Security Hub Centralization</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-gray-300 text-sm">Incident Response Automation</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Learning Path */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
            <span>🎯</span>
            <span>Ruta de Seguridad AWS</span>
          </h2>
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold">Secure Secrets with Secrets Manager</h4>
                  <p className="text-gray-400 text-sm">Aprende gestión segura de credenciales y secrets rotation</p>
                </div>
                <span className="text-gray-500 text-sm">45 min</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold">Encrypt Data with AWS KMS</h4>
                  <p className="text-gray-400 text-sm">Domina cifrado de datos y gestión de claves avanzada</p>
                </div>
                <span className="text-gray-500 text-sm">55 min</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold">Threat Detection with GuardDuty</h4>
                  <p className="text-gray-400 text-sm">Implementa detección automática de amenazas y respuesta</p>
                </div>
                <span className="text-gray-500 text-sm">65 min</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">4</div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold">Build a Security Monitoring System</h4>
                  <p className="text-gray-400 text-sm">Proyecto final: sistema completo de monitoreo de seguridad</p>
                </div>
                <span className="text-gray-500 text-sm">85 min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Todos los Cursos */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
            <span>🔒</span>
            <span>Todos los Cursos de Seguridad ({filteredCourses.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCourses.map((course) => (
              <div 
                key={course.id}
                onClick={() => goToCourse(course.id)}
                className="group bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-700/50 hover:border-red-500/30 transition-all duration-300 hover:transform hover:scale-105 cursor-pointer"
              >
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`w-16 h-16 bg-gradient-to-r ${course.color} rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300`}>
                    {course.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-lg leading-tight group-hover:text-red-300 transition-colors mb-2">
                      {course.title}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="px-2 py-1 bg-slate-700/50 rounded-full text-red-400 font-medium">
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
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>⭐ {course.rating}</span>
                    <span>•</span>
                    <span>{course.students} estudiantes</span>
                  </div>
                  <span className="px-2 py-1 bg-red-600/20 rounded text-red-300 text-xs">
                    {course.difficulty}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security Call to Action */}
        <div className="bg-gradient-to-r from-red-500/10 via-orange-500/10 to-purple-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
          <div className="mb-4">
            <span className="text-4xl">🛡️</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3">Protege tu Infraestructura AWS</h3>
          <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
            Conviértete en experto en AWS Security. Implementa cifrado, detección de amenazas y monitoreo avanzado para proteger tus workloads en la nube.
          </p>
          <button className="px-8 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-xl hover:from-red-600 hover:to-orange-600 transition-all duration-300 transform hover:scale-105">
            Comenzar con Seguridad AWS
          </button>
        </div>
      </div>
    </div>
  )
}

const SeguridadCategory: NextPage = () => {
  return <SeguridadCategoryContent />
}

export default SeguridadCategory