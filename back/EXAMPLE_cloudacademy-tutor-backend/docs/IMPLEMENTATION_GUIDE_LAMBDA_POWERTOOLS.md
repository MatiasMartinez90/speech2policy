# ⚡ Guía de Implementación: Lambda Powertools

**Tiempo estimado:** 1-2 horas
**Dificultad:** 🟢 Baja
**Prioridad:** ⭐⭐⭐ ALTA (Debugging 10x mejor)

---

## 📋 ¿Qué vamos a implementar?

Vamos a **migrar del logging estándar a Lambda Powertools** en todos los lambdas para tener:

1. **Logger estructurado** - Logs en JSON con contexto automático
2. **Tracer** - Seguimiento de requests entre funciones
3. **Metrics** - Métricas custom sin código extra

**Estado actual:**
- ✅ Powertools ya instalado (`requirements.txt`)
- ❌ Lambdas usan `logging.getLogger()` estándar
- ❌ No hay tracing ni metrics

---

## 🎯 Beneficios

### **Antes (logging estándar):**

```python
import logging
logger = logging.getLogger()
logger.info(f"Processing course: {course_id}")
```

**Output en CloudWatch:**
```
[INFO] 2025-11-14T10:30:15.123Z Processing course: argocd
```

❌ No sabes qué request fue
❌ No sabes qué usuario
❌ No sabes el cold start vs warm
❌ Difícil filtrar en CloudWatch Logs Insights

---

### **Después (Powertools):**

```python
from aws_lambda_powertools import Logger
logger = Logger()
logger.info("Processing course", course_id=course_id)
```

**Output en CloudWatch:**
```json
{
  "level": "INFO",
  "location": "handle_get_course:42",
  "message": "Processing course",
  "timestamp": "2025-11-14T10:30:15.123Z",
  "service": "courses-handler",
  "course_id": "argocd",
  "cold_start": true,
  "function_name": "cloudacademy-courses-handler",
  "function_memory_size": 256,
  "function_request_id": "abc-123-def",
  "xray_trace_id": "1-67890-abcdef"
}
```

✅ JSON estructurado (queries fáciles)
✅ Contexto automático (function_name, memory, request_id)
✅ Cold start tracking
✅ X-Ray trace ID para correlación
✅ Custom fields (course_id)

---

## 📊 Comparación Logging vs Powertools

| Feature | logging.getLogger() | Lambda Powertools | Beneficio |
|---------|---------------------|-------------------|-----------|
| **Output format** | Plain text | JSON estructurado | Queries 10x más fáciles |
| **Request ID** | Manual | Automático | Correlación inmediata |
| **Cold start** | No trackea | Automático | Debug performance |
| **Custom fields** | String interpolation | Key-value pairs | Indexable |
| **CloudWatch Insights** | Regex complejo | Queries simples | Debugging rápido |
| **Tracing** | No | Integrado X-Ray | End-to-end visibility |
| **Metrics** | CloudWatch API manual | Decorador simple | 0 boilerplate |

---

## ✅ Pre-requisitos

- [x] Lambda Powertools instalado (ya está en requirements.txt)
- [x] Python 3.11
- [ ] X-Ray habilitado en lambdas (opcional, pero recomendado)

---

## 🚀 Paso a Paso - Implementación

### **Paso 1: Habilitar X-Ray en Lambdas (10 min) - Opcional**

X-Ray te permite ver el flujo completo de un request a través de múltiples lambdas.

**Terraform** (`terraform/lambda.tf`):

```hcl
resource "aws_lambda_function" "courses_handler" {
  # ... configuración existente ...

  # Agregar tracing
  tracing_config {
    mode = "Active"  # Habilitar X-Ray
  }
}

# Repetir para todos los lambdas
```

**IAM Policy** (ya debería estar, pero verificar):

```hcl
# En terraform/iam.tf - agregar permiso X-Ray
statement {
  actions = [
    "xray:PutTraceSegments",
    "xray:PutTelemetryRecords"
  ]
  resources = ["*"]
}
```

Aplicar:
```bash
cd terraform
terraform apply
```

---

### **Paso 2: Migrar courses-handler a Powertools (20 min)**

Vamos a migrar el primer lambda como ejemplo.

**ANTES** (`lambdas/courses-handler/lambda_function.py`):

```python
import logging

# Logging estándar
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    logger.info(f"Received event: {json.dumps(event)}")
    # ...
```

**DESPUÉS**:

```python
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.metrics import MetricUnit

# Inicializar Powertools
logger = Logger(service="courses-handler")
tracer = Tracer(service="courses-handler")
metrics = Metrics(namespace="CloudAcademy", service="courses-handler")

@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_REST)
@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
def lambda_handler(event, context):
    logger.info("Request received", extra={
        "method": event.get('httpMethod'),
        "path": event.get('path')
    })

    # Metric custom
    metrics.add_metric(name="CourseListRequest", unit=MetricUnit.Count, value=1)

    # ... resto del código ...
```

