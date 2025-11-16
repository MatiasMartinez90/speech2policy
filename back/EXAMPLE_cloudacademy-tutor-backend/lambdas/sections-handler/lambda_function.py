"""
Lambda Handler: sections-handler
Maneja operaciones CRUD de secciones de cursos

Requiere grupo Cognito: Admins

Endpoints:
- POST /api/admin/courses/{id}/sections - Crear sección
- PUT /api/admin/courses/{id}/sections/{sectionId} - Actualizar sección
- DELETE /api/admin/courses/{id}/sections/{sectionId} - Eliminar sección
- PUT /api/admin/courses/{id}/sections/reorder - Reordenar secciones
"""

import json
import os
import sys
import logging
import boto3
from datetime import datetime, timezone
from decimal import Decimal
from boto3.dynamodb.conditions import Key

# Agregar directorio shared al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Importar utilidades compartidas
from shared.auth_utils import extract_user_id, is_admin
from shared.response_utils import success_response, error_response
from shared.dynamodb_utils import convert_decimals
from shared.validators import InputValidator
from shared.boto3_config import get_config_for_service

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Variables de entorno
COURSES_TABLE = os.environ.get('COURSES_TABLE', 'CourseCatalog')
COGNITO_USER_POOL_ID = os.environ.get('COGNITO_USER_POOL_ID')

# Clientes AWS con connection pooling optimizado
dynamodb_config = get_config_for_service('dynamodb', 'us-east-1')
        # Extraer origin para CORS whitelist (SECURITY: CRITICAL-3)
        headers = event.get("headers") or {}
        origin = headers.get("origin") or headers.get("Origin")

cognito_config = get_config_for_service('cognito-idp', 'us-east-1')

dynamodb = boto3.resource('dynamodb', config=dynamodb_config)
cognito = boto3.client('cognito-idp', config=cognito_config)
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

        # Extraer user_id del contexto de Cognito
        user_id = extract_user_id(event, use_username=True)

        if not user_id or user_id.startswith('anon_'):
            return error_response(401, 'Authentication required', origin=origin)

        # Verificar que el usuario está en el grupo Admins
        if not is_admin(user_id, COGNITO_USER_POOL_ID):
            return error_response(403, 'Forbidden: Admin access required', origin=origin)

        # Parsear body si existe
        body = {}
        if event.get('body'):
            body = json.loads(event['body'])

        # Routing por endpoint
        course_id = path_parameters.get('id')

        if http_method == 'POST' and '/sections' in path and 'reorder' not in path:
            return handle_create_section(course_id, body)

        elif http_method == 'PUT' and '/sections/reorder' in path:
            return handle_reorder_sections(course_id, body)

        elif http_method == 'PUT' and '/sections/' in path:
            section_id = path_parameters.get('sectionId')
            return handle_update_section(course_id, section_id, body)

        elif http_method == 'DELETE' and '/sections/' in path:
            section_id = path_parameters.get('sectionId')
            return handle_delete_section(course_id, section_id)

        else:
            return error_response(404, 'Endpoint not found', origin=origin)

    except Exception as e:
        logger.error(f"Unhandled error: {str(e)}", exc_info=True)
        return error_response(500, f'Internal server error: {str(e)}', origin=origin)


def extract_user_id(event):
    """
    Extrae el user_id del contexto de Cognito

    Args:
        event: Evento de API Gateway

    Returns:
        str: Username de Cognito (ej: Google_111137626603562904354) o anon_IP
    """
    try:
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})

        # IMPORTANTE: Usar 'cognito:username' en lugar de 'email'
        # Para usuarios de Google OAuth, el username es algo como "Google_111137626603562904354"
        # mientras que el email es "user@example.com"
        # Cognito requiere el username para admin_list_groups_for_user
        username = claims.get('cognito:username')

        if username:
            logger.info(f"Extracted username from claims: {username}")
            return username

        source_ip = event.get('requestContext', {}).get('identity', {}).get('sourceIp', 'unknown')
        return f"anon_{source_ip}"

    except Exception as e:
        logger.warning(f"Error extracting user_id: {str(e)}")
        return "anon_unknown"


def is_admin(user_id):
    """
    Verifica si el usuario está en el grupo Admins de Cognito

    Args:
        user_id: Username de Cognito (ej: Google_111137626603562904354)

    Returns:
        bool: True si es admin
    """
    try:
        logger.info(f"Checking if {user_id} is admin")

        # Listar grupos del usuario
        # user_id debe ser el Cognito Username, no el email
        response = cognito.admin_list_groups_for_user(
            Username=user_id,
            UserPoolId=COGNITO_USER_POOL_ID
        )

        groups = response.get('Groups', [])
        group_names = [group['GroupName'] for group in groups]

        is_admin = 'Admins' in group_names

        logger.info(f"User {user_id} groups: {group_names}, is_admin: {is_admin}")

        return is_admin

    except Exception as e:
        logger.error(f"Error checking admin status: {str(e)}")
        return False


