"""
Lambda Handler para gestión de Categorías de Cursos
Endpoints:
- GET /categories - Lista todas las categorías activas (público)
- GET /categories/{category_id} - Obtiene una categoría específica (público)
- POST /categories - Crea nueva categoría (requiere admin)
- PUT /categories/{category_id} - Actualiza categoría (requiere admin)
- DELETE /categories/{category_id} - Elimina categoría (requiere admin)
- POST /categories/recalculate-counts - Recalcula contadores (requiere admin)
"""

import json
import boto3
import os
import sys
import logging
from datetime import datetime
from decimal import Decimal
from boto3.dynamodb.conditions import Key

# Agregar directorio shared al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Importar utilidades compartidas
from shared.auth_utils import extract_user_id, is_admin
from shared.response_utils import success_response, error_response
from shared.dynamodb_utils import decimal_default
from shared.validators import InputValidator
from shared.boto3_config import get_config_for_service

# Configuración de logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Configuración de AWS clients con connection pooling optimizado
dynamodb_config = get_config_for_service('dynamodb', 'us-east-1')
cognito_config = get_config_for_service('cognito-idp', 'us-east-1')

dynamodb = boto3.resource('dynamodb', config=dynamodb_config)
cognito = boto3.client('cognito-idp', config=cognito_config)
        # Extraer origin para CORS whitelist (SECURITY: CRITICAL-3)
        headers = event.get("headers") or {}
        origin = headers.get("origin") or headers.get("Origin")


categories_table = dynamodb.Table(os.environ.get('CATEGORIES_TABLE', 'Categories'))
courses_table = dynamodb.Table(os.environ.get('COURSES_TABLE', 'Courses'))
COGNITO_USER_POOL_ID = os.environ.get('COGNITO_USER_POOL_ID')

# decimal_default, extract_user_id (get_user_id) e is_admin ahora se importan desde shared/
# Alias para compatibilidad con código existente
get_user_id = extract_user_id

def lambda_handler(event, context):
    """Main handler para todas las rutas de categorías"""
    print(f"Event received: {json.dumps(event)}")

    http_method = event.get('httpMethod', '')
    path = event.get('path', '')
    path_params = event.get('pathParameters') or {}

    try:
        # Routing basado en método HTTP y path
        if http_method == 'GET' and path == '/api/categories' and not path_params:
            return list_categories(event)
        elif http_method == 'GET' and 'category_id' in (path_params or {}):
            return get_category(path_params['category_id'])
        elif http_method == 'POST' and path == '/api/categories/recalculate-counts':
            return recalculate_course_counts(event)
        elif http_method == 'POST' and path == '/api/categories':
            return create_category(event)
        elif http_method == 'PUT' and 'category_id' in (path_params or {}):
            return update_category(path_params['category_id'], event)
        elif http_method == 'DELETE' and 'category_id' in (path_params or {}):
            return delete_category(path_params['category_id'], event)
        else:
            return build_response(404, {'error': 'Route not found', 'path': path, 'method': http_method})

    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return build_response(500, {'error': str(e)})

def list_categories(event):
    """
    GET /categories
    Lista todas las categorías activas ordenadas por display_order
    Query params opcionales:
    - include_inactive: true/false (default: false)
    - featured: true/false (filtra solo destacadas)
    """
    query_params = event.get('queryStringParameters') or {}
    include_inactive = query_params.get('include_inactive', 'false').lower() == 'true'
    featured_only = query_params.get('featured', 'false').lower() == 'true'

    try:
        if include_inactive:
            # Scan completo si se piden inactivas también
            response = categories_table.scan()
            items = response.get('Items', [])
        else:
            # Usar GSI para obtener solo activas ordenadas
            response = categories_table.query(
                IndexName='display_order-index',
                KeyConditionExpression=Key('is_active').eq('true'),
                ScanIndexForward=True  # Orden ascendente por display_order
            )
            items = response.get('Items', [])

        # Filtrar por featured si se solicita
        if featured_only:
            items = [item for item in items if item.get('featured', False)]

        # Transformar items para el frontend
        categories = []
        for item in items:
            category = {
                'category_id': item['PK'].replace('CATEGORY#', ''),
                'label': item.get('label', ''),
                'emoji': item.get('emoji', ''),
                'color': item.get('color', ''),
                'description': item.get('description', ''),
                'architecture': item.get('architecture', []),
                'course_count': item.get('course_count', 0),
                'level': item.get('level', 'beginner'),
                'display_order': item.get('display_order', 0),
                'is_active': item.get('is_active') == 'true',
                'featured': item.get('featured', False),
                'created_at': item.get('created_at', ''),
                'updated_at': item.get('updated_at', '')
            }
            categories.append(category)

        return build_response(200, {
            'categories': categories,
            'count': len(categories)
        })

    except Exception as e:
        print(f"Error listing categories: {str(e)}")
        return build_response(500, {'error': 'Failed to list categories'})

