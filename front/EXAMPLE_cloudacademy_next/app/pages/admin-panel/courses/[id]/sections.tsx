import { NextPage } from 'next'
import { useState, useEffect, useRef, useCallback } from 'react'
import Router, { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import useUser from '../../../../lib/useUser'
import AuthenticatedHeader from '../../../../components/AuthenticatedHeader'
import { useSections, Section, CreateSectionInput } from '../../../../hooks/useSections'

// Lazy load heavy components for better initial load performance
const RichTextEditor = dynamic(() => import('../../../../components/RichTextEditor'), {
  loading: () => (
    <div className="w-full h-64 bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto mb-2"></div>
        <p className="text-sm text-gray-400">Cargando editor...</p>
      </div>
    </div>
  ),
  ssr: false // Editor doesn't work on SSR
})

const ImageUpload = dynamic(() => import('../../../../components/ImageUpload'), {
  loading: () => (
    <div className="w-full p-8 bg-slate-900 border border-slate-700 rounded-lg text-center">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-400 mx-auto mb-2"></div>
      <p className="text-sm text-gray-400">Cargando gestor de imágenes...</p>
    </div>
  ),
  ssr: false
})

// Lazy load DnD components to reduce initial bundle size (~50 KB savings)
const SortableSectionsList = dynamic(() => import('../../../../components/SortableSectionsList'), {
  loading: () => (
    <div className="p-8 text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto mb-2"></div>
      <p className="text-sm text-gray-400">Cargando lista de secciones...</p>
    </div>
  ),
  ssr: false
})

// Import only types, load actual DnD components dynamically
import type { DragEndEvent } from '@dnd-kit/core'
import type { RichTextEditorRef } from '../../../../components/RichTextEditor'
import { arrayMove } from '@dnd-kit/sortable'

const SectionsPage: NextPage = () => {
  const router = useRouter()
  const { id: courseId } = router.query
  const { user, loading: userLoading, loggedOut, signOut } = useUser({ redirect: '/signin' })
  const { sections, loading, error, fetchSections, createSection, updateSection, deleteSection, reorderSections } = useSections(courseId as string)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingSection, setEditingSection] = useState<Section | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  // Autosave state
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Editor ref for inserting images inline
  const editorRef = useRef<RichTextEditorRef>(null)

  // Form state
  const [formData, setFormData] = useState<CreateSectionInput>({
    title: '',
    content: '',
    order: 0,
    estimated_time: '',
    images: [],
    agent_config: {
      system_prompt: '',
      validation_criteria: {},
      hints: {
        level_1: '',
        level_2: '',
        level_3: '',
      },
    },
  })

  useEffect(() => {
    if (user && !loggedOut && courseId) {
      fetchSections()
    }
  }, [user, loggedOut, courseId, fetchSections])

  // Autosave effect - save every 30 seconds when editing
  const performAutosave = useCallback(async () => {
    if (!editingSection || !formData.title.trim()) return

    setIsSaving(true)
    try {
      await updateSection(editingSection.section_id, formData)
      setLastSaved(new Date())
    } catch (error) {
      console.error('Autosave failed:', error)
    } finally {
      setIsSaving(false)
    }
  }, [editingSection, formData, updateSection])

  useEffect(() => {
    // Clear existing timer
    if (autosaveTimerRef.current) {
      clearInterval(autosaveTimerRef.current)
    }

    // Only enable autosave when editing an existing section
    if (editingSection && showCreateForm) {
      // Autosave every 30 seconds
      autosaveTimerRef.current = setInterval(() => {
        performAutosave()
      }, 30000) // 30 seconds
    }

    // Cleanup on unmount
    return () => {
      if (autosaveTimerRef.current) {
        clearInterval(autosaveTimerRef.current)
      }
    }
  }, [editingSection, showCreateForm, performAutosave])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex(s => s.section_id === active.id)
      const newIndex = sections.findIndex(s => s.section_id === over.id)

      const reordered = arrayMove(sections, oldIndex, newIndex)
      const updates = reordered.map((section, index) => ({
        section_id: section.section_id,
        order: index,
      }))

      await reorderSections(updates)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      order: sections.length,
      estimated_time: '',
      images: [],
      agent_config: {
        system_prompt: '',
        validation_criteria: {},
        hints: {
          level_1: '',
          level_2: '',
          level_3: '',
        },
      },
    })
    setShowCreateForm(false)
    setEditingSection(null)
  }

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = await createSection(formData)
    if (result) {
      resetForm()
    }
  }

  const handleUpdateSection = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingSection) return

    const result = await updateSection(editingSection.section_id, formData)
    if (result) {
      resetForm()
    }
  }

  const startEdit = (section: Section) => {
    setEditingSection(section)
    setFormData({
      title: section.title,
      content: section.content,
      order: section.order,
      estimated_time: section.estimated_time || '',
      images: section.images || [],
      agent_config: section.agent_config || {
        system_prompt: '',
        validation_criteria: {},
        hints: {
          level_1: '',
          level_2: '',
          level_3: '',
        },
      },
    })
    setShowCreateForm(true)
  }

  const handleDelete = async (sectionId: number) => {
    if (deleteConfirm !== sectionId) {
      setDeleteConfirm(sectionId)
      setTimeout(() => setDeleteConfirm(null), 3000)
      return
    }

    const success = await deleteSection(sectionId)
    if (success) {
      setDeleteConfirm(null)
    }
  }

  const handleImageUploaded = (url: string) => {
    // Add to images array
    setFormData(prev => ({
      ...prev,
      images: [...(prev.images || []), url],
    }))

    // Insert image inline in editor where cursor is
    if (editorRef.current) {
      editorRef.current.insertImage(url)
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
                Gestión de Secciones
              </h1>
              <p className="text-gray-400">
                Edita el contenido de las secciones del curso
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => Router.push(`/admin-panel/courses/${courseId}/preview`)}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>Vista Previa</span>
              </button>
              <button
                onClick={() => Router.push('/admin-panel')}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Volver al Panel</span>
              </button>
            </div>
          </div>
        </div>

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
              onClick={() => {
                setFormData(prev => ({ ...prev, order: sections.length }))
                setShowCreateForm(true)
              }}
              className="flex items-center space-x-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Crear Nueva Sección</span>
            </button>
          ) : (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editingSection ? 'Editar Sección' : 'Crear Nueva Sección'}
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

              <form onSubmit={editingSection ? handleUpdateSection : handleCreateSection} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Título *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Introducción a Terraform"
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Orden
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Tiempo Estimado
                    </label>
                    <input
                      type="text"
                      value={formData.estimated_time}
                      onChange={(e) => setFormData({ ...formData, estimated_time: e.target.value })}
                      placeholder="30 minutos"
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Content Editor */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contenido *
                  </label>
                  <RichTextEditor
                    ref={editorRef}
                    content={formData.content}
                    onChange={(content) => setFormData({ ...formData, content })}
                    placeholder="Escribe el contenido de la sección aquí..."
                    onImageInsert={() => {
                      const imageSection = document.getElementById('image-upload-section')
                      imageSection?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }}
                  />
                </div>

                {/* Image Upload - Always visible */}
                {courseId && (
                  <div id="image-upload-section">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Imágenes
                    </label>
                    <ImageUpload
                      courseId={courseId as string}
                      onImageUploaded={handleImageUploaded}
                      maxFiles={10}
                    />
                  </div>
                )}

                {/* AI Agent Config - System Prompt */}
                <div className="border-t border-slate-700 pt-6">
                  <h3 className="text-lg font-medium text-white mb-4">Configuración del Agente IA</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      System Prompt
                    </label>
                    <textarea
                      value={formData.agent_config?.system_prompt}
                      onChange={(e) => setFormData({
                        ...formData,
                        agent_config: {
                          ...formData.agent_config!,
                          system_prompt: e.target.value
                        }
                      })}
                      rows={4}
                      placeholder="Eres un tutor experto en..."
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <p className="mt-2 text-xs text-gray-400">
                      Este prompt define el comportamiento del asistente de IA para esta sección específica.
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center space-x-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                    >
                      {loading ? 'Guardando...' : (editingSection ? 'Actualizar Sección' : 'Crear Sección')}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>

                  {/* Autosave Status Indicator */}
                  {editingSection && (
                    <div className="flex items-center space-x-2">
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                          <span className="text-sm text-blue-400">Guardando...</span>
                        </>
                      ) : lastSaved ? (
                        <>
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm text-gray-400">
                            Guardado automáticamente a las {lastSaved.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Sections List with Drag & Drop */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h2 className="text-xl font-bold text-white">
              Secciones ({sections.length})
            </h2>
          </div>

          {loading && sections.length === 0 ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
            </div>
          ) : sections.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No hay secciones creadas. Crea la primera sección usando el botón de arriba.
            </div>
          ) : (
            <SortableSectionsList
              sections={sections}
              onDragEnd={handleDragEnd}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
          )}
        </div>
      </main>
    </div>
  )
}

export default SectionsPage
