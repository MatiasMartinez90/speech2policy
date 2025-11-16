import type { NextPage } from 'next'
import Router from 'next/router'
import { useState, useEffect } from 'react'
import { useAuthenticator } from '@aws-amplify/ui-react'
import AuthenticatedHeader from '../components/AuthenticatedHeader'

const DevOps: NextPage = () => {
  const { user, authStatus, signOut } = useAuthenticator()
  const [selectedLevel, setSelectedLevel] = useState('all')
  const [selectedType, setSelectedType] = useState('all')

  // DEBUG: Log auth status
  useEffect(() => {
    console.log('🔍 [/devops] authStatus:', authStatus)
    console.log('🔍 [/devops] user:', user ? 'PRESENT' : 'NULL')
  }, [authStatus, user])

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      console.log('🚪 [/devops] Redirecting to /signin (unauthenticated)')
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
      id: 'webapp-cloud-setup',
      title: 'Set Up a Web App in the Cloud',
      description: 'Despliega tu primera aplicación web en AWS. Aprende EC2, Load Balancers, Auto Scaling y mejores prácticas de arquitectura cloud.',
      icon: '🌐',
      level: 'Básico',
      duration: '45 min',
      cost: '$0.08',
      difficulty: 'Práctico',
      type: 'AWS Fundamentals',
      color: 'from-blue-500 to-blue-600',
      students: 245,
      rating: 4.8,
      featured: true
    },
    {
      id: 'github-aws-connect',
      title: 'Connect a GitHub Repo with AWS',
      description: 'Integra GitHub con servicios AWS. CodeCommit, webhooks, automated deployments y sincronización de repositorios con la nube.',
      icon: '🔗',
      level: 'Básico',
      duration: '30 min',
      cost: 'Gratis',
      difficulty: 'Configuración',
      type: 'Source Control',
      color: 'from-gray-500 to-gray-600',
      students: 189,
      rating: 4.6,
      featured: false
    },
    {
      id: 'secure-packages-codeartifact',
      title: 'Secure Packages with CodeArtifact',
      description: 'Gestiona dependencias seguras con AWS CodeArtifact. Package management, vulnerability scanning y control de acceso a artifacts.',
      icon: '📦',
      level: 'Intermedio',
      duration: '40 min',
      cost: '$0.05',
      difficulty: 'Seguridad',
      type: 'Package Management',
      color: 'from-orange-500 to-orange-600',
      students: 134,
      rating: 4.7,
      featured: false
    },
    {
      id: 'ci-codebuild',
      title: 'Continuous Integration with CodeBuild',
      description: 'Automatiza builds con AWS CodeBuild. Configuración de buildspec, testing automático, artifacts y integración con pipelines CI/CD.',
      icon: '🔨',
      level: 'Intermedio',
      duration: '50 min',
      cost: '$0.12',
      difficulty: 'Automatización',
      type: 'CI/CD',
      color: 'from-green-500 to-green-600',
      students: 198,
      rating: 4.9,
      featured: true
    },
    {
      id: 'deploy-codedeploy',
      title: 'Deploy a Web App with CodeDeploy',
      description: 'Deployments automatizados con AWS CodeDeploy. Blue/green deployments, rollback strategies y deployment configurations.',
      icon: '🚀',
      level: 'Intermedio',
      duration: '55 min',
      cost: '$0.10',
      difficulty: 'Deployment',
      type: 'CI/CD',
      color: 'from-purple-500 to-purple-600',
      students: 167,
      rating: 4.8,
      featured: true
    },
    {
      id: 'iac-cloudformation',
      title: 'Infrastructure as Code with CloudFormation',
      description: 'Infraestructura como código con AWS CloudFormation. Templates, stacks, nested stacks y automatización de recursos AWS.',
      icon: '📋',
      level: 'Avanzado',
      duration: '65 min',
      cost: '$0.15',
      difficulty: 'IaC',
      type: 'Infrastructure',
      color: 'from-yellow-500 to-yellow-600',
      students: 203,
      rating: 4.9,
      featured: true
    },
    {
      id: 'cicd-pipeline-aws',
      title: 'Build a CI/CD Pipeline with AWS',
      description: 'Pipeline completo de CI/CD con AWS DevOps. CodePipeline, CodeCommit, CodeBuild, CodeDeploy y monitoring integrado.',
      icon: '⚙️',
      level: 'Avanzado',
      duration: '75 min',
      cost: '$0.20',
      difficulty: 'Pipeline Completo',
      type: 'CI/CD',
      color: 'from-indigo-500 to-indigo-600',
      students: 289,
      rating: 4.9,
      featured: true
    },
    {
      id: 'docker-app-deploy',
      title: 'Deploy an App with Docker',
      description: 'Containerización y deployment con Docker en AWS. ECS, Fargate, ECR, container orchestration y scaling automático.',
      icon: '🐳',
      level: 'Intermedio',
      duration: '60 min',
      cost: '$0.18',
      difficulty: 'Containers',
      type: 'Docker',
      color: 'from-cyan-500 to-cyan-600',
      students: 156,
      rating: 4.7,
      featured: false
    },
    {
      id: 'cross-account-deploy',
      title: 'Deploy an App Across Accounts',
      description: 'Deployments multi-cuenta en AWS. Cross-account roles, IAM policies, CodePipeline cross-account y governance empresarial.',
      icon: '🔄',
      level: 'Avanzado',
      duration: '70 min',
      cost: '$0.25',
      difficulty: 'Multi-Account',
      type: 'Enterprise',
      color: 'from-red-500 to-red-600',
      students: 98,
      rating: 4.8,
      featured: false
    },
    {
      id: 'kubernetes-cluster-launch',
      title: 'Launch a Kubernetes Cluster',
      description: 'Crea clusters de Kubernetes con Amazon EKS. Worker nodes, networking, security groups y configuración inicial del cluster.',
      icon: '☸️',
      level: 'Avanzado',
      duration: '80 min',
      cost: '$0.30',
      difficulty: 'Kubernetes',
      type: 'Container Orchestration',
      color: 'from-blue-600 to-purple-600',
      students: 234,
      rating: 4.9,
      featured: true
    },
    {
      id: 'kubernetes-deployment-setup',
      title: 'Set Up Kubernetes Deployment',
      description: 'Configuración de deployments en Kubernetes. Pods, services, ingress controllers y service mesh con AWS Load Balancer Controller.',
      icon: '⚡',
      level: 'Avanzado',
      duration: '65 min',
      cost: '$0.22',
      difficulty: 'K8s Deployment',
      type: 'Container Orchestration',
      color: 'from-teal-500 to-green-600',
      students: 178,
      rating: 4.8,
      featured: false
    },
    {
      id: 'kubernetes-manifests',
      title: 'Create Kubernetes Manifests',
      description: 'YAML manifests para Kubernetes. Deployments, services, configmaps, secrets, persistent volumes y Helm charts básicos.',
      icon: '📄',
      level: 'Intermedio',
      duration: '45 min',
      cost: '$0.08',
      difficulty: 'K8s Manifests',
      type: 'Container Orchestration',
      color: 'from-lime-500 to-green-600',
      students: 145,
      rating: 4.6,
      featured: false
    },
    {
      id: 'kubernetes-backend-deploy',
      title: 'Deploy Backend with Kubernetes',
      description: 'Deploy de aplicaciones backend en EKS. Microservices, databases, APIs, monitoring con CloudWatch Container Insights.',
      icon: '🔧',
      level: 'Avanzado',
      duration: '85 min',
      cost: '$0.35',
      difficulty: 'K8s Backend',
      type: 'Container Orchestration',
      color: 'from-emerald-500 to-teal-600',
      students: 167,
      rating: 4.9,
      featured: true
    },
    {
      id: 'terraform-s3-buckets',
      title: 'Create S3 Buckets with Terraform',
      description: 'Infrastructure as Code con Terraform y AWS. S3 buckets, policies, versioning, lifecycle rules y state management.',
      icon: '🏗️',
      level: 'Intermedio',
      duration: '50 min',
      cost: '$0.12',
      difficulty: 'Terraform',
      type: 'Infrastructure',
      color: 'from-violet-500 to-purple-600',
      students: 201,
      rating: 4.8,
      featured: false
    },
    {
      id: 'multicloud-aws-gcp',
      title: 'Multi-Cloud Data Transfer with AWS and GCP',
      description: 'Transferencia de datos entre AWS y Google Cloud. DataSync, Storage Transfer Service, hybrid cloud y estrategias multi-cloud.',
      icon: '☁️',
      level: 'Avanzado',
      duration: '90 min',
      cost: '$0.40',
      difficulty: 'Multi-Cloud',
      type: 'Cloud Integration',
      color: 'from-pink-500 to-rose-600',
      students: 123,
      rating: 4.7,
      featured: false
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
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  • CATEGORÍA
                </span>
                <h1 className="text-4xl font-bold text-white mt-4 mb-2">
                  DevOps
                </h1>
                <p className="text-gray-300 text-lg">
                  Domina CI/CD, Infrastructure as Code, containerización y orquestación. Desde AWS DevOps hasta Kubernetes y Terraform avanzado.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-500 border-2 border-slate-800"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-green-500 border-2 border-slate-800"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 border-2 border-slate-800"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-purple-500 border-2 border-slate-800"></div>
                </div>
                <span className="text-gray-400 text-sm ml-2">1.2k+ estudiantes</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-indigo-500/20">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">DURACIÓN TOTAL</div>
                  <div className="text-sm text-white">15+ horas</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">DIFICULTAD</div>
                  <div className="text-sm text-white">Básico a Experto</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">COSTO PROMEDIO</div>
                  <div className="text-sm text-white">~$0.18</div>
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
                  <div className="text-sm text-white">15 disponibles</div>
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
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-400 transition-colors"
            >
              <option value="all">Todos los niveles</option>
              <option value="Básico">Básico</option>
              <option value="Intermedio">Intermedio</option>
              <option value="Avanzado">Avanzado</option>
            </select>
            
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-400 transition-colors"
            >
              <option value="all">Todos los tipos</option>
              <option value="CI/CD">CI/CD</option>
              <option value="Infrastructure">Infrastructure</option>
              <option value="Container Orchestration">Kubernetes</option>
              <option value="AWS Fundamentals">AWS Fundamentals</option>
              <option value="Docker">Docker</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </div>
        </div>

        {/* Cursos Destacados */}
        {featuredCourses.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
              <span>🚀</span>
              <span>Cursos Destacados</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {featuredCourses.map((course) => (
                <div 
                  key={course.id}
                  onClick={() => goToCourse(course.id)}
                  className="group bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-700/50 hover:border-indigo-500/30 transition-all duration-300 hover:transform hover:scale-105 cursor-pointer relative overflow-hidden"
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
                      <h3 className="text-white font-bold text-xl leading-tight group-hover:text-indigo-300 transition-colors mb-2">
                        {course.title}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="px-2 py-1 bg-slate-700/50 rounded-full text-indigo-400 font-medium">
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
                    <div className="flex items-center space-x-1 text-indigo-400 group-hover:text-indigo-300 transition-colors text-sm font-medium">
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
            <span>⚙️</span>
            <span>Todos los Cursos ({filteredCourses.length})</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div 
                key={course.id}
                onClick={() => goToCourse(course.id)}
                className="group bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-700/50 hover:border-indigo-500/30 transition-all duration-300 hover:transform hover:scale-105 cursor-pointer"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-r ${course.color} rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-300`}>
                    {course.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-sm leading-tight group-hover:text-indigo-300 transition-colors mb-1">
                      {course.title}
                    </h3>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="px-2 py-1 bg-slate-700/50 rounded-full text-indigo-400 font-medium">
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

export default DevOps