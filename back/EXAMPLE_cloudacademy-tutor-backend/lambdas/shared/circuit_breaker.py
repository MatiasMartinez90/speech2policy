"""
Circuit Breaker Pattern para llamadas a servicios externos (Bedrock API)

Previene cascadas de fallos cuando un servicio externo está fallando,
permitiendo que el sistema se recupere más rápido.

Estados:
- CLOSED: Funcionamiento normal, permite todas las llamadas
- OPEN: Servicio fallando, rechaza llamadas inmediatamente
- HALF_OPEN: Permitiendo llamadas de prueba para verificar recuperación
"""

import time
import logging
from enum import Enum
from functools import wraps
from typing import Callable, Any, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """Estados del Circuit Breaker"""
    CLOSED = "closed"        # Normal operation
    OPEN = "open"           # Failing, rejecting calls
    HALF_OPEN = "half_open" # Testing recovery


class CircuitBreakerError(Exception):
    """Excepción lanzada cuando el circuit breaker está abierto"""
    pass


class CircuitBreaker:
    """
    Implementación del patrón Circuit Breaker

    Parámetros:
    - failure_threshold: Número de fallos antes de abrir el circuito (default: 5)
    - recovery_timeout: Segundos antes de intentar recuperación (default: 60)
    - expected_exception: Tipo de excepción a contar como fallo (default: Exception)
    - name: Nombre del circuit breaker para logging (default: "CircuitBreaker")
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception,
        name: str = "CircuitBreaker"
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.name = name

        # Estado interno
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._last_failure_time: Optional[float] = None
        self._last_state_change: float = time.time()

    @property
    def state(self) -> CircuitState:
        """Obtiene el estado actual del circuit breaker"""
        # Si está OPEN, verificar si es momento de pasar a HALF_OPEN
        if self._state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self._transition_to_half_open()

        return self._state

    def _should_attempt_reset(self) -> bool:
        """Verifica si pasó suficiente tiempo para intentar recuperación"""
        if self._last_failure_time is None:
            return False

        time_since_last_failure = time.time() - self._last_failure_time
        return time_since_last_failure >= self.recovery_timeout

    def _transition_to_half_open(self):
        """Transiciona de OPEN a HALF_OPEN para probar recuperación"""
        logger.info(f"[{self.name}] Circuit breaker transitioning to HALF_OPEN state")
        self._state = CircuitState.HALF_OPEN
        self._last_state_change = time.time()

    def _on_success(self):
        """Callback cuando una llamada es exitosa"""
        if self._state == CircuitState.HALF_OPEN:
            # Recuperación exitosa, cerrar el circuito
            logger.info(f"[{self.name}] Circuit breaker closing after successful recovery")
            self._state = CircuitState.CLOSED
            self._failure_count = 0
            self._last_failure_time = None
            self._last_state_change = time.time()
        elif self._state == CircuitState.CLOSED:
            # Reset del contador de fallos en operación normal
            self._failure_count = 0

    def _on_failure(self, exception: Exception):
        """Callback cuando una llamada falla"""
        self._failure_count += 1
        self._last_failure_time = time.time()

        logger.warning(
            f"[{self.name}] Circuit breaker registered failure "
            f"({self._failure_count}/{self.failure_threshold}): {str(exception)}"
        )

        # Si estamos en HALF_OPEN, volver a OPEN inmediatamente
        if self._state == CircuitState.HALF_OPEN:
            logger.warning(f"[{self.name}] Circuit breaker opening after failed recovery attempt")
            self._state = CircuitState.OPEN
            self._last_state_change = time.time()
            return

        # Si alcanzamos el threshold, abrir el circuito
        if self._failure_count >= self.failure_threshold:
            logger.error(
                f"[{self.name}] Circuit breaker opening after {self._failure_count} failures"
            )
            self._state = CircuitState.OPEN
            self._last_state_change = time.time()

    def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Ejecuta una función a través del circuit breaker

        Args:
            func: Función a ejecutar
            *args, **kwargs: Argumentos para la función

        Returns:
            Resultado de la función

        Raises:
            CircuitBreakerError: Si el circuito está abierto
            Exception: Si la función falla
        """
        # Verificar estado actual
        current_state = self.state

        if current_state == CircuitState.OPEN:
            raise CircuitBreakerError(
                f"Circuit breaker '{self.name}' is OPEN. "
                f"Service unavailable. Retry after {self.recovery_timeout}s"
            )

        try:
            # Ejecutar la función
            result = func(*args, **kwargs)

            # Registrar éxito
            self._on_success()

            return result

        except self.expected_exception as e:
            # Registrar fallo
            self._on_failure(e)

            # Re-lanzar la excepción
            raise

    def __call__(self, func: Callable) -> Callable:
        """
        Permite usar el circuit breaker como decorador

        Usage:
            breaker = CircuitBreaker(failure_threshold=3)

            @breaker
            def my_function():
                # código que puede fallar
                pass
        """
        @wraps(func)
        def wrapper(*args, **kwargs):
            return self.call(func, *args, **kwargs)

        return wrapper

    def get_metrics(self) -> dict:
        """
        Obtiene métricas actuales del circuit breaker

        Returns:
            Dict con métricas: state, failure_count, last_failure_time, etc.
        """
        return {
            'name': self.name,
            'state': self._state.value,
            'failure_count': self._failure_count,
            'failure_threshold': self.failure_threshold,
            'last_failure_time': self._last_failure_time,
            'last_state_change': self._last_state_change,
            'recovery_timeout': self.recovery_timeout
        }


# Instancia global para llamadas a Bedrock
# Se puede configurar con variables de entorno si es necesario
bedrock_circuit_breaker = CircuitBreaker(
    failure_threshold=5,        # 5 fallos consecutivos
    recovery_timeout=30,         # 30 segundos antes de reintentar
    expected_exception=Exception,
    name="BedrockAPI"
)
