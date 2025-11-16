# Lambda Warmer - Guía Completa

## 🎯 ¿Qué es y por qué lo necesitamos?

### El Problema: Cold Starts

Cuando un usuario hace un request y tu Lambda lleva **15+ minutos sin usarse**, AWS destruye el contenedor. El siguiente request sufre un **"cold start"**:

```
Cold Start = Init Duration + First Request Duration
           = ~1070ms + ~197ms
           = ~1.27 segundos 😱
```

**Impacto en UX:**
- Primera carga del catálogo de cursos: 1.3 segundos
- Usuarios perciben el sitio como "lento"
- Tasa de rebote aumenta

### La Solución: Lambda Warmer

Un "ping" automático cada 2 minutos que mantiene el contenedor vivo:

```
EventBridge → Lambda (ping) → Contenedor vivo → Usuario (respuesta rápida <50ms)
```

**Resultado:**
- ✅ 99% de requests: <50ms (warm)
- ✅ 1% de requests: ~1s (cold start inevitable)
- ✅ Costo: ~$0.02/mes (2 centavos)

---

## 📊 Configuración Actual

### Lambda con Warmer

**Función:** `cloudacademy-courses-handler`

**Frecuencia:** Cada 2 minutos

**Cobertura:** ~99% de requests sin cold start

**Costos mensuales:**
- Invocaciones del warmer: 21,600/mes
- Dentro del tier gratuito: ✅ GRATIS (1 millón/mes gratis)
- Costo real: ~$0.02/mes

**Requests disponibles para tráfico:**
- Tier gratuito total: 1,000,000/mes
- Usado por warmer: 21,600/mes
- **Disponible para usuarios**: 978,400/mes (~32,600/día)

---

## 🔧 Cómo Funciona

### Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│  EventBridge Rule                                           │
│  schedule: rate(2 minutes)                                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Lambda: courses-handler                                    │
│  Event: {"warmer": true}                                    │
│  ├─ Detecta evento de warmer                                │
│  ├─ Retorna inmediatamente (no hace trabajo real)          │
│  └─ Duration: ~50ms                                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  Contenedor Lambda VIVO                                     │
│  ├─ Runtime cargado                                         │
│  ├─ Librerías importadas                                    │
│  ├─ Conexiones establecidas                                 │
│  └─ LISTO para request real                                 │
└─────────────────────────────────────────────────────────────┘
                 │
                 ▼ (Usuario hace request)
┌─────────────────────────────────────────────────────────────┐
│  Request Real desde API Gateway                             │
│  Event: {httpMethod: "GET", path: "/api/courses"}          │
│  ├─ Usa el MISMO contenedor (ya caliente)                  │
│  ├─ NO hay cold start                                       │
│  └─ Response en ~18ms ✅                                    │
└─────────────────────────────────────────────────────────────┘
```

### Flujo Detallado

1. **EventBridge ejecuta regla cada 2 minutos**
   ```
   Cron: */2 * * * * (cada 2 minutos)
   ```

2. **Lambda recibe evento especial**
   ```json
   {
     "warmer": true,
     "time": "2025-11-15T13:00:00Z"
   }
   ```

3. **Código detecta warmer y retorna rápido**
   ```python
   def lambda_handler(event, context):
       # Detectar evento de warmer
       if event.get('warmer'):
           logger.info("Warmer ping received - keeping function warm")
           return {"statusCode": 200, "body": "warm"}

       # Código normal continúa...
   ```

4. **Contenedor queda vivo por 15 minutos**
   - Si llega request real en esos 15 min → usa mismo contenedor
   - Si no llega nada en 15 min → contenedor se destruye
   - Warmer vuelve a "pingar" en 2 min → contenedor revive

---

## ⚙️ Configuración en Terraform

### Archivos Involucrados

**`terraform/lambda-warmer.tf`**
```terraform
# EventBridge Rule - Ejecuta cada 2 minutos
resource "aws_cloudwatch_event_rule" "keep_courses_warm" {
  name                = "keep-courses-handler-warm"
  description         = "Invoca courses-handler cada 2 min para evitar cold starts"
  schedule_expression = "rate(2 minutes)"
}

# Target - Invocar lambda con evento especial
resource "aws_cloudwatch_event_target" "courses_warmer" {
  rule      = aws_cloudwatch_event_rule.keep_courses_warm.name
  target_id = "courses-handler-target"
  arn       = aws_lambda_function.courses_handler.arn

  input = jsonencode({
    warmer = true
  })
}

