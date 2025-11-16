"""
Lambda Handler: admin-handler
Maneja operaciones administrativas (CRUD de cursos)

Requiere grupo Cognito: Admins

Endpoints:
- POST /api/admin/courses - Crear curso
- PUT /api/admin/courses/{id} - Actualizar curso
- DELETE /api/admin/courses/{id} - Eliminar curso
"""

import json
import os
import sys
import logging
import boto3
from datetime import datetime, timezone
from decimal import Decimal

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
CATEGORIES_TABLE = os.environ.get('CATEGORIES_TABLE', 'Categories')
COGNITO_USER_POOL_ID = os.environ.get('COGNITO_USER_POOL_ID')

# Clientes AWS con connection pooling optimizado
dynamodb_config = get_config_for_service('dynamodb', 'us-east-1')
cognito_config = get_config_for_service('cognito-idp', 'us-east-1')

dynamodb = boto3.resource('dynamodb', config=dynamodb_config)
cognito = boto3.client('cognito-idp', config=cognito_config)
table = dynamodb.Table(COURSES_TABLE)
categories_table = dynamodb.Table(CATEGORIES_TABLE)


def lambda_handler(event, context):
    """
    Handler principal de Lambda

    Args:
        event: Evento de API Gateway
        context: Contexto de Lambda

    Returns:
        dict: Response con statusCode, headers, body
    """
        # Extraer origin para CORS whitelist (SECURITY: CRITICAL-3)
        headers = event.get("headers") or {}
        origin = headers.get("origin") or headers.get("Origin")

    try:
        logger.info(f"Received event: {json.dumps(event)}")

        # Extraer método HTTP y path
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        path_parameters = event.get('pathParameters') or {}

        # Extraer user_id del contexto de Cognito (usar username para admin operations)
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
        if http_method == 'POST' and path.endswith('/api/admin/courses'):
            return handle_create_course(body)

        elif http_method == 'PUT' and '/api/admin/courses/' in path:
            course_id = path_parameters.get('id')
            return handle_update_course(course_id, body)

        elif http_method == 'DELETE' and '/api/admin/courses/' in path:
            course_id = path_parameters.get('id')
            return handle_delete_course(course_id)

        else:
            return error_response(404, 'Endpoint not found', origin=origin)

    except Exception as e:
        logger.error(f"Unhandled error: {str(e)}", exc_info=True)
        return error_response(500, f'Internal server error: {str(e)}', origin=origin)


# extract_user_id e is_admin ahora se importan desde shared.auth_utils


def update_category_course_count(category_id, delta):
    """
    Incrementa o decrementa el course_count de una categoría

    Args:
        category_id: ID de la categoría
        delta: Valor a sumar (+1 para incrementar, -1 para decrementar)
    """
    try:
        logger.info(f"Updating course_count for category {category_id} with delta {delta}")

        categories_table.update_item(
            Key={
                'PK': f'CATEGORY#{category_id}',
                'SK': 'METADATA'
            },
            UpdateExpression='SET course_count = if_not_exists(course_count, :zero) + :delta, updated_at = :updated_at',
            ExpressionAttributeValues={
                ':delta': delta,
                ':zero': 0,
                ':updated_at': datetime.now(timezone.utc).isoformat()
            }
        )

        logger.info(f"Successfully updated course_count for category {category_id}")
    except Exception as e:
        logger.error(f"Error updating course_count for category {category_id}: {str(e)}")
        # No fallar la operación principal si falla la actualización del contador


