"""
Lambda Handler: progress-handler
Maneja lectura de progreso de usuarios en cursos

Endpoints:
- GET /api/tutor/progress?course_id=X - Obtener progreso del usuario autenticado
"""

import json
import os
import sys
import logging
import boto3
from decimal import Decimal

# Agregar directorio shared al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Importar utilidades compartidas
from shared.auth_utils import extract_user_id
from shared.response_utils import success_response, error_response
from shared.dynamodb_utils import convert_decimals
from shared.boto3_config import get_config_for_service

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Variables de entorno
PROGRESS_TABLE = os.environ.get('PROGRESS_TABLE', 'UserProgress')

# Cliente DynamoDB con connection pooling optimizado
dynamodb_config = get_config_for_service('dynamodb', 'us-east-1')
dynamodb = boto3.resource('dynamodb', config=dynamodb_config)
table = dynamodb.Table(PROGRESS_TABLE)


def lambda_handler(event, context):
    """
    Handler principal de Lambda

    Args:
        # Extraer origin para CORS whitelist (SECURITY: CRITICAL-3)
        headers = event.get("headers") or {}
        origin = headers.get("origin") or headers.get("Origin")

        event: Evento de API Gateway
        context: Contexto de Lambda

    Returns:
        dict: Response con statusCode, headers, body
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")

        # Extraer método HTTP y path
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')

        # Extraer user_id del contexto de Cognito
        user_id = extract_user_id(event)

        if not user_id or user_id.startswith('anon_'):
            return error_response(401, 'Authentication required to access progress', origin=origin)

        # Routing por endpoint
        if http_method == 'GET' and path.endswith('/api/tutor/progress'):
            # Obtener course_id de query parameters
            query_params = event.get('queryStringParameters') or {}
            course_id = query_params.get('course_id')

            if not course_id:
                return error_response(400, 'Missing required parameter: course_id', origin=origin)

            return handle_get_progress(user_id, course_id)

        else:
            return error_response(404, 'Endpoint not found', origin=origin)

    except Exception as e:
        logger.error(f"Unhandled error: {str(e)}", exc_info=True)
        return error_response(500, f'Internal server error: {str(e)}', origin=origin)


# extract_user_id ahora se importa desde shared.auth_utils


def handle_get_progress(user_id, course_id):
    """
    Maneja GET /api/tutor/progress?course_id=X

    Retorna progreso del usuario en un curso específico

    Args:
        user_id: Email del usuario
        course_id: ID del curso

    Returns:
        dict: Response con progreso
    """
    try:
        logger.info(f"Getting progress for user {user_id} in course {course_id}")

        # Obtener progreso de DynamoDB
        response = table.get_item(
            Key={
                'PK': f'USER#{user_id}',
                'SK': f'COURSE#{course_id}'
            }
        )

        if 'Item' not in response:
            # No hay progreso registrado, retornar progreso vacío
            logger.info(f"No progress found for user {user_id} in course {course_id}")
            return success_response({
                'user_id': user_id,
                'course_id': course_id,
                'current_section': 0,
                'total_checkpoints': 0,
                'checkpoints_passed': 0,
                'checkpoints_completed': {},
                'hints_used': {},
                'started_at': None,
                'last_activity': None,
                'completion_percentage': 0
            })

        progress = response['Item']

        # Convertir Decimals
        progress_clean = convert_decimals(progress)

        # Calcular completion percentage
        total_checkpoints = progress_clean.get('total_checkpoints', 0)
        checkpoints_passed = progress_clean.get('checkpoints_passed', 0)

        if total_checkpoints > 0:
            completion_percentage = int((checkpoints_passed / total_checkpoints) * 100)
        else:
            completion_percentage = 0

        progress_clean['completion_percentage'] = completion_percentage

        logger.info(f"Progress retrieved: {completion_percentage}% complete")

        return success_response(progress_clean, origin=origin)

    except Exception as e:
        logger.error(f"Error getting progress: {str(e)}", exc_info=True)
        return error_response(500, f'Error getting progress: {str(e)}', origin=origin)


# convert_decimals, success_response y error_response ahora se importan desde shared/