def handle_create_section(course_id, body):
    """
    Maneja POST /api/admin/courses/{id}/sections

    Crea una nueva sección para un curso

    Args:
        course_id: ID del curso
        body: {
            "title": "Introducción a Terraform",
            "content": "<p>HTML content...</p>",
            "estimated_time": "30 minutos",
            "order": 1,
            "images": ["https://..."],
            "agent_config": {
                "system_prompt": "...",
                "validation_criteria": {},
                "hints": {...}
            }
        }

    Returns:
        dict: Response con sección creada
    """
    try:
        # Validar course_id
        error = InputValidator.validate_course_id(course_id)
        if error:
            return error_response(400, f'Invalid course_id: {error}', origin=origin)

        # Validar campos requeridos
        required_fields = ['title', 'order']
        missing_fields = InputValidator.validate_required_fields(body, required_fields)
        if missing_fields:
            return error_response(400, '; '.join(missing_fields), origin=origin)

        # Validar title
        error = InputValidator.validate_course_name(body['title'])  # Usa misma validación que course_name
        if error:
            return error_response(400, f'Invalid title: {error}', origin=origin)

        # Validar order (section_id)
        error = InputValidator.validate_section_id(body['order'])
        if error:
            return error_response(400, f'Invalid order: {error}', origin=origin)

        # Validar content si está presente
        if 'content' in body and body['content']:
            error = InputValidator.validate_description(body['content'], min_length=10, max_length=50000)
            if error:
                return error_response(400, f'Invalid content: {error}', origin=origin)

        # Verificar que el curso existe
        existing = table.get_item(
            Key={
                'PK': f'COURSE#{course_id}',
                'SK': 'METADATA'
            }
        )

        if 'Item' not in existing:
            return error_response(404, f'Course {course_id} not found', origin=origin)

        # Generar section_id basado en el order
        section_id = body['order']
        timestamp = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

        # Crear item de sección
        section = {
            'PK': f'COURSE#{course_id}',
            'SK': f'SECTION#{section_id}',
            'section_id': section_id,
            'title': body['title'],
            'order': body['order'],
            'content': body.get('content', ''),
            'estimated_time': body.get('estimated_time', ''),
            'images': body.get('images', []),
            'agent_config': body.get('agent_config', {
                'system_prompt': '',
                'validation_criteria': {},
                'hints': {
                    'level_1': '',
                    'level_2': '',
                    'level_3': ''
                }
            }),
            'created_at': timestamp,
            'updated_at': timestamp
        }

        # Guardar en DynamoDB
        table.put_item(Item=section)

        # Actualizar total_sections en metadata del curso
        update_course_total_sections(course_id)

        logger.info(f"Section {section_id} created for course {course_id}")

        # Convertir Decimals para response
        section_clean = convert_decimals(section)

        return success_response({
            'message': 'Section created successfully',
            'section': section_clean
        }, status_code=201)

    except Exception as e:
        logger.error(f"Error creating section: {str(e)}", exc_info=True)
        return error_response(500, f'Error creating section: {str(e)}', origin=origin)


def handle_update_section(course_id, section_id, body):
    """
    Maneja PUT /api/admin/courses/{id}/sections/{sectionId}

    Actualiza una sección existente

    Args:
        course_id: ID del curso
        section_id: ID de la sección
        body: Campos a actualizar

    Returns:
        dict: Response con sección actualizada
    """
    try:
        if not course_id or not section_id:
            return error_response(400, 'Missing course_id or section_id', origin=origin)

        # Verificar que la sección existe
        existing = table.get_item(
            Key={
                'PK': f'COURSE#{course_id}',
                'SK': f'SECTION#{section_id}'
            }
        )

        if 'Item' not in existing:
            return error_response(404, f'Section {section_id} not found in course {course_id}', origin=origin)

        # Construir update expression
        timestamp = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

        update_expression = 'SET updated_at = :updated_at'
        expression_values = {':updated_at': timestamp}
        expression_names = {}

        # Campos actualizables
        updatable_fields = ['title', 'content', 'estimated_time', 'order', 'images', 'agent_config']

        # Log para debugging
        logger.info(f"Body received: {json.dumps(body)}")
        logger.info(f"Fields in body: {list(body.keys())}")

        for field in updatable_fields:
            if field in body:
                logger.info(f"Updating field '{field}' with value: {body[field]}")
                update_expression += f', #{field} = :{field}'
                expression_names[f'#{field}'] = field
                expression_values[f':{field}'] = body[field]

        logger.info(f"Final update expression: {update_expression}")
        logger.info(f"Expression values: {expression_values}")

        # Ejecutar update
        response = table.update_item(
            Key={
                'PK': f'COURSE#{course_id}',
                'SK': f'SECTION#{section_id}'
            },
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_names if expression_names else None,
            ExpressionAttributeValues=expression_values,
            ReturnValues='ALL_NEW'
        )

        updated_section = response['Attributes']

        logger.info(f"Section {section_id} updated in course {course_id}")

        # Convertir Decimals
        section_clean = convert_decimals(updated_section)

        return success_response({
            'message': 'Section updated successfully',
            'section': section_clean
        })

    except Exception as e:
        logger.error(f"Error updating section: {str(e)}", exc_info=True)
        return error_response(500, f'Error updating section: {str(e)}', origin=origin)


