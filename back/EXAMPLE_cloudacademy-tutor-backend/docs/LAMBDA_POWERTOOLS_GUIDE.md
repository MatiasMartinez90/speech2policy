# 🚀 AWS Lambda Powertools - Guía de Uso

**Fecha:** 2025-01-14
**Status:** ✅ Implementado (Mejora #10)
**Versión:** aws-lambda-powertools==2.32.0

---

## 📋 ¿Qué es Lambda Powertools?

AWS Lambda Powertools es una biblioteca **oficial de AWS** para Python que facilita:

✅ **Logging estructurado** en JSON con correlation IDs automáticos
✅ **Métricas custom** a CloudWatch sin código extra
✅ **Tracing** con AWS X-Ray (opcional)
✅ **Mejores prácticas** de observability out-of-the-box

**Costo:** $0/mes (solo pagas por CloudWatch Logs/Metrics que ya usas)

---

## 🎯 Features Implementadas

### **1. Logger Estructurado**

Reemplaza `logging.getLogger()` por `Logger` de Powertools para:
- Logs en formato JSON (fácil parsing en CloudWatch Logs Insights)
- Correlation IDs automáticos (tracear requests across services)
- Context injection (Lambda info, cold start, etc.)
- Sampling inteligente (reducir costos sin perder visibilidad)

### **2. Módulo Compartido**

Creamos `lambdas/shared/logger.py` con helpers reutilizables:
- `get_logger(service_name)` - Crear logger configurado
- `inject_lambda_context()` - Decorator para auto-inyectar contexto
- `log_metrics()` - Decorator para capturar métricas

---

## 💡 Cómo Usar

### **Opción 1: Logger Simple (Migración Mínima)**

Cambia esto:
```python
import logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

logger.info("Processing request")
```

Por esto:
```python
from shared.logger import get_logger

logger = get_logger(__name__)  # __name__ = nombre del módulo

logger.info("Processing request")
```

**Beneficios:**
- ✅ Logs en JSON automáticamente
- ✅ Correlation IDs para tracear requests
- ✅ Cold start tracking
- ✅ Compatible con CloudWatch Logs Insights

### **Opción 2: Logger + Context Injection (Recomendado)**

```python
from shared.logger import get_logger, inject_lambda_context

logger = get_logger(__name__)

@inject_lambda_context(logger=logger)
def lambda_handler(event, context):
    """Auto-inyecta: function_name, request_id, cold_start, correlation_id"""

    logger.info("Lambda started")

    course_id = event.get('pathParameters', {}).get('id')

    # Agregar campos custom al log
    logger.info("Processing course", extra={
        "course_id": course_id,
        "user_id": extract_user_id(event)
    })

    try:
        # Tu lógica aquí
        result = process_course(course_id)

        logger.info("Course processed successfully", extra={
            "sections_count": len(result['sections'])
        })

        return success_response(result)

    except Exception as e:
        # Auto-captura stack trace y exception info
        logger.error("Error processing course", exc_info=True, extra={
            "error_type": type(e).__name__,
            "course_id": course_id
        })
        raise
```

**Ejemplo de log generado:**
```json
{
  "level": "INFO",
  "location": "lambda_function.py:45",
  "message": "Processing course",
  "timestamp": "2025-01-14T10:30:45.123Z",
  "service": "courses-handler",
  "course_id": "terraform-101",
  "user_id": "user@example.com",
  "cold_start": true,
  "function_name": "courses-handler-prod",
  "function_memory_size": 512,
  "function_request_id": "52fdfc07-2182-154f-163f-5f0f9a621d72",
  "correlation_id": "api-gateway-request-id-123"
}
```

### **Opción 3: Logger + Métricas (Performance Tracking)**

```python
from aws_lambda_powertools import Metrics
from shared.logger import get_logger, inject_lambda_context, log_metrics

logger = get_logger(__name__)
metrics = Metrics(service="tutor-handler")

@inject_lambda_context(logger=logger)
@log_metrics()  # Auto-captura cold start metric
def lambda_handler(event, context):
    logger.info("Lambda started")

    # Incrementar contador de requests
    metrics.add_metric(name="RequestsReceived", unit="Count", value=1)

    # Medir latencia de Bedrock
    import time
    start = time.time()

    response = bedrock_client.invoke_model(...)

    bedrock_duration = (time.time() - start) * 1000  # ms

    # Enviar métrica custom
    metrics.add_metric(
        name="BedrockLatency",
        unit="Milliseconds",
        value=bedrock_duration
    )

    # Dimensiones para filtrar en CloudWatch
    metrics.add_dimension(name="CourseID", value=course_id)
    metrics.add_dimension(name="ModelID", value=model_id)

    logger.info("Bedrock response received", extra={
        "latency_ms": bedrock_duration
    })

    return success_response(response)
```

**Métricas en CloudWatch:**
- Namespace: `cloudacademy-backend`
- Métricas: `RequestsReceived`, `BedrockLatency`, `ColdStart`
- Dimensiones: `service`, `CourseID`, `ModelID`

---

## 🔍 Queries CloudWatch Logs Insights

Con logs JSON estructurados, puedes hacer queries poderosas:

### **Top 10 requests más lentos:**
```sql
fields @timestamp, service, course_id, @duration
| filter service = "tutor-handler"
| sort @duration desc
| limit 10
```

### **Contar errores por tipo:**
```sql
fields @timestamp, error_type, message
| filter level = "ERROR"
| stats count() by error_type
```

### **Filtrar por correlation_id (tracear un request):**
```sql
fields @timestamp, service, message, course_id
| filter correlation_id = "api-gateway-request-id-123"
| sort @timestamp asc
```

### **Cold start rate:**
```sql
fields @timestamp, cold_start
| filter cold_start = true
| stats count() as cold_starts, count(*) as total_requests
| fields cold_starts / total_requests * 100 as cold_start_percentage
```

---

## 📊 Configuración Recomendada

### **Variables de Entorno (Lambda)**

```bash
# Nivel de logging (opcional, default: INFO)
LOG_LEVEL=INFO

# Sample rate para logs DEBUG (opcional, default: 0.1 = 10%)
POWERTOOLS_LOGGER_SAMPLE_RATE=0.1

# Service name (opcional, usa AWS_LAMBDA_FUNCTION_NAME por defecto)
POWERTOOLS_SERVICE_NAME=tutor-handler
```

### **Logs Retention**

- **Dev:** 7 días
- **Staging:** 14 días
- **Prod:** 30 días

Configurar en CloudFormation/Terraform:
```hcl
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = 30
}
```

---

## 🎯 Próximos Pasos (Opcional)

### **1. Migrar handlers uno por uno**
- ✅ `tutor-handler/lambda_function.py` - Mayor beneficio (logs críticos)
- ✅ `admin-handler/lambda_function.py` - Operaciones admin
- ✅ `courses-handler/lambda_function.py` - Lectura de cursos
- ⏳ Otros handlers según necesidad

### **2. Agregar métricas custom**
- Latencia de Bedrock por curso/sección
- Rate de circuit breaker OPEN
- Checkpoint pass rate
- Rate limiting hits

### **3. Implementar Tracer (X-Ray) - OPCIONAL**

Solo si necesitas debugging avanzado (múltiples microservicios):

```python
from aws_lambda_powertools import Tracer

tracer = Tracer(service="tutor-handler")

@tracer.capture_lambda_handler
def lambda_handler(event, context):
    # Auto-trace completo del request

    @tracer.capture_method
    def call_bedrock():
        return bedrock_client.invoke_model(...)

    response = call_bedrock()
    return response
```

**Costo:** $0.0001 por trace (primeros 100k free tier)
**Beneficio:** Ver latencias de cada paso (DynamoDB, Bedrock, etc.) visualmente

---

## 📚 Referencias

- [Lambda Powertools Docs](https://docs.powertools.aws.dev/lambda/python/)
- [Logger Examples](https://docs.powertools.aws.dev/lambda/python/latest/core/logger/)
- [Metrics Examples](https://docs.powertools.aws.dev/lambda/python/latest/core/metrics/)
- [CloudWatch Logs Insights Queries](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html)

---

## ✅ Estado de Implementación

| Handler | Logger | Metrics | Tracer | Status |
|---------|--------|---------|--------|--------|
| tutor-handler | ⏳ | ⏳ | ❌ | Pendiente |
| admin-handler | ⏳ | ⏳ | ❌ | Pendiente |
| courses-handler | ⏳ | ⏳ | ❌ | Pendiente |
| sections-handler | ⏳ | ⏳ | ❌ | Pendiente |
| upload-handler | ⏳ | ⏳ | ❌ | Pendiente |
| progress-handler | ⏳ | ⏳ | ❌ | Pendiente |
| categories-handler | ⏳ | ⏳ | ❌ | Pendiente |

**Nota:** Powertools está instalado y configurado. La migración de handlers es **gradual y opcional** según necesidad.

---

**Última actualización:** 2025-01-14
**Branch:** `claude/code-analysis-0152xQj5zizLxUAeo9P9WaFU`
