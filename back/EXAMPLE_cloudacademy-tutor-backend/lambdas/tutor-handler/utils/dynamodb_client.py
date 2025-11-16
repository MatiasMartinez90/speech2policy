"""
DynamoDB Client para operaciones en las 4 tablas

Tablas:
- CourseCatalog: Metadata de cursos y secciones
- TutorSessions: Historial de conversaciones
- UserProgress: Progreso de usuarios
- UserUsage: Rate limiting
"""

import json
import logging
import boto3
import sys
import os
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from boto3.dynamodb.conditions import Key

# Agregar directorio shared al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))
from shared.boto3_config import get_config_for_service

logger = logging.getLogger()


class DynamoDBClient:
    """Cliente para operaciones DynamoDB del tutor"""

    def __init__(self, courses_table, sessions_table, progress_table, usage_table, region='us-east-1'):
        """
        Inicializa cliente DynamoDB con connection pooling optimizado

        Args:
            courses_table: Nombre de la tabla CourseCatalog
            sessions_table: Nombre de la tabla TutorSessions
            progress_table: Nombre de la tabla UserProgress
            usage_table: Nombre de la tabla UserUsage
            region: Región de AWS
        """
        # Usar configuración optimizada con connection pooling
        config = get_config_for_service('dynamodb', region)
        self.dynamodb = boto3.resource('dynamodb', config=config)

        self.courses_table = self.dynamodb.Table(courses_table)
        self.sessions_table = self.dynamodb.Table(sessions_table)
        self.progress_table = self.dynamodb.Table(progress_table)
        self.usage_table = self.dynamodb.Table(usage_table)

        logger.info(f"DynamoDBClient initialized with connection_pool=50, adaptive_retries=enabled")

    # ========================================================================
    # COURSES CATALOG - Lectura de cursos y secciones
    # ========================================================================

    def get_course_metadata(self, course_id):
        """
        Obtiene metadata de un curso

        Args:
            course_id: ID del curso (ej: "image-gen-bedrock")

        Returns:
            dict: Metadata del curso o None si no existe
        """
        try:
            response = self.courses_table.get_item(
                Key={
                    'PK': f'COURSE#{course_id}',
                    'SK': 'METADATA'
                }
            )
            return response.get('Item')
        except Exception as e:
            logger.error(f"Error getting course metadata: {str(e)}")
            return None

    def get_section(self, course_id, section_id):
        """
        Obtiene datos completos de una sección

        Args:
            course_id: ID del curso
            section_id: ID de la sección (número)

        Returns:
            dict: Datos de la sección con content, checkpoint, hints, etc.
        """
        try:
            response = self.courses_table.get_item(
                Key={
                    'PK': f'COURSE#{course_id}',
                    'SK': f'SECTION#{section_id}'
                }
            )
            return response.get('Item')
        except Exception as e:
            logger.error(f"Error getting section {section_id}: {str(e)}")
            return None

    def get_all_sections(self, course_id):
        """
        Obtiene todas las secciones de un curso

        Args:
            course_id: ID del curso

        Returns:
            list: Lista de secciones ordenadas por section_id
        """
        try:
            response = self.courses_table.query(
                KeyConditionExpression=Key('PK').eq(f'COURSE#{course_id}') & Key('SK').begins_with('SECTION#')
            )
            sections = response.get('Items', [])
            # Ordenar por section_id
            sections.sort(key=lambda x: x.get('section_id', 0))
            return sections
        except Exception as e:
            logger.error(f"Error getting sections: {str(e)}")
            return []

    # ========================================================================
    # TUTOR SESSIONS - Guardar conversaciones
    # ========================================================================

    def save_session_message(self, session_id, user_id, course_id, section_id, message_type, content, response=None):
        """
        Guarda un mensaje de la conversación en TutorSessions

        Args:
            session_id: UUID de la sesión
            user_id: Email del usuario
            course_id: ID del curso
            section_id: ID de la sección
            message_type: 'question' | 'checkpoint' | 'hint'
            content: Contenido del mensaje del usuario
            response: Respuesta de Claude (opcional)

        Returns:
            bool: True si se guardó exitosamente
        """
        try:
            timestamp = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

            # TTL: 30 días desde ahora
            ttl = int((datetime.now(timezone.utc) + timedelta(days=30)).timestamp())

            item = {
                'PK': f'SESSION#{session_id}',
                'SK': f'TIMESTAMP#{timestamp}',
                'user_id': user_id,
                'course_id': course_id,
                'section_id': section_id,
                'message_type': message_type,
                'user_message': content,
                'timestamp': timestamp,
                'ttl': ttl
            }

            if response:
                item['assistant_response'] = response

            self.sessions_table.put_item(Item=item)
            logger.info(f"Session message saved: {session_id}")
            return True

        except Exception as e:
            logger.error(f"Error saving session message: {str(e)}")
            return False

    def get_session_history(self, session_id, limit=20):
        """
        Obtiene historial de una sesión

        Args:
            session_id: UUID de la sesión
            limit: Número máximo de mensajes (default 20)

        Returns:
            list: Lista de mensajes ordenados por timestamp
        """
        try:
            response = self.sessions_table.query(
                KeyConditionExpression=Key('PK').eq(f'SESSION#{session_id}'),
                ScanIndexForward=False,  # Orden descendente (más recientes primero)
                Limit=limit
            )
            messages = response.get('Items', [])
            # Revertir para tener orden cronológico
            messages.reverse()
            return messages
        except Exception as e:
            logger.error(f"Error getting session history: {str(e)}")
            return []

    # ========================================================================
    # USER PROGRESS - Tracking de progreso
    # ========================================================================

    def get_user_progress(self, user_id, course_id):
        """
        Obtiene progreso de un usuario en un curso

        Args:
            user_id: Email del usuario
            course_id: ID del curso

        Returns:
            dict: Progreso del usuario o None si no existe
        """
        try:
            response = self.progress_table.get_item(
                Key={
                    'PK': f'USER#{user_id}',
                    'SK': f'COURSE#{course_id}'
                }
            )
            return response.get('Item')
        except Exception as e:
            logger.error(f"Error getting user progress: {str(e)}")
            return None

    def update_checkpoint_progress(self, user_id, course_id, section_id, score, passed, answer, feedback):
        """
        Actualiza progreso después de validar un checkpoint

        Args:
            user_id: Email del usuario
            course_id: ID del curso
            section_id: ID de la sección
            score: Score obtenido (0-100)
            passed: True si pasó el checkpoint
            answer: Respuesta del estudiante
            feedback: Feedback de Claude

        Returns:
            bool: True si se actualizó exitosamente
        """
        try:
            timestamp = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

            # Primero intentar obtener progreso existente
            existing_progress = self.get_user_progress(user_id, course_id)

            if existing_progress:
                # Actualizar progreso existente
                checkpoints = existing_progress.get('checkpoints_completed', {})
                checkpoints[str(section_id)] = {
                    'score': Decimal(str(score)),
                    'passed': passed,
                    'completed_at': timestamp,
                    'attempts': checkpoints.get(str(section_id), {}).get('attempts', 0) + 1
                }

                # Calcular nuevo progreso
                current_section = max(existing_progress.get('current_section', 0), section_id + (1 if passed else 0))
                total_checkpoints = len(checkpoints)
                checkpoints_passed = sum(1 for cp in checkpoints.values() if cp.get('passed', False))

                self.progress_table.update_item(
                    Key={
                        'PK': f'USER#{user_id}',
                        'SK': f'COURSE#{course_id}'
                    },
                    UpdateExpression='SET checkpoints_completed = :chk, current_section = :cs, last_activity = :la, total_checkpoints = :tc, checkpoints_passed = :cp',
                    ExpressionAttributeValues={
                        ':chk': checkpoints,
                        ':cs': current_section,
                        ':la': timestamp,
                        ':tc': total_checkpoints,
                        ':cp': checkpoints_passed
                    }
                )
            else:
                # Crear nuevo registro de progreso
                item = {
                    'PK': f'USER#{user_id}',
                    'SK': f'COURSE#{course_id}',
                    'user_id': user_id,
                    'course_id': course_id,
                    'current_section': section_id + (1 if passed else 0),
                    'checkpoints_completed': {
                        str(section_id): {
                            'score': Decimal(str(score)),
                            'passed': passed,
                            'completed_at': timestamp,
                            'attempts': 1
                        }
                    },
                    'total_checkpoints': 1,
                    'checkpoints_passed': 1 if passed else 0,
                    'started_at': timestamp,
                    'last_activity': timestamp
                }
                self.progress_table.put_item(Item=item)

            logger.info(f"Checkpoint progress updated for user {user_id}, section {section_id}, score {score}")
            return True

        except Exception as e:
            logger.error(f"Error updating checkpoint progress: {str(e)}", exc_info=True)
            return False

    def record_hint_usage(self, user_id, course_id, section_id, hint_level):
        """
        Registra uso de una pista

        Args:
            user_id: Email del usuario
            course_id: ID del curso
            section_id: ID de la sección
            hint_level: Nivel de pista (1, 2, o 3)

        Returns:
            bool: True si se registró exitosamente
        """
        try:
            timestamp = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

            # Obtener progreso existente o crear uno nuevo
            existing_progress = self.get_user_progress(user_id, course_id)

            if existing_progress:
                hints_used = existing_progress.get('hints_used', {})
                section_hints = hints_used.get(str(section_id), [])

                # Agregar nivel de pista si no está ya
                if hint_level not in section_hints:
                    section_hints.append(hint_level)
                    section_hints.sort()

                hints_used[str(section_id)] = section_hints

                self.progress_table.update_item(
                    Key={
                        'PK': f'USER#{user_id}',
                        'SK': f'COURSE#{course_id}'
                    },
                    UpdateExpression='SET hints_used = :hu, last_activity = :la',
                    ExpressionAttributeValues={
                        ':hu': hints_used,
                        ':la': timestamp
                    }
                )
            else:
                # Crear nuevo registro
                item = {
                    'PK': f'USER#{user_id}',
                    'SK': f'COURSE#{course_id}',
                    'user_id': user_id,
                    'course_id': course_id,
                    'current_section': 0,
                    'hints_used': {
                        str(section_id): [hint_level]
                    },
                    'started_at': timestamp,
                    'last_activity': timestamp
                }
                self.progress_table.put_item(Item=item)

            logger.info(f"Hint usage recorded: user {user_id}, section {section_id}, level {hint_level}")
            return True

        except Exception as e:
            logger.error(f"Error recording hint usage: {str(e)}")
            return False

    # ========================================================================
    # USER USAGE - Rate limiting
    # ========================================================================

    def get_usage_count(self, user_id, period):
        """
        Obtiene contador de uso para un usuario y período

        Args:
            user_id: Email del usuario o anon_IP
            period: 'TOTAL' | 'YYYY-MM-DD' | 'YYYY-MM-DD-HH'

        Returns:
            int: Número de requests en el período
        """
        try:
            response = self.usage_table.get_item(
                Key={
                    'user_id': user_id,
                    'period': period
                }
            )
            item = response.get('Item', {})
            return item.get('count', 0)
        except Exception as e:
            logger.error(f"Error getting usage count: {str(e)}")
            return 0

    def increment_usage(self, user_id, period, action_type='question'):
        """
        Incrementa contador de uso para un período

        Args:
            user_id: Email del usuario o anon_IP
            period: 'TOTAL' | 'YYYY-MM-DD' | 'YYYY-MM-DD-HH'
            action_type: 'question' | 'checkpoint' | 'hint'

        Returns:
            int: Nuevo contador
        """
        try:
            timestamp = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

            # TTL: 7 días desde ahora (excepto para period='TOTAL')
            ttl = None
            if period != 'TOTAL':
                ttl = int((datetime.now(timezone.utc) + timedelta(days=7)).timestamp())

            # Incrementar contador
            update_expr = 'SET #count = if_not_exists(#count, :zero) + :inc, last_request = :ts'
            expr_attr_names = {'#count': 'count'}
            expr_attr_values = {
                ':zero': 0,
                ':inc': 1,
                ':ts': timestamp
            }

            if ttl:
                update_expr += ', #ttl = :ttl'
                expr_attr_names['#ttl'] = 'ttl'
                expr_attr_values[':ttl'] = ttl

            # Agregar contador por tipo de acción
            action_count_key = f'{action_type}_count'
            update_expr += f', {action_count_key} = if_not_exists({action_count_key}, :zero) + :inc'

            response = self.usage_table.update_item(
                Key={
                    'user_id': user_id,
                    'period': period
                },
                UpdateExpression=update_expr,
                ExpressionAttributeNames=expr_attr_names,
                ExpressionAttributeValues=expr_attr_values,
                ReturnValues='ALL_NEW'
            )

            new_count = response['Attributes'].get('count', 0)
            logger.info(f"Usage incremented for {user_id}/{period}: {new_count} ({action_type})")
            return new_count

        except Exception as e:
            logger.error(f"Error incrementing usage: {str(e)}")
            return 0
