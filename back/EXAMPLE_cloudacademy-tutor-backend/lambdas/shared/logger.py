"""
Logger compartido usando AWS Lambda Powertools

Features:
- Logs estructurados en formato JSON
- Correlation IDs automáticos para request tracing
- Compatibilidad con CloudWatch Logs Insights
- Sampling para reducir costos en producción
- Context injection automático (cold start, Lambda info, etc.)

Usage:
    from shared.logger import get_logger

    logger = get_logger(__name__)

    logger.info("Processing request", extra={"user_id": user_id})
    logger.error("Error occurred", exc_info=True)
"""

import os
from aws_lambda_powertools import Logger
from aws_lambda_powertools.logging import correlation_paths


def get_logger(service_name: str = None, log_level: str = None) -> Logger:
    """
    Obtiene logger configurado con Powertools

    Args:
        service_name: Nombre del servicio (ej: 'tutor-handler', 'courses-handler')
                     Si no se especifica, usa la variable de entorno AWS_LAMBDA_FUNCTION_NAME
        log_level: Nivel de logging ('DEBUG', 'INFO', 'WARNING', 'ERROR')
                  Si no se especifica, usa LOG_LEVEL env var o 'INFO' por defecto

    Returns:
        Logger: Logger configurado con Powertools

    Examples:
        >>> logger = get_logger('tutor-handler')
        >>> logger.info("Request received", extra={"course_id": "terraform-101"})
        {
            "level": "INFO",
            "location": "lambda_function:45",
            "message": "Request received",
            "timestamp": "2025-01-14 10:30:45,123+0000",
            "service": "tutor-handler",
            "course_id": "terraform-101",
            "cold_start": true,
            "function_name": "tutor-handler-prod",
            "function_memory_size": 512,
            "function_request_id": "52fdfc07-2182-154f-163f-5f0f9a621d72"
        }
    """
    # Obtener service name desde variable de entorno si no se especifica
    if not service_name:
        service_name = os.environ.get('AWS_LAMBDA_FUNCTION_NAME', 'cloudacademy-backend')

    # Obtener log level desde variable de entorno si no se especifica
    if not log_level:
        log_level = os.environ.get('LOG_LEVEL', 'INFO')

    # Crear logger con configuración optimizada
    logger = Logger(
        service=service_name,
        level=log_level,
        # Sampling: en producción, logear solo 10% de requests DEBUG para reducir costos
        # Siempre logear INFO+ sin sampling
        sample_rate=float(os.environ.get('POWERTOOLS_LOGGER_SAMPLE_RATE', '0.1')),
        # Auto-inject context: Lambda info, cold start, correlation IDs
        log_uncaught_exceptions=True,  # Capturar excepciones no manejadas
        # Correlation ID path para API Gateway
        correlation_id_path=correlation_paths.API_GATEWAY_REST
    )

    return logger


# Instancia global singleton (recomendado por AWS)
# Se reutiliza en warm starts para mejor performance
_default_logger = None


def get_default_logger() -> Logger:
    """
    Obtiene instancia singleton del logger

    Reutiliza el logger en warm starts para mejor performance

    Returns:
        Logger: Logger singleton
    """
    global _default_logger

    if _default_logger is None:
        _default_logger = get_logger()

    return _default_logger


# Helpers para decorators (uso avanzado)

def inject_lambda_context(logger: Logger = None):
    """
    Decorator para auto-inyectar contexto de Lambda en logs

    Usage:
        from shared.logger import get_logger, inject_lambda_context

        logger = get_logger(__name__)

        @inject_lambda_context(logger=logger)
        def lambda_handler(event, context):
            logger.info("Processing request")
            return {"statusCode": 200}

    Inyecta automáticamente:
    - function_name
    - function_memory_size
    - function_arn
    - function_request_id
    - cold_start (boolean)
    - correlation_id (desde API Gateway)
    """
    if logger is None:
        logger = get_default_logger()

    return logger.inject_lambda_context(
        log_event=False,  # No logear todo el evento (puede tener datos sensibles)
        correlation_id_path=correlation_paths.API_GATEWAY_REST
    )


def log_metrics():
    """
    Decorator para auto-capturar métricas de la función

    Usage:
        from aws_lambda_powertools import Metrics
        from shared.logger import log_metrics

        metrics = Metrics(service="tutor-handler")

        @log_metrics()
        def lambda_handler(event, context):
            metrics.add_metric(name="RequestsReceived", unit="Count", value=1)
            return {"statusCode": 200}

    Captura automáticamente:
    - Cold starts
    - Duration
    - Success/Failure rate
    """
    from aws_lambda_powertools import Metrics

    # Crear instancia de Metrics si no existe
    service_name = os.environ.get('AWS_LAMBDA_FUNCTION_NAME', 'cloudacademy-backend')
    metrics = Metrics(service=service_name)

    return metrics.log_metrics(
        capture_cold_start_metric=True,  # Métrica de cold starts
        raise_on_empty_metrics=False  # No fallar si no hay métricas
    )


# Ejemplo de uso completo
"""
# En lambda_function.py:

from shared.logger import get_logger, inject_lambda_context

logger = get_logger(__name__)

@inject_lambda_context(logger=logger)
def lambda_handler(event, context):
    logger.info("Lambda started")

    try:
        # Tu lógica aquí
        course_id = event.get('pathParameters', {}).get('id')

        logger.info("Processing course", extra={
            "course_id": course_id,
            "user_id": "user@example.com"
        })

        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Success"})
        }

    except Exception as e:
        logger.error("Error processing request", exc_info=True, extra={
            "error_type": type(e).__name__
        })
        raise
"""
