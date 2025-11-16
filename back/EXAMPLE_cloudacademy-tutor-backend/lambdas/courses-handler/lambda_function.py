"""
Lambda Handler: courses-handler
Maneja lectura de cursos y secciones del catálogo

Endpoints:
- GET /api/courses - Listar todos los cursos
- GET /api/courses/{id} - Detalle de un curso
- GET /api/courses/{id}/sections/{sectionId} - Contenido de una sección
"""

import json
import os
import sys
import logging
import base64
import boto3
from boto3.dynamodb.conditions import Key
from decimal import Decimal

# Agregar directorio shared al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Importar utilidades compartidas
from shared.response_utils import success_response, error_response
from shared.dynamodb_utils import convert_decimals
from shared.boto3_config import get_config_for_service
from shared.validators import InputValidator  # SECURITY: HIGH-1

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Variables de entorno
COURSES_TABLE = os.environ.get('COURSES_TABLE', 'CourseCatalog')

# Cliente DynamoDB con connection pooling optimizado
dynamodb_config = get_config_for_service('dynamodb', 'us-east-1')
dynamodb = boto3.resource('dynamodb', config=dynamodb_config)
table = dynamodb.Table(COURSES_TABLE)


def lambda_handler(event, context):
    """
    Handler principal de Lambda

    Args:
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
        path_parameters = event.get('pathParameters') or {}

        # Routing por endpoint
        if http_method == 'GET':
        # Extraer origin para CORS whitelist (SECURITY: CRITICAL-3)
        headers = event.get("headers") or {}
        origin = headers.get("origin") or headers.get("Origin")

            # GET /api/courses/{id}/sections/{sectionId}
            if '/sections/' in path:
                course_id = path_parameters.get('id')
                section_id = path_parameters.get('sectionId')
                return handle_get_section(course_id, section_id)

            # GET /api/courses/{id}
            elif path_parameters.get('id'):
                course_id = path_parameters.get('id')
                return handle_get_course(course_id)

            # GET /api/courses
            else:
                # Extraer query string parameters para filtros
                query_params = event.get('queryStringParameters') or {}
                return handle_list_courses(query_params)

        else:
            return error_response(405, 'Method not allowed', origin=origin)

    except Exception as e:
        logger.error(f"Unhandled error: {str(e)}", exc_info=True)
        return error_response(500, f'Internal server error: {str(e)}', origin=origin)


def handle_list_courses(query_params=None):
    """
    Maneja GET /api/courses

    Soporta filtros por query params:
    - category: Filtrar por categoría (ej: bedrock, security, networking)
    - difficulty: Filtrar por dificultad (Beginner, Intermediate, Advanced)
    - is_published: Filtrar por estado de publicación (true/false)
    - limit: Número de resultados por página (default: 20, max: 100)
    - next_token: Token de paginación para obtener siguiente página

    Retorna lista paginada de cursos disponibles (solo metadata)

    Args:
        query_params: dict con query string parameters

    Returns:
        dict: Response con lista de cursos paginados
    """
    try:
        query_params = query_params or {}
        logger.info(f"Listing courses with filters: {query_params}")

        # Parámetros de paginación
        limit = min(int(query_params.get('limit', 20)), 100)  # Max 100 items por página
        next_token = query_params.get('next_token')

        # Construir FilterExpression dinámico para filtros opcionales
        filter_parts = []
        expression_values = {}

        # Filtro por categoría
        if 'category' in query_params and query_params['category']:
            filter_parts.append('category = :category')
            expression_values[':category'] = query_params['category']

        # Filtro por dificultad
        if 'difficulty' in query_params and query_params['difficulty']:
            filter_parts.append('difficulty = :difficulty')
            expression_values[':difficulty'] = query_params['difficulty']

        # Filtro por estado de publicación
        if 'is_published' in query_params:
            # Convertir string a boolean
            is_published_str = query_params['is_published'].lower()
            if is_published_str in ['true', '1', 'yes']:
                filter_parts.append('is_published = :is_published')
                expression_values[':is_published'] = True
            elif is_published_str in ['false', '0', 'no']:
                filter_parts.append('is_published = :is_published')
                expression_values[':is_published'] = False

        # Preparar parámetros del query usando GSI
        # Usamos el GSI entity_type-created_at-index para query eficiente
        query_kwargs = {
            'IndexName': 'entity_type-created_at-index',
            'KeyConditionExpression': Key('entity_type').eq('COURSE_METADATA'),
            'ScanIndexForward': False,  # Ordenar por created_at descendente (más recientes primero)
            'Limit': limit
        }

        # Agregar FilterExpression si hay filtros
        if filter_parts:
            filter_expression = ' AND '.join(filter_parts)
            query_kwargs['FilterExpression'] = filter_expression
            query_kwargs['ExpressionAttributeValues'] = expression_values
            logger.info(f"Filter expression: {filter_expression}")
            logger.info(f"Expression values: {expression_values}")

        # Si hay next_token, decodificarlo y usarlo como ExclusiveStartKey
        if next_token:
            try:
                exclusive_start_key = json.loads(base64.b64decode(next_token).decode('utf-8'))
                query_kwargs['ExclusiveStartKey'] = exclusive_start_key
                logger.info(f"Continuing query from: {exclusive_start_key}")
            except Exception as e:
                logger.warning(f"Invalid next_token: {e}")
                return error_response(400, 'Invalid next_token parameter', origin=origin)

        # Query del GSI para obtener solo metadata de cursos (mucho más rápido que scan)
        response = table.query(**query_kwargs)

        courses = response.get('Items', [])

        # Convertir Decimals a float para JSON
        courses_clean = [convert_decimals(course) for course in courses]

        # No es necesario ordenar manualmente - el GSI ya retorna ordenado por created_at descendente
        logger.info(f"Found {len(courses_clean)} courses (after filters)")

        # Preparar next_token si hay más resultados
        response_data = {
            'courses': courses_clean,
            'count': len(courses_clean),
            'limit': limit,
            'filters': query_params  # Devolver filtros aplicados para debugging
        }

        # Si hay LastEvaluatedKey, codificarlo como next_token
        if 'LastEvaluatedKey' in response:
            last_key = response['LastEvaluatedKey']
            next_token_encoded = base64.b64encode(json.dumps(last_key).encode('utf-8')).decode('utf-8')
            response_data['next_token'] = next_token_encoded
            response_data['has_more'] = True
            logger.info(f"More results available, next_token generated")
        else:
            response_data['has_more'] = False
            logger.info(f"No more results available")

        return success_response(response_data, origin=origin)

    except Exception as e:
        logger.error(f"Error listing courses: {str(e)}", exc_info=True)
        return error_response(500, f'Error listing courses: {str(e)}', origin=origin)


def handle_get_course(course_id):
    """
    Maneja GET /api/courses/{id}

    Retorna metadata del curso y todas las secciones con contenido completo

    Args:
        course_id: ID del curso

    Returns:
        dict: Response con metadata y secciones completas
    """
    try:
        # SECURITY (HIGH-1): Validar course_id para prevenir NoSQL injection
        error = InputValidator.validate_course_id(course_id)
        if error:
            logger.warning(f"SECURITY: Invalid course_id rejected: {course_id} - {error}")
            return error_response(400, f'Invalid course_id: {error}', origin=origin)

        logger.info(f"Getting course: {course_id}")

        # Obtener metadata del curso
        metadata_response = table.get_item(
            Key={
                'PK': f'COURSE#{course_id}',
                'SK': 'METADATA'
            }
        )

        if 'Item' not in metadata_response:
            return error_response(404, f'Course {course_id} not found', origin=origin)

        metadata = metadata_response['Item']

        # Obtener todas las secciones con contenido completo
        sections_response = table.query(
            KeyConditionExpression=Key('PK').eq(f'COURSE#{course_id}') & Key('SK').begins_with('SECTION#'),
            ProjectionExpression='section_id, title, content, estimated_time, #order, images, agent_config',
            ExpressionAttributeNames={
                '#order': 'order'  # 'order' es palabra reservada
            }
        )

        sections = sections_response.get('Items', [])

        # Ordenar secciones por section_id
        sections.sort(key=lambda x: x.get('section_id', 0))

        # Convertir Decimals
        metadata_clean = convert_decimals(metadata)
        sections_clean = [convert_decimals(section) for section in sections]

        logger.info(f"Course {course_id} found with {len(sections_clean)} sections")

        return success_response({
            'course': metadata_clean,
            'sections': sections_clean,
            'total_sections': len(sections_clean)
        })

    except Exception as e:
        logger.error(f"Error getting course {course_id}: {str(e)}", exc_info=True)
        return error_response(500, f'Error getting course: {str(e)}', origin=origin)


def handle_get_section(course_id, section_id):
    """
    Maneja GET /api/courses/{id}/sections/{sectionId}

    Retorna contenido completo de una sección

    Args:
        course_id: ID del curso
        section_id: ID de la sección (string o int)

    Returns:
        dict: Response con contenido de la sección
    """
    try:
        # SECURITY (HIGH-1): Validar course_id para prevenir NoSQL injection
        error = InputValidator.validate_course_id(course_id)
        if error:
            logger.warning(f"SECURITY: Invalid course_id rejected: {course_id} - {error}")
            return error_response(400, f'Invalid course_id: {error}', origin=origin)

        # SECURITY (HIGH-1): Validar section_id
        try:
            section_id_int = int(section_id)
            # Validar rango razonable (0-999)
            if section_id_int < 0 or section_id_int > 999:
                logger.warning(f"SECURITY: Invalid section_id out of range: {section_id_int}")
                return error_response(400, 'section_id must be between 0 and 999', origin=origin)
        except (ValueError, TypeError):
            logger.warning(f"SECURITY: Non-numeric section_id rejected: {section_id}")
            return error_response(400, 'section_id must be a valid integer', origin=origin)

        logger.info(f"Getting section {section_id_int} from course {course_id}")

        # Obtener sección completa
        response = table.get_item(
            Key={
                'PK': f'COURSE#{course_id}',
                'SK': f'SECTION#{section_id_int}'
            }
        )

        if 'Item' not in response:
            return error_response(404, f'Section {section_id_int} not found in course {course_id}', origin=origin)

        section = response['Item']

        # Convertir Decimals
        section_clean = convert_decimals(section)

        logger.info(f"Section {section_id_int} retrieved successfully")

        return success_response({
            'section': section_clean
        })

    except Exception as e:
        logger.error(f"Error getting section {section_id}: {str(e)}", exc_info=True)
        return error_response(500, f'Error getting section: {str(e)}', origin=origin)


# convert_decimals, success_response y error_response ahora se importan desde shared/