def unfeatured_other_courses():
    """
    Desmarca is_featured=false en todos los cursos que lo tengan en true

    Esta función se llama cuando se marca un curso como estrella,
    para asegurar que solo 1 curso esté marcado como featured a la vez.

    Optimización: Usa FilterExpression y paginación para evitar leer todos los cursos.
    """
    try:
        from boto3.dynamodb.conditions import Key, Attr

        logger.info("Unmarking all featured courses")

        # Query del GSI con FilterExpression para solo traer los featured
        # Usar límite para evitar traer demasiados (normalmente debería haber solo 1)
        query_kwargs = {
            'IndexName': 'entity_type-created_at-index',
            'KeyConditionExpression': Key('entity_type').eq('COURSE_METADATA'),
            'FilterExpression': Attr('is_featured').eq(True),
            'Limit': 10  # Límite razonable (debería haber solo 1 featured)
        }

        unmarked_count = 0

        # Manejar paginación en caso de que haya múltiples featured (error de datos)
        while True:
            response = table.query(**query_kwargs)
            courses = response.get('Items', [])

            # Desmarcar todos los que tengan is_featured=true
            for course in courses:
                course_id = course.get('course_id')
                logger.info(f"Unmarking course {course_id} as featured")

                table.update_item(
                    Key={
                        'PK': f'COURSE#{course_id}',
                        'SK': 'METADATA'
                    },
                    UpdateExpression='SET is_featured = :false',
                    ExpressionAttributeValues={
                        ':false': False
                    }
                )
                unmarked_count += 1

            # Si no hay más páginas, salir
            if 'LastEvaluatedKey' not in response:
                break

            # Continuar con siguiente página
            query_kwargs['ExclusiveStartKey'] = response['LastEvaluatedKey']

        logger.info(f"Successfully unmarked {unmarked_count} featured courses")

    except Exception as e:
        logger.error(f"Error unmarking featured courses: {str(e)}")
        # No fallar la operación principal si esto falla


def handle_create_course(body):
    """
    Maneja POST /api/admin/courses

    Crea un nuevo curso con su metadata

    Args:
        body: {
            "course_id": "my-new-course",
            "course_name": "Mi Nuevo Curso",
            "description": "Descripción del curso",
            "category": "AWS",
            "difficulty": "Beginner",
            "total_sections": 0
        }

    Returns:
        dict: Response con curso creado
    """
    try:
        # Validar campos requeridos
        required_fields = ['course_id', 'course_name', 'description']
        missing_fields = InputValidator.validate_required_fields(body, required_fields)
        if missing_fields:
            return error_response(400, '; '.join(missing_fields), origin=origin)

        # Validar course_id
        course_id = body['course_id']
        error = InputValidator.validate_course_id(course_id)
        if error:
            return error_response(400, f'Invalid course_id: {error}', origin=origin)

        # Validar course_name
        error = InputValidator.validate_course_name(body['course_name'])
        if error:
            return error_response(400, f'Invalid course_name: {error}', origin=origin)

        # Validar description
        error = InputValidator.validate_description(body['description'], min_length=20, max_length=5000)
        if error:
            return error_response(400, f'Invalid description: {error}', origin=origin)

        # Validar difficulty si está presente
        if 'difficulty' in body:
            error = InputValidator.validate_difficulty(body['difficulty'])
            if error:
                return error_response(400, f'Invalid difficulty: {error}', origin=origin)

        # Verificar que el curso no existe
        existing = table.get_item(
            Key={
                'PK': f'COURSE#{course_id}',
                'SK': 'METADATA'
            }
        )

        if 'Item' in existing:
            return error_response(409, f'Course {course_id} already exists', origin=origin)

        # Crear metadata del curso
        timestamp = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

        metadata = {
            'PK': f'COURSE#{course_id}',
            'SK': 'METADATA',
            'entity_type': 'COURSE_METADATA',  # Para GSI
            'course_id': course_id,
            'course_name': body['course_name'],
            'title': body.get('title', ''),
            'description': body['description'],
            'category': body.get('category', 'General'),
            'difficulty': body.get('difficulty', 'Beginner'),
            'total_sections': 0,  # Se calculará automáticamente desde las secciones
            'student_count': body.get('student_count', 0),
            'average_rating': Decimal(str(body.get('average_rating', 0.0))),
            'completion_rate': Decimal(str(body.get('completion_rate', 0.0))),
            'created_at': timestamp,
            'updated_at': timestamp,
            'is_published': body.get('is_published', False),
            # Campos de metadata (Fase 1)
            'estimated_time': body.get('estimated_time', ''),
            'cost': Decimal(str(body.get('cost', 0))),
            'summary_30s': body.get('summary_30s', ''),
            'introduction': body.get('introduction', ''),
            'subtitle': body.get('subtitle', ''),
            'what_youll_need': body.get('what_youll_need', []),
            'key_concepts': body.get('key_concepts', []),
            # Campos opcionales para páginas de categoría
            'icon': body.get('icon', ''),
            'type': body.get('type', ''),
            'featured': body.get('featured', False),
            'color': body.get('color', ''),
            'rating': Decimal(str(body.get('rating', 0.0))) if body.get('rating') is not None else Decimal('0.0'),
            # Campo para curso estrella del home
            'is_featured': body.get('is_featured', False)
        }

        # Guardar en DynamoDB
        table.put_item(Item=metadata)

        logger.info(f"Course {course_id} created successfully")

        # Actualizar contador de la categoría si el curso está publicado
        if metadata['is_published']:
            update_category_course_count(metadata['category'], delta=1)

        # Convertir Decimals para response
        metadata_clean = convert_decimals(metadata)

        return success_response({
            'message': 'Course created successfully',
            'course': metadata_clean
        }, status_code=201)

    except Exception as e:
        logger.error(f"Error creating course: {str(e)}", exc_info=True)
        return error_response(500, f'Error creating course: {str(e)}', origin=origin)


