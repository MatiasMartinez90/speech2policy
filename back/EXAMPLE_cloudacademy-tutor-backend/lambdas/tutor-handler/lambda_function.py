"""
Lambda Handler: tutor-handler
Maneja todas las interacciones del tutor IA con Claude Sonnet 3.5 v2

Endpoints:
- POST /api/tutor/ask - Preguntas libres sobre el curso
- POST /api/tutor/validate - Validar respuesta de checkpoint
- GET /api/tutor/hint - Solicitar pista progresiva
"""

import json
import os
import sys
import logging
from datetime import datetime, timezone

# Agregar directorio shared al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Importar utilidades compartidas
from shared.auth_utils import extract_user_id
from shared.response_utils import success_response, error_response
from shared.structured_logger import (
    get_logger, set_context, configure_root_logger,
    log_user_action, log_performance, log_error_with_context
)

# Importar módulos propios
from utils.bedrock_client import BedrockClient
from utils.dynamodb_client import DynamoDBClient
from utils.prompt_builder import PromptBuilder
from utils.rate_limiter import RateLimiter
from validators.content_validator import ContentValidator
from validators.checkpoint_validator import CheckpointValidator

# Configurar logging estructurado
configure_root_logger(logging.INFO)
logger = get_logger(__name__)

# Variables de entorno
COURSES_TABLE = os.environ.get('COURSES_TABLE', 'CourseCatalog')
SESSIONS_TABLE = os.environ.get('SESSIONS_TABLE', 'TutorSessions')
PROGRESS_TABLE = os.environ.get('PROGRESS_TABLE', 'UserProgress')
USAGE_TABLE = os.environ.get('USAGE_TABLE', 'UserUsage')
BEDROCK_MODEL_ID = os.environ.get('BEDROCK_MODEL_ID', 'anthropic.claude-3-5-sonnet-20241022-v2:0')
COGNITO_USER_POOL_ID = os.environ.get('COGNITO_USER_POOL_ID')

# Inicializar clientes
bedrock_client = BedrockClient(model_id=BEDROCK_MODEL_ID)
dynamodb_client = DynamoDBClient(
    courses_table=COURSES_TABLE,
    sessions_table=SESSIONS_TABLE,
    progress_table=PROGRESS_TABLE,
    usage_table=USAGE_TABLE
)
content_validator = ContentValidator()
checkpoint_validator = CheckpointValidator()
rate_limiter = RateLimiter(dynamodb_client=dynamodb_client)
prompt_builder = PromptBuilder()


def lambda_handler(event, context):
    """
    Handler principal de Lambda

    Args:
        event: Evento de API Gateway con httpMethod, path, body, requestContext
        context: Contexto de Lambda

    Returns:
        dict: Response con statusCode, headers, body
    """
    try:
        # Extraer método HTTP y path
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')

        # Extraer origin para CORS whitelist (SECURITY: CRITICAL-3)
        headers = event.get('headers') or {}
        origin = headers.get('origin') or headers.get('Origin')

        # Extraer user_id del contexto de Cognito (si está autenticado)
        user_id = extract_user_id(event)

        # Establecer contexto global para logging estructurado
        request_id = context.request_id if context else 'unknown'
        set_context(
            user_id=user_id,
            request_id=request_id,
            http_method=http_method,
            path=path
        )

        logger.info("Request received", extra={
            'http_method': http_method,
            'path': path,
            'user_id': user_id
        })

        # Parsear body
        body = json.loads(event.get('body', '{}'))

        # Routing por endpoint
        if http_method == 'POST' and path.endswith('/api/tutor/ask'):
            return handle_ask_question(user_id, body)

        elif http_method == 'POST' and path.endswith('/api/tutor/validate'):
            return handle_validate_checkpoint(user_id, body)

        elif http_method == 'GET' and path.endswith('/api/tutor/hint'):
            # Los parámetros vienen en queryStringParameters para GET
            params = event.get('queryStringParameters', {})
            return handle_get_hint(user_id, params)

        else:
            return error_response(404, 'Endpoint not found', origin=origin)

    except Exception as e:
        log_error_with_context(
            logger, e,
            context="lambda_handler",
            http_method=http_method,
            path=path
        )
        return error_response(500, f'Internal server error: {str(e)}', origin=origin)


# extract_user_id ahora se importa desde shared.auth_utils


