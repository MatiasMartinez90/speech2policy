"""
Structured Logger con formato JSON para CloudWatch Logs

Proporciona logging estructurado que facilita:
- Búsquedas y filtros en CloudWatch Logs Insights
- Correlación de requests con trace IDs
- Análisis de performance y métricas
- Debugging con contexto rico

Usage:
    from shared.structured_logger import get_logger, set_context

    logger = get_logger(__name__)

    # Agregar contexto global para este request
    set_context(user_id="user123", request_id="abc-123")

    # Logs con metadata automática
    logger.info("User asking question",
                extra={'course_id': 'aws-101', 'tokens': 150})
"""

import json
import logging
import time
from datetime import datetime
from typing import Any, Dict, Optional
from contextlib import contextmanager

# Contexto global por request (se reinicia en cada invocación de Lambda)
_request_context: Dict[str, Any] = {}


def set_context(**kwargs):
    """
    Establece contexto global para el request actual

    Args:
        **kwargs: Pares clave-valor para agregar al contexto

    Usage:
        set_context(user_id="user123", course_id="aws-101", request_id="xyz")
    """
    global _request_context
    _request_context.update(kwargs)


def clear_context():
    """Limpia el contexto global (útil entre tests)"""
    global _request_context
    _request_context = {}


def get_context() -> Dict[str, Any]:
    """Obtiene el contexto global actual"""
    return _request_context.copy()


class StructuredFormatter(logging.Formatter):
    """
    Formatter que convierte logs a JSON estructurado

    Incluye automáticamente:
    - timestamp (ISO 8601)
    - level (INFO, ERROR, etc.)
    - message
    - logger_name
    - contexto global (user_id, request_id, etc.)
    - metadata adicional del log (extra fields)
    """

    def format(self, record: logging.LogRecord) -> str:
        """
        Formatea un LogRecord como JSON

        Args:
            record: LogRecord de Python

        Returns:
            str: JSON string con todos los campos
        """
        # Construir objeto de log
        log_data = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
        }

        # Agregar contexto global si existe
        if _request_context:
            log_data['context'] = _request_context.copy()

        # Agregar metadata adicional (campos extra)
        # Excluir campos internos de Python logging
        excluded_fields = {
            'name', 'msg', 'args', 'created', 'filename', 'funcName',
            'levelname', 'levelno', 'lineno', 'module', 'msecs',
            'message', 'pathname', 'process', 'processName',
            'relativeCreated', 'thread', 'threadName', 'exc_info',
            'exc_text', 'stack_info', 'taskName'
        }

        extra = {
            key: value
            for key, value in record.__dict__.items()
            if key not in excluded_fields
        }

        if extra:
            log_data['extra'] = extra

        # Agregar información de excepción si existe
        if record.exc_info:
            log_data['exception'] = {
                'type': record.exc_info[0].__name__,
                'message': str(record.exc_info[1]),
                'traceback': self.formatException(record.exc_info)
            }

        # Agregar ubicación del código (útil para debugging)
        log_data['location'] = {
            'file': record.filename,
            'line': record.lineno,
            'function': record.funcName
        }

        # Serializar a JSON
        return json.dumps(log_data, default=str, ensure_ascii=False)


def get_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    """
    Obtiene un logger estructurado

    Args:
        name: Nombre del logger (usualmente __name__)
        level: Nivel de logging (default: INFO)

    Returns:
        logging.Logger: Logger configurado con StructuredFormatter

    Usage:
        logger = get_logger(__name__)
        logger.info("Processing request", extra={'user_id': '123'})
    """
    logger = logging.getLogger(name)

    # Solo configurar si no tiene handlers (evitar duplicados)
    if not logger.handlers:
        logger.setLevel(level)

        # Handler para stdout (Lambda envía stdout a CloudWatch)
        handler = logging.StreamHandler()
        handler.setLevel(level)

        # Usar formatter estructurado
        formatter = StructuredFormatter()
        handler.setFormatter(formatter)

        logger.addHandler(handler)

        # No propagar a root logger (evitar duplicados)
        logger.propagate = False

    return logger