**Cambios clave:**

1. **Imports** - Agregar Powertools
2. **Logger init** - `Logger(service="courses-handler")`
3. **Decoradores** - `@logger.inject_lambda_context`, `@tracer.capture_lambda_handler`
4. **Logging** - Usar `extra={}` para campos custom en lugar de f-strings

---

### **Paso 3: Migrar funciones internas a tracing (15 min)**

Agregar tracing a funciones que llaman DynamoDB, Bedrock, etc.

**ANTES**:

```python
def handle_list_courses(query_params=None):
    logger.info(f"Listing courses with filters: {query_params}")
    response = table.query(...)
    return success_response(response_data)
```

**DESPUÉS**:

```python
@tracer.capture_method
def handle_list_courses(query_params=None):
    logger.info("Listing courses", extra={"filters": query_params})

    # Tracer automáticamente mide duración y agrega a X-Ray
    response = table.query(...)

    # Log result
    logger.info("Courses retrieved", extra={
        "count": len(response.get('Items', [])),
        "has_more": 'LastEvaluatedKey' in response
    })

    return success_response(response_data)
```

**Beneficios:**
- ✅ X-Ray muestra cuánto tarda `handle_list_courses`
- ✅ Logs estructurados con contexto (filters, count)
- ✅ Fácil debug si falla

---

### **Paso 4: Migrar tutor-handler (20 min)**

Este es el más importante porque llama a Bedrock (lento).

**ANTES** (`lambdas/tutor-handler/lambda_function.py`):

```python
import logging
logger = logging.getLogger()

def lambda_handler(event, context):
    logger.info("Tutor request received")
    # ...
```

**DESPUÉS**:

```python
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.logging import correlation_paths

logger = Logger(service="tutor-handler")
tracer = Tracer(service="tutor-handler")
metrics = Metrics(namespace="CloudAcademy", service="tutor-handler")

@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_REST)
@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
def lambda_handler(event, context):
    logger.info("Tutor request received")

    # ... código existente ...

    # Metric de llamadas a Bedrock
    metrics.add_metric(name="BedrockInvocations", unit=MetricUnit.Count, value=1)

    return response
```

**En `bedrock_client.py`**:

```python
from aws_lambda_powertools import Tracer
tracer = Tracer(service="tutor-handler")

class BedrockClient:
    @tracer.capture_method
    def invoke_claude(self, system_prompt, user_prompt, max_tokens=2000):
        logger.info("Invoking Bedrock", extra={
            "model": self.model_id,
            "max_tokens": max_tokens
        })

        # X-Ray mostrará duración de Bedrock call
        response = self.client.invoke_model(...)

        logger.info("Bedrock response received", extra={
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "latency_ms": latency
        })

        return result
```

---

### **Paso 5: Migrar admin-handler y otros (15 min c/u)**

Repetir el patrón para:
- admin-handler
- categories-handler
- sections-handler
- progress-handler
- upload-handler

**Template rápido:**

```python
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.logging import correlation_paths

logger = Logger(service="NOMBRE-HANDLER")
tracer = Tracer(service="NOMBRE-HANDLER")
metrics = Metrics(namespace="CloudAcademy", service="NOMBRE-HANDLER")

@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_REST)
@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
def lambda_handler(event, context):
    # ... código existente ...
```

---

## 🧪 Testing - Verificar que Funciona

### **Test 1: Logs Estructurados**

Llamar a un endpoint:
```bash
curl https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api/courses
```

Ir a CloudWatch Logs → `/aws/lambda/cloudacademy-courses-handler` → Ver logs recientes

**Deberías ver JSON:**
```json
{
  "level": "INFO",
  "message": "Request received",
  "service": "courses-handler",
  "cold_start": false,
  "function_request_id": "abc-123",
  ...
}
```

---

### **Test 2: CloudWatch Logs Insights Query**

CloudWatch → Logs Insights → Select log groups

**Query 1: Buscar requests por curso específico**
```sql
fields @timestamp, message, course_id, @requestId
| filter course_id = "argocd"
| sort @timestamp desc
| limit 20
```

**Query 2: Cold starts en las últimas 24h**
```sql
fields @timestamp, function_name, cold_start
| filter cold_start = true
| stats count() by function_name
```

**Query 3: Latencia de Bedrock**
```sql
fields @timestamp, latency_ms, input_tokens, output_tokens
| filter message = "Bedrock response received"
| stats avg(latency_ms), max(latency_ms), sum(input_tokens) by bin(5m)
```

---

### **Test 3: X-Ray Traces (si habilitaste)**

1. X-Ray → Service map
2. Deberías ver: **API Gateway → Lambda → DynamoDB/Bedrock**
3. Click en lambda → Ver traces individuales
4. Ver duración de cada segmento

---

### **Test 4: Metrics Custom**