# Permiso para EventBridge invocar lambda
resource "aws_lambda_permission" "allow_eventbridge_warmer" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.courses_handler.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.keep_courses_warm.arn
}
```

### Variables Ajustables

**Frecuencia del warmer:**
```terraform
# Cada 1 minuto (99.9% cobertura, ~$0.05/mes)
schedule_expression = "rate(1 minute)"

# Cada 2 minutos (99% cobertura, ~$0.02/mes) ← ACTUAL
schedule_expression = "rate(2 minutes)"

# Cada 5 minutos (80% cobertura, GRATIS)
schedule_expression = "rate(5 minutes)"
```

---

## 🔴 Cómo DESHABILITAR el Warmer

### Opción 1: Deshabilitar la regla (temporal)

**En AWS Console:**
1. Ve a EventBridge → Rules
2. Busca `keep-courses-handler-warm`
3. Click "Disable"

**Con AWS CLI:**
```bash
aws events disable-rule --name keep-courses-handler-warm
```

**Con Terraform:**
```terraform
resource "aws_cloudwatch_event_rule" "keep_courses_warm" {
  # ...
  is_enabled = false  # ← Agregar esta línea
}
```

### Opción 2: Eliminar completamente

**Comentar en `lambda-warmer.tf`:**
```terraform
# resource "aws_cloudwatch_event_rule" "keep_courses_warm" {
#   name                = "keep-courses-handler-warm"
#   description         = "Invoca courses-handler cada 2 min"
#   schedule_expression = "rate(2 minutes)"
# }
# ... resto del código comentado
```

**Aplicar cambios:**
```bash
cd terraform
terraform apply -auto-approve
```

### Opción 3: Destruir solo el warmer

```bash
cd terraform
terraform destroy -target=aws_cloudwatch_event_rule.keep_courses_warm
terraform destroy -target=aws_cloudwatch_event_target.courses_warmer
terraform destroy -target=aws_lambda_permission.allow_eventbridge_warmer
```

---

## 📈 Monitoreo

### CloudWatch Metrics

**Ver invocaciones del warmer:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=cloudacademy-courses-handler \
  --start-time $(date -u -v-1H '+%Y-%m-%dT%H:%M:%S') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%S') \
  --period 3600 \
  --statistics Sum
```

**Ver logs del warmer:**
```bash
aws logs tail /aws/lambda/cloudacademy-courses-handler --since 10m | grep "warmer"
```

Deberías ver:
```json
{
  "level": "INFO",
  "message": "Warmer ping received - keeping function warm",
  "service": "courses-handler"
}
```

### Dashboards

**CloudWatch Dashboard** - Ver métricas visuales:
- Cold starts (Init Duration > 0)
- Warm executions (Duration < 100ms)
- Invocaciones totales

---

## 💰 Análisis de Costos

### Desglose Detallado

**EventBridge Rules:**
- Reglas programadas: ✅ GRATIS
- Costo: $0.00/mes

**Lambda Invocaciones:**
- Tier gratuito: 1,000,000 requests/mes
- Warmer usa: 21,600/mes (2.16%)
- Costo: ✅ GRATIS

**Lambda Duration:**
- Warmer duration: ~50ms @ 128MB
- GB-segundos: 0.0064 GB-s por invocación
- 21,600 invocaciones × 0.0064 = 138.24 GB-s/mes
- Tier gratuito: 400,000 GB-s/mes
- Costo: ✅ GRATIS

**Total real:**
- Si pasas el tier gratuito: ~$0.02/mes
- En práctica: **$0.00/mes** (dentro del free tier)

### Proyección de Tráfico

**Con warmer activo:**

| Escenario | Warmer Requests | User Requests | Total | Costo |
|-----------|----------------|---------------|-------|-------|
| MVP/Beta | 21,600 | 5,000 | 26,600 | $0.00 |
| Lanzamiento | 21,600 | 50,000 | 71,600 | $0.00 |
| Creciendo | 21,600 | 200,000 | 221,600 | $0.00 |
| Popular | 21,600 | 500,000 | 521,600 | $0.00 |
| **Límite free tier** | 21,600 | 978,400 | 1,000,000 | $0.00 |
| Pasando límite | 21,600 | 1,500,000 | 1,521,600 | **$0.10** |

**Conclusión:** Incluso con 1.5M requests/mes, solo pagas $0.10/mes.

---

## 🎯 Mejores Prácticas

### ✅ DO's

