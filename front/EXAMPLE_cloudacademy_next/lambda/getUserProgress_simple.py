import json
import logging
import os

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    Lambda function para obtener el progreso de cursos de un usuario
    GET /api/users/me/progress
    Versión simplificada con datos mock para testing
    """
    
    logger.info(f"Received event: {json.dumps(event)}")
    
    try:
        # Extraer user_id del evento (vendría del token JWT de Cognito)
        # Por ahora usamos un parámetro de query para testing
        user_id = event.get('queryStringParameters', {}).get('user_id') if event.get('queryStringParameters') else None
        
        if not user_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,OPTIONS'
                },
                'body': json.dumps({
                    'error': 'user_id parameter is required'
                })
            }
        
        # Datos mock basados en los datos reales de la base de datos
        # TODO: Reemplazar con consulta real a PostgreSQL cuando tengamos las dependencias
        mock_data = {
            'user': {
                'user_id': user_id,
                'name': 'Matias Martinez',
                'email': 'matias.martinez90@gmail.com',
                'total_courses_enrolled': 4,
                'courses_completed': 1,
                'average_progress': 60.0
            },
            'courses': [
                {
                    'course_id': 'aws-fundamentals',
                    'progress_percentage': 45,
                    'started_at': '2025-07-10T10:00:00',
                    'last_accessed': '2025-07-12T09:30:00',
                    'completed_at': None
                },
                {
                    'course_id': 'docker-basics',
                    'progress_percentage': 100,
                    'started_at': '2025-07-08T14:00:00',
                    'completed_at': '2025-07-11T16:45:00',
                    'last_accessed': '2025-07-11T16:45:00'
                },
                {
                    'course_id': 'kubernetes-intro',
                    'progress_percentage': 20,
                    'started_at': '2025-07-11T11:00:00',
                    'last_accessed': '2025-07-12T08:15:00',
                    'completed_at': None
                },
                {
                    'course_id': 'terraform-advanced',
                    'progress_percentage': 75,
                    'started_at': '2025-07-05T09:00:00',
                    'last_accessed': '2025-07-12T10:00:00',
                    'completed_at': None
                }
            ],
            'summary': {
                'total_courses': 4,
                'completed_courses': 1,
                'in_progress_courses': 3,
                'average_progress': 60.0
            }
        }
        
        logger.info(f"✅ Progress retrieved for user {user_id}: {len(mock_data['courses'])} courses")
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps(mock_data, default=str)
        }
            
    except Exception as e:
        logger.error(f"❌ Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps({
                'error': 'Internal server error'
            })
        }