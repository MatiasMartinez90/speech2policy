"""
Retry utilities con Exponential Backoff

Proporciona decoradores y funciones para reintentar operaciones fallidas
con estrategia de exponential backoff.

Útil para:
- Llamadas a APIs externas (Bedrock, etc.)
- Operaciones de DynamoDB con throttling
- Cualquier operación que pueda fallar temporalmente
"""

import time
import logging
from functools import wraps
from typing import Callable, Type, Tuple, Optional
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


def is_retryable_error(exception: Exception) -> bool:
    """
    Determina si un error es retriable (transitorio)

    Args:
        exception: La excepción a evaluar

    Returns:
        bool: True si el error es retriable, False si es permanente
    """
    # Errores de AWS/Boto3 retriables
    if isinstance(exception, ClientError):
        error_code = exception.response.get('Error', {}).get('Code', '')

        # Throttling y rate limiting
        if error_code in [
            'ThrottlingException',
            'TooManyRequestsException',
            'ProvisionedThroughputExceededException',
            'RequestLimitExceeded',
            'ServiceUnavailable',
            'InternalServerError',
            'InternalFailure'
        ]:
            return True

        # Timeouts y errores de red
        if 'timeout' in error_code.lower() or 'timed out' in str(exception).lower():
            return True

        # Service unavailable
        if error_code.startswith('5'):  # 5xx errors
            return True

        return False

    # Timeout errors genéricos
    if 'timeout' in str(exception).lower() or 'timed out' in str(exception).lower():
        return True

    # Connection errors
    if 'connection' in str(exception).lower():
        return True

    # Por defecto, no reintentar errores desconocidos
    return False


def retry_with_exponential_backoff(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    exponential_base: float = 2.0,
    retryable_exceptions: Optional[Tuple[Type[Exception], ...]] = None,
    retry_on_error_check: Optional[Callable[[Exception], bool]] = None
):
    """
    Decorador para reintentar funciones con exponential backoff

    Args:
        max_retries: Número máximo de reintentos (default: 3)
        base_delay: Delay inicial en segundos (default: 1.0)
        max_delay: Delay máximo en segundos (default: 30.0)
        exponential_base: Base para el crecimiento exponencial (default: 2.0)
        retryable_exceptions: Tupla de excepciones a reintentar (default: None = todas)
        retry_on_error_check: Función custom para determinar si reintentar (default: is_retryable_error)

    Usage:
        @retry_with_exponential_backoff(max_retries=3, base_delay=1.0)
        def my_api_call():
            return external_api.request()

    Patrón de delays:
        Intento 1: falla → espera base_delay (1s)
        Intento 2: falla → espera base_delay * 2^1 (2s)
        Intento 3: falla → espera base_delay * 2^2 (4s)
        Intento 4: falla → lanza excepción
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Función para determinar si reintentar
            check_retry = retry_on_error_check or is_retryable_error

            last_exception = None
            attempt = 0

            while attempt <= max_retries:
                try:
                    # Intentar ejecutar la función
                    result = func(*args, **kwargs)

                    # Si llegamos aquí, fue exitoso
                    if attempt > 0:
                        logger.info(
                            f"[Retry] {func.__name__} succeeded after {attempt} retries"
                        )

                    return result

                except Exception as e:
                    last_exception = e
                    attempt += 1

                    # Verificar si debemos reintentar
                    should_retry = False

                    # Si se especificaron excepciones específicas
                    if retryable_exceptions:
                        should_retry = isinstance(e, retryable_exceptions)
                    else:
                        # Usar la función de check
                        should_retry = check_retry(e)

                    # Si no es retriable o agotamos los intentos
                    if not should_retry or attempt > max_retries:
                        logger.error(
                            f"[Retry] {func.__name__} failed after {attempt} attempts: {str(e)}"
                        )
                        raise

                    # Calcular delay con exponential backoff
                    delay = min(
                        base_delay * (exponential_base ** (attempt - 1)),
                        max_delay
                    )

                    logger.warning(
                        f"[Retry] {func.__name__} attempt {attempt}/{max_retries} failed: {str(e)}. "
                        f"Retrying in {delay:.2f}s..."
                    )

                    # Esperar antes del próximo intento
                    time.sleep(delay)

            # Si llegamos aquí, agotamos todos los reintentos
            logger.error(
                f"[Retry] {func.__name__} exhausted all {max_retries} retries"
            )
            raise last_exception

        return wrapper
    return decorator


def retry_call(
    func: Callable,
    *args,
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    **kwargs
):
    """
    Ejecuta una función con retry sin usar decorador

    Args:
        func: Función a ejecutar
        *args: Argumentos posicionales para la función
        max_retries: Número máximo de reintentos
        base_delay: Delay inicial en segundos
        max_delay: Delay máximo en segundos
        **kwargs: Argumentos keyword para la función

    Returns:
        Resultado de la función

    Usage:
        result = retry_call(api.request, param1, param2, max_retries=5)
    """
    @retry_with_exponential_backoff(
        max_retries=max_retries,
        base_delay=base_delay,
        max_delay=max_delay
    )
    def _wrapped():
        return func(*args, **kwargs)

    return _wrapped()


class RetryConfig:
    """
    Configuración de retry reutilizable

    Usage:
        bedrock_retry = RetryConfig(max_retries=5, base_delay=2.0)

        @bedrock_retry.decorator
        def call_bedrock():
            ...
    """

    def __init__(
        self,
        max_retries: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 30.0,
        exponential_base: float = 2.0
    ):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base

    @property
    def decorator(self):
        """Retorna un decorador configurado"""
        return retry_with_exponential_backoff(
            max_retries=self.max_retries,
            base_delay=self.base_delay,
            max_delay=self.max_delay,
            exponential_base=self.exponential_base
        )


# Configuraciones predefinidas para casos comunes

# Para llamadas a Bedrock (API externa, puede tener throttling)
bedrock_retry_config = RetryConfig(
    max_retries=3,
    base_delay=1.0,
    max_delay=10.0,
    exponential_base=2.0
)

# Para operaciones de DynamoDB (throttling común)
dynamodb_retry_config = RetryConfig(
    max_retries=5,
    base_delay=0.5,
    max_delay=5.0,
    exponential_base=2.0
)

# Para llamadas HTTP externas genéricas
http_retry_config = RetryConfig(
    max_retries=3,
    base_delay=2.0,
    max_delay=30.0,
    exponential_base=2.0
)