1. **Monitorear métricas regularmente**
   - Cold start rate debería ser <1%
   - Si ves cold starts >5%, ajusta frecuencia

2. **Usar solo en lambdas críticas**
   - ✅ `courses-handler` (endpoint principal)
   - ❌ NO en lambdas de admin (poco tráfico)

3. **Ajustar frecuencia según tráfico**
   - MVP/Beta: `rate(5 minutes)` suficiente
   - Producción: `rate(2 minutes)` recomendado
   - Alto tráfico: `rate(1 minute)` garantizado

4. **Loggear eventos de warmer**
   ```python
   if event.get('warmer'):
       logger.info("Warmer ping", extra={"warmer": True})
   ```

### ❌ DON'Ts

1. **NO usar en todas las lambdas**
   - Solo lambdas user-facing críticas
   - Lambdas de backend/admin no lo necesitan

2. **NO usar frecuencia <1 minuto**
   - EventBridge tiene límite de 1 min
   - No agrega valor vs 1 minuto

3. **NO olvidar deshabilitar si no se usa**
   - Si pausas el proyecto, deshabilita warmer
   - Evita costos innecesarios

---

## 🐛 Troubleshooting

### Problema: Sigo viendo cold starts

**Diagnóstico:**
```bash
# Ver últimos cold starts
aws logs tail /aws/lambda/cloudacademy-courses-handler --since 1h | grep "Init Duration"
```

**Soluciones:**
1. Verificar que EventBridge está habilitado:
   ```bash
   aws events describe-rule --name keep-courses-handler-warm
   ```
   Estado debe ser: `"State": "ENABLED"`

2. Aumentar frecuencia:
   ```terraform
   schedule_expression = "rate(1 minute)"  # Más agresivo
   ```

3. Verificar permisos:
   ```bash
   aws lambda get-policy --function-name cloudacademy-courses-handler
   ```

### Problema: Muchas invocaciones en logs

**Diagnóstico:**
```bash
# Contar invocaciones del warmer
aws logs tail /aws/lambda/cloudacademy-courses-handler --since 1h | grep -c "warmer"
```

**Soluciones:**
1. Reducir frecuencia:
   ```terraform
   schedule_expression = "rate(5 minutes)"
   ```

2. Deshabilitar temporalmente (ver sección anterior)

### Problema: Costos inesperados

**Diagnóstico:**
```bash
# Ver invocaciones totales del mes
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=cloudacademy-courses-handler \
  --start-time $(date -u -v-30d '+%Y-%m-%dT%H:%M:%S') \
  --end-time $(date -u '+%Y-%m-%dT%H:%M:%S') \
  --period 2592000 \
  --statistics Sum
```

**Soluciones:**
1. Verificar que no tienes múltiples reglas:
   ```bash
   aws events list-rules | grep courses
   ```

2. Revisar que el tier gratuito está activo:
   ```bash
   aws ce get-cost-and-usage \
     --time-period Start=2025-11-01,End=2025-11-30 \
     --granularity MONTHLY \
     --metrics BlendedCost \
     --group-by Type=SERVICE
   ```

---

## 🔄 Alternativas

### Provisioned Concurrency

**Qué es:** AWS mantiene N contenedores SIEMPRE calientes.

**Pros:**
- ✅ 100% garantizado sin cold starts
- ✅ Más predecible

**Contras:**
- ❌ Costo: ~$12-15/mes por contenedor
- ❌ Overkill para tráfico bajo/medio

**Cuándo usarlo:**
- Tráfico constante >1000 req/día
- SLA estricto (<100ms SIEMPRE)
- Presupuesto no es problema

### Lambda Layer Optimization

**Qué es:** Reducir tamaño del layer para init más rápido.

**Impacto:**
- Init time: 1070ms → ~800ms
- Warm time: sin cambio

**Cuándo usarlo:**
- Complementario con warmer
- Si tienes muchas dependencias

---

## 📚 Referencias

- [AWS Lambda Lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)
- [EventBridge Scheduled Rules](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html)
- [Lambda Pricing](https://aws.amazon.com/lambda/pricing/)
- [Serverless Warmup Plugin](https://github.com/juanjoDiaz/serverless-plugin-warmup)

---

## 📝 Changelog

### 2025-11-15
- ✅ Implementado warmer para `courses-handler`
- ✅ Frecuencia: rate(2 minutes)
- ✅ Cobertura estimada: 99%
- ✅ Costo: ~$0.02/mes

---

**¿Preguntas?** Revisa el troubleshooting o contacta al equipo de DevOps.