def handle_delete_section(course_id, section_id):
    """
    Maneja DELETE /api/admin/courses/{id}/sections/{sectionId}

    Elimina una sección

    Args:
        course_id: ID del curso
        section_id: ID de la sección

    Returns:
        dict: Response con confirmación
    """
    try:
        if not course_id or not section_id:
            return error_response(400, 'Missing course_id or section_id', origin=origin)

        # Verificar que la sección existe
        existing = table.get_item(
            Key={
                'PK': f'COURSE#{course_id}',
                'SK': f'SECTION#{section_id}'
            }
        )

        if 'Item' not in existing:
            return error_response(404, f'Section {section_id} not found', origin=origin)

        # Eliminar sección
        table.delete_item(
            Key={
                'PK': f'COURSE#{course_id}',
                'SK': f'SECTION#{section_id}'
            }
        )

        # Actualizar total_sections en metadata del curso
        update_course_total_sections(course_id)

        logger.info(f"Section {section_id} deleted from course {course_id}")

        return success_response({
            'message': f'Section {section_id} deleted successfully'
        })

    except Exception as e:
        logger.error(f"Error deleting section: {str(e)}", exc_info=True)
        return error_response(500, f'Error deleting section: {str(e)}', origin=origin)


def handle_reorder_sections(course_id, body):
    """
    Maneja PUT /api/admin/courses/{id}/sections/reorder

    Reordena las secciones de un curso

    Args:
        course_id: ID del curso
        body: {
            "sections": [
                {"section_id": 1, "order": 0},
                {"section_id": 2, "order": 1},
                {"section_id": 3, "order": 2}
            ]
        }

    Returns:
        dict: Response con confirmación
    """
    try:
        if 'sections' not in body:
            return error_response(400, 'Missing sections array', origin=origin)

        sections = body['sections']
        updated_count = 0

        for section_data in sections:
            section_id = section_data['section_id']
            new_order = section_data['order']

            try:
                table.update_item(
                    Key={
                        'PK': f'COURSE#{course_id}',
                        'SK': f'SECTION#{section_id}'
                    },
                    UpdateExpression='SET #order = :order, updated_at = :updated_at',
                    ExpressionAttributeNames={'#order': 'order'},
                    ExpressionAttributeValues={
                        ':order': new_order,
                        ':updated_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
                    }
                )
                updated_count += 1
            except Exception as e:
                logger.warning(f"Failed to update section {section_id}: {str(e)}")

        logger.info(f"Reordered {updated_count} sections for course {course_id}")

        return success_response({
            'message': f'Reordered {updated_count} sections successfully',
            'updated_count': updated_count
        })

    except Exception as e:
        logger.error(f"Error reordering sections: {str(e)}", exc_info=True)
        return error_response(500, f'Error reordering sections: {str(e)}', origin=origin)


def update_course_total_sections(course_id):
    """
    Actualiza el total_sections en la metadata del curso
    contando las secciones existentes

    Args:
        course_id: ID del curso
    """
    try:
        # Contar secciones del curso
        response = table.query(
            KeyConditionExpression=Key('PK').eq(f'COURSE#{course_id}') & Key('SK').begins_with('SECTION#')
        )

        total_sections = len(response.get('Items', []))

        # Actualizar metadata
        table.update_item(
            Key={
                'PK': f'COURSE#{course_id}',
                'SK': 'METADATA'
            },
            UpdateExpression='SET total_sections = :total',
            ExpressionAttributeValues={':total': total_sections}
        )

        logger.info(f"Updated total_sections to {total_sections} for course {course_id}")

    except Exception as e:
        logger.error(f"Error updating total_sections: {str(e)}")


# convert_decimals, extract_user_id, is_admin, success_response y error_response ahora se importan desde shared/