def handle_update_course(course_id, body):
    """
    Maneja PUT /api/admin/courses/{id}

    Actualiza metadata de un curso existente

    Args:
        course_id: ID del curso
        body: Campos a actualizar

    Returns:
        dict: Response con curso actualizado
    """
    try:
        # Validar course_id del path
        error = InputValidator.validate_course_id(course_id)
        if error:
            return error_response(400, f'Invalid course_id: {error}', origin=origin)

        # Validar campos específicos si están presentes en body
        if 'course_name' in body:
            error = InputValidator.validate_course_name(body['course_name'])
            if error:
                return error_response(400, f'Invalid course_name: {error}', origin=origin)

        if 'description' in body:
            error = InputValidator.validate_description(body['description'], min_length=20, max_length=5000)
            if error:
                return error_response(400, f'Invalid description: {error}', origin=origin)

        if 'difficulty' in body:
            error = InputValidator.validate_difficulty(body['difficulty'])
            if error:
                return error_response(400, f'Invalid difficulty: {error}', origin=origin)

        # Verificar que el curso existe
        existing = table.get_item(
            Key={
                'PK': f'COURSE#{course_id}',
                'SK': 'METADATA'
            }
        )

        if 'Item' not in existing:
            return error_response(404, f'Course {course_id} not found', origin=origin)

        # Guardar valores antiguos para actualizar contadores
        old_course = existing['Item']
        old_category = old_course.get('category', '')
        old_is_published = old_course.get('is_published', False)

        # Construir update expression
        timestamp = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

        update_expression = 'SET updated_at = :updated_at'
        expression_values = {':updated_at': timestamp}
        expression_names = {}

        # Campos actualizables (fácil agregar más en el futuro)
        updatable_fields = [
            # Campos base
            'course_name', 'title', 'description', 'category', 'difficulty', 'is_published',
            # Campos de metadata (Fase 1)
            'estimated_time', 'cost', 'summary_30s', 'introduction', 'subtitle',
            'what_youll_need', 'key_concepts',
            # Campos opcionales para páginas de categoría
            'icon', 'type', 'featured', 'color', 'rating', 'student_count',
            'completion_rate', 'average_rating',
            # Campo para curso estrella del home
            'is_featured'
            # Fácil agregar más: 'tags', 'prerequisites', 'learning_outcomes', etc.
        ]

        # Campos numéricos que requieren conversión a Decimal
        decimal_fields = {'cost', 'rating', 'average_rating', 'completion_rate'}

        for field in updatable_fields:
            if field in body:
                update_expression += f', #{field} = :{field}'
                expression_names[f'#{field}'] = field

                # Convertir campos numéricos a Decimal para DynamoDB
                if field in decimal_fields:
                    expression_values[f':{field}'] = Decimal(str(body[field]))
                else:
                    expression_values[f':{field}'] = body[field]

        # LÓGICA ESPECIAL: Solo 1 curso puede ser is_featured=true
        # Si se está marcando este curso como featured, desmarcar todos los demás
        if body.get('is_featured') == True:
            logger.info(f"Marking course {course_id} as featured, unmarking all others")
            unfeatured_other_courses()

        # Ejecutar update
        response = table.update_item(
            Key={
                'PK': f'COURSE#{course_id}',
                'SK': 'METADATA'
            },
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_names if expression_names else None,
            ExpressionAttributeValues=expression_values,
            ReturnValues='ALL_NEW'
        )

        updated_course = response['Attributes']

        logger.info(f"Course {course_id} updated successfully")

        # Actualizar contadores de categorías si cambió is_published o category
        new_category = updated_course.get('category', old_category)
        new_is_published = updated_course.get('is_published', old_is_published)

        # Caso 1: Cambió el estado de publicación en la misma categoría
        if old_category == new_category and old_is_published != new_is_published:
            if new_is_published:
                # Se publicó: incrementar contador
                update_category_course_count(new_category, delta=1)
            else:
                # Se despublicó: decrementar contador
                update_category_course_count(old_category, delta=-1)

        # Caso 2: Cambió de categoría
        elif old_category != new_category:
            # Si estaba publicado en la categoría anterior, decrementar
            if old_is_published:
                update_category_course_count(old_category, delta=-1)
            # Si está publicado en la nueva categoría, incrementar
            if new_is_published:
                update_category_course_count(new_category, delta=1)

        # Convertir Decimals
        course_clean = convert_decimals(updated_course)

        return success_response({
            'message': 'Course updated successfully',
            'course': course_clean
        })

    except Exception as e:
        logger.error(f"Error updating course: {str(e)}", exc_info=True)
        return error_response(500, f'Error updating course: {str(e)}', origin=origin)


