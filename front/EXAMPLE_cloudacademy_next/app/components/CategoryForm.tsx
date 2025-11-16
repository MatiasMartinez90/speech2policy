import { useState, useEffect } from 'react'
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../hooks/useAdminCategories'

interface CategoryFormProps {
  category?: Category | null
  onSubmit: (data: CreateCategoryInput | UpdateCategoryInput) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Principiante', color: 'bg-green-500' },
  { value: 'intermediate', label: 'Intermedio', color: 'bg-yellow-500' },
  { value: 'advanced', label: 'Avanzado', color: 'bg-red-500' },
]

const TAILWIND_COLORS = [
  'from-blue-500 to-cyan-600',
  'from-purple-500 to-pink-600',
  'from-green-500 to-emerald-600',
  'from-orange-500 to-red-600',
  'from-indigo-500 to-purple-600',
  'from-pink-500 to-rose-600',
  'from-yellow-500 to-orange-600',
  'from-teal-500 to-cyan-600',
  'from-red-500 to-pink-600',
  'from-slate-500 to-gray-600',
]

export default function CategoryForm({ category, onSubmit, onCancel, loading = false }: CategoryFormProps) {
  const [formData, setFormData] = useState({
    label: '',
    emoji: '',
    color: TAILWIND_COLORS[0],
    description: '',
    architecture: '[]',
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    display_order: 999,
    featured: false,
    course_count: 0,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Populate form if editing
  useEffect(() => {
    if (category) {
      setFormData({
        label: category.label,
        emoji: category.emoji,
        color: category.color,
        description: category.description,
        architecture: JSON.stringify(category.architecture || [], null, 2),
        level: category.level,
        display_order: category.display_order,
        featured: category.featured,
        course_count: category.course_count,
      })
    }
  }, [category])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.label.trim()) {
      newErrors.label = 'El nombre de la categoría es requerido'
    }

    if (!formData.emoji.trim()) {
      newErrors.emoji = 'El emoji es requerido'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es requerida'
    }

    // Validate JSON architecture
    if (formData.architecture.trim()) {
      try {
        JSON.parse(formData.architecture)
      } catch (e) {
        newErrors.architecture = 'JSON inválido'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // Parse architecture JSON
    let architectureArray = []
    try {
      architectureArray = JSON.parse(formData.architecture || '[]')
    } catch (e) {
      console.error('Failed to parse architecture:', e)
    }

    const submitData = {
      label: formData.label.trim(),
      emoji: formData.emoji.trim(),
      color: formData.color,
      description: formData.description.trim(),
      architecture: architectureArray,
      level: formData.level,
      display_order: formData.display_order,
      featured: formData.featured,
      course_count: formData.course_count,
    }

    await onSubmit(submitData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Label & Emoji */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Nombre de la Categoría *
          </label>
          <input
            type="text"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            className={`w-full px-4 py-2 bg-gray-800 border ${
              errors.label ? 'border-red-500' : 'border-gray-700'
            } rounded-lg text-white focus:outline-none focus:border-blue-500`}
            placeholder="ej: Amazon Bedrock"
            disabled={loading}
          />
          {errors.label && (
            <p className="mt-1 text-sm text-red-500">{errors.label}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Emoji *
          </label>
          <input
            type="text"
            value={formData.emoji}
            onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
            className={`w-full px-4 py-2 bg-gray-800 border ${
              errors.emoji ? 'border-red-500' : 'border-gray-700'
            } rounded-lg text-white text-2xl text-center focus:outline-none focus:border-blue-500`}
            placeholder="🤖"
            maxLength={2}
            disabled={loading}
          />
          {errors.emoji && (
            <p className="mt-1 text-sm text-red-500">{errors.emoji}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">Usa un emoji único</p>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Descripción *
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className={`w-full px-4 py-2 bg-gray-800 border ${
            errors.description ? 'border-red-500' : 'border-gray-700'
          } rounded-lg text-white focus:outline-none focus:border-blue-500`}
          rows={3}
          placeholder="Descripción breve de la categoría..."
          disabled={loading}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-500">{errors.description}</p>
        )}
      </div>

      {/* Color Gradient */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Color del Gradiente
        </label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {TAILWIND_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setFormData({ ...formData, color })}
              className={`h-12 rounded-lg bg-gradient-to-r ${color} ${
                formData.color === color
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900'
                  : ''
              }`}
              disabled={loading}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Seleccionado: <span className={`font-mono`}>{formData.color}</span>
        </p>
      </div>

      {/* Level & Display Order */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Nivel de Dificultad
          </label>
          <select
            value={formData.level}
            onChange={(e) =>
              setFormData({
                ...formData,
                level: e.target.value as 'beginner' | 'intermediate' | 'advanced',
              })
            }
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            disabled={loading}
          >
            {DIFFICULTY_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Orden de Visualización
          </label>
          <input
            type="number"
            value={formData.display_order}
            onChange={(e) =>
              setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })
            }
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            min={0}
            disabled={loading}
          />
          <p className="mt-1 text-xs text-gray-500">
            Menor número = aparece primero
          </p>
        </div>
      </div>

      {/* Course Count */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Número de Cursos
        </label>
        <input
          type="number"
          value={formData.course_count}
          onChange={(e) =>
            setFormData({ ...formData, course_count: parseInt(e.target.value) || 0 })
          }
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
          min={0}
          disabled={loading}
        />
        <p className="mt-1 text-xs text-gray-500">
          Actualiza manualmente o usa el botón &ldquo;Recalcular&rdquo; en la tabla
        </p>
      </div>

      {/* Architecture JSON */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Arquitectura (JSON)
        </label>
        <textarea
          value={formData.architecture}
          onChange={(e) => setFormData({ ...formData, architecture: e.target.value })}
          className={`w-full px-4 py-2 bg-gray-800 border ${
            errors.architecture ? 'border-red-500' : 'border-gray-700'
          } rounded-lg text-white font-mono text-sm focus:outline-none focus:border-blue-500`}
          rows={6}
          placeholder='[{"icon": "🤖", "title": "RAG System"}]'
          disabled={loading}
        />
        {errors.architecture && (
          <p className="mt-1 text-sm text-red-500">{errors.architecture}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Array JSON con componentes de arquitectura. Ejemplo: [{'{'}
          &ldquo;icon&rdquo;: &ldquo;🤖&rdquo;, &ldquo;title&rdquo;: &ldquo;Sistema RAG&rdquo;{'}'}]
        </p>
      </div>

      {/* Featured */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="featured"
          checked={formData.featured}
          onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
          className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-700 rounded focus:ring-blue-500"
          disabled={loading}
        />
        <label htmlFor="featured" className="ml-2 text-sm font-medium text-gray-300">
          Categoría destacada (aparece en home)
        </label>
      </div>

      {/* Buttons */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className={`flex-1 px-6 py-3 ${
            loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          } text-white rounded-lg font-medium transition-colors`}
        >
          {loading ? 'Guardando...' : category ? 'Actualizar Categoría' : 'Crear Categoría'}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
