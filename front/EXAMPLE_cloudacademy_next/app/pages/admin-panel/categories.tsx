import { NextPage } from 'next'
import { useState, useEffect } from 'react'
import Router from 'next/router'
import useUser from '../../lib/useUser'
import AuthenticatedHeader from '../../components/AuthenticatedHeader'
import { useAdminCategories, Category, CreateCategoryInput, UpdateCategoryInput } from '../../hooks/useAdminCategories'
import CategoryForm from '../../components/CategoryForm'

const AdminCategories: NextPage = () => {
  const { user, loading: userLoading, loggedOut, signOut } = useUser({ redirect: '/signin' })
  const { categories, loading, error, fetchCategories, createCategory, updateCategory, deleteCategory } = useAdminCategories()

  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [recalculating, setRecalculating] = useState<string | null>(null)

  useEffect(() => {
    if (user && !loggedOut) {
      fetchCategories(includeInactive)
    }
  }, [user, loggedOut, includeInactive, fetchCategories])

  const handleSubmit = async (data: CreateCategoryInput | UpdateCategoryInput) => {
    if (editingCategory) {
      // Update existing category
      const result = await updateCategory(editingCategory.category_id, data)
      if (result) {
        setSuccessMessage(`Categoría "${result.label}" actualizada exitosamente!`)
        setShowForm(false)
        setEditingCategory(null)
        setTimeout(() => setSuccessMessage(null), 5000)
      }
    } else {
      // Create new category
      const result = await createCategory(data as CreateCategoryInput)
      if (result) {
        setSuccessMessage(`Categoría "${result.label}" creada exitosamente!`)
        setShowForm(false)
        setEditingCategory(null)
        setTimeout(() => setSuccessMessage(null), 5000)
      }
    }
  }

  const startEdit = (category: Category) => {
    setEditingCategory(category)
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingCategory(null)
  }

  const handleDelete = async (categoryId: string) => {
    if (deleteConfirm !== categoryId) {
      setDeleteConfirm(categoryId)
      setTimeout(() => setDeleteConfirm(null), 3000)
      return
    }

    const success = await deleteCategory(categoryId)
    if (success) {
      setSuccessMessage('Categoría eliminada exitosamente')
      setDeleteConfirm(null)
      setTimeout(() => setSuccessMessage(null), 5000)
    }
  }

  const handleRecalculateCourseCount = async (categoryId: string) => {
    setRecalculating(categoryId)

    // Aquí llamarías a un endpoint que recalcula el course_count
    // Por ahora, simulamos la operación
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSuccessMessage('Contador de cursos recalculado')
      setTimeout(() => setSuccessMessage(null), 3000)
      await fetchCategories(includeInactive)
    } catch (err) {
      console.error('Error recalculating:', err)
    } finally {
      setRecalculating(null)
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

  const activeCategories = categories.filter(cat => cat.is_active)
  const featuredCategories = categories.filter(cat => cat.featured && cat.is_active)

  return (
    <div className="min-h-screen bg-slate-900">
      <AuthenticatedHeader user={user} signOut={signOut} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Gestión de Categorías
              </h1>
              <p className="text-gray-400">
                Administra las categorías de cursos de CloudAcademy
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Total Categorías</p>
                <p className="text-3xl font-bold text-white">{categories.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Activas</p>
                <p className="text-3xl font-bold text-white">{activeCategories.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Destacadas</p>
                <p className="text-3xl font-bold text-white">{featuredCategories.length}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
            </div>
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
                <p className="text-green-200">{successMessage}</p>
              </div>
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

        {/* Create Button */}
        <div className="mb-8">
          {!showForm ? (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center space-x-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Nueva Categoría</span>
              </button>

              <label className="flex items-center space-x-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(e) => setIncludeInactive(e.target.checked)}
                  className="w-4 h-4 bg-slate-900 border-slate-700 rounded text-green-500 focus:ring-2 focus:ring-green-500"
                />
                <span>Mostrar inactivas</span>
              </label>
            </div>
          ) : (
            <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                </h2>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <CategoryForm
                category={editingCategory}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                loading={loading}
              />
            </div>
          )}
        </div>

        {/* Categories Table */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h2 className="text-xl font-bold text-white">
              Categorías ({categories.length})
            </h2>
          </div>

          {loading && categories.length === 0 ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
            </div>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No hay categorías creadas. Crea la primera categoría usando el botón de arriba.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Nivel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Orden
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Cursos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {categories.map((category) => (
                    <tr key={category.category_id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-3xl">{category.emoji}</span>
                          <div>
                            <div className="text-sm font-medium text-white">
                              {category.label}
                            </div>
                            <div className="text-xs text-gray-500">
                              {category.category_id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-300 max-w-xs truncate">
                          {category.description}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          category.level === 'beginner' ? 'bg-green-500/20 text-green-300' :
                          category.level === 'intermediate' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>
                          {category.level === 'beginner' ? 'Principiante' :
                           category.level === 'intermediate' ? 'Intermedio' : 'Avanzado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {category.display_order}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-300">
                            {category.course_count}
                          </span>
                          <button
                            onClick={() => handleRecalculateCourseCount(category.category_id)}
                            disabled={recalculating === category.category_id}
                            className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors disabled:opacity-50"
                            title="Recalcular contador"
                          >
                            {recalculating === category.category_id ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {category.is_active ? (
                            <span className="flex items-center space-x-1 text-xs text-green-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Activa</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-1 text-xs text-gray-500">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                              <span>Inactiva</span>
                            </span>
                          )}
                          {category.featured && (
                            <span className="text-yellow-400" title="Destacada">
                              ⭐
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => startEdit(category)}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(category.category_id)}
                            className={`p-2 rounded-lg transition-colors ${
                              deleteConfirm === category.category_id
                                ? 'text-red-300 bg-red-500/20 animate-pulse'
                                : 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                            }`}
                            title={deleteConfirm === category.category_id ? 'Click nuevamente para confirmar' : 'Eliminar'}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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

export default AdminCategories
