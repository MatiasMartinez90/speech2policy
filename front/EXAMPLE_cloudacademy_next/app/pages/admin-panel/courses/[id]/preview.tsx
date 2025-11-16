import { NextPage } from 'next'
import { useEffect, useState } from 'react'
import Router, { useRouter } from 'next/router'
import Image from 'next/image'
import useUser from '../../../../lib/useUser'
import AuthenticatedHeader from '../../../../components/AuthenticatedHeader'
import { useSections, Section } from '../../../../hooks/useSections'
import { useAdminCourses, Course } from '../../../../hooks/useAdminCourses'

const CoursePreviewPage: NextPage = () => {
  const router = useRouter()
  const { id: courseId } = router.query
  const { user, loading: userLoading, loggedOut, signOut } = useUser({ redirect: '/signin' })
  const { sections, loading: sectionsLoading, fetchSections } = useSections(courseId as string)
  const { courses, loading: coursesLoading, fetchCourses } = useAdminCourses()
  const [course, setCourse] = useState<Course | null>(null)

  useEffect(() => {
    if (user && !loggedOut && courseId) {
      fetchSections()
      fetchCourses()
    }
  }, [user, loggedOut, courseId, fetchSections, fetchCourses])

  useEffect(() => {
    if (courses.length > 0 && courseId) {
      const foundCourse = courses.find(c => c.course_id === courseId)
      setCourse(foundCourse || null)
    }
  }, [courses, courseId])

  if (userLoading || coursesLoading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
    </div>
  )

  if (loggedOut) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-gray-400">Redirecting...</div>
    </div>
  )

  const sortedSections = [...sections].sort((a, b) => a.order - b.order)

  return (
    <div className="min-h-screen bg-slate-900">
      <AuthenticatedHeader user={user} signOut={signOut} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Vista Previa del Curso
              </h1>
              <p className="text-gray-400">
                Así verán los estudiantes este curso
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => Router.push(`/admin-panel/courses/${courseId}/sections`)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Volver al Editor</span>
              </button>
              <button
                onClick={() => Router.push('/admin-panel')}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Panel Admin</span>
              </button>
            </div>
          </div>
        </div>

        {/* Course Header */}
        {course && (
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 mb-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-300 border border-gray-500/30">
                  • CATEGORÍA
                </span>
                <h2 className="text-4xl font-bold text-white mt-4 mb-2">
                  {course.course_name}
                </h2>
                <p className="text-gray-300 text-lg">
                  {course.description}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-400 to-gray-500 border-2 border-slate-800"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 border-2 border-slate-800"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-purple-500 border-2 border-slate-800"></div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 border-2 border-slate-800"></div>
                </div>
                <span className="text-gray-400 text-sm ml-2">{course.student_count || 0}+ estudiantes</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-6 mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-gray-500/20">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">DURACIÓN TOTAL</div>
                  <div className="text-sm text-white">{course.estimated_time || 'N/A'}</div>
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
                  <div className="text-sm text-white capitalize">{course.difficulty}</div>
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
                  <div className="text-sm text-white">${(course.cost || 0).toFixed(2)}</div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider">SECCIONES</div>
                  <div className="text-sm text-white">{sections.length}</div>
                </div>
              </div>
            </div>

            {/* Key Concepts Showcase */}
            {course.key_concepts && course.key_concepts.length > 0 && (
              <div className="mt-8 bg-gradient-to-r from-gray-500/10 via-blue-500/10 to-purple-500/10 border border-gray-500/30 rounded-xl p-6">
                <div className="flex items-center justify-center space-x-3 mb-6">
                  <span className="text-2xl">💻</span>
                  <h3 className="text-white font-bold text-lg">Tecnologías Principales</h3>
                </div>
                <div className="flex flex-wrap justify-center gap-6">
                  {course.key_concepts.map((concept, index) => (
                    <div key={index} className="flex flex-col items-center justify-center text-center min-w-[80px]">
                      <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-2">
                        <span className="text-purple-400 text-xl leading-none flex items-center justify-center">{concept.emoji}</span>
                      </div>
                      <span className="text-gray-300 text-sm font-medium">{concept.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {sectionsLoading && sections.length === 0 && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto mb-4"></div>
            <p className="text-gray-400">Cargando secciones...</p>
          </div>
        )}

        {/* Empty State */}
        {!sectionsLoading && sections.length === 0 && (
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-12 text-center">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-bold text-white mb-2">
              No hay secciones en este curso
            </h3>
            <p className="text-gray-400 mb-6">
              Agrega secciones para que aparezcan en el preview
            </p>
            <button
              onClick={() => Router.push(`/admin-panel/courses/${courseId}/sections`)}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
            >
              Ir al Editor de Secciones
            </button>
          </div>
        )}

        {/* Sections Preview */}
        {sortedSections.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-white">
                Contenido del Curso
              </h3>
              <span className="text-gray-400">
                {sortedSections.length} sección{sortedSections.length !== 1 ? 'es' : ''}
              </span>
            </div>

            {sortedSections.map((section, index) => (
              <div
                key={section.section_id}
                id={`section-${section.section_id}`}
                className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden"
              >
                {/* Section Header */}
                <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border-b border-slate-700/50 px-6 py-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-green-500/20 text-green-300 text-sm rounded-full font-medium">
                      Sección {section.order + 1}
                    </span>
                    {section.estimated_time && (
                      <span className="flex items-center text-sm text-gray-400">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {section.estimated_time}
                      </span>
                    )}
                  </div>
                  <h4 className="text-2xl font-bold text-white">
                    {section.title}
                  </h4>
                </div>

                {/* Section Content */}
                <div className="px-6 py-6">
                  <div
                    className="ProseMirror prose prose-invert prose-slate max-w-none
                      prose-headings:text-white prose-headings:font-bold
                      prose-p:text-gray-300 prose-p:leading-relaxed
                      prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                      prose-strong:text-white prose-strong:font-semibold
                      prose-code:text-green-400 prose-code:bg-slate-900/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                      prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700
                      prose-ul:text-gray-300 prose-ol:text-gray-300
                      prose-li:text-gray-300
                      prose-blockquote:border-l-green-500 prose-blockquote:text-gray-400
                      prose-img:rounded-lg prose-img:border prose-img:border-slate-700
                      prose-table:border prose-table:border-slate-700
                      prose-th:bg-slate-800 prose-th:text-white prose-th:border prose-th:border-slate-700
                      prose-td:border prose-td:border-slate-700 prose-td:text-gray-300"
                    dangerouslySetInnerHTML={{ __html: section.content }}
                  />
                </div>

                {/* Section Images */}
                {section.images && section.images.length > 0 && (
                  <div className="px-6 pb-6">
                    <div className="border-t border-slate-700/50 pt-6">
                      <h5 className="text-sm font-medium text-gray-400 mb-3">
                        Recursos de esta sección
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {section.images.map((imageUrl, imgIndex) => (
                          <div key={imgIndex} className="relative group h-32">
                            <Image
                              src={imageUrl}
                              alt={`Resource ${imgIndex + 1}`}
                              fill
                              className="object-cover rounded-lg border border-slate-700"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <a
                                href={imageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white transition-colors"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Table of Contents - Floating Navigation */}
        {sortedSections.length > 3 && (
          <div className="fixed bottom-8 right-8 bg-slate-800 border border-slate-700 rounded-lg p-4 max-w-xs shadow-xl">
            <h5 className="text-sm font-medium text-white mb-2">Navegación Rápida</h5>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {sortedSections.map((section) => (
                <a
                  key={section.section_id}
                  href={`#section-${section.section_id}`}
                  className="block px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-slate-700/50 rounded transition-colors"
                >
                  {section.order + 1}. {section.title}
                </a>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default CoursePreviewPage
