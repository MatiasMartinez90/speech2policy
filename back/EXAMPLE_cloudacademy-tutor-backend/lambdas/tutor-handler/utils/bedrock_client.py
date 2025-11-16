"""
Bedrock Client para invocar Claude Sonnet 3.5 v2

Maneja:
- Invocación de Claude vía boto3
- Construcción de mensajes con formato correcto
- Parsing de respuestas
- Retry con exponential backoff (3 intentos, 1s/2s/4s delays)
- Circuit Breaker para resiliencia ante fallos de Bedrock
- Manejo de errores transitorios y permanentes
"""

import json
import logging
import boto3
import sys
import os
from botocore.exceptions import ClientError

# Agregar directorio shared al path para importar circuit breaker y retry
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))
from shared.circuit_breaker import bedrock_circuit_breaker, CircuitBreakerError
from shared.retry import bedrock_retry_config
from shared.structured_logger import get_logger, log_api_call
from shared.config_manager import get_aws_region, get_bedrock_model_id
from shared.boto3_config import get_config_for_service

logger = get_logger(__name__)


class BedrockClient:
    """Cliente para invocar Amazon Bedrock (Claude)"""

    def __init__(self, model_id: str = None, region: str = None):
        """
        Inicializa el cliente de Bedrock

        Args:
            model_id: ID del modelo de Bedrock (default: desde config)
            region: Región de AWS (default: desde config)

        Note:
            Si no se proporcionan, se obtienen de:
            1. Variables de entorno (BEDROCK_MODEL_ID, AWS_REGION)
            2. Parameter Store (si está configurado)
            3. Valores por defecto
        """
        self.model_id = model_id or get_bedrock_model_id()
        self.region = region or get_aws_region()

        # Usar configuración optimizada con connection pooling
        config = get_config_for_service('bedrock-runtime', self.region)
        self.client = boto3.client('bedrock-runtime', config=config)

        logger.info(f"BedrockClient initialized with model_id={self.model_id}, region={self.region}, connection_pool=50")

    def invoke_claude(self, system_prompt, user_prompt, max_tokens=1000, temperature=0.7):
        """
        Invoca Claude con system prompt y user prompt

        Args:
            system_prompt: System prompt con contexto e instrucciones
            user_prompt: Pregunta del usuario
            max_tokens: Máximo de tokens a generar (default 1000) - SECURITY: Reducido para prevenir cost exhaustion
            temperature: Temperatura de generación (default 0.7)

        Returns:
            dict: {
                'answer': str,
                'tokens_used': int,
                'stop_reason': str
            }

        Raises:
            CircuitBreakerError: Si el circuit breaker está abierto (servicio no disponible)
            Exception: Si hay error en la invocación
        """
        try:
            # SECURITY (CRITICAL-2): Truncar user input a 2000 chars para prevenir abuso
            original_length = len(user_prompt)
            if original_length > 2000:
                user_prompt = user_prompt[:2000]
                logger.warning(
                    f"SECURITY: User prompt truncated from {original_length} to 2000 chars "
                    "to prevent cost exhaustion attack"
                )

            # Construir payload según formato de Claude
            # Documentación: https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-anthropic-claude-messages.html
            payload = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": max_tokens,  # Reducido de 2000 a 1000 (SECURITY)
                "temperature": temperature,
                "system": system_prompt,
                "messages": [
                    {
                        "role": "user",
                        "content": user_prompt
                    }
                ]
            }

            logger.info(f"Invoking Bedrock model: {self.model_id} with max_tokens={max_tokens}")
            logger.debug(f"System prompt length: {len(system_prompt)} chars")
            logger.debug(f"User prompt length: {len(user_prompt)} chars (original: {original_length})")

            # Invocar modelo a través del circuit breaker y retry
            # Orden: retry (errores transitorios) → circuit breaker (fallos persistentes)
            @bedrock_retry_config.decorator
            def _invoke():
                return self.client.invoke_model(
                    modelId=self.model_id,
                    body=json.dumps(payload)
                )

            response = bedrock_circuit_breaker.call(_invoke)

            # Parsear respuesta
            response_body = json.loads(response['body'].read())

            logger.debug(f"Bedrock response: {json.dumps(response_body)}")

            # Extraer respuesta de Claude
            answer = ''
            if 'content' in response_body and len(response_body['content']) > 0:
                answer = response_body['content'][0].get('text', '')

            # SECURITY (MEDIUM-6): Validar output de Bedrock
            answer = self._validate_bedrock_output(answer)

            # Extraer uso de tokens
            usage = response_body.get('usage', {})
            input_tokens = usage.get('input_tokens', 0)
            output_tokens = usage.get('output_tokens', 0)
            total_tokens = input_tokens + output_tokens

            # Stop reason
            stop_reason = response_body.get('stop_reason', 'unknown')

            # Log API call con structured logging
            logger.info("Bedrock invocation successful", extra={
                'service': 'bedrock',
                'operation': 'invoke_model',
                'model_id': self.model_id,
                'total_tokens': total_tokens,
                'input_tokens': input_tokens,
                'output_tokens': output_tokens,
                'stop_reason': stop_reason,
                'answer_length': len(answer)
            })

            return {
                'answer': answer,
                'tokens_used': total_tokens,
                'input_tokens': input_tokens,
                'output_tokens': output_tokens,
                'stop_reason': stop_reason
            }

        except CircuitBreakerError as e:
            logger.error(f"Circuit breaker is open: {str(e)}")
            raise Exception(f"Bedrock service temporarily unavailable. Please try again in a moment.")

        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            error_message = e.response.get('Error', {}).get('Message', str(e))
            logger.error(f"Bedrock ClientError [{error_code}]: {error_message}")
            raise Exception(f"Bedrock invocation failed: {error_message}")

        except Exception as e:
            logger.error(f"Unexpected error invoking Bedrock: {str(e)}", exc_info=True)
            raise Exception(f"Bedrock invocation error: {str(e)}")

    def invoke_with_conversation_history(self, system_prompt, messages, max_tokens=1000, temperature=0.7):
        """
        Invoca Claude con historial de conversación completo

        Args:
            system_prompt: System prompt con contexto
            messages: Lista de mensajes [{"role": "user"|"assistant", "content": str}, ...]
            max_tokens: Máximo de tokens a generar (default 1000) - SECURITY: Reducido
            temperature: Temperatura de generación

        Returns:
            dict: Similar a invoke_claude()

        Raises:
            CircuitBreakerError: Si el circuit breaker está abierto
        """
        try:
            # SECURITY (CRITICAL-2): Truncar mensajes largos en el historial
            truncated_messages = []
            for msg in messages:
                content = msg.get('content', '')
                if len(content) > 2000:
                    logger.warning(
                        f"SECURITY: Message content truncated from {len(content)} to 2000 chars"
                    )
                    content = content[:2000]
                truncated_messages.append({
                    'role': msg['role'],
                    'content': content
                })

            payload = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": max_tokens,  # Reducido de 2000 a 1000 (SECURITY)
                "temperature": temperature,
                "system": system_prompt,
                "messages": truncated_messages
            }

            logger.info(
                f"Invoking Bedrock with conversation history ({len(messages)} messages) "
                f"with max_tokens={max_tokens}"
            )

            # Invocar a través del circuit breaker y retry
            @bedrock_retry_config.decorator
            def _invoke():
                return self.client.invoke_model(
                    modelId=self.model_id,
                    body=json.dumps(payload)
                )

            response = bedrock_circuit_breaker.call(_invoke)

            response_body = json.loads(response['body'].read())

            # Extraer respuesta
            answer = ''
            if 'content' in response_body and len(response_body['content']) > 0:
                answer = response_body['content'][0].get('text', '')

            usage = response_body.get('usage', {})
            total_tokens = usage.get('input_tokens', 0) + usage.get('output_tokens', 0)

            return {
                'answer': answer,
                'tokens_used': total_tokens,
                'input_tokens': usage.get('input_tokens', 0),
                'output_tokens': usage.get('output_tokens', 0),
                'stop_reason': response_body.get('stop_reason', 'unknown')
            }

        except CircuitBreakerError as e:
            logger.error(f"Circuit breaker is open: {str(e)}")
            raise Exception(f"Bedrock service temporarily unavailable. Please try again in a moment.")

        except Exception as e:
            logger.error(f"Error invoking Bedrock with history: {str(e)}", exc_info=True)
            raise Exception(f"Bedrock conversation error: {str(e)}")

    def invoke_for_validation(self, validation_prompt, student_answer, criteria):
        """
        Invoca Claude específicamente para validación de checkpoints
        Usa temperatura baja (0.3) para respuestas más consistentes

        Args:
            validation_prompt: Prompt con instrucciones de validación
            student_answer: Respuesta del estudiante
            criteria: Lista de criterios de validación

        Returns:
            dict: Similar a invoke_claude() pero con temperatura más baja
        """
        # Construir prompt estructurado
        user_prompt = f"""
Respuesta del estudiante:
{student_answer}

Criterios de validación:
{json.dumps(criteria, indent=2, ensure_ascii=False)}

Por favor evalúa la respuesta del estudiante según los criterios proporcionados.
Retorna tu evaluación en formato JSON con la siguiente estructura:

{{
  "criteria_results": [
    {{
      "criterion": "nombre del criterio",
      "met": true/false,
      "score": 0-100,
      "explanation": "explicación breve"
    }}
  ],
  "overall_feedback": "feedback general constructivo",
  "score": 0-100
}}
"""

        # Invocar con temperatura baja para consistencia
        return self.invoke_claude(
            system_prompt=validation_prompt,
            user_prompt=user_prompt,
            max_tokens=1500,
            temperature=0.3  # Temperatura baja para validación consistente
        )

    def _validate_bedrock_output(self, answer):
        """
        Valida output de Bedrock para prevenir XSS y DoS (SECURITY: MEDIUM-6)

        Detecta y sanitiza:
        - Script tags (<script>, <iframe>)
        - Respuestas muy largas que podrían causar DoS en frontend
        - Contenido potencialmente peligroso

        Args:
            answer: Respuesta de Bedrock (texto generado por Claude)

        Returns:
            str: Respuesta validada y sanitizada

        Security:
            - Si detecta script tags → reemplazar con mensaje de error
            - Si es muy largo (>5000 chars) → truncar
            - Loggear detecciones para análisis
        """
        import re

        # 1. Detectar script/iframe tags (XSS potential)
        dangerous_tags = [
            r'<script[\s\S]*?>',
            r'<iframe[\s\S]*?>',
            r'<object[\s\S]*?>',
            r'<embed[\s\S]*?>',
            r'javascript:',
            r'onerror\s*=',
            r'onload\s*='
        ]

        for pattern in dangerous_tags:
            if re.search(pattern, answer, re.IGNORECASE):
                logger.warning(
                    f"SECURITY ALERT: Bedrock output contains dangerous tag/script. "
                    f"Pattern: {pattern[:30]}... | Output preview: {answer[:100]}..."
                )
                # Retornar mensaje de error en lugar de contenido peligroso
                return ("⚠️ La respuesta generada contiene contenido que no puede ser mostrado. "
                        "Por favor, reformula tu pregunta de manera diferente.")

        # 2. Truncar respuestas muy largas (prevenir DoS en frontend)
        if len(answer) > 5000:
            logger.warning(
                f"SECURITY: Bedrock output truncated from {len(answer)} to 5000 chars "
                "to prevent frontend DoS"
            )
            answer = answer[:5000] + "\n\n... [respuesta truncada por ser muy larga]"

        # 3. Respuesta segura
        return answer

    def get_circuit_breaker_metrics(self):
        """
        Obtiene métricas del circuit breaker para Bedrock API

        Returns:
            dict: Métricas del circuit breaker (state, failure_count, etc.)
        """
        return bedrock_circuit_breaker.get_metrics()
