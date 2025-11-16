"""
Configuration Manager para secrets y config

Maneja configuración desde múltiples fuentes con orden de prioridad:
1. Variables de entorno (más alta prioridad)
2. AWS Systems Manager Parameter Store (config no-sensible)
3. AWS Secrets Manager (secrets críticos)
4. Valores por defecto (fallback)

Features:
- Cache en memoria para evitar múltiples llamadas a AWS
- Soporte para secrets encriptados
- Fail-fast en secrets críticos, fail-soft en config opcional
- Thread-safe para entornos concurrentes
"""

import os
import json
import logging
from typing import Any, Optional, Dict
from functools import lru_cache
import boto3
from botocore.exceptions import ClientError
from .boto3_config import get_config_for_service

logger = logging.getLogger(__name__)


class ConfigManager:
    """
    Gestor centralizado de configuración y secrets

    Usage:
        config = ConfigManager()

        # Config no-sensible (fail-soft)
        region = config.get_config('AWS_REGION', default='us-east-1')

        # Secret crítico (fail-fast)
        api_key = config.get_secret('THIRD_PARTY_API_KEY', required=True)
    """

    def __init__(self, region: Optional[str] = None):
        """
        Inicializa el config manager

        Args:
            region: Región de AWS (default: desde env var o us-east-1)
        """
        self.region = region or os.environ.get('AWS_REGION', 'us-east-1')

        # Clientes AWS (lazy initialization)
        self._ssm_client = None
        self._secrets_client = None

        # Cache en memoria
        self._cache: Dict[str, Any] = {}

    @property
    def ssm_client(self):
        """Lazy initialization de SSM client con connection pooling"""
        if self._ssm_client is None:
            config = get_config_for_service('ssm', self.region)
            self._ssm_client = boto3.client('ssm', config=config)
        return self._ssm_client

    @property
    def secrets_client(self):
        """Lazy initialization de Secrets Manager client con connection pooling"""
        if self._secrets_client is None:
            config = get_config_for_service('secretsmanager', self.region)
            self._secrets_client = boto3.client('secretsmanager', config=config)
        return self._secrets_client

    def get_config(
        self,
        key: str,
        default: Optional[Any] = None,
        required: bool = False,
        use_parameter_store: bool = True
    ) -> Any:
        """
        Obtiene configuración no-sensible

        Orden de búsqueda:
        1. Variable de entorno
        2. Parameter Store (si use_parameter_store=True)
        3. Valor default

        Args:
            key: Nombre de la configuración
            default: Valor por defecto si no se encuentra
            required: Si True, lanza excepción si no se encuentra
            use_parameter_store: Si True, busca en Parameter Store

        Returns:
            Valor de la configuración

        Raises:
            ValueError: Si required=True y no se encuentra el valor
        """
        # 1. Verificar cache
        cache_key = f"config:{key}"
        if cache_key in self._cache:
            logger.debug(f"Config '{key}' found in cache")
            return self._cache[cache_key]

        # 2. Verificar variable de entorno
        env_value = os.environ.get(key)
        if env_value is not None:
            logger.debug(f"Config '{key}' found in environment")
            self._cache[cache_key] = env_value
            return env_value

        # 3. Verificar Parameter Store (si está habilitado)
        if use_parameter_store:
            param_value = self._get_from_parameter_store(key)
            if param_value is not None:
                logger.debug(f"Config '{key}' found in Parameter Store")
                self._cache[cache_key] = param_value
                return param_value

        # 4. Usar valor default
        if default is not None:
            logger.debug(f"Config '{key}' using default value")
            self._cache[cache_key] = default
            return default

        # 5. Si es required y no se encontró, fallar
        if required:
            raise ValueError(f"Required config '{key}' not found in environment or Parameter Store")

        logger.warning(f"Config '{key}' not found, returning None")
        return None

    def get_secret(
        self,
        secret_name: str,
        required: bool = False,
        json_key: Optional[str] = None
    ) -> Optional[str]:
        """
        Obtiene secret desde Secrets Manager

        Args:
            secret_name: Nombre del secret en Secrets Manager
            required: Si True, lanza excepción si no se encuentra
            json_key: Si el secret es JSON, extrae esta key específica

        Returns:
            Valor del secret (string)

        Raises:
            ValueError: Si required=True y no se encuentra
        """
        # 1. Verificar cache
        cache_key = f"secret:{secret_name}:{json_key or 'full'}"
        if cache_key in self._cache:
            logger.debug(f"Secret '{secret_name}' found in cache")
            return self._cache[cache_key]

        # 2. Intentar obtener de Secrets Manager
        try:
            response = self.secrets_client.get_secret_value(SecretId=secret_name)

            secret_value = response.get('SecretString')

            if not secret_value:
                raise ValueError(f"Secret '{secret_name}' is empty")

            # Si se pide una key específica de JSON
            if json_key:
                secret_data = json.loads(secret_value)
                value = secret_data.get(json_key)

                if value is None and required:
                    raise ValueError(f"Key '{json_key}' not found in secret '{secret_name}'")

                logger.info(f"Secret '{secret_name}.{json_key}' retrieved successfully")
                self._cache[cache_key] = value
                return value

            # Retornar secret completo
            logger.info(f"Secret '{secret_name}' retrieved successfully")
            self._cache[cache_key] = secret_value
            return secret_value

        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')

            if error_code == 'ResourceNotFoundException':
                logger.warning(f"Secret '{secret_name}' not found in Secrets Manager")
            else:
                logger.error(f"Error retrieving secret '{secret_name}': {str(e)}")

            # Si es required, fallar
            if required:
                raise ValueError(f"Required secret '{secret_name}' not found or inaccessible")

            return None

        except Exception as e:
            logger.error(f"Unexpected error retrieving secret '{secret_name}': {str(e)}")

            if required:
                raise

            return None

    def _get_from_parameter_store(self, parameter_name: str) -> Optional[str]:
        """
        Obtiene parámetro desde SSM Parameter Store

        Args:
            parameter_name: Nombre del parámetro

        Returns:
            Valor del parámetro o None si no existe
        """
        try:
            # Intentar con el nombre directo
            response = self.ssm_client.get_parameter(
                Name=parameter_name,
                WithDecryption=True  # Soporta SecureString
            )

            value = response['Parameter']['Value']
            logger.info(f"Parameter '{parameter_name}' retrieved from Parameter Store")
            return value

        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')

            if error_code == 'ParameterNotFound':
                logger.debug(f"Parameter '{parameter_name}' not found in Parameter Store")
            else:
                logger.warning(f"Error retrieving parameter '{parameter_name}': {str(e)}")

            return None

        except Exception as e:
            logger.warning(f"Unexpected error retrieving parameter '{parameter_name}': {str(e)}")
            return None

    def clear_cache(self):
        """Limpia el cache (útil para testing o recargar configuración)"""
        self._cache.clear()
        logger.info("Configuration cache cleared")


