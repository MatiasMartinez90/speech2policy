"""
Content Validator - Guardrails de contenido

Triple capa de validación:
1. Blocked topics (política, religión, médico, legal)
2. Spam patterns (URLs, números de teléfono, spam)
3. Relevancia al curso (keywords AWS esperados)
"""

import re
import logging

logger = logging.getLogger()


class ContentValidator:
    """Validador de contenido con guardrails"""

    # Topics bloqueados
    BLOCKED_TOPICS = [
        # Política y religión
        'trump', 'biden', 'política', 'elecciones', 'voto', 'partido político',
        'dios', 'jesús', 'alá', 'biblia', 'corán', 'religión', 'iglesia',

        # Médico y legal
        'cáncer', 'enfermedad', 'medicamento', 'droga', 'tratamiento médico',
        'abogado', 'demanda', 'legal advice', 'consulta legal',

        # Crypto/inversiones (no relacionado con AWS)
        'bitcoin', 'ethereum', 'crypto', 'trading', 'invertir dinero',

        # Otros
        'violencia', 'armas', 'terrorismo', 'hackear', 'piratear',
    ]

    # Patrones de spam
    SPAM_PATTERNS = [
        r'https?://[^\s]+',  # URLs
        r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',  # Números de teléfono
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Emails
        r'(?i)(compra|comprar|venta|vender|gratis|free|descuento|oferta)',  # Spam comercial
    ]

    # SECURITY: Patrones de Prompt Injection (CRITICAL-2)
    # Detecta intentos de jailbreak, manipulación de system prompt, y data exfiltration
    PROMPT_INJECTION_PATTERNS = [
        # Intentos de ignorar instrucciones previas
        r'(?i)(ignore|disregard|forget|skip|bypass).*(previous|above|prior|earlier|all).*(instruction|prompt|rule|directive|command)',
        r'(?i)(ignore|disregard).*(instruction|prompt|rule)',

        # Intentos de cambiar el rol del asistente
        r'(?i)(you are now|ahora eres|act as|actúa como|pretend to be|simula ser).*(assistant|asistente|bot|admin|system|developer)',
        r'(?i)(new role|nuevo rol|change role|cambiar rol)',

        # Intentos de acceder a modo admin/system
        r'(?i)(system message|mensaje del sistema|admin mode|modo admin|developer mode|modo desarrollador|root access|debug mode)',
        r'(?i)(enable|habilitar|activate|activar).*(admin|system|root|debug)',

        # Delimitadores sospechosos que podrían romper el contexto
        r'---[\s\S]*---',  # Delimitadores triple dash
        r'===[\s\S]*===',  # Delimitadores triple equals
        r'```[\s\S]*```',  # Bloques de código sospechosos (podrían contener instrucciones ocultas)

        # Intentos de extraer datos sensibles
        r'(?i)(extract|show|display|reveal|print|output|return).*(all|todo|entire|complete).*(data|información|respuestas|answers|secrets)',
        r'(?i)(dame|give me|muestra|show me).*(respuestas correctas|correct answers|soluciones|solutions)',

        # Intentos de inyección de JSON/XML/código
        r'(?i)<script[\s\S]*>',  # Script tags
        r'(?i)<iframe[\s\S]*>',  # Iframe tags
        r'(?i)(\{.*"role".*:.*"system".*\})',  # JSON con role:system

        # Intentos de romper el prompt con escape sequences
        r'\\n\\n\\n',  # Múltiples newlines escapados
        r'\x00|\x01|\x02',  # Null bytes y caracteres de control
    ]

    # Keywords esperados por curso (mínimo 1 debe estar presente)
    COURSE_KEYWORDS = {
        'image-gen-bedrock': [
            'aws', 'amazon', 'lambda', 'bedrock', 'api gateway', 's3', 'titan',
            'cloud', 'serverless', 'función', 'bucket', 'endpoint', 'iam',
            'python', 'imagen', 'generador', 'modelo', 'inteligencia artificial'
        ],
        # Agregar keywords para otros cursos aquí
    }

    def validate_question(self, question, course_id):
        """
        Valida pregunta del usuario contra guardrails

        Args:
            question: Pregunta del usuario
            course_id: ID del curso actual

        Returns:
            dict: {
                'valid': bool,
                'reason': str,
                'rejection_message': str (si valid=False)
            }
        """
        try:
            question_lower = question.lower()

            # 1. Verificar temas bloqueados
            for topic in self.BLOCKED_TOPICS:
                if topic.lower() in question_lower:
                    logger.warning(f"Blocked topic detected: {topic}")
                    return {
                        'valid': False,
                        'reason': f'blocked_topic:{topic}',
                        'rejection_message': self._get_blocked_topic_message()
                    }

            # 2. Verificar patrones de spam
            for pattern in self.SPAM_PATTERNS:
                if re.search(pattern, question):
                    logger.warning(f"Spam pattern detected: {pattern}")
                    return {
                        'valid': False,
                        'reason': f'spam_pattern:{pattern}',
                        'rejection_message': self._get_spam_message()
                    }

            # 3. SECURITY: Verificar prompt injection (CRITICAL-2)
            for pattern in self.PROMPT_INJECTION_PATTERNS:
                if re.search(pattern, question):
                    logger.warning(
                        f"SECURITY ALERT: Prompt injection attempt detected. "
                        f"Pattern: {pattern[:50]}... | Question preview: {question[:100]}..."
                    )
                    return {
                        'valid': False,
                        'reason': f'prompt_injection:{pattern[:30]}',
                        'rejection_message': self._get_prompt_injection_message()
                    }

            # 4. Verificar relevancia al curso (solo si la pregunta tiene +20 caracteres)
            if len(question) > 20:
                keywords = self.COURSE_KEYWORDS.get(course_id, [])
                if keywords:
                    has_keyword = any(kw.lower() in question_lower for kw in keywords)

                    if not has_keyword:
                        logger.warning(f"No course keywords found in question")
                        return {
                            'valid': False,
                            'reason': 'no_course_keywords',
                            'rejection_message': self._get_off_topic_message(course_id)
                        }

            # 5. Verificar longitud mínima (evitar preguntas muy cortas sin sentido)
            if len(question.strip()) < 5:
                return {
                    'valid': False,
                    'reason': 'too_short',
                    'rejection_message': '❓ Tu pregunta es muy corta. ¿Podrías ser más específico?'
                }

            # 6. SECURITY: Verificar longitud máxima y truncar (CRITICAL-2)
            if len(question) > 2000:
                return {
                    'valid': False,
                    'reason': 'too_long',
                    'rejection_message': '📝 Tu pregunta es muy larga. Intenta ser más conciso (máximo 2000 caracteres).'
                }

            # Si pasó todas las validaciones, es válida
            logger.info("Question passed all validation checks")
            return {
                'valid': True,
                'reason': 'valid',
                'rejection_message': None
            }

        except Exception as e:
            logger.error(f"Error in content validation: {str(e)}", exc_info=True)
            # FAIL-CLOSED: En caso de error, rechazar por seguridad
            return {
                'valid': False,
                'reason': 'validation_error',
                'rejection_message': '⚠️ Lo siento, hubo un error al procesar tu pregunta. Por favor, intenta nuevamente en unos momentos.'
            }

    def _get_blocked_topic_message(self):
        """
        Mensaje para temas bloqueados

        Returns:
            str: Mensaje de rechazo amigable
        """
        return """🤔 Tu pregunta parece estar fuera del alcance del curso.

Este tutor está especializado en AWS y cloud computing.

¿Hay algo sobre los servicios AWS del curso que te gustaría aprender? Estaré encantado de ayudarte con eso."""

    def _get_spam_message(self):
        """
        Mensaje para patrones de spam

        Returns:
            str: Mensaje de rechazo
        """
        return """⚠️ Tu mensaje parece contener información no permitida (URLs, emails, números de teléfono).

Por favor, haz preguntas educativas sobre el contenido del curso sin incluir enlaces o información de contacto."""

    def _get_off_topic_message(self, course_id):
        """
        Mensaje para preguntas off-topic

        Args:
            course_id: ID del curso

        Returns:
            str: Mensaje de rechazo con sugerencias
        """
        return f"""🤔 Tu pregunta no parece estar relacionada con el contenido del curso.

**Este curso cubre:** Amazon Web Services (AWS), cloud computing, y servicios como Lambda, Bedrock, API Gateway, S3.

**Puedes preguntar sobre:**
- Conceptos de AWS explicados en el curso
- Cómo funcionan los servicios mencionados
- Mejores prácticas de cloud computing
- Detalles de implementación del proyecto

¿Hay algún tema del curso sobre el que te gustaría saber más?"""

    def _get_prompt_injection_message(self):
        """
        Mensaje para intentos de prompt injection (SECURITY: CRITICAL-2)

        Returns:
            str: Mensaje de rechazo genérico que no revela detalles del sistema
        """
        return """⚠️ Tu pregunta contiene patrones que no están permitidos.

Por favor, reformula tu consulta de manera clara y directa sobre los conceptos de AWS y cloud computing del curso.

Si necesitas ayuda con algún tema específico del curso, estaré encantado de explicártelo."""

    def validate_checkpoint_answer(self, answer):
        """
        Validación básica de respuestas de checkpoint

        Args:
            answer: Respuesta del estudiante al checkpoint

        Returns:
            dict: Similar a validate_question
        """
        # Para checkpoints, las validaciones son más relajadas
        # Solo verificamos longitud y spam obvio

        if len(answer.strip()) < 10:
            return {
                'valid': False,
                'reason': 'too_short',
                'rejection_message': '✍️ Tu respuesta es muy corta. Intenta desarrollar más tu respuesta (mínimo 10 caracteres).'
            }

        if len(answer) > 5000:
            return {
                'valid': False,
                'reason': 'too_long',
                'rejection_message': '📝 Tu respuesta es muy larga. Intenta ser más conciso (máximo 5000 caracteres).'
            }

        # Verificar spam patterns
        for pattern in self.SPAM_PATTERNS:
            if re.search(pattern, answer):
                return {
                    'valid': False,
                    'reason': f'spam_pattern:{pattern}',
                    'rejection_message': self._get_spam_message()
                }

        return {
            'valid': True,
            'reason': 'valid',
            'rejection_message': None
        }
