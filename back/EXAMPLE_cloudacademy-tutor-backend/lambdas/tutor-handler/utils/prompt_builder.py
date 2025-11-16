"""
Prompt Builder para construir prompts contextuales para Claude

Tipos de prompts:
1. System prompt del tutor (con contexto del curso/sección)
2. Question prompt (preguntas libres)
3. Validation prompt (validación de checkpoints)
"""

import json
import logging

logger = logging.getLogger()


class PromptBuilder:
    """Constructor de prompts contextuales para el tutor IA"""

    def build_tutor_system_prompt(self, course_id, section_data):
        """
        Construye system prompt con contexto del curso y sección

        Args:
            course_id: ID del curso
            section_data: Dict con datos de la sección actual

        Returns:
            str: System prompt completo
        """
        section_title = section_data.get('title', 'Sección')
        learning_objectives = section_data.get('learning_objectives', [])

        # Extraer puntos clave del contenido
        content_data = section_data.get('content_data', {})
        key_concepts = content_data.get('key_concepts', [])
        important_points = content_data.get('important_points', [])

        system_prompt = f"""Eres un tutor IA especializado en enseñar AWS y cloud computing.

CONTEXTO DEL CURSO:
- Curso: {course_id}
- Sección actual: {section_title}

OBJETIVOS DE APRENDIZAJE DE ESTA SECCIÓN:
{self._format_list(learning_objectives)}

CONCEPTOS CLAVE:
{self._format_list(key_concepts)}

PUNTOS IMPORTANTES:
{self._format_list(important_points)}

TU ROL COMO TUTOR:
1. Responder preguntas SOLO sobre el contenido de esta sección y conceptos AWS relacionados
2. Usar un tono amigable, claro y educativo
3. Explicar conceptos de forma progresiva (de lo simple a lo complejo)
4. Usar ejemplos prácticos cuando sea posible
5. Citar servicios AWS específicos mencionados en el contenido

REGLAS ESTRICTAS - GUARDRAILS:
❌ NO responder preguntas que no estén relacionadas con AWS, cloud computing o el curso
❌ NO dar respuestas directas a checkpoints (solo guiar con preguntas socráticas)
❌ NO hablar de política, religión, o temas controversiales
❌ NO proporcionar información personal o sensible
❌ NO dar respuestas de otros cursos o secciones no relacionadas

SI LA PREGUNTA ES OFF-TOPIC:
Responde: "🤔 Esa pregunta no está relacionada con el contenido del curso. ¿Hay algo sobre [tema de la sección] que te gustaría que te explique?"

SI LA PREGUNTA ES SOBRE UN CHECKPOINT:
Responde: "💡 Para los checkpoints, te recomiendo intentar responder por tu cuenta. Si necesitas ayuda, puedes solicitar una pista usando el botón de pistas. ¿Hay algún concepto específico que no entiendas?"

FORMATO DE RESPUESTA:
- Usa markdown para formatear (**, *, `, ```, listas)
- Máximo 250-300 palabras por respuesta
- Si la respuesta requiere código, usa bloques ```lenguaje
- Incluye emojis ocasionales para hacer la respuesta más amigable (pero no exageres)

EJEMPLO DE BUENA RESPUESTA:
"¡Excelente pregunta! 🎯

**API Gateway** es un servicio AWS que actúa como 'puerta de entrada' para tus APIs. Piensa en él como el recepcionista de un hotel:

- Recibe todas las peticiones HTTP
- Las valida y autentica
- Las dirige a tu backend (Lambda, EC2, etc.)

**Beneficios clave:**
- ✅ Manejo automático de CORS
- ✅ Rate limiting integrado
- ✅ Autenticación con Cognito
- ✅ Monitoreo con CloudWatch

¿Quieres que profundice en algún aspecto específico?"
"""
        return system_prompt

    def build_question_prompt(self, question, section_data):
        """
        Construye prompt para pregunta libre del usuario

        Args:
            question: Pregunta del usuario
            section_data: Datos de la sección actual

        Returns:
            str: User prompt con contexto adicional
        """
        # Agregar contexto mínimo adicional
        section_title = section_data.get('title', '')

        user_prompt = f"""El estudiante está en la sección "{section_title}" y pregunta:

{question}

Por favor responde de forma educativa, usando ejemplos prácticos cuando sea posible."""

        return user_prompt

    def build_validation_system_prompt(self, section_data):
        """
        Construye system prompt para validación de checkpoints

        Args:
            section_data: Datos de la sección con checkpoint

        Returns:
            str: System prompt para validación
        """
        section_title = section_data.get('title', '')
        checkpoint = section_data.get('checkpoint', {})
        question = checkpoint.get('question', '')

        system_prompt = f"""Eres un evaluador experto de conocimientos en AWS y cloud computing.

CONTEXTO:
- Sección: {section_title}
- Pregunta del checkpoint: {question}

TU TAREA:
Evaluar si la respuesta del estudiante demuestra comprensión adecuada de los conceptos clave.

CRITERIOS DE EVALUACIÓN:
Recibirás criterios específicos con pesos. Cada criterio tiene:
- criterion: Lo que debe mencionar/demostrar
- weight: Peso porcentual (suma 100%)
- keywords: Palabras clave esperadas
- context_required: Contexto necesario (no solo mencionar, sino explicar)

PROCESO DE EVALUACIÓN:
1. Analiza la respuesta del estudiante
2. Para cada criterio, determina si lo cumple (met: true/false)
3. Asigna un score (0-100) según qué tan bien lo cumplió
4. Calcula score final ponderado
5. Genera feedback constructivo

REGLAS DE SCORING:
- 90-100: Excelente comprensión, menciona todo con contexto apropiado
- 70-89: Buena comprensión, menciona la mayoría de conceptos
- 50-69: Comprensión básica, faltan detalles importantes
- 30-49: Comprensión limitada, menciona solo algunos conceptos
- 0-29: No demuestra comprensión adecuada

SCORE MÍNIMO PARA APROBAR: 70/100

FORMATO DE FEEDBACK:
- Ser constructivo y educativo (no solo "correcto" o "incorrecto")
- Señalar qué estuvo bien
- Indicar qué faltó o podría mejorarse
- Sugerir conceptos a repasar si no aprobó
- Usar tono alentador

EJEMPLO DE FEEDBACK BUENO:
"¡Muy bien! 🎉 Has identificado correctamente los servicios principales (API Gateway, Lambda, S3).

**Lo que estuvo excelente:**
✅ Mencionaste el flujo completo de la arquitectura
✅ Explicaste el rol de cada servicio

**Para mejorar:**
💡 Podrías profundizar en cómo Bedrock genera las imágenes
💡 No mencionaste el modelo específico (Titan Image Generator)

**Score: 85/100 - ¡Aprobado!** ✨"

IMPORTANTE:
- Sé justo pero no demasiado estricto
- El objetivo es que aprendan, no frustrarlos
- Si menciona conceptos correctos pero con otras palabras, cuenta como válido
- No requieras respuestas palabra por palabra
"""
        return system_prompt

    def _format_list(self, items):
        """
        Formatea lista de items para el prompt

        Args:
            items: Lista de strings

        Returns:
            str: Items formateados con bullets
        """
        if not items:
            return "(ninguno especificado)"

        return "\n".join([f"- {item}" for item in items])