def get_category(category_id):
    """
    GET /categories/{category_id}
    Obtiene una categoría específica por ID
    """
    try:
        result = categories_table.get_item(
            Key={
                'PK': f'CATEGORY#{category_id}',
                'SK': 'METADATA'
            }
        )

        if 'Item' not in result:
            return build_response(404, {'error': 'Category not found'})

        item = result['Item']
        category = {
            'category_id': item['PK'].replace('CATEGORY#', ''),
            'label': item.get('label', ''),
            'emoji': item.get('emoji', ''),
            'color': item.get('color', ''),
            'description': item.get('description', ''),
            'architecture': item.get('architecture', []),
            'course_count': item.get('course_count', 0),
            'level': item.get('level', 'beginner'),
            'display_order': item.get('display_order', 0),
            'is_active': item.get('is_active') == 'true',
            'featured': item.get('featured', False),
            'created_at': item.get('created_at', ''),
            'updated_at': item.get('updated_at', '')
        }

        return build_response(200, category)

    except Exception as e:
        print(f"Error getting category: {str(e)}")
        return build_response(500, {'error': 'Failed to get category'})

def create_category(event):
    """
    POST /categories
    Crea una nueva categoría (requiere permisos de admin)
    Body: {
        "label": "string",
        "emoji": "string",
        "color": "string",
        "description": "string",
        "architecture": [],
        "level": "beginner|intermediate|advanced",
        "display_order": number,
        "featured": boolean
    }
    """
    try:
        # Verificar permisos de admin
        user_id = get_user_id(event, use_username=True)
        if not is_admin(user_id, COGNITO_USER_POOL_ID):
            logger.warning(f"User {user_id} attempted to create category without admin privileges")
            return build_response(403, {'error': 'Access denied. Admin privileges required.'})
        # Parsear body
        body = json.loads(event.get('body', '{}'))

        # Validar campos requeridos
        required_fields = ['label', 'emoji', 'color', 'description']
        missing_fields = InputValidator.validate_required_fields(body, required_fields)
        if missing_fields:
            return build_response(400, {'error': '; '.join(missing_fields)})

        # Validar label
        error = InputValidator.validate_course_name(body['label'])  # Usa misma validación
        if error:
            return build_response(400, {'error': f'Invalid label: {error}'})

        # Generar category_id desde label (slug)
        category_id = body['label'].lower().replace(' ', '-').replace('&', 'and')
        # Limpiar caracteres especiales
        category_id = ''.join(c for c in category_id if c.isalnum() or c == '-')

        # Verificar que no exista
        existing = categories_table.get_item(
            Key={
                'PK': f'CATEGORY#{category_id}',
                'SK': 'METADATA'
            }
        )

        if 'Item' in existing:
            return build_response(409, {'error': 'Category with this label already exists'})

        # Preparar item
        now = datetime.utcnow().isoformat()
        item = {
            'PK': f'CATEGORY#{category_id}',
            'SK': 'METADATA',
            'category_id': category_id,
            'label': body['label'],
            'emoji': body['emoji'],
            'color': body['color'],
            'description': body['description'],
            'architecture': body.get('architecture', []),
            'course_count': body.get('course_count', 0),
            'level': body.get('level', 'beginner'),
            'display_order': body.get('display_order', 999),
            'is_active': 'true',  # String para GSI
            'featured': body.get('featured', False),
            'created_at': now,
            'updated_at': now
        }

        # Guardar en DynamoDB
        categories_table.put_item(Item=item)

        # Retornar categoría creada
        category = {
            'category_id': category_id,
            'label': item['label'],
            'emoji': item['emoji'],
            'color': item['color'],
            'description': item['description'],
            'architecture': item['architecture'],
            'course_count': item['course_count'],
            'level': item['level'],
            'display_order': item['display_order'],
            'is_active': True,
            'featured': item['featured'],
            'created_at': item['created_at'],
            'updated_at': item['updated_at']
        }

        return build_response(201, category)

    except json.JSONDecodeError:
        return build_response(400, {'error': 'Invalid JSON in request body'})
    except Exception as e:
        print(f"Error creating category: {str(e)}")
        return build_response(500, {'error': 'Failed to create category'})

