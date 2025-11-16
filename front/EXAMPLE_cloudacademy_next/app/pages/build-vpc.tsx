import type { NextPage } from 'next'
import Router from 'next/router'
import { useState } from 'react'
import useUser from '../lib/useUser'
import AuthenticatedHeader from '../components/AuthenticatedHeader'
import BedrockChatInterface from '../components/BedrockChatInterface'

const BuildVPCCourseContent = ({ user, signOut }: { user: any; signOut: any }) => {
  const [showDemo, setShowDemo] = useState(false)
  const [currentTaskStep, setCurrentTaskStep] = useState(0)
  const [taskAnswers, setTaskAnswers] = useState<Record<string, string>>({
    step0: '',
    step1: '',
    step2: '',
    step3: '',
    step4: ''
  })

  const goBack = () => {
    Router.push('/networks')
  }

  const courseSteps = [
    {
      id: 0,
      title: "Before we start",
      subtitle: "Step #0...",
      icon: "🏗️",
      color: "from-blue-500 to-blue-600",
      active: true
    },
    {
      id: 1,
      title: "Create VPC",
      icon: "🌐",
      color: "from-cyan-500 to-cyan-600"
    },
    {
      id: 2,
      title: "Configure Subnets",
      icon: "🏘️",
      color: "from-teal-500 to-teal-600"
    },
    {
      id: 3,
      title: "Internet Gateway",
      icon: "🌍",
      color: "from-green-500 to-green-600"
    },
    {
      id: 4,
      title: "NAT Gateway",
      icon: "🗺️",
      color: "from-yellow-500 to-yellow-600"
    },
    {
      id: 5,
      title: "Clean Up",
      icon: "🗑️",
      color: "from-red-500 to-red-600"
    }
  ]

  const taskSteps = [
    {
      id: 0,
      title: "What is a VPC and what will you build today?",
      placeholder: "Start your answer with &apos;A VPC (Virtual Private Cloud) is...&apos; In this project, I will build...",
      description: "Explain what a VPC is and describe your building plan using the city analogy...",
      charLimit: 500
    },
    {
      id: 1,
      title: "What does CIDR mean and why is there a default VPC?",
      placeholder: "CIDR stands for... There was already a default VPC in my account because...",
      description: "Start your answer explaining CIDR notation and why AWS creates a default VPC...",
      charLimit: 500
    },
    {
      id: 2,
      title: "What are subnets and Availability Zones?",
      placeholder: "Subnets are... There are already subnets existing in my account, one for every...",
      description: "Explain subnets using the neighborhood analogy and what Availability Zones are...",
      charLimit: 500
    },
    {
      id: 3,
      title: "What are Internet Gateways and route tables?",
      placeholder: "Internet gateways are... The route 0.0.0.0/0 means...",
      description: "Explain the purpose of IGWs and what the destination route means...",
      charLimit: 500
    },
    {
      id: 4,
      title: "Why do we need NAT Gateways for private subnets?",
      placeholder: "The NAT Gateway must be placed in a public subnet because... The main difference between IGW and NAT Gateway is...",
      description: "Explain the security benefits and placement requirements of NAT Gateways...",
      charLimit: 500
    }
  ]

  const handleTaskAnswer = (stepId: number, answer: string) => {
    setTaskAnswers(prev => ({
      ...prev,
      [`step${stepId}`]: answer
    }))
  }

  const currentTask = taskSteps[currentTaskStep]

  return (
    <div className="min-h-screen bg-slate-900">
      <AuthenticatedHeader user={user} signOut={signOut} />
      
      {/* Header con título del paso actual */}
      {currentTaskStep >= 1 && (
        <header className="bg-slate-800/50 border-b border-slate-700/50 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center text-white font-medium text-sm sm:text-base">
              {currentTaskStep === 1 && "Sección 1: Creando la VPC - Los Cimientos de tu Ciudad Virtual"}
              {currentTaskStep === 2 && "Sección 2: Subredes - Diseñando los Barrios"}
              {currentTaskStep === 3 && "Sección 3: Internet Gateway - La Puerta Principal"}
              {currentTaskStep === 4 && "Sección 4: NAT Gateway - Salida Segura para Barrios Privados"}
            </div>
          </div>
        </header>
      )}

      <div className="flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full lg:w-80 bg-slate-800/30 lg:min-h-screen border-b lg:border-r lg:border-b-0 border-slate-700/50 p-4 lg:p-6">
          <div className="mb-4 lg:hidden">
            <h2 className="text-white font-semibold text-lg">Course Progress</h2>
          </div>
          <div className="space-y-3 grid grid-cols-2 lg:grid-cols-1 gap-3 lg:gap-0 lg:space-y-3">
            {courseSteps.map((step) => (
              <div
                key={step.id}
                className={`flex items-center space-x-2 lg:space-x-3 p-2 lg:p-3 rounded-xl transition-all cursor-pointer ${
                  step.active 
                    ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 border border-blue-500/30' 
                    : currentTaskStep > 0 && step.id <= currentTaskStep 
                    ? 'bg-gradient-to-r from-green-500/10 to-green-600/10 border border-green-500/20'
                    : 'hover:bg-slate-700/30'
                }`}
              >
                <div className={`flex items-center justify-center w-6 h-6 lg:w-8 lg:h-8 rounded-lg bg-gradient-to-r ${step.color} text-white text-xs lg:text-sm flex-shrink-0`}>
                  {step.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs lg:text-sm text-gray-300 leading-tight">
                    Step #{step.id}: {step.title}
                  </div>
                  {step.subtitle && (
                    <div className="text-xs text-gray-500 mt-1 hidden lg:block">
                      {step.subtitle}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Course Resources */}
          <div className="mt-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <h3 className="text-white font-medium mb-3 text-sm">Quick Links</h3>
            <div className="space-y-2">
              <button
                onClick={goBack}
                className="w-full text-left text-gray-400 hover:text-white text-xs p-2 rounded hover:bg-slate-700/50 transition-colors"
              >
                ← Back to Networks
              </button>
              <div className="text-gray-400 text-xs p-2">
                📖 VPC User Guide
              </div>
              <div className="text-gray-400 text-xs p-2">
                🎥 Architecture Examples
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 space-y-6">
          {/* Project Header - Solo se muestra en step 0 */}
          {currentTaskStep === 0 && (
            <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-4 sm:p-6 lg:p-8 backdrop-blur-sm">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6 space-y-4 md:space-y-0">
                <div className="flex-1">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    • VPC PROJECT
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white mt-4">
                    Creando tu Propia Red Privada en la Nube
                  </h1>
                  <p className="text-gray-300 mt-3 text-base sm:text-lg">
                    Un Curso Rápido de AWS VPC - Construye tu infraestructura de red desde cero
                  </p>
                </div>
                <div className="flex items-center space-x-2 md:ml-4">
                  <div className="flex -space-x-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-blue-400 to-cyan-500 border-2 border-slate-800"></div>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-teal-400 to-green-500 border-2 border-slate-800"></div>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 border-2 border-slate-800"></div>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-red-400 to-pink-500 border-2 border-slate-800"></div>
                  </div>
                  <span className="text-gray-400 text-sm ml-2">567+ completed</span>
                </div>
              </div>

              {/* Project Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
                <div className="flex items-center space-x-2 lg:space-x-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <span className="text-blue-400 text-lg">⚡</span>
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm lg:text-base">45 min</div>
                    <div className="text-gray-400 text-xs">Duration</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 lg:space-x-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <span className="text-green-400 text-lg">💰</span>
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm lg:text-base">$0.05</div>
                    <div className="text-gray-400 text-xs">Est. Cost</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 lg:space-x-3">
                  <div className="p-2 rounded-lg bg-yellow-500/20">
                    <span className="text-yellow-400 text-lg">📊</span>
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm lg:text-base">Básico</div>
                    <div className="text-gray-400 text-xs">Level</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 lg:space-x-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <span className="text-purple-400 text-lg">⭐</span>
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm lg:text-base">4.8</div>
                    <div className="text-gray-400 text-xs">Rating</div>
                  </div>
                </div>
              </div>

              {/* Introduction */}
              <div className="space-y-6 mb-8">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4">¡Bienvenido al mundo de AWS! 🌐</h2>
                  <p className="text-gray-300 mb-4">
                    Si alguna vez te has preguntado cómo las empresas construyen su infraestructura de red segura y aislada dentro de AWS, 
                    la respuesta es la <strong className="text-blue-400">VPC (Virtual Private Cloud)</strong>. Piensa en ella como tu propio centro de datos virtual.
                  </p>
                  <p className="text-gray-300 mb-6">
                    En este tutorial, te guiaremos paso a paso para que puedas crear una VPC desde cero, configurar subredes públicas y privadas, 
                    y darles acceso a internet de forma segura. ¡Manos a la obra! 💻
                  </p>
                </div>

                <div className="bg-slate-700/30 rounded-xl p-6 border border-slate-600/30">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <span className="text-2xl mr-3">💡</span>
                    ¿Qué es una VPC?
                  </h3>
                  <p className="text-gray-300 mb-4">
                    Imagina que tu región de AWS es un <strong>país</strong>. Una VPC es como tu propia <strong>ciudad privada</strong> dentro de ese país. 
                    En tu ciudad, puedes diseñar barrios (subredes), establecer reglas de tráfico (tablas de rutas) y medidas de seguridad 
                    (grupos de seguridad) para controlar cómo tus casas y edificios (recursos como servidores y bases de datos) se conectan y funcionan juntos.
                  </p>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <div className="text-center text-gray-300 text-sm">
                      <div className="space-y-2">
                        <div>🌍 País (AWS Region)</div>
                        <div className="ml-4">├── 🏙️ Tu Ciudad Privada (VPC)</div>
                        <div className="ml-8">├── 🏘️ Barrio Público (Public Subnet)</div>
                        <div className="ml-8">├── 🏠 Barrio Privado (Private Subnet)</div>
                        <div className="ml-8">├── 🌉 Puerta Principal (Internet Gateway)</div>
                        <div className="ml-8">└── 🗺️ Reglas de Tráfico (Route Tables)</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-700/30 rounded-xl p-6 border border-slate-600/30">
                    <h4 className="text-white font-semibold mb-3 flex items-center">
                      <span className="text-xl mr-2">📚</span>
                      Lo que aprenderás hoy
                    </h4>
                    <ul className="text-gray-300 space-y-2 text-sm">
                      <li>• Crear una VPC desde cero</li>
                      <li>• Configurar subredes públicas y privadas</li>
                      <li>• Conectar tu VPC a internet</li>
                      <li>• Configurar acceso seguro para recursos privados</li>
                      <li>• Limpiar recursos para evitar costos</li>
                    </ul>
                  </div>
                  
                  <div className="bg-slate-700/30 rounded-xl p-6 border border-slate-600/30">
                    <h4 className="text-white font-semibold mb-3 flex items-center">
                      <span className="text-xl mr-2">⚡</span>
                      Requisitos
                    </h4>
                    <ul className="text-gray-300 space-y-2 text-sm">
                      <li>• Cuenta de AWS (Free Tier)</li>
                      <li>• Conocimiento básico de AWS Console</li>
                      <li>• Conceptos básicos de direcciones IP</li>
                      <li>• Fundamentos de redes</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* AI Chat Assistant for Step 0 */}
              <BedrockChatInterface 
                courseStep={0}
                courseContext="build-vpc"
                className="mb-6"
              />

              {/* Continue Button */}
              <div className="text-center">
                <button 
                  onClick={() => setCurrentTaskStep(1)}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 transform hover:scale-105 text-sm sm:text-base"
                >
                  Comenzar Sección #1: Crear VPC
                </button>
              </div>
            </div>
          )}

          {/* Steps individuales con contenido detallado */}
          {currentTaskStep >= 1 && (
            <div className="space-y-6">
              <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600/50">
                <div className="flex items-center space-x-2 mb-4">
                  <span className="text-xl">
                    {currentTaskStep === 1 && "🌐"} 
                    {currentTaskStep === 2 && "🏘️"}
                    {currentTaskStep === 3 && "🌍"}
                    {currentTaskStep === 4 && "🗺️"}
                  </span>
                  <h4 className="text-white font-medium">
                    {currentTaskStep === 1 && "Sección 1: Creando la VPC - Los Cimientos de tu Ciudad Virtual"}
                    {currentTaskStep === 2 && "Sección 2: Subredes - Diseñando los Barrios"}
                    {currentTaskStep === 3 && "Sección 3: Internet Gateway - La Puerta Principal"}
                    {currentTaskStep === 4 && "Sección 4: NAT Gateway - Salida Segura para Barrios Privados"}
                  </h4>
                </div>
                
                {/* Contenido específico por sección */}
                {currentTaskStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-4">Paso a Paso para Crear tu VPC</h3>
                      
                      <div className="space-y-4">
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/30">
                          <h4 className="text-white font-semibold mb-2">1. Accede al Servicio VPC</h4>
                          <p className="text-gray-300 text-sm mb-2">En la barra de búsqueda superior de AWS, escribe VPC y selecciona el servicio.</p>
                        </div>

                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/30">
                          <h4 className="text-white font-semibold mb-2">2. Explora la VPC por Defecto</h4>
                          <p className="text-gray-300 text-sm mb-2">Al entrar en &quot;Your VPCs&quot;, notarás que ¡ya existe una VPC!</p>
                          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mt-2">
                            <p className="text-blue-300 text-sm">
                              <strong>💡 ¿Por qué ya hay una VPC?</strong> AWS crea automáticamente una &quot;VPC por defecto&quot; cuando abres tu cuenta. 
                              Esto permite que principiantes puedan lanzar servicios como EC2 inmediatamente, sin configurar una red desde cero.
                            </p>
                          </div>
                        </div>

                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/30">
                          <h4 className="text-white font-semibold mb-2">3. Crea tu VPC Personalizada</h4>
                          <ul className="text-gray-300 text-sm space-y-1 mb-3">
                            <li>• Haz clic en &quot;Create VPC&quot;</li>
                            <li>• VPC settings: Selecciona &quot;VPC only&quot;</li>
                            <li>• Name tag: <code className="bg-slate-700 px-1 rounded">mi-primera-vpc</code></li>
                            <li>• IPv4 CIDR block: <code className="bg-slate-700 px-1 rounded">10.0.0.0/16</code></li>
                          </ul>
                          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                            <p className="text-yellow-300 text-sm">
                              <strong>💡 ¿Qué es CIDR?</strong> CIDR (10.0.0.0/16) define el rango de direcciones IP para tu ciudad. 
                              El /16 significa que tienes 65,536 direcciones IP disponibles (¡suficientes para una ciudad grande!).
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentTaskStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-4">Dividiendo tu Ciudad en Barrios (Subredes)</h3>
                      
                      <div className="space-y-4">
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/30">
                          <h4 className="text-white font-semibold mb-2">1. Crea la Subred Pública</h4>
                          <ul className="text-gray-300 text-sm space-y-1 mb-3">
                            <li>• Ve a &quot;Subnets&quot; → &quot;Create subnet&quot;</li>
                            <li>• VPC ID: Selecciona <code className="bg-slate-700 px-1 rounded">mi-primera-vpc</code></li>
                            <li>• Subnet name: <code className="bg-slate-700 px-1 rounded">subnet-publica</code></li>
                            <li>• IPv4 CIDR block: <code className="bg-slate-700 px-1 rounded">10.0.1.0/24</code></li>
                          </ul>
                        </div>

                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/30">
                          <h4 className="text-white font-semibold mb-2">2. Crea la Subred Privada</h4>
                          <ul className="text-gray-300 text-sm space-y-1 mb-3">
                            <li>• Repite el proceso anterior</li>
                            <li>• Subnet name: <code className="bg-slate-700 px-1 rounded">subnet-privada</code></li>
                            <li>• IPv4 CIDR block: <code className="bg-slate-700 px-1 rounded">10.0.2.0/24</code></li>
                          </ul>
                        </div>

                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/30">
                          <h4 className="text-white font-semibold mb-2">3. ¡Haciendo Pública la Subred Pública!</h4>
                          <p className="text-gray-300 text-sm mb-2">
                            Selecciona tu subnet-publica → Actions → Edit subnet settings → 
                            Marca &quot;Enable auto-assign public IPv4 address&quot;
                          </p>
                          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                            <p className="text-green-300 text-sm">
                              <strong>💡 ¿Por qué este paso?</strong> Esto hace que cualquier instancia lanzada en esta subred 
                              obtenga automáticamente una IP pública. ¡Un gran ahorro de tiempo!
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentTaskStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-4">Conectando tu Ciudad al Mundo Exterior</h3>
                      
                      <div className="space-y-4">
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/30">
                          <h4 className="text-white font-semibold mb-2">1. Crea y Adjunta el Internet Gateway</h4>
                          <ul className="text-gray-300 text-sm space-y-1 mb-3">
                            <li>• Ve a &quot;Internet Gateways&quot; → &quot;Create internet gateway&quot;</li>
                            <li>• Name: <code className="bg-slate-700 px-1 rounded">mi-igw</code></li>
                            <li>• Una vez creado, selecciónalo → Actions → &quot;Attach to VPC&quot;</li>
                            <li>• Adjúntalo a <code className="bg-slate-700 px-1 rounded">mi-primera-vpc</code></li>
                          </ul>
                        </div>

                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/30">
                          <h4 className="text-white font-semibold mb-2">2. Configura la Tabla de Rutas (El GPS de la Ciudad)</h4>
                          <ul className="text-gray-300 text-sm space-y-1 mb-3">
                            <li>• Ve a &quot;Route Tables&quot; → &quot;Create route table&quot;</li>
                            <li>• Name: <code className="bg-slate-700 px-1 rounded">tabla-rutas-publica</code></li>
                            <li>• Selecciónala → Routes → Edit routes → Add route</li>
                            <li>• Destination: <code className="bg-slate-700 px-1 rounded">0.0.0.0/0</code> (cualquier dirección de internet)</li>
                            <li>• Target: Internet Gateway → <code className="bg-slate-700 px-1 rounded">mi-igw</code></li>
                          </ul>
                        </div>

                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/30">
                          <h4 className="text-white font-semibold mb-2">3. Asocia la Ruta a la Subred</h4>
                          <p className="text-gray-300 text-sm mb-2">
                            Con tabla-rutas-publica seleccionada → Subnet Associations → Edit → 
                            Marca tu subnet-publica → Save
                          </p>
                          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                            <p className="text-purple-300 text-sm">
                              <strong>🎉 ¡Listo!</strong> Tu subred pública ahora sabe cómo llegar a internet a través del IGW.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentTaskStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-4">Salida Segura para los Barrios Privados</h3>
                      
                      <div className="space-y-4">
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/30">
                          <h4 className="text-white font-semibold mb-2">1. Crea el NAT Gateway</h4>
                          <ul className="text-gray-300 text-sm space-y-1 mb-3">
                            <li>• Ve a &quot;NAT Gateways&quot; → &quot;Create NAT gateway&quot;</li>
                            <li>• Name: <code className="bg-slate-700 px-1 rounded">mi-nat-gateway</code></li>
                            <li>• <strong>¡Importante!</strong> Subnet: <code className="bg-slate-700 px-1 rounded">subnet-publica</code></li>
                            <li>• Connectivity type: Public</li>
                            <li>• Haz clic en &quot;Allocate Elastic IP&quot;</li>
                          </ul>
                          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                            <p className="text-red-300 text-sm">
                              <strong>⚠️ Muy Importante:</strong> El NAT Gateway DEBE ir en la subred pública porque necesita 
                              acceso a internet para funcionar como intermediario.
                            </p>
                          </div>
                        </div>

                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/30">
                          <h4 className="text-white font-semibold mb-2">2. Configura la Ruta Privada</h4>
                          <ul className="text-gray-300 text-sm space-y-1 mb-3">
                            <li>• Ve a &quot;Route Tables&quot; → Selecciona la tabla principal de tu VPC</li>
                            <li>• Routes → Edit routes → Add route</li>
                            <li>• Destination: <code className="bg-slate-700 px-1 rounded">0.0.0.0/0</code></li>
                            <li>• Target: NAT Gateway → <code className="bg-slate-700 px-1 rounded">mi-nat-gateway</code></li>
                            <li>• Asegúrate que subnet-privada esté asociada a esta tabla</li>
                          </ul>
                        </div>

                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                          <h4 className="text-green-300 font-semibold mb-2">¡Misión Cumplida! 🎉</h4>
                          <p className="text-green-300 text-sm">
                            Tus recursos privados ahora pueden salir a internet para descargar actualizaciones, 
                            pero permanecen seguros y ocultos del exterior. ¡Has construido una infraestructura de red completa!
                          </p>
                        </div>

                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-4">
                          <h4 className="text-yellow-300 font-semibold mb-2">🗑️ No olvides limpiar</h4>
                          <p className="text-yellow-300 text-sm mb-2">
                            El NAT Gateway tiene costo por hora. Cuando termines de experimentar:
                          </p>
                          <ul className="text-yellow-300 text-sm space-y-1">
                            <li>• Elimina primero el NAT Gateway</li>
                            <li>• Luego elimina la VPC (arrastrará todo lo demás)</li>
                            <li>• Escribe &quot;delete&quot; para confirmar</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Task Input para cada step */}
                <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600/50">
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="text-yellow-400">🧠</span>
                    <h4 className="text-white font-medium">{currentTask.title}</h4>
                  </div>
                  
                  <p className="text-gray-300 mb-4">{currentTask.description}</p>
                  
                  <textarea
                    value={taskAnswers[`step${currentTaskStep}`] || ''}
                    onChange={(e) => handleTaskAnswer(currentTaskStep, e.target.value)}
                    placeholder={currentTask.placeholder}
                    className="w-full h-24 sm:h-32 bg-slate-800 border border-slate-600 rounded-lg p-3 sm:p-4 text-gray-300 placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                    maxLength={currentTask.charLimit}
                  />
                  
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 space-y-3 sm:space-y-0">
                    <div className="text-xs sm:text-sm text-gray-400">
                      {(taskAnswers[`step${currentTaskStep}`] || '').length}/{currentTask.charLimit} caracteres
                    </div>
                  </div>
                </div>

                {/* AI Chat Assistant */}
                <BedrockChatInterface 
                  courseStep={currentTaskStep}
                  courseContext="build-vpc"
                  className="mt-6"
                />

                {/* Navigation */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-6 space-y-4 sm:space-y-0">
                  <button 
                    onClick={() => setCurrentTaskStep(Math.max(0, currentTaskStep - 1))}
                    className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-slate-600 text-gray-300 rounded-lg hover:bg-slate-500 transition-colors text-sm sm:text-base"
                  >
                    ← Sección Anterior
                  </button>
                  
                  {currentTaskStep < 4 ? (
                    <button 
                      onClick={() => setCurrentTaskStep(currentTaskStep + 1)}
                      className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 text-sm sm:text-base"
                    >
                      Continuar a Sección #{currentTaskStep + 1} →
                    </button>
                  ) : (
                    <button 
                      onClick={goBack}
                      className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all duration-200 text-sm sm:text-base"
                    >
                      ¡Curso Completado! 🎉
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

const BuildVPCPage: NextPage = () => {
  const { user, loading, loggedOut, signOut } = useUser({ redirect: '/signin' })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  if (loggedOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Redirecting to login...</div>
      </div>
    )
  }

  return <BuildVPCCourseContent user={user} signOut={signOut} />
}

export default BuildVPCPage