CloudWatch → Metrics → CloudAcademy (namespace)

Deberías ver:
- `CourseListRequest` (count)
- `BedrockInvocations` (count)
- `ColdStart` (count - automático)

---

## 📊 Queries Útiles de CloudWatch Logs Insights

### **Errores en las últimas 24h**
```sql
fields @timestamp, level, message, @logStream
| filter level = "ERROR"
| sort @timestamp desc
```

### **Requests lentos (>2 segundos)**
```sql
fields @timestamp, @duration, message, path
| filter @duration > 2000
| sort @duration desc
```

### **Top 10 cursos más consultados**
```sql
fields course_id
| filter message = "Processing course"
| stats count() as request_count by course_id
| sort request_count desc
| limit 10
```

### **Cold start rate por función**
```sql
fields function_name, cold_start
| stats count() as total, sum(cold_start) as cold_starts by function_name
| fields function_name, cold_starts, total, (cold_starts / total * 100) as cold_start_percentage
```

---

## ✅ Checklist de Implementación

**Por cada lambda:**
- [ ] Import de Powertools agregado
- [ ] Logger inicializado con service name
- [ ] Decoradores en lambda_handler
- [ ] f-strings reemplazados por extra={}
- [ ] @tracer.capture_method en funciones clave
- [ ] Metrics custom agregados (opcional)

**Verificación:**
- [ ] Logs en formato JSON en CloudWatch
- [ ] Queries de Logs Insights funcionan
- [ ] X-Ray muestra traces (si está habilitado)
- [ ] Metrics custom aparecen en CloudWatch

---

## 🎯 Criterios de Éxito

✅ **Implementación exitosa si:**
1. Todos los logs son JSON estructurado
2. Logs Insights queries retornan resultados
3. Contexto automático aparece (request_id, cold_start, etc.)
4. Custom fields están en los logs

✅ **Funcionamiento correcto si:**
- Debugging es 10x más rápido (finds en segundos)
- Puedes correlacionar requests por request_id
- Sabes exactamente cuándo hay cold starts
- Queries de performance son simples

---

## 📈 Mejoras Futuras (Bonus)

### **1. Sampling de logs (reducir costos)**

Solo loguear INFO en prod, DEBUG en desarrollo:

```python
import os
logger = Logger(
    service="courses-handler",
    level=os.getenv("LOG_LEVEL", "INFO")
)
```

### **2. Append keys custom globalmente**

```python
logger.append_keys(
    environment="production",
    version="1.0.0"
)
```

### **3. Metrics avanzados**

```python
# Latencia de DynamoDB
with metrics.add_time_metric("DynamoDBLatency"):
    response = table.query(...)

# Metric con dimensiones
metrics.add_metric(
    name="CourseViews",
    unit=MetricUnit.Count,
    value=1,
    dimensions={"Category": category}
)
```

### **4. Distributed tracing entre lambdas**

Si un lambda llama a otro lambda, X-Ray correlaciona automáticamente.

---

## 💰 Costos

- Lambda Powertools: **Gratis** (library open source)
- X-Ray: **$5 por 1M traces** (primeros 100k gratis/mes)
- CloudWatch Logs: Sin cambio (mismo volumen)
- CloudWatch Metrics (custom): **$0.30/métrica/mes**

**Total estimado:** $0-2/mes (gratis tier cubre POC)

---

## 🚨 Troubleshooting

**Logs no son JSON:**
- Verificar que usas `Logger()` de Powertools, no `logging.getLogger()`
- Verificar imports correctos

**X-Ray no muestra traces:**
- Verificar `tracing_config { mode = "Active" }` en Terraform
- Verificar permisos IAM (xray:PutTraceSegments)
- Esperar 1-2 minutos (latencia de X-Ray)

**Decoradores no funcionan:**
- Orden correcto: `@logger.inject_lambda_context` DEBE ser el primero
- Verificar que lambda_handler tiene signature `(event, context)`

**Performance degradado:**
- Powertools tiene overhead <10ms
- Si ves más, probablemente es X-Ray sampling (configurar rate)

---

## 📚 Próximos Pasos

Después de implementar Powertools:
1. ✅ Crear dashboards en CloudWatch con metrics custom
2. ✅ Configurar alertas basadas en metrics (alto cold start rate)
3. ✅ Documentar queries estándar de Logs Insights para el equipo

---

## 🔗 Referencias

- [Lambda Powertools Docs](https://docs.powertools.aws.dev/lambda/python/)
- [Logger](https://docs.powertools.aws.dev/lambda/python/latest/core/logger/)
- [Tracer](https://docs.powertools.aws.dev/lambda/python/latest/core/tracer/)
- [Metrics](https://docs.powertools.aws.dev/lambda/python/latest/core/metrics/)
- [CloudWatch Logs Insights Syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html)

---

**Última actualización:** 2025-11-14
**Autor:** CloudAcademy DevOps Team