# Instancia global singleton
_config_manager = None


def get_config_manager(region: Optional[str] = None) -> ConfigManager:
    """
    Obtiene instancia singleton del ConfigManager

    Args:
        region: Región de AWS (solo se usa en primera llamada)

    Returns:
        ConfigManager: Instancia singleton
    """
    global _config_manager

    if _config_manager is None:
        _config_manager = ConfigManager(region=region)

    return _config_manager


# Funciones de conveniencia

def get_config(key: str, default: Optional[Any] = None, required: bool = False) -> Any:
    """
    Helper para obtener configuración usando el manager global

    Usage:
        from shared.config_manager import get_config

        region = get_config('AWS_REGION', default='us-east-1')
    """
    return get_config_manager().get_config(key, default, required)


def get_secret(secret_name: str, required: bool = False, json_key: Optional[str] = None) -> Optional[str]:
    """
    Helper para obtener secret usando el manager global

    Usage:
        from shared.config_manager import get_secret

        api_key = get_secret('third-party-api-key', required=True)
    """
    return get_config_manager().get_secret(secret_name, required, json_key)


# Configuraciones comunes pre-definidas

def get_aws_region() -> str:
    """Obtiene la región de AWS"""
    return get_config('AWS_REGION', default='us-east-1')


def get_bedrock_model_id() -> str:
    """Obtiene el Model ID de Bedrock"""
    return get_config(
        'BEDROCK_MODEL_ID',
        default='anthropic.claude-3-5-sonnet-20241022-v2:0'
    )


def get_cognito_user_pool_id() -> Optional[str]:
    """Obtiene el Cognito User Pool ID"""
    return get_config('COGNITO_USER_POOL_ID', required=False)


def get_table_name(table_env_var: str, default_name: str) -> str:
    """
    Obtiene nombre de tabla DynamoDB

    Args:
        table_env_var: Nombre de la variable de entorno (e.g., 'COURSES_TABLE')
        default_name: Nombre por defecto de la tabla

    Returns:
        Nombre de la tabla
    """
    return get_config(table_env_var, default=default_name)
