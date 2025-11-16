import { NextPage } from 'next'
import { useState, useEffect } from 'react'
import Router from 'next/router'
import Link from 'next/link'
import useUser from '../lib/useUser'
import AuthenticatedHeader from '../components/AuthenticatedHeader'
import { useAdminCourses, Course, CreateCourseInput } from '../hooks/useAdminCourses'
import { useAdminCategories } from '../hooks/useAdminCategories'
import useCategories from '../hooks/useCategories'

const AdminPanel: NextPage = () => {
  const { user, loading: userLoading, loggedOut, signOut } = useUser({ redirect: '/signin' })
  const { courses, loading, error, fetchCourses, createCourse, updateCourse, deleteCourse } = useAdminCourses()
  const { categories: dynamicCategories, fetchCategories } = useAdminCategories()
  const { getCategoryConfig } = useCategories()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deletingCourse, setDeletingCourse] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<{ message: string; courseId?: string } | null>(null)

  // Form state
  const [formData, setFormData] = useState<CreateCourseInput>({
    course_id: '',
    course_name: '',
    title: '',
    description: '',
    category: '', // Will be populated from dynamic categories
    difficulty: 'Beginner',
    is_published: false,
    estimated_time: '',
    cost: 0,
    summary_30s: '',
    introduction: '',
    subtitle: '',
    what_youll_need: [],
    key_concepts: [],
    // Campos opcionales para páginas de categoría
    icon: '',
    type: '',
    featured: false,
    color: '',
    rating: undefined,
    student_count: undefined,
  })

  useEffect(() => {
    if (user && !loggedOut) {
      fetchCourses()
      fetchCategories() // Fetch dynamic categories from DynamoDB
    }
  }, [user, loggedOut, fetchCourses, fetchCategories])

  // Set default category when categories are loaded
  useEffect(() => {
    if (dynamicCategories.length > 0 && !formData.category) {
      const firstActiveCategory = dynamicCategories.find(cat => cat.is_active)
      if (firstActiveCategory) {
        setFormData(prev => ({ ...prev, category: firstActiveCategory.category_id }))
      }
    }
  }, [dynamicCategories, formData.category])

  // Helper to get category display info
  const getCategoryDisplay = (categoryId: string) => {
    const dynamicCategory = dynamicCategories.find(cat => cat.category_id === categoryId)
    if (dynamicCategory) {
      return {
        emoji: dynamicCategory.emoji,
        label: dynamicCategory.label,
        color: dynamicCategory.color
      }
    }
    // Fallback to hardcoded categories if dynamic not found
    const hardcodedCategory = getCategoryConfig(categoryId)
    return {
      emoji: hardcodedCategory.emoji,
      label: hardcodedCategory.label,
      color: 'from-gray-500 to-gray-600'
    }
  }

  const resetForm = () => {
    const firstActiveCategory = dynamicCategories.find(cat => cat.is_active)
    setFormData({
      course_id: '',
      course_name: '',
      title: '',
      description: '',
      category: firstActiveCategory?.category_id || '',
      difficulty: 'Beginner',
      is_published: false,
      estimated_time: '',
      cost: 0,
      summary_30s: '',
      introduction: '',
      subtitle: '',
      what_youll_need: [],
      key_concepts: [],
      // Campos opcionales para páginas de categoría
      icon: '',
      type: '',
      featured: false,
      color: '',
      rating: undefined,
      student_count: undefined,
    })
    setShowCreateForm(false)
    setEditingCourse(null)
  }

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = await createCourse(formData)
    if (result) {
      setSuccessMessage({
        message: `Curso "${result.course_name}" creado exitosamente!`,
        courseId: result.course_id
      })
      resetForm()
      // Auto-hide success message after 10 seconds
      setTimeout(() => setSuccessMessage(null), 10000)
    }
  }

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingCourse) return

    const updates = {
      course_name: formData.course_name,
      title: formData.title,
      description: formData.description,
      category: formData.category,
      difficulty: formData.difficulty,
      is_published: formData.is_published,
      estimated_time: formData.estimated_time,
      cost: formData.cost,
      summary_30s: formData.summary_30s,
      introduction: formData.introduction,
      subtitle: formData.subtitle,
      what_youll_need: formData.what_youll_need,
      key_concepts: formData.key_concepts,
    }

    const result = await updateCourse(editingCourse.course_id, updates)
    if (result) {
      setSuccessMessage({
        message: `Curso "${result.course_name}" actualizado exitosamente!`,
        courseId: result.course_id
      })
      resetForm()
      // Auto-hide success message after 10 seconds
      setTimeout(() => setSuccessMessage(null), 10000)
    }
  }

  const startEdit = (course: Course) => {
    setEditingCourse(course)
    setFormData({
      course_id: course.course_id,
      course_name: course.course_name,
      title: course.title || '',
      description: course.description,
      category: course.category,
      difficulty: course.difficulty,
      is_published: course.is_published,
      estimated_time: course.estimated_time || '',
      cost: course.cost || 0,
      summary_30s: course.summary_30s || '',
      introduction: course.introduction || '',
      subtitle: course.subtitle || '',
      what_youll_need: course.what_youll_need || [],
      key_concepts: course.key_concepts || [],
    })
    setShowCreateForm(true)
  }

  const handleDelete = async (courseId: string) => {
    // Evitar clicks si ya se está eliminando este curso
    if (deletingCourse === courseId) {
      return
    }

    // Primer click: pedir confirmación
    if (deleteConfirm !== courseId) {
      setDeleteConfirm(courseId)
      setTimeout(() => setDeleteConfirm(null), 3000)
      return
    }

    // Segundo click: ejecutar eliminación
    setDeletingCourse(courseId)

    try {
      const success = await deleteCourse(courseId)
      if (success) {
        setDeleteConfirm(null)
        setSuccessMessage({ message: `Curso "${courseId}" eliminado exitosamente` })

        // Auto-hide success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000)
      }
    } finally {
      setDeletingCourse(null)
    }
  }

  const handleToggleFeatured = async (course: Course) => {
    try {
      // Toggle: si ya está featured, quitar estrella; si no, poner estrella
      const newFeaturedValue = !course.is_featured

      console.log(`Toggle featured for ${course.course_id}: ${course.is_featured} -> ${newFeaturedValue}`)

      const success = await updateCourse(course.course_id, { is_featured: newFeaturedValue })

      if (success) {
        // Refrescar lista de cursos para ver el cambio (esperar a que se complete)
        await fetchCourses()

        const message = newFeaturedValue
          ? `"${course.course_name}" marcado como curso estrella`
          : `"${course.course_name}" desmarcado como curso estrella`

        setSuccessMessage({
          message,
          courseId: course.course_id
        })

        // Auto-hide success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000)
      }
    } catch (error) {
      console.error('Error toggling featured:', error)
    }
  }

  if (userLoading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Panel de Administración
              </h1>
              <p className="text-gray-400">
                Gestiona el catálogo de cursos de CloudAcademy
              </p>
            </div>
            <button
              onClick={() => Router.push('/admin')}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Volver al Dashboard</span>
            </button>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-500/10 border border-green-500/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-green-200">{successMessage.message}</p>
              </div>
              <div className="flex items-center space-x-2">
                {successMessage.courseId && (
                  <button
                    onClick={() => Router.push(`/admin-panel/courses/${successMessage.courseId}/sections`)}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Agregar Secciones
                  </button>
                )}
                <button
                  onClick={() => setSuccessMessage(null)}
                  className="text-green-400 hover:text-green-300"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Create/Edit Form */}
        <div className="mb-8">
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Crear Nuevo Curso</span>
            </button>
          ) : (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editingCourse ? 'Editar Curso' : 'Crear Nuevo Curso'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={editingCourse ? handleUpdateCourse : handleCreateCourse} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Course ID (only for create) */}
                  {!editingCourse && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Course ID *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.course_id}
                        onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                        placeholder="image-gen-bedrock"
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">Identificador único (slug, sin espacios)</p>
                    </div>
                  )}

                  {/* Course Name */}
                  <div className={!editingCourse ? '' : 'md:col-span-2'}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nombre del Curso *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.course_name}
                      onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                      placeholder="Generador de Imágenes con IA"
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  {/* Title */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Título
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Set Up a RAG Chatbot in Bedrock"
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Este es el título grande que se muestra en la página del curso
                    </p>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Categoría
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      {dynamicCategories.filter(cat => cat.is_active).map((category) => (
                        <option key={category.category_id} value={category.category_id}>
                          {category.emoji} {category.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      <Link href="/admin-panel/categories" className="text-blue-400 hover:text-blue-300">
                        Gestionar categorías →
                      </Link>
                    </p>
                  </div>

                  {/* Difficulty */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Dificultad
                    </label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="Beginner">Principiante</option>
                      <option value="Intermediate">Intermedio</option>
                      <option value="Advanced">Avanzado</option>
                    </select>
                  </div>

                  {/* Estimated Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Tiempo Estimado
                    </label>
                    <input
                      type="text"
                      value={formData.estimated_time}
                      onChange={(e) => setFormData({ ...formData, estimated_time: e.target.value })}
                      placeholder="ej: 2 horas, 3 días"
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">Tiempo para completar el curso</p>
                  </div>

                  {/* Cost */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Costo (USD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">0 = Gratis</p>
                  </div>

                  {/* Published Status */}
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="is_published"
                      checked={formData.is_published}
                      onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                      className="w-5 h-5 bg-slate-900 border-slate-700 rounded focus:ring-2 focus:ring-green-500"
                    />
                    <label htmlFor="is_published" className="text-sm font-medium text-gray-300">
                      Publicar curso
                    </label>
                  </div>
                </div>

                {/* Summary 30s */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Resumen en 30 Segundos
                  </label>
                  <textarea
                    value={formData.summary_30s}
                    onChange={(e) => setFormData({ ...formData, summary_30s: e.target.value })}
                    rows={3}
                    maxLength={300}
                    placeholder="Resumen rápido de qué aprenderás en este curso..."
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {formData.summary_30s?.length || 0}/300 caracteres
                  </p>
                </div>

                {/* Introduction */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Introducción
                  </label>
                  <textarea
                    value={formData.introduction}
                    onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
                    rows={5}
                    placeholder="Introducción detallada del curso. Explica qué se aprenderá, prerequisitos, objetivos, etc..."
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Subtitle */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Subtítulo
                  </label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    placeholder="Build an AI chatbot that learns from your data..."
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* What You'll Need */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Qué vas a necesitar (What You&apos;ll Need)
                  </label>
                  <div className="space-y-2">
                    {formData.what_youll_need?.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => {
                            const newList = [...(formData.what_youll_need || [])]
                            newList[index] = e.target.value
                            setFormData({ ...formData, what_youll_need: newList })
                          }}
                          placeholder="An AWS account - Create one here!"
                          className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newList = formData.what_youll_need?.filter((_, i) => i !== index) || []
                            setFormData({ ...formData, what_youll_need: newList })
                          }}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          what_youll_need: [...(formData.what_youll_need || []), '']
                        })
                      }}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                    >
                      + Agregar item
                    </button>
                  </div>
                </div>

                {/* Key Concepts */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Conceptos clave (Key Concepts)
                  </label>
                  <p className="text-xs text-gray-400 mb-3">
                    Tecnologías o servicios principales del curso (ej: Lambda, EC2, etc.)
                  </p>
                  <div className="space-y-2">
                    {formData.key_concepts?.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.emoji}
                          onChange={(e) => {
                            const newList = [...(formData.key_concepts || [])]
                            newList[index] = { ...newList[index], emoji: e.target.value }
                            setFormData({ ...formData, key_concepts: newList })
                          }}
                          placeholder="⚡"
                          maxLength={2}
                          className="w-16 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-center text-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const newList = [...(formData.key_concepts || [])]
                            newList[index] = { ...newList[index], name: e.target.value }
                            setFormData({ ...formData, key_concepts: newList })
                          }}
                          placeholder="Lambda"
                          className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newList = formData.key_concepts?.filter((_, i) => i !== index) || []
                            setFormData({ ...formData, key_concepts: newList })
                          }}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          key_concepts: [...(formData.key_concepts || []), { emoji: '', name: '' }]
                        })
                      }}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                    >
                      + Agregar concepto
                    </button>
                  </div>
                </div>

                {/* Sección: Campos Opcionales para Páginas de Categoría */}
                <div className="md:col-span-2 mt-6 pt-6 border-t border-slate-700">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                    <span>🎨</span>
                    <span>Campos Opcionales (Páginas de Categoría)</span>
                  </h3>
                  <p className="text-sm text-gray-400 mb-6">
                    Estos campos mejoran la presentación en páginas como /rag-bedrock. Si se dejan vacíos, se usan valores por defecto de la categoría.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Icon */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Icono (Emoji o URL)
                      </label>
                      <input
                        type="text"
                        value={formData.icon || ''}
                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                        placeholder="🤖 o https://..."
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Emoji o URL de imagen. Si vacío, usa emoji de la categoría.
                      </p>
                    </div>

                    {/* Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Tipo de Curso
                      </label>
                      <input
                        type="text"
                        value={formData.type || ''}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        placeholder="AI/ML, Security, Networking..."
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Categoría secundaria para filtros adicionales
                      </p>
                    </div>

                    {/* Featured */}
                    <div>
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.featured || false}
                          onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                          className="w-5 h-5 bg-slate-900 border-slate-700 rounded text-green-500 focus:ring-2 focus:ring-green-500"
                        />
                        <span className="text-sm font-medium text-gray-300">
                          ⭐ Curso Destacado
                        </span>
                      </label>
                      <p className="mt-1 text-xs text-gray-500 ml-8">
                        Aparece en hero section de página de categoría
                      </p>
                    </div>

                    {/* Color Gradient */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Color de Gradiente
                      </label>
                      <select
                        value={formData.color || ''}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="">Default (por categoría)</option>
                        <option value="from-purple-500 to-blue-600">Purple → Blue</option>
                        <option value="from-red-500 to-orange-600">Red → Orange</option>
                        <option value="from-green-500 to-teal-600">Green → Teal</option>
                        <option value="from-blue-500 to-cyan-600">Blue → Cyan</option>
                        <option value="from-yellow-500 to-orange-600">Yellow → Orange</option>
                        <option value="from-indigo-500 to-purple-600">Indigo → Purple</option>
                      </select>
                    </div>

                    {/* Rating */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Rating (0-5)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={formData.rating || ''}
                        onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || undefined })}
                        placeholder="4.8"
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Rating visual del curso (independiente de reviews reales)
                      </p>
                    </div>

                    {/* Student Count */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Cantidad de Estudiantes
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.student_count || ''}
                        onChange={(e) => setFormData({ ...formData, student_count: parseInt(e.target.value) || undefined })}
                        placeholder="892"
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Contador de estudiantes (manual o calculado)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Descripción *
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    placeholder="Descripción completa del curso..."
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex items-center space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                  >
                    {loading ? 'Guardando...' : (editingCourse ? 'Actualizar Curso' : 'Crear Curso')}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Courses Table */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h2 className="text-xl font-bold text-white">
              Cursos ({courses.length})
            </h2>
          </div>

          {loading && courses.length === 0 ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
            </div>
          ) : courses.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No hay cursos creados. Crea el primer curso usando el botón de arriba.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Curso
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Dificultad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Secciones
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Curso Estrella
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {courses.map((course) => (
                    <tr key={course.course_id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {course.course_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {course.course_id}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded-full">
                          {getCategoryDisplay(course.category).emoji} {getCategoryDisplay(course.category).label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          course.difficulty === 'Beginner' ? 'bg-green-500/20 text-green-300' :
                          course.difficulty === 'Intermediate' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>
                          {course.difficulty}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {course.total_sections}
                      </td>
                      <td className="px-6 py-4">
                        {course.is_published ? (
                          <span className="flex items-center space-x-1 text-xs text-green-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Publicado</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-1 text-xs text-gray-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span>Borrador</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => handleToggleFeatured(course)}
                            className={`relative inline-flex items-center justify-center w-6 h-6 rounded transition-all cursor-pointer ${
                              course.is_featured
                                ? 'text-yellow-400 hover:text-yellow-500 hover:bg-yellow-500/10'
                                : 'text-gray-600 hover:text-yellow-400 hover:bg-yellow-500/10'
                            }`}
                            title={course.is_featured ? 'Click para desmarcar como estrella' : 'Click para marcar como curso estrella'}
                          >
                            {course.is_featured ? (
                              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                              </svg>
                            ) : (
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => Router.push(`/admin-panel/courses/${course.course_id}/sections`)}
                            className="p-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-colors"
                            title="Editar Secciones"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => startEdit(course)}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(course.course_id)}
                            disabled={deletingCourse === course.course_id}
                            className={`p-2 rounded-lg transition-colors ${
                              deletingCourse === course.course_id
                                ? 'text-gray-500 bg-red-500/10 cursor-not-allowed'
                                : deleteConfirm === course.course_id
                                ? 'text-red-300 bg-red-500/20 animate-pulse'
                                : 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                            }`}
                            title={
                              deletingCourse === course.course_id
                                ? 'Eliminando...'
                                : deleteConfirm === course.course_id
                                ? 'Click nuevamente para confirmar'
                                : 'Eliminar'
                            }
                          >
                            {deletingCourse === course.course_id ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default AdminPanel
