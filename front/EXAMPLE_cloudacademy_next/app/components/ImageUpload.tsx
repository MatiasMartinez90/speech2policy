import { useState, useRef, DragEvent, memo } from 'react'
import Image from 'next/image'
import { useImageUpload } from '../hooks/useImageUpload'

interface ImageUploadProps {
  courseId: string
  onImageUploaded?: (url: string) => void
  maxFiles?: number
}

function ImageUpload({ courseId, onImageUploaded, maxFiles = 10 }: ImageUploadProps) {
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploading, progress, error, uploadImage } = useImageUpload(courseId)

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    await handleFiles(files)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      await handleFiles(files)
    }
  }

  const handleFiles = async (files: File[]) => {
    if (uploadedImages.length + files.length > maxFiles) {
      alert(`Solo puedes subir un máximo de ${maxFiles} imágenes`)
      return
    }

    for (const file of files) {
      const url = await uploadImage(file)
      if (url) {
        setUploadedImages(prev => [...prev, url])
        if (onImageUploaded) {
          onImageUploaded(url)
        }
      }
    }
  }

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index))
  }

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      alert('URL copiada al portapapeles')
    } catch (err) {
      console.error('Error copying to clipboard:', err)
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-green-500 bg-green-500/10'
            : uploading
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-slate-700 hover:border-slate-600 bg-slate-900/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="space-y-3">
          <div className="flex justify-center">
            <svg className={`w-12 h-12 ${uploading ? 'text-blue-400 animate-pulse' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>

          {uploading ? (
            <div className="space-y-2">
              <p className="text-blue-400 font-medium">Subiendo imagen...</p>
              <div className="w-full bg-slate-800 rounded-full h-2.5">
                <div
                  className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-400">{progress}%</p>
            </div>
          ) : (
            <>
              <p className="text-gray-300">
                <span className="font-medium text-green-400">Click para seleccionar</span> o arrastra imágenes aquí
              </p>
              <p className="text-sm text-gray-500">
                PNG, JPG, GIF o WEBP (máx. 5MB)
              </p>
              <p className="text-xs text-gray-600">
                {uploadedImages.length}/{maxFiles} imágenes subidas
              </p>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Uploaded Images Gallery */}
      {uploadedImages.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-300">Imágenes Subidas</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {uploadedImages.map((url, index) => (
              <div key={index} className="relative group h-32">
                <Image
                  src={url}
                  alt={`Uploaded ${index + 1}`}
                  fill
                  className="object-cover rounded-lg border border-slate-700"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
                  <button
                    onClick={() => copyToClipboard(url)}
                    className="p-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white transition-colors"
                    title="Copiar URL"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                  <button
                    onClick={() => removeImage(index)}
                    className="p-2 bg-red-500 hover:bg-red-600 rounded-lg text-white transition-colors"
                    title="Eliminar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Memoize to prevent re-renders during uploads
export default memo(ImageUpload)
