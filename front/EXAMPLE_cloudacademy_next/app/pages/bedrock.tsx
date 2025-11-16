import type { NextPage } from 'next'
import Router from 'next/router'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import useUser from '../lib/useUser'
import AuthenticatedHeader from '../components/AuthenticatedHeader'
import SEO from '../components/SEO'

// Lazy load BedrockChatInterface component for better performance
const BedrockChatInterface = dynamic(
  () => import('../components/BedrockChatInterface'),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        <span className="ml-3 text-gray-400">Cargando chat...</span>
      </div>
    ),
    ssr: false // Don't render on server since it's interactive
  }
)

const BedrockCourseContent = ({ user, signOut }: { user: any; signOut: any }) => {
  const [showDemo, setShowDemo] = useState(false)
  const [currentTaskStep, setCurrentTaskStep] = useState(0)
  const [taskAnswers, setTaskAnswers] = useState<Record<string, string>>({
    step0: '',
    step1: '',
    step2: '',
    step3: ''
  })

  const goBack = () => {
    Router.push('/admin')
  }

  const courseSteps = [
    {
      id: 0,
      title: "Before we start",
      subtitle: "Step #1...",
      icon: "🧠",
      color: "from-purple-500 to-purple-600",
      active: true
    },
    {
      id: 1,
      title: "Setting Up...",
      icon: "⚡",
      color: "from-orange-500 to-orange-600"
    },
    {
      id: 2,
      title: "Store Your Data",
      icon: "🗄️",
      color: "from-teal-500 to-teal-600"
    },
    {
      id: 3,
      title: "Finish Setup",
      icon: "🧠",
      color: "from-pink-500 to-pink-600"
    },
    {
      id: 4,
      title: "Get Access",
      icon: "🔑",
      color: "from-yellow-500 to-yellow-600"
    },
    {
      id: 5,
      title: "Sync Your Data",
      icon: "🔄",
      color: "from-blue-500 to-blue-600"
    },
    {
      id: 6,
      title: "Chat With Your Bot",
      icon: "🤖",
      color: "from-green-500 to-green-600"
    }
  ]

  const taskSteps = [
    {
      id: 0,
      title: "What is RAG and how will you demonstrate it today?",
      placeholder: "Start your answer with &apos;RAG (Retrieval Augmented Generation) is...&apos; In this project, I will demonstrate RAG by...",
      description: "Go on, we know you have a great answer...",
      charLimit: 500
    },
    {
      id: 1,
      title: "What are we doing in this step?",
      placeholder: "In this step, I will...",
      description: "Start your answer with &apos;In this step, I will...&apos;",
      charLimit: 500
    },
    {
      id: 2,
      title: "What are we doing in this step?",
      placeholder: "In this step, I will...", 
      description: "Start your answer with &apos;In this step, I will...&apos;",
      charLimit: 500
    },
    {
      id: 3,
      title: "What are we doing in this step?",
      placeholder: "In this step, I will...",
      description: "Start your answer with 'In this step, I will...'", 
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

  // SEO structured data
  const courseStructuredData = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": "RAG con Amazon Bedrock",
    "description": "Aprende a construir sistemas RAG (Retrieval Augmented Generation) usando Amazon Bedrock, Knowledge Bases y modelos de IA generativa.",
    "provider": {
      "@type": "Organization",
      "name": "CloudAcademy",
      "url": "https://proyectos.cloudacademy.ar"
    },
    "educationalLevel": "Intermedio-Avanzado",
    "inLanguage": "es",
    "coursePrerequisites": "Conocimientos básicos de AWS"
  }

  return (
    <>
      <SEO
        title="Curso RAG con Amazon Bedrock | CloudAcademy"
        description="Aprende a construir sistemas RAG (Retrieval Augmented Generation) paso a paso con Amazon Bedrock. Integra IA generativa con tus datos empresariales usando Knowledge Bases, S3, OpenSearch y Claude."
        canonical="https://proyectos.cloudacademy.ar/bedrock"
        keywords="Amazon Bedrock, RAG, Retrieval Augmented Generation, AWS IA, Knowledge Base, Claude, OpenSearch, embeddings"
        structuredData={courseStructuredData}
        noindex={true}
      />

      <div className="min-h-screen bg-slate-900">
        <AuthenticatedHeader user={user} signOut={signOut} />
      
      {/* Header con título del paso actual */}
      {currentTaskStep >= 1 && (
        <header className="bg-slate-800/50 border-b border-slate-700/50 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center text-white font-medium text-sm sm:text-base">
              {currentTaskStep === 1 && "Step #1: Setting Up a Knowledge Base"}
              {currentTaskStep === 2 && "Step #2: Store Your Documents in S3"}
              {currentTaskStep === 3 && "Step #3: Finish Setting Up Your Knowledge Base"}
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
                    ? 'bg-gradient-to-r from-purple-500/20 to-purple-600/20 border border-purple-500/30' 
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
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 space-y-6">
          {/* Project Header - Solo se muestra en step 0 */}
          {currentTaskStep === 0 && (
            <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-4 sm:p-6 lg:p-8 backdrop-blur-sm">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6 space-y-4 md:space-y-0">
                <div className="flex-1">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
                    • PROJECT
                  </span>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white mt-4">
                    Set Up a RAG Chatbot in Bedrock
                  </h1>
                  <p className="text-gray-300 mt-3 text-base sm:text-lg">
                    Build an AI chatbot that learns from your data with RAG and Amazon Bedrock!
                  </p>
                </div>
                <div className="flex items-center space-x-2 md:ml-4">
                  <div className="flex -space-x-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 border-2 border-slate-800"></div>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-green-400 to-green-500 border-2 border-slate-800"></div>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-purple-400 to-purple-500 border-2 border-slate-800"></div>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-pink-400 to-pink-500 border-2 border-slate-800"></div>
                  </div>
                  <span className="text-gray-400 text-sm ml-2">70+ completed</span>
                </div>
              </div>

              {/* Project Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
                <div className="flex items-center space-x-2 lg:space-x-3">
                  <div className="p-2 rounded-lg bg-orange-500/20">
                    <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider">DIFFICULTY</div>
                    <div className="text-xs sm:text-sm text-white">Mildly spicy</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 lg:space-x-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider">TIME</div>
                    <div className="text-xs sm:text-sm text-white">60 min</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 lg:space-x-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider">COST</div>
                    <div className="text-xs sm:text-sm text-white">~$0.01</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 lg:space-x-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider">COMPLETED</div>
                    <div className="text-xs sm:text-sm text-white">70+ completed</div>
                  </div>
                </div>
              </div>

              {/* Requirements and Concepts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.78 0-2.678-2.153-1.415-3.414l5-5A2 2 0 009 9.172V5L8 4z" />
                    </svg>
                    <h3 className="text-white font-medium">WHAT YOU&apos;LL NEED</h3>
                  </div>
                  <ul className="space-y-2 text-gray-300">
                    <li className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0"></span>
                      <span className="text-sm">An AWS account - <a href="#" className="text-blue-400 hover:text-blue-300 underline">Create one here!</a></span>
                    </li>
                  </ul>
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <h3 className="text-white font-medium">KEY CONCEPTS</h3>
                  </div>
                  <ul className="space-y-2 text-gray-300">
                    <li className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"></span>
                      <span className="text-sm">Amazon Bedrock</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"></span>
                      <span className="text-sm">Amazon OpenSearch Serverless</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"></span>
                      <span className="text-sm">Amazon S3</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 30 Second Summary - Solo se muestra en step 0 */}
          {currentTaskStep === 0 && (
            <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-4 sm:p-6 backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-4">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className="text-white font-semibold">30 Second Summary</h3>
              </div>
              <div className="space-y-4 text-gray-300 text-sm sm:text-base">
                <p>
                  In this project, you&apos;ll learn how to build a chatbot that&apos;s an expert on you – it can answer questions about 
                  who you are, what you do, and what you know!
                </p>
                <p>
                  This is made possible when we use a special AI technique called <span className="text-white font-medium">RAG (Retrieval Augmented 
                  Generation)</span>, which is a way to train an AI chatbot on your personal documents. We&apos;ll learn how to do this 
                  on <span className="text-white font-medium">Amazon Bedrock</span>, an AWS service that gives you access to AI models to bring into your applications.
                </p>
              </div>

              {/* Demo Section */}
              <div className="mt-8 text-center">
                <div className="bg-white rounded-lg p-4 sm:p-6 max-w-full sm:max-w-md mx-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900 text-sm sm:text-base">Test Knowledge Base</h4>
                    <button className="text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" checked className="rounded" readOnly />
                      <span className="text-sm text-gray-700">Generate responses</span>
                    </div>
                    
                    <div className="text-left">
                      <div className="text-xs sm:text-sm font-medium text-gray-900 mb-2">Llama 3 70B Instruct v1 | On-demand</div>
                      <div className="text-xs text-gray-500 mb-2">Owner</div>
                      
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs">N</span>
                          </div>
                          <span className="text-sm font-medium">Who is Natasha</span>
                        </div>
                        <div className="text-xs text-gray-600">
                          Natasha Org is a NetWork Student who is learning AWS with hands-on projects and has completed various projects, including working with...
                        </div>
                        <button className="text-blue-600 text-xs mt-1">Show details →</button>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mt-4">This is what your finished chatbot can do!</p>
                
                <button className="mt-4 px-4 sm:px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transition-all duration-200 text-sm sm:text-base">
                  Explore your potential 🚀
                </button>
              </div>
            </div>
          )}

          {/* What is RAG? Section */}
          <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-4 sm:p-6 backdrop-blur-sm">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-xl sm:text-2xl">🧠</span>
              <h3 className="text-white font-semibold text-lg sm:text-xl">What is RAG?</h3>
            </div>
            <div className="space-y-4 text-gray-300 text-sm sm:text-base">
              <p>
                AI chatbots like ChatGPT are super smart, but they only know what they learned during training and what 
                they can search online. They can&apos;t learn about you or your documents, unless you upload 
                your files manually in each conversation (or unless you&apos;re a celebrity 😅).
              </p>
              <p>
                That&apos;s where <span className="text-white font-medium">RAG (Retrieval Augmented Generation)</span> comes in. RAG is an AI technique that lets you take 
                an AI model&apos;s brain (i.e. their ability to turn data into a human-like response) and give it your own 
                documents to train on. Now, your AI chatbot becomes an in-house expert on your documents and 
                information!
              </p>
              <p>
                Companies often use RAG to create customer support chatbots, but you can also use RAG to create a 
                personal research assistant or an advanced way to search your documents.
              </p>
            </div>
          </div>

          {/* Let's get ready to... Section */}
          <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-4 sm:p-6 backdrop-blur-sm">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-xl sm:text-2xl">✅</span>
              <h3 className="text-white font-semibold text-lg sm:text-xl">Let&apos;s get ready to...</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-green-500 rounded flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-gray-300 text-sm sm:text-base">🚀 Build a powerful RAG chatbot from scratch in Amazon Bedrock!</span>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-gray-600 rounded flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                </div>
                <span className="text-gray-400 text-sm sm:text-base">📚 Create a Knowledge Base to hold your chatbot&apos;s information.</span>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-gray-600 rounded flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                </div>
                <span className="text-gray-400 text-sm sm:text-base">🗄️ Use Amazon S3 and OpenSearch to manage your chatbot&apos;s data.</span>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-gray-600 rounded flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                </div>
                <span className="text-gray-400 text-sm sm:text-base">🔍 Test and refine your chatbot&apos;s performance.</span>
              </div>
            </div>

            <div className="mt-6 text-gray-300 text-sm sm:text-base">
              <p className="mb-4">
                Want a complete demo of how to do this project, from start to finish? Check out our 
                <a href="#" className="text-blue-400 hover:text-blue-300 underline ml-1">walkthrough with Natasha ↗</a>
              </p>
              
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center justify-center text-gray-400 mb-2">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm text-center">Video no disponible</p>
                <p className="text-gray-500 text-xs text-center">Este video no está disponible</p>
              </div>
            </div>
          </div>

          {/* Choose Your Mode Section */}
          <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-4 sm:p-6 backdrop-blur-sm">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-xl sm:text-2xl">🛠️</span>
              <h3 className="text-white font-semibold text-lg sm:text-xl">Choose Your Mode...</h3>
            </div>
            <p className="text-gray-300 mb-4 sm:mb-6 text-sm sm:text-base">
              We like to give a couple of different options for these hands-on projects, based on how much support 
              and guidance you want.
            </p>
            <p className="text-gray-300 mb-4 sm:mb-6 text-sm sm:text-base">
              There are these <span className="text-yellow-400 font-medium">😎 equally awesome</span> ways you can complete your project.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4 text-center border border-slate-600/50">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold text-sm sm:text-base">#0</span>
                </div>
                <h4 className="text-white font-medium mb-2 text-sm sm:text-base">#0 - No Touch</h4>
              </div>
              
              <div className="bg-slate-700/50 rounded-lg p-4 text-center border border-yellow-500/50 bg-yellow-500/10">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold text-sm sm:text-base">#1</span>
                </div>
                <h4 className="text-white font-medium mb-2 text-sm sm:text-base">#1 - Low Touch</h4>
              </div>
              
              <div className="bg-slate-700/50 rounded-lg p-4 text-center border border-slate-600/50">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold text-sm sm:text-base">#2</span>
                </div>
                <h4 className="text-white font-medium mb-2 text-sm sm:text-base">#2 - High Touch</h4>
              </div>
            </div>
          </div>

          {/* Your Step-By-Step Project Section */}
          <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-6 backdrop-blur-sm">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-2xl">⚠️</span>
              <h3 className="text-white font-semibold">Your Step-By-Step Project</h3>
            </div>
            
            {currentTaskStep === 0 && (
              <div className="space-y-6">
                <div className="border border-orange-500/30 bg-orange-500/10 rounded-lg p-4">
                  <p className="text-orange-200 mb-2">
                    Welcome to the high-touch version of this project. We&apos;ll guide you through this project step-by-step 
                    together.
                  </p>
                  <p className="text-orange-200">Let&apos;s go!</p>
                </div>

                <div className="border border-slate-600/50 bg-slate-700/30 rounded-lg p-4">
                  <p className="text-gray-300 mb-2">
                    If you&apos;re EVER stuck - <a href="#" className="text-blue-400 hover:text-blue-300 underline">ask the NetWork community.</a> Students like you are already asking 
                    questions about this project.
                  </p>
                </div>

                <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600/50">
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="text-xl">🧠</span>
                    <h4 className="text-white font-medium">Step #0: Before we start Step #1...</h4>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-4">Before we start Step #1...</h3>
                  
                  <p className="text-gray-300 mb-4">Here&apos;s a quick overview of what we&apos;re building today:</p>
                  
                  <p className="text-gray-300 mb-4">
                    You&apos;re about to build a chatbot that&apos;s trained on your personal documents. When you send a message to 
                    your completed chatbot, three things will happen behind the scenes:
                  </p>
                  
                  <div className="space-y-3 mb-6">
                    <p className="text-gray-300">
                      <span className="font-medium">1. The chatbot uses an AI model</span> to understand your question and figure out what information it needs to 
                      answer it.
                    </p>
                    <p className="text-gray-300">
                      <span className="font-medium">2. The AI model sends a request for information it needs to your Knowledge Base</span>, which is where you 
                      process and store your personal documents.
                    </p>
                    <p className="text-gray-300">
                      <span className="font-medium">3. The AI model transforms the raw data</span> (e.g. paragraphs of text) from your Knowledge Base into a 
                      proper response, which gets sent back to you.
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="font-medium text-gray-900">CHATBOT</h5>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                          <span className="text-blue-600 text-sm">👤</span>
                        </div>
                        <div className="text-xs text-gray-600">User (You)</div>
                      </div>
                      
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-4xl">↔️</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                          <span className="text-gray-600 text-sm">∞</span>
                        </div>
                        <div className="text-xs text-gray-600">AI Model</div>
                      </div>
                      
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-2xl">↔️</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="w-12 h-8 bg-green-100 rounded flex items-center justify-center mb-2">
                          <span className="text-green-600 text-xs">📚</span>
                        </div>
                        <div className="text-xs text-gray-600">Knowledge Base</div>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-400 text-center text-sm mb-6">A simple diagram of what we&apos;re building</p>

                  <div className="border border-yellow-500/30 bg-yellow-500/10 rounded-lg p-4 mb-6">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-yellow-400">💡</span>
                      <h5 className="text-yellow-200 font-medium">How in the world are we going to build this?</h5>
                    </div>
                    <ul className="space-y-2 text-yellow-200">
                      <li>• We&apos;ll build a <span className="font-medium">Knowledge Base</span> in Amazon Bedrock in 🧠 <span className="font-medium">Steps #1-3</span>.</li>
                      <li>• We&apos;ll pick the best <span className="font-medium">AI models</span> for our chatbot in 🤖 <span className="font-medium">Step #4</span>.</li>
                      <li>• We&apos;ll sync your documents from S3 to the Knowledge Base in 🔄 <span className="font-medium">Step #5</span>.</li>
                      <li>• Finally, Bedrock sets up a chatbot when we connect the Knowledge Base and AI model, which we&apos;ll test in 🤖 <span className="font-medium">Step #6!</span></li>
                    </ul>
                  </div>

                  <div className="bg-white rounded-lg p-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="bg-blue-100 rounded-lg p-3 mb-2">
                          <div className="text-blue-600 text-xs font-medium">S3</div>
                        </div>
                        <div className="text-xs text-gray-600">Your Documents</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="bg-green-100 rounded-lg p-3 mb-2 relative">
                          <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1 rounded">S3</div>
                          <div className="text-green-600 text-xs font-medium">📚</div>
                        </div>
                        <div className="text-xs text-gray-600">Chunking</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="bg-green-100 rounded-lg p-3 mb-2 relative">
                          <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-1 rounded">KB</div>
                          <div className="text-green-600 text-xs font-medium">🧠</div>
                        </div>
                        <div className="text-xs text-gray-600">Generate Embeddings</div>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="text-2xl">↔️</div>
                        <div className="text-center ml-2">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mb-1">
                            <span className="text-gray-600 text-sm">∞</span>
                          </div>
                          <div className="text-xs text-gray-600">AI Model</div>
                        </div>
                        <div className="text-2xl ml-2">↔️</div>
                        <div className="text-center ml-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mb-1">
                            <span className="text-blue-600 text-sm">👤</span>
                          </div>
                          <div className="text-xs text-gray-600">User</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Task Input */}
                <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600/50">
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="text-yellow-400">🧠</span>
                    <h4 className="text-white font-medium">{currentTask.title}</h4>
                  </div>
                  
                  <p className="text-gray-300 mb-4">{currentTask.description}</p>
                  
                  <textarea
                    value={taskAnswers.step0}
                    onChange={(e) => handleTaskAnswer(0, e.target.value)}
                    placeholder={currentTask.placeholder}
                    className="w-full h-24 sm:h-32 bg-slate-800 border border-slate-600 rounded-lg p-3 sm:p-4 text-gray-300 placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                  />
                  
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 space-y-3 sm:space-y-0">
                    <div className="text-xs sm:text-sm text-gray-400">
                      {taskAnswers.step0.length}/{currentTask.charLimit} Character limit reached {currentTask.charLimit > taskAnswers.step0.length ? "Upgrade to Pro" : ""}
                    </div>
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                      <button className="px-3 sm:px-4 py-2 bg-slate-600 text-gray-300 rounded-lg hover:bg-slate-500 transition-colors text-sm">
                        ✓ Tasks still to complete
                      </button>
                      <button className="px-3 sm:px-4 py-2 bg-slate-600 text-gray-300 rounded-lg hover:bg-slate-500 transition-colors text-sm">
                        📑 Return to later
                      </button>
                    </div>
                  </div>
                </div>

                {/* AI Chat Assistant for Step 0 */}
                <BedrockChatInterface 
                  courseStep={0}
                  courseContext="bedrock-rag"
                  className="mb-6"
                />

                {/* Continue Button */}
                <div className="text-center">
                  <button 
                    onClick={() => setCurrentTaskStep(1)}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 text-sm sm:text-base"
                  >
                    Continue to Step #1
                  </button>
                </div>
              </div>
            )}

            {/* Steps individuales con tareas */}
            {currentTaskStep >= 1 && (
              <div className="space-y-6">
                <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600/50">
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="text-xl">
                      {currentTaskStep === 1 && "🧠"} 
                      {currentTaskStep === 2 && "🗄️"}
                      {currentTaskStep === 3 && "🧠"}
                    </span>
                    <h4 className="text-white font-medium">
                      {currentTaskStep === 1 && "Step #1: Setting Up a Knowledge Base"}
                      {currentTaskStep === 2 && "Step #2: Store Your Documents in S3"}
                      {currentTaskStep === 3 && "Step #3: Finish Setting Up Your Knowledge Base"}
                    </h4>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-4">
                    {currentTaskStep === 1 && "Step #1: Setting Up a Knowledge Base"}
                    {currentTaskStep === 2 && "Step #2: Store Your Documents in S3"}
                    {currentTaskStep === 3 && "Step #3: Finish Setting Up Your Knowledge Base"}
                  </h3>
                  
                  <p className="text-gray-300 mb-4">
                    {currentTaskStep === 1 && "In this step, you&apos;ll create a Knowledge Base in Amazon Bedrock to store your chatbot&apos;s information."}
                    {currentTaskStep === 2 && "Upload your documents to Amazon S3 so your chatbot can access them."}
                    {currentTaskStep === 3 && "Connect your S3 bucket to your Knowledge Base and complete the setup."}
                  </p>
                  
                  <ul className="space-y-2 text-gray-300 mb-6">
                    {currentTaskStep === 1 && (
                      <>
                        <li>• Go to the Amazon Bedrock console.</li>
                        <li>• Navigate to Knowledge Bases and click <span className="font-medium">Create Knowledge Base</span>.</li>
                        <li>• Follow the prompts to set up your Knowledge Base.</li>
                      </>
                    )}
                    {currentTaskStep === 2 && (
                      <>
                        <li>• Create a new S3 bucket.</li>
                        <li>• Upload your files to the bucket.</li>
                        <li>• Set the correct permissions for Bedrock to access your files.</li>
                      </>
                    )}
                    {currentTaskStep === 3 && (
                      <>
                        <li>• In the Bedrock console, link your S3 bucket to your Knowledge Base.</li>
                        <li>• Index your documents.</li>
                        <li>• Test the connection.</li>
                      </>
                    )}
                  </ul>

                  {/* Task Input para cada step */}
                  <div className="bg-slate-700/50 rounded-lg p-6 border border-slate-600/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <span className="text-yellow-400">🧠</span>
                      <h4 className="text-white font-medium">What are we doing in this step?</h4>
                    </div>
                    
                    <p className="text-gray-300 mb-4">Start your answer with &quot;In this step, I will...&quot;</p>
                    
                    <textarea
                      value={taskAnswers[`step${currentTaskStep}`] || ''}
                      onChange={(e) => handleTaskAnswer(currentTaskStep, e.target.value)}
                      placeholder="In this step, I will..."
                      className="w-full h-24 sm:h-32 bg-slate-800 border border-slate-600 rounded-lg p-3 sm:p-4 text-gray-300 placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500 text-sm sm:text-base"
                    />
                    
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 space-y-3 sm:space-y-0">
                      <div className="text-xs sm:text-sm text-gray-400">
                        {(taskAnswers[`step${currentTaskStep}`] || '').length}/500 Character limit reached Upgrade to Pro
                      </div>
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                        <button className="px-3 sm:px-4 py-2 bg-slate-600 text-gray-300 rounded-lg hover:bg-slate-500 transition-colors text-sm">
                          ✓ Tasks still to complete
                        </button>
                        <button className="px-3 sm:px-4 py-2 bg-slate-600 text-gray-300 rounded-lg hover:bg-slate-500 transition-colors text-sm">
                          📑 Return to later
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* AI Chat Assistant */}
                  <BedrockChatInterface 
                    courseStep={currentTaskStep}
                    courseContext="bedrock-rag"
                    className="mt-6"
                  />

                  {/* Navigation */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-6 space-y-4 sm:space-y-0">
                    <button 
                      onClick={() => setCurrentTaskStep(Math.max(0, currentTaskStep - 1))}
                      className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-slate-600 text-gray-300 rounded-lg hover:bg-slate-500 transition-colors text-sm sm:text-base"
                    >
                      ← Previous Step
                    </button>
                    
                    {currentTaskStep < 3 ? (
                      <button 
                        onClick={() => setCurrentTaskStep(currentTaskStep + 1)}
                        className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transition-all duration-200 text-sm sm:text-base"
                      >
                        Continue to Step #{currentTaskStep + 1} →
                      </button>
                    ) : (
                      <button 
                        onClick={goBack}
                        className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-green-700 transition-all duration-200 text-sm sm:text-base"
                      >
                        Complete Course 🎉
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
    </>
  )
}

const BedrockCourse: NextPage = () => {
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

  return <BedrockCourseContent user={user} signOut={signOut} />
}

export default BedrockCourse