def handle_delete_course(course_id):
    """
    Maneja DELETE /api/admin/courses/{id}

    Elimina un curso y todas sus secciones

    Args:
        course_id: ID del curso

    Returns:
        dict: Response con confirmación
    """
    try:
        if not course_id:
            return error_response(400, 'Missing course_id', origin=origin)

        logger.info(f"Deleting course {course_id} and all its sections")

        # Obtener todas las secciones del curso
        from boto3.dynamodb.conditions import Key

        response = table.query(
            KeyConditionExpression=Key('PK').eq(f'COURSE#{course_id}')
        )

        items = response.get('Items', [])

        if not items:
            return error_response(404, f'Course {course_id} not found', origin=origin)

        # Buscar el metadata para obtener category y is_published antes de eliminar
        course_metadata = None
        for item in items:
            if item.get('SK') == 'METADATA':
                course_metadata = item
                break

        # Eliminar todos los items (metadata + secciones)
        deleted_count = 0
        for item in items:
            table.delete_item(
                Key={
                    'PK': item['PK'],
                    'SK': item['SK']
                }
            )
            deleted_count += 1

        logger.info(f"Deleted {deleted_count} items for course {course_id}")

        # Decrementar contador de la categoría si el curso estaba publicado
        if course_metadata:
            category = course_metadata.get('category', '')
            was_published = course_metadata.get('is_published', False)
            if was_published and category:
                update_category_course_count(category, delta=-1)

        return success_response({
            'message': f'Course {course_id} deleted successfully',
            'deleted_items': deleted_count
        })

    except Exception as e:
        logger.error(f"Error deleting course: {str(e)}", exc_info=True)
        return error_response(500, f'Error deleting course: {str(e)}', origin=origin)


# convert_decimals, success_response y error_response ahora se importan desde shared/
