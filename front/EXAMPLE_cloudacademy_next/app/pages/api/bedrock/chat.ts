import type { NextApiRequest, NextApiResponse } from 'next'

interface ChatRequest {
  message: string
  context: string
  history: Array<{
    content: string
    role: 'user' | 'assistant'
  }>
}

interface ChatResponse {
  success: boolean
  message: string
  error?: string
}

// Mock responses para pruebas - Reemplaza esto con tu FastAPI backend
const getMockResponse = (message: string, context: string): string => {
  const lowerMessage = message.toLowerCase()
  
  // Knowledge Base responses
  if (lowerMessage.includes('knowledge base') || lowerMessage.includes('base de conocimiento')) {
    return `¡Excelente pregunta! Una Knowledge Base en Amazon Bedrock es un repositorio que almacena y organiza tus documentos para que los modelos de IA puedan acceder a ellos.

**Características principales:**
• 📚 Almacena documentos en formato PDF, TXT, Word, etc.
• 🔍 Usa embeddings para búsqueda semántica
• 🔗 Se integra con Amazon S3 y OpenSearch
• ⚡ Permite consultas en tiempo real

**Para este paso del curso:**
1. Ve a la consola de Amazon Bedrock
2. Navega a "Knowledge Bases"
3. Haz clic en "Create Knowledge Base"
4. Sigue el wizard de configuración

¿Necesitas ayuda con algún paso específico?`
  }
  
  // S3 help
  if (lowerMessage.includes('s3') || lowerMessage.includes('bucket')) {
    return `Te ayudo con la configuración de S3 para tu Knowledge Base:

**Pasos para configurar S3:**
1. 🗄️ Crea un bucket en S3 (ej: "mi-conocimiento-bedrock")
2. 📁 Sube tus documentos al bucket
3. 🔐 Configura los permisos IAM correctos
4. 🔗 Conecta el bucket a tu Knowledge Base

**Permisos necesarios:**
• \`s3:GetObject\` - Para leer documentos
• \`s3:ListBucket\` - Para listar archivos
• Acceso desde el rol de Bedrock

**Formato de documentos soportados:**
• PDF, TXT, DOCX, HTML, CSV

¿Qué tipo de documentos planeas subir?`
  }
  
  // Response help
  if (lowerMessage.includes('respuesta') || lowerMessage.includes('escribir') || lowerMessage.includes('answer')) {
    return `Te ayudo a escribir una buena respuesta para este paso:

**Estructura sugerida:**
"En este paso, voy a [acción específica] para [objetivo del paso]."

**Ejemplos según el paso:**

**Step #1 - Knowledge Base:**
"En este paso, voy a crear una Knowledge Base en Amazon Bedrock para almacenar y organizar los documentos que usará mi chatbot RAG."

**Step #2 - S3:**
"En este paso, voy a configurar un bucket de S3 y subir mis documentos para que la Knowledge Base pueda acceder a ellos."

**Step #3 - Conexión:**
"En este paso, voy a conectar mi bucket de S3 con la Knowledge Base y configurar la indexación de documentos."

**Tips:**
• Sé específico sobre lo que harás
• Menciona las herramientas que usarás
• Explica el propósito/objetivo

¿Quieres que te ayude a personalizar la respuesta para tu caso específico?`
  }
  
  // General RAG help
  if (lowerMessage.includes('rag') || lowerMessage.includes('retrieval')) {
    return `RAG (Retrieval Augmented Generation) es una técnica poderosa que combina:

**🔍 Retrieval (Recuperación):**
• Busca información relevante en tu Knowledge Base
• Usa embeddings para encontrar contenido similar
• Selecciona los fragmentos más útiles

**🤖 Generation (Generación):**
• Usa un modelo LLM (como Claude) para generar respuestas
• Combina la información recuperada con el conocimiento del modelo
• Produce respuestas contextuales y precisas

**Ventajas de RAG:**
• ✅ Respuestas basadas en tus datos específicos
• ✅ Información actualizada (no limitada al entrenamiento)
• ✅ Mayor precisión y relevancia
• ✅ Cita fuentes específicas

**En este curso aprenderás:**
1. Crear Knowledge Bases
2. Configurar retrieval
3. Integrar con modelos generativos
4. Optimizar el rendimiento

¿Hay algún aspecto específico de RAG que te gustaría explorar más?`
  }
  
  // Default helpful response
  return `¡Hola! Soy tu asistente de IA para el curso de RAG con Bedrock. 

Veo que estás trabajando en el curso. Te puedo ayudar con:

• 🧠 **Conceptos**: RAG, Knowledge Bases, embeddings
• 🛠️ **Implementación**: AWS Bedrock, S3, OpenSearch
• ✍️ **Tareas**: Cómo escribir buenas respuestas
• 🔧 **Problemas**: Debugging y configuración

**Pregúntame sobre:**
- "¿Qué es una Knowledge Base?"
- "¿Cómo configuro S3?"
- "¿Qué debo escribir en mi respuesta?"
- "Explícame RAG con ejemplos"

¿En qué puedo ayudarte específicamente?`
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: '',
      error: 'Method not allowed'
    })
  }

  try {
    const { message, context, history }: ChatRequest = req.body

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: '',
        error: 'Message is required'
      })
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

    // Generate mock response
    const responseMessage = getMockResponse(message, context)

    res.status(200).json({
      success: true,
      message: responseMessage
    })

  } catch (error) {
    console.error('Chat API error:', error)
    res.status(500).json({
      success: false,
      message: '',
      error: 'Internal server error'
    })
  }
}