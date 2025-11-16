import json
import logging

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    Handler para el post-confirmation trigger de Cognito
    Versión simplificada que solo logea (sin PostgreSQL por ahora)
    """
    
    logger.info(f"Received event: {json.dumps(event)}")
    
    # Verificar que es un evento de confirmación de registro
    if event.get('triggerSource') != 'PostConfirmation_ConfirmSignUp':
        logger.info("No es un evento de confirmación de registro, saltando...")
        return event
    
    try:
        # Extraer datos del usuario del evento
        user_attributes = event.get('request', {}).get('userAttributes', {})
        
        user_data = {
            'cognito_user_id': event.get('userName'),
            'email': user_attributes.get('email'),
            'name': user_attributes.get('name'),
            'picture_url': user_attributes.get('picture'),
            'provider': 'google'
        }
        
        logger.info(f"✅ Usuario registrado exitosamente!")
        logger.info(f"📧 Email: {user_data['email']}")
        logger.info(f"👤 Nombre: {user_data['name']}")
        logger.info(f"🆔 Cognito ID: {user_data['cognito_user_id']}")
        
        # TODO: Agregar integración con PostgreSQL cuando tengamos las dependencias
        # TODO: Agregar envío de emails de bienvenida
        
        return event
        
    except Exception as e:
        logger.error(f"❌ Error procesando usuario: {str(e)}")
        # No fallar el proceso de registro, solo loggear el error
        return event