def update_category(category_id, event):
    """
    PUT /categories/{category_id}
    Actualiza una categoría existente (requiere permisos de admin)
    Body: cualquier campo de la categoría
    """
    try:
        # Verificar permisos de admin
        user_id = get_user_id(event, use_username=True)
        if not is_admin(user_id, COGNITO_USER_POOL_ID):
            logger.warning(f"User {user_id} attempted to update category without admin privileges")
            return build_response(403, {'error': 'Access denied. Admin privileges required.'})
        # Parsear body
        body = json.loads(event.get('body', '{}'))

        # Verificar que exista
        existing = categories_table.get_item(
            Key={
                'PK': f'CATEGORY#{category_id}',
                'SK': 'METADATA'
            }
        )

        if 'Item' not in existing:
            return build_response(404, {'error': 'Category not found'})

        # Construir UpdateExpression dinámicamente
        update_expression = "SET updated_at = :updated_at"
        expression_values = {
            ':updated_at': datetime.utcnow().isoformat()
        }
        expression_names = {}

        # Campos actualizables
        updatable_fields = {
            'label': 'label',
            'emoji': 'emoji',
            'color': 'color',
            'description': 'description',
            'architecture': 'architecture',
            'course_count': 'course_count',
            'level': 'level',
            'display_order': 'display_order',
            'featured': 'featured'
        }

        for field, attr_name in updatable_fields.items():
            if field in body:
                # is_active es especial (string para GSI)
                if field == 'is_active':
                    value = 'true' if body[field] else 'false'
                else:
                    value = body[field]

                update_expression += f", #{attr_name} = :{attr_name}"
                expression_names[f'#{attr_name}'] = attr_name
                expression_values[f':{attr_name}'] = value

        # Si se actualiza is_active, manejarlo
        if 'is_active' in body:
            value = 'true' if body['is_active'] else 'false'
            update_expression += ", #is_active = :is_active"
            expression_names['#is_active'] = 'is_active'
            expression_values[':is_active'] = value

        # Actualizar en DynamoDB
        response_data = categories_table.update_item(
            Key={
                'PK': f'CATEGORY#{category_id}',
                'SK': 'METADATA'
            },
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_names if expression_names else None,
            ExpressionAttributeValues=expression_values,
            ReturnValues='ALL_NEW'
        )

        # Formatear respuesta
        item = response_data['Attributes']
        category = {
            'category_id': item['PK'].replace('CATEGORY#', ''),
            'label': item.get('label', ''),
            'emoji': item.get('emoji', ''),
            'color': item.get('color', ''),
            'description': item.get('description', ''),
            'architecture': item.get('architecture', []),
            'course_count': item.get('course_count', 0),
            'level': item.get('level', 'beginner'),
            'display_order': item.get('display_order', 0),
            'is_active': item.get('is_active') == 'true',
            'featured': item.get('featured', False),
            'created_at': item.get('created_at', ''),
            'updated_at': item.get('updated_at', '')
        }

        return build_response(200, category)

    except json.JSONDecodeError:
        return build_response(400, {'error': 'Invalid JSON in request body'})
    except Exception as e:
        print(f"Error updating category: {str(e)}")
        return build_response(500, {'error': 'Failed to update category'})

def delete_category(category_id, event):
    """
    DELETE /categories/{category_id}
    Elimina (soft delete) una categoría (requiere permisos de admin)
    La marca como is_active = false
    """
    try:
        # Verificar permisos de admin
        user_id = get_user_id(event, use_username=True)
        if not is_admin(user_id, COGNITO_USER_POOL_ID):
            logger.warning(f"User {user_id} attempted to delete category without admin privileges")
            return build_response(403, {'error': 'Access denied. Admin privileges required.'})
        # Verificar que exista
        existing = categories_table.get_item(
            Key={
                'PK': f'CATEGORY#{category_id}',
                'SK': 'METADATA'
            }
        )

        if 'Item' not in existing:
            return build_response(404, {'error': 'Category not found'})

        # Soft delete: marcar como inactiva
        categories_table.update_item(
            Key={
                'PK': f'CATEGORY#{category_id}',
                'SK': 'METADATA'
            },
            UpdateExpression='SET is_active = :inactive, updated_at = :updated_at',
            ExpressionAttributeValues={
                ':inactive': 'false',
                ':updated_at': datetime.utcnow().isoformat()
            }
        )

        return build_response(200, {
            'message': 'Category deleted successfully',
            'category_id': category_id
        })

    except Exception as e:
        print(f"Error deleting category: {str(e)}")
        return build_response(500, {'error': 'Failed to delete category'})

