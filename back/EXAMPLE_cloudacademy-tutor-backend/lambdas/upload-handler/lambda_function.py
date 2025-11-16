"""
Lambda Handler: upload-handler
Maneja uploads de imágenes para cursos (genera presigned URLs)

Requiere grupo Cognito: Admins

Endpoints:
- POST /api/admin/upload-url - Generar presigned URL para upload
- GET /api/admin/images - Listar imágenes de un curso
- DELETE /api/admin/images/{key} - Eliminar imagen
"""

import json
import os
import sys
import logging
import boto3
from datetime import datetime, timezone
from urllib.parse import quote

# Agregar directorio shared al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Importar utilidades compartidas
from shared.auth_utils import extract_user_id, is_admin
from shared.response_utils import success_response, error_response
from shared.validators import InputValidator
from shared.boto3_config import get_config_for_service

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Variables de entorno
S3_BUCKET = os.environ.get('S3_BUCKET', 'cloudacademy-course-images')
COGNITO_USER_POOL_ID = os.environ.get('COGNITO_USER_POOL_ID')

# Clientes AWS con connection pooling optimizado
s3_config = get_config_for_service('s3', 'us-east-1')
cognito_config = get_config_for_service('cognito-idp', 'us-east-1')
        # Extraer origin para CORS whitelist (SECURITY: CRITICAL-3)
        headers = event.get("headers") or {}
        origin = headers.get("origin") or headers.get("Origin")


s3 = boto3.client('s3', config=s3_config)
cognito = boto3.client('cognito-idp', config=cognito_config)


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
        if http_method == 'POST' and path.endswith('/api/admin/upload-url'):
            return handle_generate_upload_url(body)

        elif http_method == 'GET' and '/api/admin/images' in path:
            course_id = event.get('queryStringParameters', {}).get('course_id', '')
            return handle_list_images(course_id)

        elif http_method == 'DELETE' and '/api/admin/images/' in path:
            image_key = path_parameters.get('key')
            return handle_delete_image(image_key)

        else:
            return error_response(404, 'Endpoint not found', origin=origin)

    except Exception as e:
        logger.error(f"Unhandled error: {str(e)}", exc_info=True)
        return error_response(500, f'Internal server error: {str(e)}', origin=origin)


# extract_user_id e is_admin ahora se importan desde shared.auth_utils


def handle_generate_upload_url(body):
    """
    Maneja POST /api/admin/upload-url

    Genera presigned URL para que el frontend suba una imagen directamente a S3

    Args:
        body: {
            "course_id": "terraform-aws-basics",
            "filename": "diagram.png",
            "content_type": "image/png"
        }

    Returns:
        dict: Response con presigned URL
    """
    try:
        # Validar campos requeridos
        required_fields = ['course_id', 'filename', 'content_type']
        missing_fields = InputValidator.validate_required_fields(body, required_fields)
        if missing_fields:
            return error_response(400, '; '.join(missing_fields), origin=origin)

        course_id = body['course_id']
        filename = body['filename']
        content_type = body['content_type']

        # Validar course_id
        error = InputValidator.validate_course_id(course_id)
        if error:
            return error_response(400, f'Invalid course_id: {error}', origin=origin)

        # Validar filename (prevenir path traversal y caracteres peligrosos)
        error = InputValidator.validate_filename(filename)
        if error:
            return error_response(400, f'Invalid filename: {error}', origin=origin)

        # Validar content_type
        allowed_types = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
        error = InputValidator.validate_content_type(content_type, allowed_types)
        if error:
            return error_response(400, f'Invalid content_type: {error}', origin=origin)

        # Generar key único para S3
        timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
        safe_filename = filename.replace(' ', '_').replace('/', '_')
        s3_key = f"courses/{course_id}/{timestamp}_{safe_filename}"

        # Generar presigned URL (válida por 15 minutos)
        presigned_url = s3.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': S3_BUCKET,
                'Key': s3_key,
                'ContentType': content_type,
            },
            ExpiresIn=900  # 15 minutos
        )

        # URL pública de la imagen (después del upload)
        public_url = f"https://{S3_BUCKET}.s3.amazonaws.com/{quote(s3_key)}"

        logger.info(f"Generated presigned URL for {s3_key}")

        return success_response({
            'presigned_url': presigned_url,
            'public_url': public_url,
            's3_key': s3_key,
            'expires_in': 900
        })

    except Exception as e:
        logger.error(f"Error generating presigned URL: {str(e)}", exc_info=True)
        return error_response(500, f'Error generating presigned URL: {str(e)}', origin=origin)


def handle_list_images(course_id):
    """
    Maneja GET /api/admin/images?course_id={id}

    Lista todas las imágenes de un curso

    Args:
        course_id: ID del curso

    Returns:
        dict: Response con lista de imágenes
    """
    try:
        if not course_id:
            return error_response(400, 'Missing course_id parameter', origin=origin)

        prefix = f"courses/{course_id}/"

        # Listar objetos en S3
        response = s3.list_objects_v2(
            Bucket=S3_BUCKET,
            Prefix=prefix
        )

        images = []
        for obj in response.get('Contents', []):
            key = obj['Key']
            public_url = f"https://{S3_BUCKET}.s3.amazonaws.com/{quote(key)}"

            images.append({
                's3_key': key,
                'public_url': public_url,
                'size': obj['Size'],
                'last_modified': obj['LastModified'].isoformat(),
                'filename': key.split('/')[-1]
            })

        logger.info(f"Found {len(images)} images for course {course_id}")

        return success_response({
            'course_id': course_id,
            'images': images,
            'total': len(images)
        })

    except Exception as e:
        logger.error(f"Error listing images: {str(e)}", exc_info=True)
        return error_response(500, f'Error listing images: {str(e)}', origin=origin)


def handle_delete_image(image_key):
    """
    Maneja DELETE /api/admin/images/{key}

    Elimina una imagen de S3

    Args:
        image_key: Key del objeto en S3

    Returns:
        dict: Response con confirmación
    """
    try:
        if not image_key:
            return error_response(400, 'Missing image_key', origin=origin)

        # Verificar que el objeto existe
        try:
            s3.head_object(Bucket=S3_BUCKET, Key=image_key)
        except s3.exceptions.NoSuchKey:
            return error_response(404, f'Image {image_key} not found', origin=origin)

        # Eliminar objeto
        s3.delete_object(
            Bucket=S3_BUCKET,
            Key=image_key
        )

        logger.info(f"Deleted image {image_key}")

        return success_response({
            'message': f'Image {image_key} deleted successfully',
            's3_key': image_key
        })

    except Exception as e:
        logger.error(f"Error deleting image: {str(e)}", exc_info=True)
        return error_response(500, f'Error deleting image: {str(e)}', origin=origin)


# success_response y error_response ahora se importan desde shared.response_utils
