# ⚠️ CloudWatch Alarms - Configuración Recomendada

**Proyecto:** CloudAcademy Tutor Backend
**Fecha:** 2025-01-14
**Status:** 📋 Documentado (Ready para implementar)

---

## 📋 Overview

Alarmas esenciales para detectar problemas proactivamente en POC:
- ✅ **Circuit Breaker OPEN** - Bedrock degradado
- ✅ **Error Rate >5%** - Funcionalidad rota
- ✅ **Latencia P99 >3s** - UX degradado
- ✅ **Bedrock Throttling** - Rate limits excedidos

**Costo:** ~$0.10/mes por alarma ($0.40/mes total para 4 alarmas básicas)

---

## 🔔 Alarmas Críticas

### **Alarma #1: Circuit Breaker OPEN**

**Propósito:** Detectar cuando Bedrock está fallando repetidamente

**Métrica Custom:**
```python
# En bedrock_client.py ya tenemos:
logger.warning(f"Circuit breaker opened after {self.failure_count} failures")
```

**Metric Filter (CloudWatch Logs):**
```
Namespace: cloudacademy-backend
Log Group: /aws/lambda/tutor-handler
Filter Pattern: [timestamp, request_id, level=WARNING, location, message="Circuit*breaker*opened*"]

Metric Name: CircuitBreakerOpened
Metric Value: 1
Default Value: 0
```

**Alarma:**
```yaml
AlarmName: CircuitBreaker-OPEN-Critical
MetricName: CircuitBreakerOpened
Namespace: cloudacademy-backend
Statistic: Sum
Period: 300  # 5 minutos
EvaluationPeriods: 1
Threshold: 1  # ≥1 evento en 5min
ComparisonOperator: GreaterThanOrEqualToThreshold
TreatMissingData: notBreaching

Actions:
  - SNS Topic: cloudacademy-alerts-critical
```

**Severidad:** 🔴 CRITICAL
**Acción:** Investigar Bedrock service health, revisar logs

---

### **Alarma #2: Error Rate >5%**

**Propósito:** Detectar funcionalidad rota en cualquier handler

**Métrica Lambda Built-in:**
```
Namespace: AWS/Lambda
MetricName: Errors
Dimensions:
  - Name: FunctionName
    Value: <function-name>
```

**Alarma por Handler:**
```yaml
# Repetir para: tutor-handler, courses-handler, admin-handler, etc.

AlarmName: ErrorRate-High-{FunctionName}
Metrics:
  - Id: errors
    MetricStat:
      Metric:
        Namespace: AWS/Lambda
        MetricName: Errors
        Dimensions:
          - Name: FunctionName
            Value: tutor-handler
      Period: 300
      Stat: Sum

  - Id: invocations
    MetricStat:
      Metric:
        Namespace: AWS/Lambda
        MetricName: Invocations
        Dimensions:
          - Name: FunctionName
            Value: tutor-handler
      Period: 300
      Stat: Sum

  - Id: error_rate
    Expression: "(errors / invocations) * 100"
    Label: "Error Rate %"

Threshold: 5  # >5% error rate
ComparisonOperator: GreaterThanThreshold
EvaluationPeriods: 2
DatapointsToAlarm: 2
TreatMissingData: notBreaching

Actions:
  - SNS Topic: cloudacademy-alerts-high
```

**Severidad:** 🟠 HIGH
**Acción:** Revisar logs de errores, rollback si es deployment reciente

---

### **Alarma #3: Latencia P99 >3s**

**Propósito:** Detectar degradación de performance (UX impactado)

**Métrica Lambda Built-in:**
```
Namespace: AWS/Lambda
MetricName: Duration
Statistic: p99
Dimensions:
  - Name: FunctionName
    Value: <function-name>
```

**Alarma (tutor-handler - el más crítico):**
```yaml
AlarmName: Latency-P99-High-tutor-handler
MetricName: Duration
Namespace: AWS/Lambda
Dimensions:
  - Name: FunctionName
    Value: tutor-handler
Statistic: p99
Period: 300  # 5 minutos
EvaluationPeriods: 2
Threshold: 3000  # 3 segundos en ms
ComparisonOperator: GreaterThanThreshold
TreatMissingData: notBreaching

Actions:
  - SNS Topic: cloudacademy-alerts-medium
```

**Severidad:** 🟡 MEDIUM
**Acción:** Revisar cold starts, optimizar código, verificar timeouts de Bedrock

---

### **Alarma #4: Bedrock Throttling**

**Propósito:** Detectar rate limiting de Bedrock (necesitas aumentar cuota)

**Métrica Custom:**
```python
# En bedrock_client.py con retry.py:
except ClientError as e:
    if e.response['Error']['Code'] == 'ThrottlingException':
        logger.warning("Bedrock throttling detected", extra={
            "error_code": "ThrottlingException",
            "model_id": self.model_id
        })
```

**Metric Filter:**
```
Log Group: /aws/lambda/tutor-handler
Filter Pattern: [timestamp, request_id, level=WARNING, location, message="*throttling*detected*" || message="*ThrottlingException*"]

Metric Name: BedrockThrottling
Metric Value: 1
Default Value: 0
```