@contextmanager
def log_performance(logger: logging.Logger, operation: str, **context):
    """
    Context manager para medir y loggear performance de operaciones

    Args:
        logger: Logger a usar
        operation: Nombre de la operación
        **context: Contexto adicional

    Usage:
        with log_performance(logger, "bedrock_invoke", model="claude-3"):
            result = bedrock.invoke(...)
    """
    start_time = time.time()
    error = None

    try:
        yield
    except Exception as e:
        error = e
        raise
    finally:
        elapsed_ms = (time.time() - start_time) * 1000

        log_data = {
            'operation': operation,
            'duration_ms': round(elapsed_ms, 2),
            'success': error is None,
            **context
        }

        if error:
            log_data['error'] = str(error)
            logger.error(f"Operation '{operation}' failed", extra=log_data)
        else:
            logger.info(f"Operation '{operation}' completed", extra=log_data)


def log_api_call(
    logger: logging.Logger,
    service: str,
    operation: str,
    status_code: Optional[int] = None,
    duration_ms: Optional[float] = None,
    **metadata
):
    """
    Helper para loggear llamadas a APIs externas

    Args:
        logger: Logger a usar
        service: Nombre del servicio (e.g., "bedrock", "dynamodb")
        operation: Operación realizada (e.g., "invoke_model", "put_item")
        status_code: Código de respuesta HTTP (si aplica)
        duration_ms: Duración en milisegundos
        **metadata: Metadata adicional

    Usage:
        log_api_call(
            logger,
            service="bedrock",
            operation="invoke_model",
            status_code=200,
            duration_ms=1234,
            tokens_used=150
        )
    """
    log_data = {
        'service': service,
        'operation': operation,
        **metadata
    }

    if status_code is not None:
        log_data['status_code'] = status_code

    if duration_ms is not None:
        log_data['duration_ms'] = round(duration_ms, 2)

    # Determinar nivel según status
    if status_code and status_code >= 400:
        logger.error(f"{service}.{operation} failed", extra=log_data)
    else:
        logger.info(f"{service}.{operation}", extra=log_data)


def log_user_action(
    logger: logging.Logger,
    user_id: str,
    action: str,
    resource: Optional[str] = None,
    **metadata
):
    """
    Helper para loggear acciones de usuarios

    Args:
        logger: Logger a usar
        user_id: ID del usuario
        action: Acción realizada (e.g., "ask_question", "validate_checkpoint")
        resource: Recurso afectado (e.g., "course:aws-101")
        **metadata: Metadata adicional

    Usage:
        log_user_action(
            logger,
            user_id="user123",
            action="ask_question",
            resource="course:aws-101",
            section_id=0
        )
    """
    log_data = {
        'user_id': user_id,
        'action': action,
        **metadata
    }

    if resource:
        log_data['resource'] = resource

    logger.info(f"User action: {action}", extra=log_data)


def log_error_with_context(
    logger: logging.Logger,
    error: Exception,
    context: str,
    **metadata
):
    """
    Helper para loggear errores con contexto rico

    Args:
        logger: Logger a usar
        error: La excepción
        context: Contexto donde ocurrió el error
        **metadata: Metadata adicional

    Usage:
        try:
            bedrock.invoke(...)
        except Exception as e:
            log_error_with_context(
                logger, e,
                context="bedrock_invocation",
                user_id=user_id,
                course_id=course_id
            )
    """
    log_data = {
        'error_type': type(error).__name__,
        'error_message': str(error),
        'context': context,
        **metadata
    }

    logger.error(
        f"Error in {context}: {str(error)}",
        extra=log_data,
        exc_info=True
    )


# Pre-configurar el root logger de Lambda con formato estructurado
# Esto captura logs de bibliotecas de terceros también
def configure_root_logger(level: int = logging.INFO):
    """
    Configura el root logger con formato estructurado

    Útil para capturar logs de bibliotecas externas (boto3, etc.)

    Args:
        level: Nivel de logging (default: INFO)
    """
    root_logger = logging.getLogger()

    # Limpiar handlers existentes
    root_logger.handlers = []

    # Configurar con structured formatter
    handler = logging.StreamHandler()
    handler.setFormatter(StructuredFormatter())
    root_logger.addHandler(handler)
    root_logger.setLevel(level)
