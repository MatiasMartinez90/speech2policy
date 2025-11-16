import { useEditor, EditorContent, Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle, Color } from '@tiptap/extension-text-style'
import { useCallback, useState, useImperativeHandle, forwardRef, memo } from 'react'

// Initialize lowlight with common languages
const lowlight = createLowlight(common)

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  onImageInsert?: () => void
}

export interface RichTextEditorRef {
  insertImage: (url: string) => void
}

const MenuBar = ({ editor, onImageInsert }: { editor: Editor | null; onImageInsert?: () => void }) => {
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [showTextColorPicker, setShowTextColorPicker] = useState(false)
  const [showHighlightColorPicker, setShowHighlightColorPicker] = useState(false)
  const [imageWidth, setImageWidth] = useState('')
  const [imageHeight, setImageHeight] = useState('')

  if (!editor) {
    return null
  }

  // Color presets
  const textColors = [
    { name: 'Blanco', value: '#ffffff' },
    { name: 'Gris', value: '#94a3b8' },
    { name: 'Rojo', value: '#ef4444' },
    { name: 'Naranja', value: '#f97316' },
    { name: 'Amarillo', value: '#eab308' },
    { name: 'Verde', value: '#22c55e' },
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Morado', value: '#a855f7' },
    { name: 'Rosa', value: '#ec4899' },
  ]

  const highlightColors = [
    { name: 'Amarillo', value: '#fef08a' },
    { name: 'Verde', value: '#bbf7d0' },
    { name: 'Azul', value: '#bfdbfe' },
    { name: 'Rojo', value: '#fecaca' },
    { name: 'Naranja', value: '#fed7aa' },
    { name: 'Morado', value: '#e9d5ff' },
    { name: 'Rosa', value: '#fbcfe8' },
  ]

  const setLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run()
      setLinkUrl('')
      setShowLinkInput(false)
    }
  }

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  return (
    <div className="border-b border-slate-700 p-2 bg-slate-900/50">
      <div className="flex flex-wrap gap-1 mb-2">
        {/* Headings */}
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            editor.isActive('heading', { level: 1 })
              ? 'bg-green-500 text-white'
              : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
          }`}
          type="button"
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-green-500 text-white'
              : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
          }`}
          type="button"
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-green-500 text-white'
              : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
          }`}
          type="button"
        >
          H3
        </button>

        <div className="w-px h-6 bg-slate-700 mx-1" />

        {/* Text formatting */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1.5 rounded text-sm font-bold transition-colors ${
            editor.isActive('bold')
              ? 'bg-green-500 text-white'
              : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
          }`}
          type="button"
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1.5 rounded text-sm italic transition-colors ${
            editor.isActive('italic')
              ? 'bg-green-500 text-white'
              : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
          }`}
          type="button"
        >
          I
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`px-3 py-1.5 rounded text-sm line-through transition-colors ${
            editor.isActive('strike')
              ? 'bg-green-500 text-white'
              : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
          }`}
          type="button"
        >
          S
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`px-3 py-1.5 rounded text-sm underline transition-colors ${
            editor.isActive('underline')
              ? 'bg-green-500 text-white'
              : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
          }`}
          type="button"
          title="Subrayado"
        >
          U
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`px-3 py-1.5 rounded text-sm font-mono transition-colors ${
            editor.isActive('code')
              ? 'bg-green-500 text-white'
              : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
          }`}
          type="button"
          title="Código inline"
        >
          {'</>'}
        </button>
        <button
          onClick={() => setShowHighlightColorPicker(!showHighlightColorPicker)}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            editor.isActive('highlight') || showHighlightColorPicker
              ? 'bg-yellow-500 text-black'
              : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
          }`}
          type="button"
          title="Resaltar texto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        </button>

        {/* Text Color */}
        <button
          onClick={() => setShowTextColorPicker(!showTextColorPicker)}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            showTextColorPicker
              ? 'bg-blue-500 text-white'
              : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
          }`}
          type="button"
          title="Color de texto"
        >
          A
        </button>

        <div className="w-px h-6 bg-slate-700 mx-1" />

        {/* Lists */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            editor.isActive('bulletList')
              ? 'bg-green-500 text-white'
              : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
          }`}
          type="button"
          title="Lista con viñetas"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            editor.isActive('orderedList')
              ? 'bg-green-500 text-white'
              : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
          }`}
          type="button"
          title="Lista numerada"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M3 12h18M3 20h18" />
          </svg>
        </button>

        <div className="w-px h-6 bg-slate-700 mx-1" />

        {/* Text Alignment */}
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            editor.isActive({ textAlign: 'left' })
              ? 'bg-green-500 text-white'
              : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
          }`}
          type="button"
          title="Alinear a la izquierda"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8M4 18h12" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            editor.isActive({ textAlign: 'center' })
              ? 'bg-green-500 text-white'
              : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
          }`}
          type="button"
          title="Centrar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M8 12h8M6 18h12" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            editor.isActive({ textAlign: 'right' })
              ? 'bg-green-500 text-white'
              : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
          }`}
          type="button"
          title="Alinear a la derecha"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M12 12h8M8 18h12" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            editor.isActive({ textAlign: 'justify' })
              ? 'bg-green-500 text-white'
              : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
          }`}
          type="button"
          title="Justificar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="w-px h-6 bg-slate-700 mx-1" />

        {/* Link */}
        <button
          onClick={() => {
            if (editor.isActive('link')) {
              editor.chain().focus().unsetLink().run()
            } else {
              setShowLinkInput(!showLinkInput)
            }
          }}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            editor.isActive('link')
              ? 'bg-green-500 text-white'
              : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
          }`}
          type="button"
          title={editor.isActive('link') ? 'Quitar link' : 'Insertar link'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>

        {/* Table */}
        <button
          onClick={insertTable}
          className="px-3 py-1.5 rounded text-sm bg-slate-800 text-gray-300 hover:bg-slate-700 transition-colors"
          type="button"
          title="Insertar tabla (3x3)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>

        {/* Table actions (only show when in table) */}
        {editor.isActive('table') && (
          <>
            <button
              onClick={() => editor.chain().focus().addRowBefore().run()}
              className="px-2 py-1.5 rounded text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              type="button"
              title="Agregar fila arriba"
            >
              +↑
            </button>
            <button
              onClick={() => editor.chain().focus().addRowAfter().run()}
              className="px-2 py-1.5 rounded text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              type="button"
              title="Agregar fila abajo"
            >
              +↓
            </button>
            <button
              onClick={() => editor.chain().focus().addColumnBefore().run()}
              className="px-2 py-1.5 rounded text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              type="button"
              title="Agregar columna izquierda"
            >
              +←
            </button>
            <button
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              className="px-2 py-1.5 rounded text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              type="button"
              title="Agregar columna derecha"
            >
              +→
            </button>
            <button
              onClick={() => editor.chain().focus().deleteTable().run()}
              className="px-2 py-1.5 rounded text-xs bg-red-600 text-white hover:bg-red-700 transition-colors"
              type="button"
              title="Eliminar tabla"
            >
              ✕
            </button>
          </>
        )}

        <div className="w-px h-6 bg-slate-700 mx-1" />

        {/* Code block */}
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            editor.isActive('codeBlock')
              ? 'bg-green-500 text-white'
              : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
          }`}
          type="button"
          title="Bloque de código"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </button>

        {/* Blockquote */}
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            editor.isActive('blockquote')
              ? 'bg-green-500 text-white'
              : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
          }`}
          type="button"
          title="Cita"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>

        <div className="w-px h-6 bg-slate-700 mx-1" />

        {/* Image - Upload */}
        {onImageInsert && (
          <button
            onClick={onImageInsert}
            className="px-3 py-1.5 rounded text-sm bg-slate-800 text-gray-300 hover:bg-slate-700 transition-colors"
            type="button"
            title="Insertar imagen"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
        )}

        {/* Image Alignment - Show when image is selected */}
        {editor.isActive('image') && (
          <>
            <div className="w-px h-6 bg-slate-700 mx-1" />
            <span className="text-xs text-gray-500 px-2">Alinear:</span>
            <button
              onClick={() => editor.chain().focus().updateAttributes('image', { 'data-align': 'left' }).run()}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                editor.getAttributes('image')['data-align'] === 'left'
                  ? 'bg-purple-500 text-white'
                  : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
              }`}
              type="button"
              title="Alinear imagen a la izquierda"
            >
              ←
            </button>
            <button
              onClick={() => editor.chain().focus().updateAttributes('image', { 'data-align': 'center' }).run()}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                editor.getAttributes('image')['data-align'] === 'center'
                  ? 'bg-purple-500 text-white'
                  : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
              }`}
              type="button"
              title="Centrar imagen"
            >
              ↔
            </button>
            <button
              onClick={() => editor.chain().focus().updateAttributes('image', { 'data-align': 'right' }).run()}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                editor.getAttributes('image')['data-align'] === 'right'
                  ? 'bg-purple-500 text-white'
                  : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
              }`}
              type="button"
              title="Alinear imagen a la derecha"
            >
              →
            </button>
            <div className="w-px h-6 bg-slate-700 mx-1" />
            <span className="text-xs text-gray-500 px-2">Tamaño:</span>
            <input
              type="text"
              value={imageWidth}
              onChange={(e) => setImageWidth(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const value = imageWidth.trim()
                  editor.chain().focus().updateAttributes('image', {
                    width: value || null
                  }).run()
                }
              }}
              onBlur={() => {
                const value = imageWidth.trim()
                editor.chain().focus().updateAttributes('image', {
                  width: value || null
                }).run()
              }}
              placeholder="Ancho (ej: 500px)"
              className="w-32 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-xs focus:ring-2 focus:ring-purple-500"
            />
            <input
              type="text"
              value={imageHeight}
              onChange={(e) => setImageHeight(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const value = imageHeight.trim()
                  editor.chain().focus().updateAttributes('image', {
                    height: value || null
                  }).run()
                }
              }}
              onBlur={() => {
                const value = imageHeight.trim()
                editor.chain().focus().updateAttributes('image', {
                  height: value || null
                }).run()
              }}
              placeholder="Alto (ej: 300px)"
              className="w-32 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white text-xs focus:ring-2 focus:ring-purple-500"
            />
          </>
        )}

        <div className="flex-1" />

        {/* Undo/Redo */}
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="px-3 py-1.5 rounded text-sm bg-slate-800 text-gray-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          type="button"
          title="Deshacer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="px-3 py-1.5 rounded text-sm bg-slate-800 text-gray-300 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          type="button"
          title="Rehacer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6-6m6 6l-6 6" />
          </svg>
        </button>
      </div>

      {/* Link input */}
      {showLinkInput && (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                setLink()
              }
            }}
            placeholder="https://ejemplo.com"
            className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={setLink}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
            type="button"
          >
            Agregar
          </button>
          <button
            onClick={() => {
              setShowLinkInput(false)
              setLinkUrl('')
            }}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 rounded text-sm transition-colors"
            type="button"
          >
            Cancelar
          </button>
        </div>
      )}


      {/* Text Color Picker */}
      {showTextColorPicker && (
        <div className="mt-2 p-3 bg-slate-800 rounded-lg border border-slate-700">
          <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Color de Texto</div>
          <div className="flex flex-wrap gap-2">
            {textColors.map((color) => (
              <button
                key={color.value}
                onClick={() => {
                  editor.chain().focus().setColor(color.value).run()
                }}
                className="w-8 h-8 rounded border-2 border-slate-700 hover:border-white transition-colors"
                style={{ backgroundColor: color.value }}
                title={color.name}
                type="button"
              />
            ))}
            <button
              onClick={() => {
                editor.chain().focus().unsetColor().run()
                setShowTextColorPicker(false)
              }}
              className="w-8 h-8 rounded border-2 border-slate-700 hover:border-white bg-slate-900 text-gray-400 text-xs flex items-center justify-center"
              title="Quitar color"
              type="button"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Highlight Color Picker */}
      {showHighlightColorPicker && (
        <div className="mt-2 p-3 bg-slate-800 rounded-lg border border-slate-700">
          <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Color de Resaltado</div>
          <div className="flex flex-wrap gap-2">
            {highlightColors.map((color) => (
              <button
                key={color.value}
                onClick={() => {
                  editor.chain().focus().toggleHighlight({ color: color.value }).run()
                }}
                className="w-8 h-8 rounded border-2 border-slate-700 hover:border-white transition-colors"
                style={{ backgroundColor: color.value }}
                title={color.name}
                type="button"
              />
            ))}
            <button
              onClick={() => {
                editor.chain().focus().unsetHighlight().run()
                setShowHighlightColorPicker(false)
              }}
              className="w-8 h-8 rounded border-2 border-slate-700 hover:border-white bg-slate-900 text-gray-400 text-xs flex items-center justify-center"
              title="Quitar resaltado"
              type="button"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ content, onChange, placeholder, onImageInsert }, ref) => {
    const [showPreview, setShowPreview] = useState(false)

    const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable default codeBlock to use CodeBlockLowlight instead
        codeBlock: false,
        // Configure heading levels
        heading: {
          levels: [1, 2, 3],
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'bg-slate-950 rounded-lg p-4 text-sm font-mono overflow-x-auto',
        },
      }),
      Image.extend({
        addAttributes() {
          const parentAttributes = (this as any).parent ? (this as any).parent() : {}

          return {
            ...parentAttributes,
            'data-align': {
              default: 'left',
              parseHTML: (element: HTMLElement) => element.getAttribute('data-align') || 'left',
              renderHTML: (attributes: Record<string, any>) => {
                if (!attributes['data-align']) return {}
                return { 'data-align': attributes['data-align'] }
              },
            },
            width: {
              default: null,
              parseHTML: (element: HTMLElement) => element.getAttribute('width'),
              renderHTML: (attributes: Record<string, any>) => {
                if (!attributes.width) return {}
                return { width: attributes.width }
              },
            },
            height: {
              default: null,
              parseHTML: (element: HTMLElement) => element.getAttribute('height'),
              renderHTML: (attributes: Record<string, any>) => {
                if (!attributes.height) return {}
                return { height: attributes.height }
              },
            },
          }
        },
      }).configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-lg my-2',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-400 underline hover:text-blue-300',
        },
      }),
      Underline,
      // Configure Highlight to support multiple colors
      Highlight.configure({
        multicolor: true,
      }),
      // Add TextStyle as base for Color extension
      TextStyle,
      // Add Color extension for text color
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph', 'image'],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({
        placeholder: placeholder || 'Escribe el contenido de la sección aquí...',
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
  })

  const insertImage = useCallback((url: string) => {
    if (editor) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  // Expose insertImage method via ref
  useImperativeHandle(ref, () => ({
    insertImage,
  }), [insertImage])

  return (
    <div className="space-y-2">
      {/* Preview toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowPreview(false)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              !showPreview
                ? 'bg-green-500 text-white'
                : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
            }`}
            type="button"
          >
            Editor
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              showPreview
                ? 'bg-green-500 text-white'
                : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
            }`}
            type="button"
          >
            Preview
          </button>
        </div>
        <span className="text-xs text-gray-500">
          {showPreview ? 'Vista previa del contenido' : 'Modo edición'}
        </span>
      </div>

      {/* Editor or Preview */}
      <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-900/50">
        {showPreview ? (
          <div className="p-4 min-h-[300px]">
            <div
              className="ProseMirror prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: editor?.getHTML() || '<p class="text-gray-500">No hay contenido para mostrar</p>' }}
            />
          </div>
        ) : (
          <>
            <MenuBar editor={editor} onImageInsert={onImageInsert} />
            <EditorContent editor={editor} className="text-gray-200" />
          </>
        )}
      </div>
    </div>
  )
})

RichTextEditor.displayName = 'RichTextEditor'

// Memoize to prevent re-renders when parent re-renders
const MemoizedRichTextEditor = memo(RichTextEditor)
MemoizedRichTextEditor.displayName = 'RichTextEditor'

export default MemoizedRichTextEditor
