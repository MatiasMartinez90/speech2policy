"""
Rate Limiter para controlar uso del tutor IA

Límites configurados:
- Anónimos: 1 total
- Autenticados: 50/día, 10/hora
- Premium: 200/día, 50/hora

Límites por tipo de acción:
- Checkpoints: Autenticados 20/día, Premium 100/día
- Hints: Autenticados 15/día, Premium 50/día
"""

import logging
from datetime import datetime, timezone

logger = logging.getLogger()


class RateLimiter:
    """Controla rate limiting del tutor usando DynamoDB"""

    # Límites por tipo de usuario
    LIMITS = {
        'anonymous': {
            'total': 1,
            'daily': 1,
            'hourly': 1,
            'checkpoints_daily': 0,
            'hints_daily': 0
        },
        'authenticated': {
            'total': None,  # Sin límite total
            'daily': 50,
            'hourly': 10,
            'checkpoints_daily': 20,
            'hints_daily': 15
        },
        'premium': {
            'total': None,
            'daily': 200,
            'hourly': 50,
            'checkpoints_daily': 100,
            'hints_daily': 50
        }
    }

    def __init__(self, dynamodb_client):
        """
        Inicializa rate limiter

        Args:
            dynamodb_client: Instancia de DynamoDBClient
        """
        self.db = dynamodb_client

    def check_and_increment(self, user_id, action_type='question', user_type=None):
        """
        Verifica rate limits e incrementa contadores si está permitido

        Args:
            user_id: Email del usuario o anon_IP
            action_type: 'question' | 'checkpoint' | 'hint'
            user_type: 'anonymous' | 'authenticated' | 'premium' (se detecta automáticamente si es None)

        Returns:
            dict: {
                'allowed': bool,
                'message': str,
                'usage': {
                    'total': int,
                    'daily': int,
                    'hourly': int,
                    'limit_total': int,
                    'limit_daily': int,
                    'limit_hourly': int
                }
            }
        """
        try:
            # Detectar tipo de usuario
            if user_type is None:
                user_type = self._detect_user_type(user_id)

            logger.info(f"Rate limit check for {user_id} ({user_type}) - action: {action_type}")

            # Obtener límites para este tipo de usuario
            limits = self.LIMITS.get(user_type, self.LIMITS['anonymous'])

            # Obtener períodos actuales
            now = datetime.now(timezone.utc)
            today = now.strftime('%Y-%m-%d')
            current_hour = now.strftime('%Y-%m-%d-%H')

            # Obtener contadores actuales
            total_count = self.db.get_usage_count(user_id, 'TOTAL')
            daily_count = self.db.get_usage_count(user_id, today)
            hourly_count = self.db.get_usage_count(user_id, current_hour)

            # Verificar límites generales
            if limits['total'] is not None and total_count >= limits['total']:
                return {
                    'allowed': False,
                    'message': f'Has alcanzado el límite total de {limits["total"]} requests. Regístrate para obtener más.',
                    'usage': self._build_usage_dict(total_count, daily_count, hourly_count, limits)
                }

            if daily_count >= limits['daily']:
                return {
                    'allowed': False,
                    'message': f'Has alcanzado el límite diario de {limits["daily"]} requests. Vuelve mañana o actualiza a Premium.',
                    'usage': self._build_usage_dict(total_count, daily_count, hourly_count, limits)
                }

            if hourly_count >= limits['hourly']:
                return {
                    'allowed': False,
                    'message': f'Has alcanzado el límite de {limits["hourly"]} requests por hora. Espera un momento.',
                    'usage': self._build_usage_dict(total_count, daily_count, hourly_count, limits)
                }

            # Verificar límites por tipo de acción
            if action_type == 'checkpoint':
                checkpoint_key = f'checkpoint_count'
                # Obtener item completo para ver checkpoint_count
                daily_usage_item = self.db.usage_table.get_item(
                    Key={'user_id': user_id, 'period': today}
                ).get('Item', {})
                checkpoint_count = daily_usage_item.get(checkpoint_key, 0)

                if checkpoint_count >= limits.get('checkpoints_daily', 0):
                    return {
                        'allowed': False,
                        'message': f'Has alcanzado el límite diario de {limits["checkpoints_daily"]} validaciones de checkpoints.',
                        'usage': self._build_usage_dict(total_count, daily_count, hourly_count, limits)
                    }

            elif action_type == 'hint':
                hint_key = f'hint_count'
                daily_usage_item = self.db.usage_table.get_item(
                    Key={'user_id': user_id, 'period': today}
                ).get('Item', {})
                hint_count = daily_usage_item.get(hint_key, 0)

                if hint_count >= limits.get('hints_daily', 0):
                    return {
                        'allowed': False,
                        'message': f'Has alcanzado el límite diario de {limits["hints_daily"]} pistas.',
                        'usage': self._build_usage_dict(total_count, daily_count, hourly_count, limits)
                    }

            # Si pasó todas las validaciones, incrementar contadores
            self.db.increment_usage(user_id, 'TOTAL', action_type)
            self.db.increment_usage(user_id, today, action_type)
            self.db.increment_usage(user_id, current_hour, action_type)

            # Actualizar contadores
            total_count += 1
            daily_count += 1
            hourly_count += 1

            logger.info(f"Rate limit check passed - new counts: total={total_count}, daily={daily_count}, hourly={hourly_count}")

            return {
                'allowed': True,
                'message': 'OK',
                'usage': self._build_usage_dict(total_count, daily_count, hourly_count, limits)
            }

        except Exception as e:
            logger.error(f"Error in rate limiter: {str(e)}", exc_info=True)
            # En caso de error, permitir la acción (fail-open)
            return {
                'allowed': True,
                'message': 'Rate limiter error - allowing request',
                'usage': {}
            }

    def _detect_user_type(self, user_id):
        """
        Detecta tipo de usuario basado en el user_id

        Args:
            user_id: Email o anon_IP

        Returns:
            str: 'anonymous' | 'authenticated' | 'premium'
        """
        # Si empieza con anon_, es anónimo
        if user_id.startswith('anon_'):
            return 'anonymous'

        # TODO: En el futuro, consultar Cognito para verificar si está en grupo Premium
        # Por ahora, todos los autenticados son 'authenticated'
        # Para detectar premium, se podría:
        # 1. Agregar parámetro user_groups a check_and_increment
        # 2. O consultar Cognito desde aquí (más costoso)

        return 'authenticated'

    def _build_usage_dict(self, total, daily, hourly, limits):
        """
        Construye diccionario de uso para respuesta

        Args:
            total: Contador total
            daily: Contador diario
            hourly: Contador horario
            limits: Límites del tipo de usuario

        Returns:
            dict: Información de uso
        """
        return {
            'total': total,
            'daily': daily,
            'hourly': hourly,
            'limit_total': limits['total'] if limits['total'] is not None else 'unlimited',
            'limit_daily': limits['daily'],
            'limit_hourly': limits['hourly'],
            'remaining_daily': max(0, limits['daily'] - daily),
            'remaining_hourly': max(0, limits['hourly'] - hourly)
        }

    def get_user_usage_summary(self, user_id):
        """
        Obtiene resumen completo de uso de un usuario

        Args:
            user_id: Email o anon_IP

        Returns:
            dict: Resumen de uso en todos los períodos
        """
        try:
            now = datetime.now(timezone.utc)
            today = now.strftime('%Y-%m-%d')
            current_hour = now.strftime('%Y-%m-%d-%H')

            return {
                'total': self.db.get_usage_count(user_id, 'TOTAL'),
                'today': self.db.get_usage_count(user_id, today),
                'current_hour': self.db.get_usage_count(user_id, current_hour),
                'user_type': self._detect_user_type(user_id)
            }
        except Exception as e:
            logger.error(f"Error getting usage summary: {str(e)}")
            return {}
