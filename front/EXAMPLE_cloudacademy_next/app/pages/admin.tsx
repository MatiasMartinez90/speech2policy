import { NextPage } from 'next'
import Router from 'next/router'
import useUser from '../lib/useUser'
import AuthenticatedHeader from '../components/AuthenticatedHeader'
import SEO from '../components/SEO'

const Admin: NextPage = () => {
  const { user, loading, loggedOut, signOut } = useUser({ redirect: '/signin' })

  const goToBedrockCourse = () => {
    Router.push('/bedrock')
  }

  const moveToCategory = (categoryId: number) => {
    // Redirigir a la página específica de cada categoría
    switch(categoryId) {
      case 1: // RAG Bedrock
        Router.push('/rag-bedrock')
        break
      case 3: // Seguridad
        Router.push('/seguridad')
        break
      case 4: // Networks
        Router.push('/networks')
        break
      case 5: // Computo
        Router.push('/computo')
        break
      case 7: // AWS Cloud Practitioner
        Router.push('/challenge-principiantes')
        break
      case 8: // DevOps
        Router.push('/devops')
        break
      case 9: // Bases de Datos
        Router.push('/databases')
        break
      default:
        // Para otras categorías, mostrar mensaje de "próximamente"
        alert('Esta categoría estará disponible próximamente')
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
    </div>
  )
  if (loggedOut) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-gray-400">Redirecting...</div>
    </div>
  )

  // User info is already logged by useUser hook

  // Categorías basadas en el home
  const categories = [
    {
      id: 1,
      title: "RAG Bedrock",
      description: "Construye chatbots inteligentes con Amazon Bedrock y RAG. Integra IA generativa con AWS para crear asistentes que entienden tus datos empresariales.",
      icon: "🧠",
      color: "bg-purple-500",
      courseCount: 8,
      level: "Intermedio-Avanzado",
      category: "IA & AWS"
    },
    {
      id: 3,
      title: "Seguridad",
      description: "AWS Security, IAM, WAF, CloudTrail y mejores prácticas de ciberseguridad en la nube. Protege tus workloads con herramientas nativas de AWS.",
      icon: "🔒",
      color: "bg-red-500",
      courseCount: 18,
      level: "Intermedio-Avanzado",
      category: "AWS Security"
    },
    {
      id: 4,
      title: "Networks",
      description: "AWS VPC, Route 53, CloudFront, Load Balancers y arquitectura de redes en la nube. Diseña infraestructuras resilientes y escalables.",
      icon: "🌐",
      color: "bg-blue-500",
      courseCount: 16,
      level: "Intermedio",
      category: "AWS Networking"
    },
    {
      id: 5,
      title: "Computo",
      description: "EC2, Lambda, ECS, Fargate y servicios de compute de AWS. Optimiza cargas de trabajo y implementa arquitecturas serverless eficientes.",
      icon: "💻",
      color: "bg-gray-500",
      courseCount: 20,
      level: "Básico-Avanzado",
      category: "AWS Compute"
    },
    {
      id: 6,
      title: "7 dias de devops challenges",
      description: "Bootcamp intensivo de DevOps con AWS. CodePipeline, CodeBuild, CodeDeploy, Infrastructure as Code y automatización durante 7 días completos.",
      icon: "🚀",
      color: "bg-green-500",
      courseCount: 7,
      level: "Intermedio-Avanzado",
      category: "DevOps Intensivo"
    },
    {
      id: 7,
      title: "AWS Cloud Practitioner",
      description: "Fundamentos de AWS Cloud Computing. Prepárate para la certificación oficial y domina servicios core de Amazon Web Services desde cero.",
      icon: "☁️",
      color: "bg-orange-500",
      courseCount: 24,
      level: "Principiante",
      category: "AWS Certificación"
    },
    {
      id: 8,
      title: "Devops",
      description: "CI/CD con AWS DevOps, Terraform, Docker, Kubernetes en EKS, monitoring con CloudWatch y cultura DevOps en equipos ágiles.",
      icon: "⚙️",
      color: "bg-indigo-500",
      courseCount: 28,
      level: "Intermedio-Avanzado",
      category: "DevOps Profesional"
    },
    {
      id: 9,
      title: "Databases",
      description: "RDS, DynamoDB, Aurora, ElastiCache y estrategias de datos en AWS. Diseña arquitecturas de bases de datos escalables y de alta disponibilidad.",
      icon: "🗄️",
      color: "bg-teal-500",
      courseCount: 15,
      level: "Básico-Avanzado",
      category: "AWS Databases"
    }
  ]

  return (
    <>
      <SEO
        title="Dashboard | CloudAcademy"
        description="Accede a tu panel de control en CloudAcademy. Explora cursos de AWS, DevOps, seguridad cloud y más."
        canonical="https://proyectos.cloudacademy.ar/admin"
        noindex={true}
      />

      <div className="min-h-screen bg-slate-900">
        <AuthenticatedHeader user={user} signOut={signOut} />

      {/* Hero Section estilo Platzi */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Dashboard de aprendizaje
            <br />
            <span className="text-green-400">CloudAcademy</span>
          </h1>
          <p className="text-xl text-gray-300 mb-16 max-w-4xl mx-auto">
            Accede a todas tus categorías de cursos AWS y DevOps. Continúa tu aprendizaje desde donde lo dejaste.
          </p>
        </div>

        {/* Admin Panel Link - Only show if user has admin capabilities */}
        <div className="mb-8">
          <div
            onClick={() => Router.push('/admin-panel')}
            className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-2xl p-6 hover:from-purple-500/20 hover:to-blue-500/20 transition-all duration-300 cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg group-hover:text-purple-300 transition-colors">
                    Panel de Administración
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Gestiona cursos y contenido del catálogo
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-purple-400 group-hover:text-purple-300 transition-colors">
                <span className="text-sm font-medium">Acceder</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </div>
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
                    <dd className="text-lg font-medium text-white">{categories.length}</dd>
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
                    <dd className="text-lg font-medium text-white">{categories.reduce((acc, cat) => acc + cat.courseCount, 0)}</dd>
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
            {categories.map((category) => (
              <div 
                key={category.id} 
                onClick={() => moveToCategory(category.id)}
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

export default Admin
