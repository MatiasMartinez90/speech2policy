import { NextPage } from 'next'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import useUser from '../../lib/useUser'
import AuthenticatedHeader from '../../components/AuthenticatedHeader'
import BedrockChatInterface from '../../components/BedrockChatInterface'
import { useCourses, CourseDetail } from '../../hooks/useCourses'

const CoursePage: NextPage = () => {
  const router = useRouter()
  const { id: courseId } = router.query
  const { user, loading: userLoading, loggedOut, signOut } = useUser({ redirect: '/signin' })
  const { loading, error, fetchCourseDetail } = useCourses()

  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [currentSection, setCurrentSection] = useState(0)

  useEffect(() => {
    if (courseId && typeof courseId === 'string' && user && !loggedOut) {
      loadCourse(courseId)
    }
  }, [courseId, user, loggedOut])

  const loadCourse = async (id: string) => {
    const courseData = await fetchCourseDetail(id)
    if (courseData) {
      setCourse(courseData)
    }
  }

  const goBack = () => {
    router.push('/courses')
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
      </div>
    )
  }

  if (loggedOut) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-gray-400">Redirecting...</div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-slate-900">
        <AuthenticatedHeader user={user} signOut={signOut} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-8 text-center">
            <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-2xl font-bold text-white mb-2">Curso No Encontrado</h1>
            <p className="text-red-200 mb-6">{error || 'El curso que buscas no existe o no está publicado'}</p>
            <button
              onClick={goBack}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Volver al Catálogo
            </button>
          </div>
        </div>
      </div>
    )
  }

  const getDifficultyColor = () => {
    switch (course.difficulty) {
      case 'Beginner':
        return 'bg-green-500'
      case 'Intermediate':
        return 'bg-yellow-500'
      case 'Advanced':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <AuthenticatedHeader user={user} signOut={signOut} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        {/* Back Button */}
        <button
          onClick={goBack}
          className="flex items-center space-x-2 text-gray-400 hover:text-gray-300 mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Volver al Catálogo</span>
        </button>

        {/* Course Header - Enhanced Hero Style */}
        <div className="mb-8">
          <div className="relative">
            {/* Glow effect background */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-green-600/20 rounded-3xl blur-xl"></div>

            <div className="relative bg-gradient-to-br from-slate-800/90 via-slate-800/95 to-slate-900/90 backdrop-blur-sm border-2 border-purple-500/30 rounded-3xl p-10">
              {/* Background pattern */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full blur-3xl"></div>

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    {course.featured && (
                      <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg animate-pulse mb-4">
                        🔥 CURSO ESTRELLA
                      </span>
                    )}
                    <h1 className="text-4xl font-bold text-white mt-4 mb-2">
                      {course.title || course.course_name}
                    </h1>
                    {course.subtitle && (
                      <p className="text-xl text-purple-300 font-medium mb-2">
                        {course.subtitle}
                      </p>
                    )}
                    <p className="text-gray-300 text-lg mb-4">
                      {course.summary_30s || course.description}
                    </p>
                    <div className="flex items-center space-x-3 mb-4">
                      <span className={`px-3 py-1 ${getDifficultyColor()}/20 text-white rounded-full text-sm font-medium`}>
                        {course.difficulty}
                      </span>
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium">
                        {course.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-purple-500 border-2 border-slate-800"></div>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 border-2 border-slate-800"></div>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-green-500 border-2 border-slate-800"></div>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 border-2 border-slate-800"></div>
                    </div>
                    {course.student_count > 0 && (
                      <span className="text-gray-400 text-sm ml-2">
                        {course.student_count}+ estudiantes
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                  {course.estimated_time && (
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-purple-500/20">
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider">DURACIÓN</div>
                        <div className="text-sm text-white">{course.estimated_time}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wider">DIFICULTAD</div>
                      <div className="text-sm text-white">{course.difficulty}</div>
                    </div>
                  </div>

                  {course.cost !== undefined && (
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-green-500/20">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider">COSTO</div>
                        <div className="text-sm text-white">
                          {course.cost === 0 ? 'Gratis' : `$${course.cost.toFixed(2)}`}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-orange-500/20">
                      <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wider">SECCIONES</div>
                      <div className="text-sm text-white">{course.total_sections} módulos</div>
                    </div>
                  </div>
                </div>

                {/* Additional Stats (Rating and Students) */}
                {(course.average_rating > 0 || course.student_count > 0) && (
                  <div className="flex items-center space-x-6 text-sm text-gray-400 pt-4 border-t border-slate-700/50">
                    {course.average_rating > 0 && (
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span>{course.average_rating.toFixed(1)} / 5.0</span>
                      </div>
                    )}
                    {course.completion_rate > 0 && (
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{course.completion_rate}% tasa de finalización</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* What You'll Need & Key Concepts */}
        {(course.what_youll_need && course.what_youll_need.length > 0) || (course.key_concepts && course.key_concepts.length > 0) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* What You'll Need */}
            {course.what_youll_need && course.what_youll_need.length > 0 && (
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
                <div className="flex items-center mb-4">
                  <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                    What You&apos;ll Need
                  </h3>
                </div>
                <ul className="space-y-2">
                  {course.what_youll_need.map((item, index) => (
                    <li key={index} className="flex items-start text-gray-300">
                      <svg className="w-5 h-5 mr-2 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Key Concepts */}
            {course.key_concepts && course.key_concepts.length > 0 && (
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
                <div className="flex items-center mb-4">
                  <svg className="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                    Key Concepts
                  </h3>
                </div>
                <ul className="space-y-2">
                  {course.key_concepts.map((concept, index) => (
                    <li key={index} className="flex items-start text-gray-300">
                      <span className="text-xl mr-2 flex-shrink-0">{concept.emoji}</span>
                      <span>{concept.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}

        {/* Course Content - 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Sections/Content */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Contenido del Curso
            </h2>

            {course.sections && course.sections.length > 0 ? (
              <div className="space-y-3">
                {course.sections.map((section, index) => (
                  <div
                    key={section.section_id}
                    onClick={() => setCurrentSection(section.section_id)}
                    className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                      currentSection === section.section_id
                        ? 'bg-green-500/10 border-green-500/50'
                        : 'bg-slate-900/50 border-slate-700/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          currentSection === section.section_id
                            ? 'bg-green-500 text-white'
                            : 'bg-slate-700 text-gray-400'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold ${
                            currentSection === section.section_id ? 'text-green-300' : 'text-white'
                          }`}>
                            {section.title}
                          </h3>
                          {section.estimated_time && (
                            <p className="text-xs text-gray-500">{section.estimated_time}</p>
                          )}
                        </div>
                      </div>
                      <svg
                        className={`w-5 h-5 transition-colors ${
                          currentSection === section.section_id ? 'text-green-400' : 'text-gray-600'
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-400">Este curso aún no tiene secciones publicadas</p>
                <p className="text-gray-500 text-sm mt-2">El contenido estará disponible próximamente</p>
              </div>
            )}
          </div>

          {/* Right: AI Tutor Chat */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-700/50 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <svg className="w-6 h-6 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Tutor IA
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Pregunta sobre cualquier sección del curso
              </p>
            </div>

            <BedrockChatInterface
              courseContext={course.course_id}
              courseStep={currentSection}
            />
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2">¿Cómo usar el Tutor IA?</h3>
              <ul className="text-gray-300 space-y-2 text-sm">
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">•</span>
                  <span>Selecciona una sección del curso en el panel izquierdo</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">•</span>
                  <span>Haz preguntas específicas sobre el contenido de esa sección</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">•</span>
                  <span>El tutor tiene contexto del curso completo y te ayudará a entender mejor</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">•</span>
                  <span>Puedes pedirle ejemplos, aclaraciones o validar tu comprensión</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default CoursePage
