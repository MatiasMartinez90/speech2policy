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
            # Query para obtener progreso del usuario
            query = """
                SELECT 
                    u.id as user_id,
                    u.name,
                    u.email,
                    COUNT(ucp.id) as total_courses_enrolled,
                    COUNT(CASE WHEN ucp.progress_percentage = 100 THEN 1 END) as courses_completed,
                    COALESCE(AVG(ucp.progress_percentage), 0) as average_progress,
                    ucp.course_id,
                    ucp.progress_percentage,
                    ucp.started_at,
                    ucp.completed_at,
                    ucp.last_accessed
                FROM users u
                LEFT JOIN user_course_progress ucp ON u.id = ucp.user_id
                WHERE u.id = %s
                GROUP BY u.id, u.name, u.email, ucp.course_id, ucp.progress_percentage, 
                         ucp.started_at, ucp.completed_at, ucp.last_accessed
                ORDER BY ucp.last_accessed DESC NULLS LAST
            """
            
            cursor.execute(query, (user_id,))
            results = cursor.fetchall()
            
            if not results:
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
            
            # Procesar resultados
            user_info = {
                'user_id': str(results[0]['user_id']),
                'name': results[0]['name'],
                'email': results[0]['email'],
                'total_courses_enrolled': results[0]['total_courses_enrolled'] or 0,
                'courses_completed': results[0]['courses_completed'] or 0,
                'average_progress': float(results[0]['average_progress'] or 0)
            }
            
            # Cursos individuales
            courses = []
            for row in results:
                if row['course_id']:  # Solo si tiene cursos
                    courses.append({
                        'course_id': row['course_id'],
                        'progress_percentage': row['progress_percentage'],
                        'started_at': row['started_at'].isoformat() if row['started_at'] else None,
                        'completed_at': row['completed_at'].isoformat() if row['completed_at'] else None,
                        'last_accessed': row['last_accessed'].isoformat() if row['last_accessed'] else None
                    })
            
            response_data = {
                'user': user_info,
                'courses': courses,
                'summary': {
                    'total_courses': len(courses),
                    'completed_courses': user_info['courses_completed'],
                    'in_progress_courses': len([c for c in courses if 0 < c['progress_percentage'] < 100]),
                    'average_progress': round(user_info['average_progress'], 2)
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
            pass