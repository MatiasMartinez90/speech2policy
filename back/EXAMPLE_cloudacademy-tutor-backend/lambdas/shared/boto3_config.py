"""
Boto3 Configuration para optimización de performance

Connection pooling y retries adaptativos para reducir latencia
y mejorar resiliencia ante errores transitorios de AWS.

Beneficios:
- Reutilización de conexiones HTTP (reduce latencia 50-100ms)
- Retries adaptativos basados en service health
- Timeouts configurados para evitar hanging requests
"""

from botocore.config import Config

# Configuración optimizada para Bedrock
# Bedrock puede tener latencias más altas (1-3s) por inferencia del modelo
BEDROCK_CONFIG = Config(
    max_pool_connections=50,  # Pool de conexiones HTTP reutilizables
    retries={
        'max_attempts': 3,      # Ya lo manejamos en retry.py, pero doble capa
        'mode': 'adaptive'      # AWS SDK ajusta delays según service health
    },
    connect_timeout=10,         # Timeout para establecer conexión
    read_timeout=90,            # Timeout para leer respuesta (Bedrock tarda)
    region_name=None            # Se setea dinámicamente
)

# Configuración optimizada para DynamoDB
# DynamoDB tiene latencias bajas (<100ms) normalmente
DYNAMODB_CONFIG = Config(
    max_pool_connections=50,
    retries={
        'max_attempts': 5,      # Más retries para throttling de DynamoDB
        'mode': 'adaptive'
    },
    connect_timeout=5,
    read_timeout=10,            # DynamoDB es rápido, timeout corto
    region_name=None
)

# Configuración para S3
S3_CONFIG = Config(
    max_pool_connections=50,
    retries={
        'max_attempts': 3,
        'mode': 'adaptive'
    },
    connect_timeout=5,
    read_timeout=30,            # Uploads pueden tardar
    region_name=None,
    signature_version='s3v4'
)

# Configuración para Cognito
COGNITO_CONFIG = Config(
    max_pool_connections=20,    # Menos concurrencia típicamente
    retries={
        'max_attempts': 3,
        'mode': 'adaptive'
    },
    connect_timeout=5,
    read_timeout=10,
    region_name=None
)

# Configuración para Secrets Manager / SSM
SECRETS_CONFIG = Config(
    max_pool_connections=10,    # Bajo volumen (cache en config_manager)
    retries={
        'max_attempts': 3,
        'mode': 'adaptive'
    },
    connect_timeout=5,
    read_timeout=10,
    region_name=None
)


def get_config_for_service(service: str, region: str = None) -> Config:
    """
    Obtiene configuración optimizada para un servicio AWS

    Args:
        service: Nombre del servicio ('bedrock', 'dynamodb', 's3', etc.)
        region: Región de AWS (opcional)

    Returns:
        Config: Configuración de botocore optimizada

    Usage:
        config = get_config_for_service('bedrock', 'us-east-1')
        client = boto3.client('bedrock-runtime', config=config)
    """
    service = service.lower()

    # Mapeo de servicios a configuraciones
    configs = {
        'bedrock': BEDROCK_CONFIG,
        'bedrock-runtime': BEDROCK_CONFIG,
        'dynamodb': DYNAMODB_CONFIG,
        's3': S3_CONFIG,
        'cognito': COGNITO_CONFIG,
        'cognito-idp': COGNITO_CONFIG,
        'secretsmanager': SECRETS_CONFIG,
        'ssm': SECRETS_CONFIG
    }

    # Obtener config base
    base_config = configs.get(service, DYNAMODB_CONFIG)  # Default a DynamoDB

    # Si se especificó región, crear nueva config con región
    if region:
        return Config(
            max_pool_connections=base_config.max_pool_connections,
            retries=base_config.retries,
            connect_timeout=base_config.connect_timeout,
            read_timeout=base_config.read_timeout,
            region_name=region,
            signature_version=getattr(base_config, 'signature_version', None)
        )

    return base_config


# Helpers para crear clientes con config optimizada

def create_bedrock_client(region: str = 'us-east-1'):
    """
    Crea cliente de Bedrock Runtime con config optimizada

    Args:
        region: Región de AWS

    Returns:
        boto3.client: Cliente configurado
    """
    import boto3
    config = get_config_for_service('bedrock-runtime', region)
    return boto3.client('bedrock-runtime', config=config)


def create_dynamodb_resource(region: str = 'us-east-1'):
    """
    Crea resource de DynamoDB con config optimizada

    Args:
        region: Región de AWS

    Returns:
        boto3.resource: Resource configurado
    """
    import boto3
    config = get_config_for_service('dynamodb', region)
    return boto3.resource('dynamodb', config=config)


def create_s3_client(region: str = 'us-east-1'):
    """
    Crea cliente de S3 con config optimizada

    Args:
        region: Región de AWS

    Returns:
        boto3.client: Cliente configurado
    """
    import boto3
    config = get_config_for_service('s3', region)
    return boto3.client('s3', config=config)


def create_cognito_client(region: str = 'us-east-1'):
    """
    Crea cliente de Cognito con config optimizada

    Args:
        region: Región de AWS

    Returns:
        boto3.client: Cliente configurado
    """
    import boto3
    config = get_config_for_service('cognito-idp', region)
    return boto3.client('cognito-idp', config=config)