def handle_ask_question(user_id, body):
    """
    Maneja POST /api/tutor/ask

    Flujo:
    1. Validar rate limiting
    2. Validar contenido (guardrails)
    3. Obtener contexto del curso/sección
    4. Construir prompt con contexto
    5. Invocar Claude
    6. Guardar en sesión
    7. Incrementar contador de uso

    Args:
        user_id: ID del usuario
        body: {
            "course_id": "image-gen-bedrock",
            "section_id": 0,
            "question": "¿Qué es API Gateway?",
            "session_id": "uuid-optional"
        }

    Returns:
        dict: Response con answer de Claude
    """
    try:
        # Validar parámetros requeridos
        course_id = body.get('course_id')
        section_id = body.get('section_id')
        question = body.get('question')
        session_id = body.get('session_id')

        if not all([course_id, section_id is not None, question]):
            return error_response(400, 'Missing required fields: course_id, section_id, question', origin=origin)

        # Log user action con structured logging
        log_user_action(
            logger,
            user_id=user_id,
            action="ask_question",
            resource=f"course:{course_id}",
            course_id=course_id,
            section_id=section_id,
            question_length=len(question)
        )

        # 1. Rate limiting
        rate_limit_result = rate_limiter.check_and_increment(
            user_id=user_id,
            action_type='question'
        )

        if not rate_limit_result['allowed']:
            return error_response(429, f"Rate limit exceeded: {rate_limit_result['message']}", origin=origin)

        # 2. Validación de contenido (guardrails)
        validation_result = content_validator.validate_question(
            question=question,
            course_id=course_id
        )

        if not validation_result['valid']:
            return success_response({
                'answer': validation_result['rejection_message'],
                'type': 'guardrail_rejection',
                'reason': validation_result['reason']
            })

        # 3. Obtener contexto del curso/sección
        section_data = dynamodb_client.get_section(
            course_id=course_id,
            section_id=section_id
        )

        if not section_data:
            return error_response(404, f'Section {section_id} not found in course {course_id}', origin=origin)

        # 4. Construir prompt con contexto
        system_prompt = prompt_builder.build_tutor_system_prompt(
            course_id=course_id,
            section_data=section_data
        )

        user_prompt = prompt_builder.build_question_prompt(
            question=question,
            section_data=section_data
        )

        # 5. Invocar Claude con performance tracking
        with log_performance(
            logger,
            "bedrock_invoke_question",
            course_id=course_id,
            section_id=section_id
        ):
            claude_response = bedrock_client.invoke_claude(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_tokens=1000
            )

        answer = claude_response.get('answer', '')
        tokens_used = claude_response.get('tokens_used', 0)

        logger.info("Question answered successfully", extra={
            'course_id': course_id,
            'section_id': section_id,
            'tokens_used': tokens_used,
            'answer_length': len(answer)
        })

        # 6. Guardar en sesión
        if session_id:
            dynamodb_client.save_session_message(
                session_id=session_id,
                user_id=user_id,
                course_id=course_id,
                section_id=section_id,
                message_type='question',
                content=question,
                response=answer
            )

        # 7. Ya se incrementó el contador en rate_limiter.check_and_increment()

        # Retornar respuesta
        return success_response({
            'answer': answer,
            'type': 'tutor_response',
            'usage': rate_limit_result.get('usage', {}),
            'tokens_used': claude_response.get('tokens_used', 0)
        })

    except Exception as e:
        logger.error(f"Error in handle_ask_question: {str(e)}", exc_info=True)
        return error_response(500, f'Error processing question: {str(e)}', origin=origin)


