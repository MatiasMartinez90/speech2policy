import json
import logging
import os
from datetime import datetime
import boto3
from botocore.exceptions import ClientError

# Configurar logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    Handler para el post-confirmation trigger de Cognito
    Crea un perfil de usuario en DynamoDB cuando se confirma el registro
    """

    logger.info(f"Received event: {json.dumps(event)}")

    # Verificar que es un evento de confirmación de registro
    if event.get('triggerSource') != 'PostConfirmation_ConfirmSignUp':
        logger.info("No es un evento de confirmación de registro, saltando...")
        return event

    try:
        # Extraer datos del usuario del evento
        user_data = extract_user_data(event)
        logger.info(f"Datos del usuario extraídos: {user_data['email']}")

        # Crear perfil de usuario en DynamoDB
        create_user_in_dynamodb(user_data)
        logger.info(f"Usuario creado en DynamoDB: {user_data['cognito_user_id']}")

        # Enviar email de bienvenida
        send_welcome_email(user_data)
        logger.info("Email de bienvenida enviado")

        return event

    except Exception as e:
        logger.error(f"Error procesando usuario: {str(e)}")
        # No fallar el proceso de registro, solo loggear el error
        return event

def extract_user_data(event):
    """
    Extrae los datos del usuario del evento de Cognito
    """
    user_attributes = event.get('request', {}).get('userAttributes', {})

    # Detectar provider (Google OAuth o Email/Password)
    # Si tiene picture, probablemente es Google OAuth
    provider = 'google' if user_attributes.get('picture') else 'email'

    return {
        'cognito_user_id': event.get('userName'),
        'email': user_attributes.get('email'),
        'name': user_attributes.get('name', user_attributes.get('email', '').split('@')[0]),
        'given_name': user_attributes.get('given_name', ''),
        'family_name': user_attributes.get('family_name', ''),
        'picture_url': user_attributes.get('picture', ''),
        'provider': provider
    }

def create_user_in_dynamodb(user_data):
    """
    Crea un perfil de usuario directamente en DynamoDB
    Tabla: Users (ARN disponible en outputs del backend tutor)
    """
    try:
        # Inicializar cliente DynamoDB
        dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        users_table = dynamodb.Table('Users')

        # Timestamp actual
        now = datetime.utcnow().isoformat()

        # Preparar item para DynamoDB
        item = {
            'PK': f"USER#{user_data['cognito_user_id']}",
            'SK': 'PROFILE',
            'cognito_user_id': user_data['cognito_user_id'],
            'username': user_data['cognito_user_id'],
            'email': user_data['email'],
            'name': user_data['name'],
            'given_name': user_data['given_name'],
            'family_name': user_data['family_name'],
            'picture_url': user_data['picture_url'],
            'provider': user_data['provider'],
            'created_at': now,
            'updated_at': now,
            'is_active': True,
            'onboarding_completed': False,
            'preferences': {}
        }

        # Escribir a DynamoDB
        users_table.put_item(Item=item)

        logger.info(f"Usuario guardado en DynamoDB: PK={item['PK']}, email={user_data['email']}")

    except Exception as e:
        logger.error(f"Error escribiendo a DynamoDB: {str(e)}")
        raise

def send_welcome_email(user_data):
    """
    Envía email de bienvenida usando AWS SES
    """
    try:
        ses_client = boto3.client('ses', region_name='us-east-1')

        # Crear contenido del email
        subject = "¡Bienvenido a CloudAcademy! 🚀"

        html_body = f"""
        <html>
        <head></head>
        <body>
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #6366f1;">¡Bienvenido a CloudAcademy!</h1>

                <p>Hola {user_data['name'] or 'estudiante'},</p>

                <p>¡Gracias por unirte a CloudAcademy! Estamos emocionados de tenerte en nuestra comunidad de aprendizaje.</p>

                <h2 style="color: #4f46e5;">¿Qué puedes hacer ahora?</h2>
                <ul>
                    <li>🧠 Explora nuestro curso de <strong>RAG con Amazon Bedrock</strong></li>
                    <li>🌐 Aprende a construir <strong>VPCs en AWS</strong></li>
                    <li>🔒 Domina la <strong>seguridad en la nube</strong></li>
                    <li>💻 Desarrolla proyectos <strong>hands-on</strong></li>
                </ul>

                <div style="background-color: #f0f9ff; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <h3 style="color: #0369a1;">🎯 Tu próximo paso:</h3>
                    <p>Completa tu primer curso y comienza tu journey en Cloud & DevOps</p>
                    <a href="https://proyectos.cloudacademy.ar"
                       style="background-color: #6366f1; color: white; padding: 12px 24px;
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                        Empezar ahora
                    </a>
                </div>

                <p>¡Nos vemos en las clases!</p>

                <p style="color: #6b7280;">
                    El equipo de CloudAcademy<br>
                    <em>Proyectos REALES para aprender Cloud y DevOps</em>
                </p>
            </div>
        </body>
        </html>
        """

        text_body = f"""
        ¡Bienvenido a CloudAcademy!

        Hola {user_data['name'] or 'estudiante'},

        ¡Gracias por unirte a CloudAcademy! Estamos emocionados de tenerte en nuestra comunidad.

        ¿Qué puedes hacer ahora?
        - Explora nuestro curso de RAG con Amazon Bedrock
        - Aprende a construir VPCs en AWS
        - Domina la seguridad en la nube
        - Desarrolla proyectos hands-on

        Tu próximo paso: Completa tu primer curso y comienza tu journey en Cloud & DevOps

        Visítanos en: https://proyectos.cloudacademy.ar

        ¡Nos vemos en las clases!

        El equipo de CloudAcademy
        Proyectos REALES para aprender Cloud y DevOps
        """

        # Enviar email
        response = ses_client.send_email(
            Source=os.environ.get('FROM_EMAIL', 'noreply@cloudacademy.ar'),
            Destination={'ToAddresses': [user_data['email']]},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {
                    'Html': {'Data': html_body, 'Charset': 'UTF-8'},
                    'Text': {'Data': text_body, 'Charset': 'UTF-8'}
                }
            }
        )

        logger.info(f"Email enviado. Message ID: {response['MessageId']}")

    except ClientError as e:
        logger.error(f"Error enviando email: {e}")
        # No fallar si el email no se puede enviar
        pass