**Alarma:**
```yaml
AlarmName: Bedrock-Throttling-Detected
MetricName: BedrockThrottling
Namespace: cloudacademy-backend
Statistic: Sum
Period: 300  # 5 minutos
EvaluationPeriods: 1
Threshold: 5  # ≥5 throttles en 5min
ComparisonOperator: GreaterThanOrEqualToThreshold
TreatMissingData: notBreaching

Actions:
  - SNS Topic: cloudacademy-alerts-high
```

**Severidad:** 🟠 HIGH
**Acción:** Solicitar aumento de cuota en AWS Service Quotas

---

## 📊 Alarmas Adicionales (Opcional)

### **Alarma #5: Cold Start Rate >20%**

**Métrica Custom (con Powertools):**
```python
# Powertools Metrics auto-captura cold starts
metrics.add_metric(name="ColdStart", unit="Count", value=1)
```

```yaml
AlarmName: ColdStart-Rate-High
# Calcular: (ColdStarts / Invocations) * 100
Threshold: 20  # >20% cold start rate
```

**Acción:** Implementar Lambda Layers, aumentar memoria, usar provisioned concurrency

---

### **Alarma #6: DynamoDB Throttling**

**Métrica Built-in:**
```
Namespace: AWS/DynamoDB
MetricName: UserErrors
Dimensions:
  - Name: TableName
    Value: CourseCatalog
```

**Acción:** Cambiar a On-Demand capacity o aumentar RCU/WCU

---

### **Alarma #7: Validation Failures >10/min**

**Métrica Custom:**
```python
# En content_validator.py:
logger.warning("Content validation failed", extra={
    "reason": result['reason'],
    "user_id": user_id
})
```

**Acción:** Investigar intentos de abuso, ajustar reglas de validación

---

## 🔧 Implementación

### **Opción 1: Terraform (Recomendado)**

```hcl
# cloudwatch_alarms.tf

# SNS Topic para notificaciones
resource "aws_sns_topic" "cloudacademy_alerts_critical" {
  name = "cloudacademy-alerts-critical"
}

resource "aws_sns_topic_subscription" "email_critical" {
  topic_arn = aws_sns_topic.cloudacademy_alerts_critical.arn
  protocol  = "email"
  endpoint  = "alerts@cloudacademy.com"  # Cambiar por tu email
}

# Metric Filter para Circuit Breaker
resource "aws_cloudwatch_log_metric_filter" "circuit_breaker_opened" {
  name           = "CircuitBreakerOpened"
  log_group_name = "/aws/lambda/tutor-handler"

  pattern = "[timestamp, request_id, level=WARNING, location, message=\"Circuit*breaker*opened*\"]"

  metric_transformation {
    name      = "CircuitBreakerOpened"
    namespace = "cloudacademy-backend"
    value     = "1"
    default_value = "0"
  }
}

# Alarma Circuit Breaker OPEN
resource "aws_cloudwatch_metric_alarm" "circuit_breaker_open" {
  alarm_name          = "CircuitBreaker-OPEN-Critical"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "CircuitBreakerOpened"
  namespace           = "cloudacademy-backend"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  alarm_description   = "Circuit breaker opened - Bedrock failing"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.cloudacademy_alerts_critical.arn]
}

# Alarma Error Rate >5% (tutor-handler)
resource "aws_cloudwatch_metric_alarm" "error_rate_high_tutor" {
  alarm_name          = "ErrorRate-High-tutor-handler"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  threshold           = 5
  alarm_description   = "Error rate >5% in tutor-handler"
  treat_missing_data  = "notBreaching"

  metric_query {
    id          = "error_rate"
    expression  = "(errors / invocations) * 100"
    label       = "Error Rate %"
    return_data = true
  }

  metric_query {
    id = "errors"
    metric {
      metric_name = "Errors"
      namespace   = "AWS/Lambda"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = "tutor-handler"
      }
    }
  }

  metric_query {
    id = "invocations"
    metric {
      metric_name = "Invocations"
      namespace   = "AWS/Lambda"
      period      = 300
      stat        = "Sum"
      dimensions = {
        FunctionName = "tutor-handler"
      }
    }
  }

  alarm_actions = [aws_sns_topic.cloudacademy_alerts_high.arn]
}

# Alarma Latencia P99 >3s
resource "aws_cloudwatch_metric_alarm" "latency_p99_high" {
  alarm_name          = "Latency-P99-High-tutor-handler"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 300
  extended_statistic  = "p99"
  threshold           = 3000  # ms
  alarm_description   = "P99 latency >3s in tutor-handler"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = "tutor-handler"
  }

  alarm_actions = [aws_sns_topic.cloudacademy_alerts_medium.arn]
}
```

---

### **Opción 2: AWS Console (Manual - POC rápido)**

1. **Ir a CloudWatch → Alarms → Create Alarm**

