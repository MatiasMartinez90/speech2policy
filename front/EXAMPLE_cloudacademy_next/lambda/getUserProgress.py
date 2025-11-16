import json
import logging
import os
import psycopg2
from psycopg2.extras import RealDictCursor

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    Lambda function para obtener el progreso de cursos de un usuario
    GET /api/users/me/progress
    Versión actualizada con PostgreSQL integration
    """
    
    logger.info(f"Received event: {json.dumps(event)}")
    
    try:
        # Extraer user_id del evento (vendría del token JWT de Cognito)
        # Por ahora usamos un parámetro de query para testing
        user_id = event.get('queryStringParameters', {}).get('user_id')
        
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
        
        # Conectar a PostgreSQL
        connection = psycopg2.connect(
            host=os.environ['DB_HOST'],
            database=os.environ['DB_NAME'],
            user=os.environ['DB_USER'],
            password=os.environ['DB_PASSWORD'],
            port=os.environ.get('DB_PORT', '5432')
        )
        
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            # Query 1: Obtener información del usuario y estadísticas agregadas
            user_stats_query = """
                SELECT 
                    u.id as user_id,
                    u.name,
                    u.email,
                    COALESCE(COUNT(ucp.id), 0) as total_courses_enrolled,
                    COALESCE(COUNT(CASE WHEN ucp.progress_percentage = 100 THEN 1 END), 0) as courses_completed,
                    COALESCE(AVG(ucp.progress_percentage), 0) as average_progress
                FROM users u
                LEFT JOIN user_course_progress ucp ON u.id = ucp.user_id
                WHERE u.id = %s
                GROUP BY u.id, u.name, u.email
            """
            
            cursor.execute(user_stats_query, (user_id,))
            user_result = cursor.fetchone()
            
            if not user_result:
                return {
                    'statusCode': 404,
                    'headers': {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                        'Access-Control-Allow-Methods': 'GET,OPTIONS'
                    },
                    'body': json.dumps({
                        'error': 'User not found'
                    })
                }
            
            # Procesar información del usuario
            user_info = {
                'user_id': str(user_result['user_id']),
                'name': user_result['name'],
                'email': user_result['email'],
                'total_courses_enrolled': user_result['total_courses_enrolled'],
                'courses_completed': user_result['courses_completed'],
                'average_progress': float(user_result['average_progress'])
            }
            
            # Query 2: Obtener cursos individuales del usuario
            courses_query = """
                SELECT 
                    course_id,
                    progress_percentage,
                    started_at,
                    completed_at,
                    last_accessed
                FROM user_course_progress 
                WHERE user_id = %s
                ORDER BY last_accessed DESC
            """
            
            cursor.execute(courses_query, (user_id,))
            course_results = cursor.fetchall()
            
            # Procesar cursos individuales
            courses = []
            for row in course_results:
                courses.append({
                    'course_id': row['course_id'],
                    'progress_percentage': row['progress_percentage'],
                    'started_at': row['started_at'].isoformat() if row['started_at'] else None,
                    'completed_at': row['completed_at'].isoformat() if row['completed_at'] else None,
                    'last_accessed': row['last_accessed'].isoformat() if row['last_accessed'] else None
                })
            
            # Calcular estadísticas desde los cursos (fallback si el agregado SQL falla)
            total_courses = len(courses)
            completed_courses = len([c for c in courses if c['progress_percentage'] == 100])
            in_progress_courses = len([c for c in courses if 0 < c['progress_percentage'] < 100])
            average_progress = sum([c['progress_percentage'] for c in courses]) / total_courses if total_courses > 0 else 0
            
            # Fallback: usar estadísticas calculadas desde cursos (más confiable)
            # Solo usar SQL aggregates si coinciden con el número real de cursos
            if user_info['total_courses_enrolled'] == total_courses and user_info['average_progress'] > 0:
                final_total = user_info['total_courses_enrolled']
                final_completed = user_info['courses_completed'] 
                final_average = user_info['average_progress']
            else:
                # Usar cálculos desde cursos individuales
                final_total = total_courses
                final_completed = completed_courses
                final_average = average_progress
            
            response_data = {
                'user': user_info,
                'courses': courses,
                'summary': {
                    'total_courses': final_total,
                    'completed_courses': final_completed,
                    'in_progress_courses': in_progress_courses,
                    'average_progress': round(final_average, 1)
                }
            }
            
            logger.info(f"✅ Progress retrieved for user {user_id}: {len(courses)} courses")
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                    'Access-Control-Allow-Methods': 'GET,OPTIONS'
                },
                'body': json.dumps(response_data, default=str)
            }
            
    except psycopg2.Error as e:
        logger.error(f"❌ Database error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,OPTIONS'
            },
            'body': json.dumps({
                'error': 'Database connection failed'
            })
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
        
    finally:
        try:
            connection.close()
        except:
            pass# Force update sábado, 12 de julio de 2025, 09:09:44 -03
