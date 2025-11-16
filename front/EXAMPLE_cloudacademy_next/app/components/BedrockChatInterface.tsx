import { useState, useRef, useEffect } from 'react'
import { useBedrockChat, ChatMessage } from '../hooks/useBedrockChat'

interface BedrockChatInterfaceProps {
  courseStep: number
  courseContext?: string
  className?: string
}

const ChatMessageComponent = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === 'user'
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] rounded-lg p-3 ${
        isUser 
          ? 'bg-blue-600 text-white' 
          : 'bg-slate-700 text-gray-100 border border-slate-600'
      }`}>
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-xs font-medium opacity-75">
            {isUser ? '👤 Tú' : '🤖 Asistente IA'}
          </span>
          <span className="text-xs opacity-50">
            {message.timestamp.toLocaleTimeString('es-ES', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    </div>
  )
}

const LoadingIndicator = () => (
  <div className="flex justify-start mb-4">
    <div className="bg-slate-700 border border-slate-600 rounded-lg p-3 max-w-[80%]">
      <div className="flex items-center space-x-2 mb-1">
        <span className="text-xs font-medium opacity-75">🤖 Asistente IA</span>
      </div>
      <div className="flex items-center space-x-2">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
        <span className="text-xs text-gray-400">Pensando...</span>
      </div>
    </div>
  </div>
)

export default function BedrockChatInterface({ 
  courseStep, 
  courseContext = 'bedrock-rag',
  className = '' 
}: BedrockChatInterfaceProps) {
  const { messages, loading, error, sendMessage, clearChat } = useBedrockChat()
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [inputValue])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || loading) return

    const messageContent = inputValue.trim()
    setInputValue('')
    
    await sendMessage(messageContent, courseContext, courseStep)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <div className={`bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 sm:p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-xl">🤖</span>
          <h3 className="text-white font-semibold text-lg">Asistente IA - Bedrock</h3>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
          >
            Limpiar chat
          </button>
        )}
      </div>

      {/* Chat Messages */}
      <div className="h-64 sm:h-80 overflow-y-auto mb-4 space-y-2 bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-center">
            <div>
              <div className="text-3xl mb-2">💭</div>
              <p className="text-sm">¡Hola! Soy tu asistente de IA para el curso de RAG con Bedrock.</p>
              <p className="text-xs mt-1">Pregúntame cualquier cosa sobre el Step #{courseStep} o el curso en general.</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessageComponent key={message.id} message={message} />
            ))}
            {loading && <LoadingIndicator />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
          <p className="text-red-300 text-sm">⚠️ {error}</p>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Pregunta sobre el Step #${courseStep} del curso...`}
            className="w-full min-h-[60px] max-h-32 bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-gray-300 placeholder-gray-500 resize-none focus:outline-none focus:border-blue-500 text-sm"
            disabled={loading}
          />
          <div className="absolute bottom-2 right-2 text-xs text-gray-500">
            {inputValue.length}/500
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-400">
            💡 Tip: Presiona Enter para enviar, Shift+Enter para nueva línea
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim() || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Enviando...</span>
              </div>
            ) : (
              '💬 Enviar'
            )}
          </button>
        </div>
      </form>

      {/* Quick Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => setInputValue('¿Puedes explicarme qué es una Knowledge Base en Bedrock?')}
          className="px-3 py-1 bg-slate-700/50 text-gray-300 rounded-lg text-xs hover:bg-slate-600/50 transition-colors"
          disabled={loading}
        >
          💡 ¿Qué es Knowledge Base?
        </button>
        <button
          onClick={() => setInputValue('¿Cómo configuro mi S3 bucket para este paso?')}
          className="px-3 py-1 bg-slate-700/50 text-gray-300 rounded-lg text-xs hover:bg-slate-600/50 transition-colors"
          disabled={loading}
        >
          🗄️ Ayuda con S3
        </button>
        <button
          onClick={() => setInputValue('¿Qué debo escribir en mi respuesta para este paso?')}
          className="px-3 py-1 bg-slate-700/50 text-gray-300 rounded-lg text-xs hover:bg-slate-600/50 transition-colors"
          disabled={loading}
        >
          ✍️ Ayuda con respuesta
        </button>
      </div>
    </div>
  )
}