def handle_validate_checkpoint(user_id, body):
    """
    Maneja POST /api/tutor/validate

    Flujo:
    1. Validar rate limiting (checkpoints)
    2. Obtener checkpoint de DynamoDB
    3. Invocar Claude con criterios de validación
    4. Calcular score ponderado
    5. Guardar resultado en UserProgress
    6. Retornar feedback

    Args:
        user_id: ID del usuario
        body: {
            "course_id": "image-gen-bedrock",
            "section_id": 0,
            "answer": "API Gateway es un servicio que..."
        }

    Returns:
        dict: Response con score, feedback, passed
    """
    try:
        # Validar parámetros
        course_id = body.get('course_id')
        section_id = body.get('section_id')
        answer = body.get('answer')

        if not all([course_id, section_id is not None, answer]):
            return error_response(400, 'Missing required fields: course_id, section_id, answer', origin=origin)

        logger.info(f"User {user_id} validating checkpoint {course_id}/section_{section_id}")

        # 1. Rate limiting para checkpoints
        rate_limit_result = rate_limiter.check_and_increment(
            user_id=user_id,
            action_type='checkpoint'
        )

        if not rate_limit_result['allowed']:
            return error_response(429, f"Rate limit exceeded: {rate_limit_result['message']}", origin=origin)

        # 2. Obtener checkpoint de DynamoDB
        section_data = dynamodb_client.get_section(
            course_id=course_id,
            section_id=section_id
        )

        if not section_data or 'checkpoint' not in section_data:
            return error_response(404, f'Checkpoint not found for section {section_id}', origin=origin)

        checkpoint = section_data['checkpoint']

        # 3. Invocar validador de checkpoint con Claude
        validation_result = checkpoint_validator.validate_answer(
            question=checkpoint.get('question', ''),
            student_answer=answer,
            validation_criteria=checkpoint.get('validation_criteria', []),
            section_context=section_data
        )

        score = validation_result['score']
        passed = validation_result['passed']
        feedback = validation_result['feedback']

        # 4. Guardar resultado en UserProgress
        dynamodb_client.update_checkpoint_progress(
            user_id=user_id,
            course_id=course_id,
            section_id=section_id,
            score=score,
            passed=passed,
            answer=answer,
            feedback=feedback
        )

        # 5. Retornar resultado
        return success_response({
            'passed': passed,
            'score': score,
            'feedback': feedback,
            'criteria_results': validation_result.get('criteria_results', []),
            'usage': rate_limit_result.get('usage', {})
        })

    except Exception as e:
        logger.error(f"Error in handle_validate_checkpoint: {str(e)}", exc_info=True)
        return error_response(500, f'Error validating checkpoint: {str(e)}', origin=origin)


def handle_get_hint(user_id, params):
    """
    Maneja GET /api/tutor/hint?course_id=X&section_id=Y&level=1

    Flujo:
    1. Validar rate limiting (hints)
    2. Obtener hints de la sección
    3. Retornar hint según nivel

    Args:
        user_id: ID del usuario
        params: {
            "course_id": "image-gen-bedrock",
            "section_id": "0",
            "level": "1"  # 1, 2, o 3
        }

    Returns:
        dict: Response con hint text
    """
    try:
        # Validar parámetros
        course_id = params.get('course_id')
        section_id = params.get('section_id')
        level = params.get('level', '1')

        if not all([course_id, section_id]):
            return error_response(400, 'Missing required parameters: course_id, section_id', origin=origin)

        # Convertir a int
        try:
            section_id = int(section_id)
            level = int(level)
        except ValueError:
            return error_response(400, 'section_id and level must be integers', origin=origin)

        if level not in [1, 2, 3]:
            return error_response(400, 'level must be 1, 2, or 3', origin=origin)

        logger.info(f"User {user_id} requesting hint level {level} for {course_id}/section_{section_id}")

        # 1. Rate limiting para hints
        rate_limit_result = rate_limiter.check_and_increment(
            user_id=user_id,
            action_type='hint'
        )

        if not rate_limit_result['allowed']:
            return error_response(429, f"Rate limit exceeded: {rate_limit_result['message']}", origin=origin)

        # 2. Obtener hints de la sección
        section_data = dynamodb_client.get_section(
            course_id=course_id,
            section_id=section_id
        )

        if not section_data or 'checkpoint' not in section_data:
            return error_response(404, f'Checkpoint not found for section {section_id}', origin=origin)

        checkpoint = section_data['checkpoint']
        hints = checkpoint.get('hints', [])

        # Buscar hint del nivel solicitado
        hint_text = None
        for hint in hints:
            if hint.get('level') == level:
                hint_text = hint.get('text')
                break

        if not hint_text:
            return error_response(404, f'Hint level {level} not found', origin=origin)

        # 3. Registrar uso de hint en progreso
        dynamodb_client.record_hint_usage(
            user_id=user_id,
            course_id=course_id,
            section_id=section_id,
            hint_level=level
        )

        # 4. Retornar hint
        return success_response({
            'hint': hint_text,
            'level': level,
            'max_level': 3,
            'usage': rate_limit_result.get('usage', {})
        })

    except Exception as e:
        logger.error(f"Error in handle_get_hint: {str(e)}", exc_info=True)
        return error_response(500, f'Error getting hint: {str(e)}', origin=origin)


# success_response y error_response ahora se importan desde shared.response_utils