2. **Seleccionar métrica:**
   - Para Error Rate: `AWS/Lambda` → `Errors` + `Invocations`
   - Para Latencia: `AWS/Lambda` → `Duration`
   - Para Metric Filters: `Custom Namespace` → `cloudacademy-backend`

3. **Configurar condiciones:**
   - Threshold según tablas arriba
   - Evaluation periods: 1-2
   - Treat missing data: Not breaching

4. **Agregar notificación:**
   - Crear SNS Topic: `cloudacademy-alerts-critical`
   - Subscribe email/Slack

5. **Nombrar alarma** según convención arriba

---

### **Opción 3: AWS CLI**

```bash
# Crear SNS Topic
aws sns create-topic --name cloudacademy-alerts-critical

# Subscribe email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789:cloudacademy-alerts-critical \
  --protocol email \
  --notification-endpoint alerts@cloudacademy.com

# Crear Metric Filter
aws logs put-metric-filter \
  --log-group-name "/aws/lambda/tutor-handler" \
  --filter-name "CircuitBreakerOpened" \
  --filter-pattern '[timestamp, request_id, level=WARNING, location, message="Circuit*breaker*opened*"]' \
  --metric-transformations \
    metricName=CircuitBreakerOpened,metricNamespace=cloudacademy-backend,metricValue=1,defaultValue=0

# Crear alarma
aws cloudwatch put-metric-alarm \
  --alarm-name "CircuitBreaker-OPEN-Critical" \
  --alarm-description "Circuit breaker opened - Bedrock failing" \
  --metric-name CircuitBreakerOpened \
  --namespace cloudacademy-backend \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching \
  --alarm-actions arn:aws:sns:us-east-1:123456789:cloudacademy-alerts-critical
```

---

## 📈 Testing de Alarmas

### **Test Manual:**

```bash
# Trigger Circuit Breaker alarm
# En tutor-handler, forzar failure en Bedrock temporalmente

# Test Error Rate alarm
# Hacer 10 requests que fallen (ej: course_id inválido)

# Test Latency alarm
# Agregar time.sleep(4) temporalmente en handler
```

### **Test con AWS CLI:**

```bash
# Poner alarma en estado ALARM manualmente
aws cloudwatch set-alarm-state \
  --alarm-name "CircuitBreaker-OPEN-Critical" \
  --state-value ALARM \
  --state-reason "Testing alarm notification"
```

---

## 📧 Integración con Slack (Opcional)

### **Webhook a Slack:**

```python
# Lambda SNS → Slack forwarder
import json
import urllib.request

def lambda_handler(event, context):
    message = event['Records'][0]['Sns']['Message']
    alarm = json.loads(message)

    slack_data = {
        "text": f"🚨 *ALARM: {alarm['AlarmName']}*",
        "attachments": [{
            "color": "danger",
            "fields": [
                {"title": "Reason", "value": alarm['NewStateReason']},
                {"title": "Timestamp", "value": alarm['StateChangeTime']}
            ]
        }]
    }

    req = urllib.request.Request(
        "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
        data=json.dumps(slack_data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )

    urllib.request.urlopen(req)
```

---

## 📊 Dashboard Recomendado

**Crear Dashboard en CloudWatch:**

Widgets:
1. **Error Rate por Handler** (Line graph)
2. **Latencia P50/P90/P99** (Line graph)
3. **Circuit Breaker Events** (Number)
4. **Bedrock Throttling** (Number)
5. **Invocations Total** (Number)
6. **Cold Start %** (Gauge)

---

## ✅ Checklist de Implementación

- [ ] Crear SNS Topics (critical, high, medium)
- [ ] Subscribe emails al SNS
- [ ] Crear Metric Filters para custom metrics
- [ ] Crear alarma #1: Circuit Breaker OPEN
- [ ] Crear alarma #2: Error Rate >5%
- [ ] Crear alarma #3: Latencia P99 >3s
- [ ] Crear alarma #4: Bedrock Throttling
- [ ] Testear alarmas manualmente
- [ ] Documentar runbook para cada alarma
- [ ] (Opcional) Integrar Slack
- [ ] (Opcional) Crear Dashboard

---

## 💰 Costos Estimados

| Item | Cantidad | Costo/mes |
|------|----------|-----------|
| Alarmas básicas (4) | 4 | $0.40 |
| Metric Filters | 2-3 | $0 (free tier) |
| SNS notificaciones | ~100/mes | $0 (free tier) |
| CloudWatch Logs Insights queries | Ad-hoc | ~$0.01 |
| **Total** | | **~$0.50/mes** |

**Free Tier:** 10 alarmas gratis, 1M requests SNS gratis

---

## 📚 Referencias

- [CloudWatch Alarms Docs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html)
- [Metric Filters Syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html)
- [Lambda Metrics](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics.html)
- [SNS Subscriptions](https://docs.aws.amazon.com/sns/latest/dg/sns-create-subscribe-endpoint-to-topic.html)

---

**Última actualización:** 2025-01-14
**Branch:** `claude/code-analysis-0152xQj5zizLxUAeo9P9WaFU`
**Status:** 📋 Ready para implementar con Terraform/Console
