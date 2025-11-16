"""
Utilidades de autenticación y autorización para AWS Cognito

Funciones compartidas para extraer información de usuarios desde
eventos de API Gateway con Cognito Authorizer.
"""

import os
import logging
import boto3

logger = logging.getLogger()


def extract_user_id(event, use_username=False):
    """
    Extrae el user_id del contexto de Cognito

    Args:
        event: Evento de API Gateway con requestContext
        use_username: Si True, extrae 'cognito:username' (para operaciones admin)
                     Si False, extrae 'email' (para operaciones de usuario)

    Returns:
        str: Username de Cognito, email, o anon_{IP}

    Examples:
        # Para lambdas admin (requieren cognito:username)
        >>> user_id = extract_user_id(event, use_username=True)
        "Google_111137626603562904354"

        # Para lambdas de usuario (usan email)
        >>> user_id = extract_user_id(event, use_username=False)
        "user@example.com"

        # Usuario anónimo
        >>> user_id = extract_user_id(event)
        "anon_192.168.1.1"
    """
    try:
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})

        if use_username:
            # Para operaciones admin: usar cognito:username
            # Esto es necesario para admin_list_groups_for_user
            username = claims.get('cognito:username')
            if username:
                logger.info(f"Extracted username from claims: {username}")
                return username
        else:
            # Para operaciones de usuario: usar email
            email = claims.get('email')
            if email:
                logger.info(f"Extracted email from claims: {email}")
                return email

        # Si no hay autenticación, generar ID anónimo con IP
        source_ip = event.get('requestContext', {}).get('identity', {}).get('sourceIp', 'unknown')
        return f"anon_{source_ip}"

    except Exception as e:
        logger.warning(f"Error extracting user_id: {str(e)}")
        return "anon_unknown"


def is_admin(user_id, cognito_user_pool_id=None):
    """
    Verifica si el usuario está en el grupo Admins de Cognito

    Args:
        user_id: Username de Cognito (debe ser cognito:username, no email)
        cognito_user_pool_id: ID del Cognito User Pool (opcional, se obtiene de env var)

    Returns:
        bool: True si el usuario está en el grupo 'Admins'

    Examples:
        >>> is_admin("Google_111137626603562904354")
        True

        >>> is_admin("anon_192.168.1.1")
        False

    Notes:
        - Los usuarios anónimos (que empiezan con 'anon_') retornan False automáticamente
        - Requiere permisos IAM: cognito-idp:AdminListGroupsForUser
        - En caso de error, retorna False (fail-closed)
    """
    try:
        logger.info(f"Checking if {user_id} is admin")

        # Los usuarios anónimos nunca son admin
        if user_id.startswith('anon_'):
            logger.info(f"User {user_id} is anonymous, not admin")
            return False

        # Obtener User Pool ID
        if not cognito_user_pool_id:
            cognito_user_pool_id = os.environ.get('COGNITO_USER_POOL_ID')

        if not cognito_user_pool_id:
            logger.error("COGNITO_USER_POOL_ID not configured")
            return False

        # Crear cliente Cognito
        cognito = boto3.client('cognito-idp')

        # Listar grupos del usuario
        # IMPORTANTE: user_id debe ser cognito:username, no email
        response = cognito.admin_list_groups_for_user(
            Username=user_id,
            UserPoolId=cognito_user_pool_id
        )

        groups = response.get('Groups', [])
        group_names = [group['GroupName'] for group in groups]

        is_admin_user = 'Admins' in group_names

        if is_admin_user:
            logger.info(f"User {user_id} groups: {group_names}, is_admin: True")
        else:
            # SECURITY: Log unauthorized admin access attempts
            logger.warning(
                f"SECURITY ALERT: Unauthorized admin access attempt by user {user_id}. "
                f"User groups: {group_names}. Access denied."
            )

        return is_admin_user

    except cognito.exceptions.UserNotFoundException:
        # SECURITY: Usuario no existe en Cognito pero intentó acceder
        logger.warning(
            f"SECURITY ALERT: Admin access attempt with non-existent user: {user_id}"
        )
        return False
    except Exception as e:
        # SECURITY: Error al verificar admin status - posible ataque
        logger.error(
            f"SECURITY ERROR: Failed to verify admin status for {user_id}: {str(e)}. "
            "This could indicate an attack attempt."
        )
        # Fail-closed: en caso de error, no dar permisos de admin
        return False


# Alias para compatibilidad con código existente
get_user_id = extract_user_id