def recalculate_course_counts(event):
    """
    POST /categories/recalculate-counts
    Recalcula el course_count de todas las categorías (requiere permisos de admin)
    contando los cursos publicados que pertenecen a cada una

    Implementa paginación para manejar grandes volúmenes de datos sin timeouts
    """
    try:
        # Verificar permisos de admin
        user_id = get_user_id(event, use_username=True)
        if not is_admin(user_id, COGNITO_USER_POOL_ID):
            logger.warning(f"User {user_id} attempted to recalculate counts without admin privileges")
            return build_response(403, {'error': 'Access denied. Admin privileges required.'})
        print("Starting course_count recalculation for all categories...")

        # 1. Obtener todas las categorías con paginación
        all_categories = []
        scan_kwargs = {}

        while True:
            categories_response = categories_table.scan(**scan_kwargs)
            all_categories.extend(categories_response.get('Items', []))

            # Verificar si hay más páginas
            if 'LastEvaluatedKey' not in categories_response:
                break
            scan_kwargs['ExclusiveStartKey'] = categories_response['LastEvaluatedKey']
            print(f"Fetched {len(all_categories)} categories so far...")

        if not all_categories:
            return build_response(200, {
                'message': 'No categories found',
                'updated': 0
            })

        # 2. Obtener todos los cursos publicados con paginación
        # Usar la tabla Courses con un scan filtrando is_published
        all_courses = []
        scan_kwargs = {
            'FilterExpression': 'is_published = :published',
            'ExpressionAttributeValues': {
                ':published': True
            }
        }

        while True:
            courses_response = courses_table.scan(**scan_kwargs)
            all_courses.extend(courses_response.get('Items', []))

            # Verificar si hay más páginas
            if 'LastEvaluatedKey' not in courses_response:
                break
            scan_kwargs['ExclusiveStartKey'] = courses_response['LastEvaluatedKey']
            print(f"Fetched {len(all_courses)} published courses so far...")

        print(f"Found {len(all_categories)} categories and {len(all_courses)} published courses")

        # 3. Contar cursos por categoría
        category_counts = {}
        for course in all_courses:
            category = course.get('category', '')
            if category:
                category_counts[category] = category_counts.get(category, 0) + 1

        print(f"Course counts by category: {category_counts}")

        # 4. Actualizar cada categoría con el nuevo count
        updated_count = 0
        updates = []

        for category_item in all_categories:
            category_id = category_item['PK'].replace('CATEGORY#', '')
            current_count = category_item.get('course_count', 0)
            new_count = category_counts.get(category_id, 0)

            # Solo actualizar si cambió
            if current_count != new_count:
                categories_table.update_item(
                    Key={
                        'PK': f'CATEGORY#{category_id}',
                        'SK': 'METADATA'
                    },
                    UpdateExpression='SET course_count = :count, updated_at = :updated_at',
                    ExpressionAttributeValues={
                        ':count': new_count,
                        ':updated_at': datetime.utcnow().isoformat()
                    }
                )

                updates.append({
                    'category_id': category_id,
                    'label': category_item.get('label', category_id),
                    'old_count': current_count,
                    'new_count': new_count
                })

                updated_count += 1
                print(f"Updated {category_id}: {current_count} -> {new_count}")

        return build_response(200, {
            'message': 'Course counts recalculated successfully',
            'total_categories': len(all_categories),
            'total_courses': len(all_courses),
            'updated': updated_count,
            'updates': updates
        })

    except Exception as e:
        print(f"Error recalculating course counts: {str(e)}")
        import traceback
        traceback.print_exc()
        return build_response(500, {'error': 'Failed to recalculate course counts'})

# build_response ahora se importa como success_response desde shared/
# Alias para compatibilidad con código existente
def build_response(status_code, body):
    """Helper para generar respuestas HTTP con CORS - wrapper para success_response"""
    if 'error' in body:
        return error_response(status_code, body['error'])
    return success_response(body, status_code, origin=origin)
