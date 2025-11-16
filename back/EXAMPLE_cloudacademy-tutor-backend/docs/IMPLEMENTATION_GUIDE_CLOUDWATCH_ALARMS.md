# 🚨 Guía de Implementación: CloudWatch Alarms

**Tiempo estimado:** 1-2 horas
**Dificultad:** 🟢 Baja
**Prioridad:** ⭐⭐⭐ ALTA (Detección proactiva de problemas)

---

## 📋 ¿Qué vamos a implementar?

Vamos a crear **4 alarmas críticas** en CloudWatch que te notificarán automáticamente cuando algo salga mal en producción:

1. **Lambda Errors** - Detecta cuando los lambdas fallan
2. **Lambda Duration** - Detecta cuando los lambdas se vuelven lentos
3. **DynamoDB Throttling** - Detecta cuando DynamoDB rechaza requests
4. **Circuit Breaker Open** - Detecta cuando Bedrock API está caído

---

## 🎯 Beneficios

### **Antes (sin alarmas):**
- ❌ Te enteras de problemas cuando usuarios se quejan
- ❌ No sabes si el backend está lento o fallando
- ❌ Debugging reactivo (buscas logs después del problema)
- ❌ Downtime promedio: horas

### **Después (con alarmas):**
- ✅ Notificación inmediata cuando algo falla (email/SMS)
- ✅ Detectas problemas antes que los usuarios
- ✅ Debugging proactivo (logs disponibles al instante)
- ✅ Downtime promedio: minutos

**ROI:** Reducción 80% en tiempo de detección de problemas

---

## 📊 Las 4 Alarmas Críticas

### **1. Lambda Errors (Errores en funciones)**
**Qué detecta:** Cuando algún lambda falla (500 errors, exceptions, timeouts)
**Threshold:** > 5 errores en 5 minutos
**Acción:** Email inmediato

### **2. Lambda Duration (Latencia alta)**
**Qué detecta:** Cuando los lambdas se vuelven lentos
**Threshold:** Promedio > 5 segundos en 5 minutos
**Acción:** Email de advertencia

### **3. DynamoDB Throttling (Capacidad excedida)**
**Qué detecta:** Cuando DynamoDB rechaza requests por falta de capacidad
**Threshold:** > 10 throttles en 5 minutos
**Acción:** Email crítico

### **4. Circuit Breaker Open (Bedrock API caído)**
**Qué detecta:** Cuando el circuit breaker se abre por fallos de Bedrock
**Threshold:** > 3 circuit breaker opens en 10 minutos
**Acción:** Email crítico

---

## ✅ Pre-requisitos

- [x] Cuenta AWS con acceso a CloudWatch
- [x] Email para recibir notificaciones
- [ ] Terraform instalado (o usar AWS Console)

---

## 🚀 Paso a Paso - Implementación

### **Paso 1: Crear SNS Topic para Notificaciones (5 min)**

Primero necesitamos un "topic" donde enviar las alertas.

**Opción A: AWS Console (más fácil)**

1. Ir a AWS Console → SNS → Topics → Create topic
2. Type: **Standard**
3. Name: `cloudacademy-alarms`
4. Click **Create topic**
5. Click **Create subscription**
   - Protocol: **Email**
   - Endpoint: **tu-email@gmail.com**
6. Confirmar el email que te llegará

**Opción B: Terraform**

Agregar a `terraform/cloudwatch.tf`:

```hcl
# SNS Topic para alarmas
resource "aws_sns_topic" "alarms" {
  name = "cloudacademy-alarms"
}

resource "aws_sns_topic_subscription" "alarms_email" {
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = "tu-email@gmail.com"  # CAMBIAR
}
```

Ejecutar:
```bash
cd terraform
terraform apply
```

**✅ Verificación:** Deberías recibir un email de confirmación de AWS.

---

### **Paso 2: Crear Alarma de Lambda Errors (10 min)**

**Opción A: AWS Console**

1. CloudWatch → Alarms → Create alarm
2. Select metric → Lambda → By Function Name
3. Seleccionar **Errors** para cada lambda (courses-handler, tutor-handler, etc.)
4. Configurar:
   - Statistic: **Sum**
   - Period: **5 minutes**
   - Threshold: **Greater than 5**
5. Configure actions:
   - Alarm state: **In alarm**
   - Select SNS topic: **cloudacademy-alarms**
6. Name: `Lambda-Errors-Critical`
7. Create alarm

**Opción B: Terraform**

Agregar a `terraform/cloudwatch.tf`:

```hcl
# Alarma: Lambda Errors
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "Lambda-Errors-Critical"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"  # 5 minutos
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "Lambda errors > 5 en 5 minutos"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = "cloudacademy-courses-handler"
  }
}

# Repetir para cada lambda (tutor-handler, admin-handler, etc.)
```

**✅ Verificación:** En CloudWatch Alarms debería aparecer "OK" (verde)

---

### **Paso 3: Crear Alarma de Lambda Duration (10 min)**

**Threshold:** Promedio > 5 segundos (5000ms)

**Opción A: AWS Console**

1. CloudWatch → Alarms → Create alarm
2. Select metric → Lambda → By Function Name → **Duration**
3. Configurar:
   - Statistic: **Average**
   - Period: **5 minutes**
   - Threshold: **Greater than 5000** (milisegundos)
4. SNS topic: **cloudacademy-alarms**
5. Name: `Lambda-Duration-Warning`

**Opción B: Terraform**

```hcl
resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  alarm_name          = "Lambda-Duration-Warning"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Average"
  threshold           = "5000"  # 5 segundos
  alarm_description   = "Lambda duration > 5s promedio"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    FunctionName = "cloudacademy-tutor-handler"  # El más lento
  }
}
```

---

### **Paso 4: Crear Alarma de DynamoDB Throttling (10 min)**

**Threshold:** > 10 throttles en 5 minutos

**Opción A: AWS Console**

1. CloudWatch → Alarms → Create alarm
2. Select metric → DynamoDB → Table Metrics → **UserErrors**
3. Seleccionar tabla: **CourseCatalog**
4. Configurar:
   - Statistic: **Sum**
   - Period: **5 minutes**
   - Threshold: **Greater than 10**
5. SNS topic: **cloudacademy-alarms**
6. Name: `DynamoDB-Throttling-Critical`

**Opción B: Terraform**

```hcl
resource "aws_cloudwatch_metric_alarm" "dynamodb_throttling" {
  alarm_name          = "DynamoDB-Throttling-Critical"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "UserErrors"
  namespace           = "AWS/DynamoDB"
  period              = "300"
  statistic           = "Sum"
  threshold           = "10"
  alarm_description   = "DynamoDB throttling > 10 en 5 min"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    TableName = "CourseCatalog"
  }
}
```

---

### **Paso 5: Crear Metric Filter para Circuit Breaker (15 min)**

Esta es más avanzada porque necesitamos crear un **custom metric** desde los logs.

**Paso 5.1: Crear Metric Filter**

1. CloudWatch → Logs → Log groups
2. Seleccionar: `/aws/lambda/cloudacademy-tutor-handler`
3. Actions → Create metric filter
4. Filter pattern: `"Circuit breaker opened"`
5. Test pattern (debería mostrar 0 matches si nunca ha fallado)
6. Next → Assign metric:
   - Namespace: **CloudAcademy/CircuitBreaker**
   - Metric name: **CircuitBreakerOpen**
   - Metric value: **1**
7. Create metric filter

**Paso 5.2: Crear Alarma para el Metric**

1. CloudWatch → Alarms → Create alarm
2. Select metric → CloudAcademy/CircuitBreaker → **CircuitBreakerOpen**
3. Configurar:
   - Statistic: **Sum**
   - Period: **10 minutes**
   - Threshold: **Greater than 3**
4. SNS topic: **cloudacademy-alarms**
5. Name: `CircuitBreaker-Open-Critical`

**Terraform:**

```hcl
resource "aws_cloudwatch_log_metric_filter" "circuit_breaker" {
  name           = "CircuitBreakerOpen"
  log_group_name = "/aws/lambda/cloudacademy-tutor-handler"
  pattern        = "Circuit breaker opened"

  metric_transformation {
    name      = "CircuitBreakerOpen"
    namespace = "CloudAcademy/CircuitBreaker"
    value     = "1"
  }
}

resource "aws_cloudwatch_metric_alarm" "circuit_breaker_alarm" {
  alarm_name          = "CircuitBreaker-Open-Critical"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "CircuitBreakerOpen"
  namespace           = "CloudAcademy/CircuitBreaker"
  period              = "600"  # 10 minutos
  statistic           = "Sum"
  threshold           = "3"
  alarm_description   = "Circuit breaker abierto > 3 veces en 10 min"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  treat_missing_data  = "notBreaching"
}
```

---

## 🧪 Testing - Verificar que Funciona

### **Test 1: Alarma de Errors**

Forzar un error en lambda:

```bash
# Llamar a un endpoint que no existe
curl https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api/invalid-endpoint
```

Repetir 6 veces en 5 minutos. Deberías recibir email en ~5 minutos.

### **Test 2: Alarma de Duration** (Opcional)

Modificar temporalmente un lambda para que haga `time.sleep(6)` y llamarlo.

### **Test 3: SNS Topic**

Publicar mensaje de prueba:

```bash
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:cloudacademy-alarms \
  --message "Test de alarma" \
  --subject "Test CloudWatch"
```

Deberías recibir email inmediatamente.

---

## ✅ Checklist de Implementación

- [ ] SNS Topic creado
- [ ] Email confirmado (revisar spam)
- [ ] Alarma Lambda Errors creada
- [ ] Alarma Lambda Duration creada
- [ ] Alarma DynamoDB Throttling creada
- [ ] Metric Filter Circuit Breaker creado
- [ ] Alarma Circuit Breaker creada
- [ ] Test de SNS topic exitoso
- [ ] Todas las alarmas en estado "OK" (verde)

---

## 📊 Dashboard de Monitoreo (Bonus - 10 min)

Crear un dashboard visual:

1. CloudWatch → Dashboards → Create dashboard
2. Name: `CloudAcademy-Production`
3. Add widgets:
   - **Line graph:** Lambda Errors (todas las funciones)
   - **Line graph:** Lambda Duration (todas las funciones)
   - **Number:** DynamoDB Throttles
   - **Number:** Circuit Breaker Opens
4. Save dashboard

URL del dashboard estará en: CloudWatch → Dashboards

---

## 💰 Costos

- SNS: **$0.50/mes** por 1,000 emails
- CloudWatch Alarms: **$0.10/mes** por alarma (4 alarmas = $0.40)
- Metric Filters: **Gratis** (primeros 10)
- **Total: ~$1/mes**

---

## 🎯 Criterios de Éxito

✅ **Implementación exitosa si:**
1. Recibes email de confirmación de SNS
2. Las 4 alarmas aparecen en CloudWatch en estado "OK"
3. Test de SNS funciona (recibes email de prueba)
4. Dashboard muestra métricas en tiempo real

✅ **Funcionamiento correcto si:**
- No recibes alarmas durante operación normal
- Si fuerzas un error, recibes email en ~5 minutos
- Alarmas se auto-resuelven cuando el problema se arregla

---

## 🚨 Troubleshooting

**No recibo emails:**
- Revisar spam/promotions
- Verificar que confirmaste la subscripción
- Verificar SNS topic ARN en alarmas

**Alarma siempre en ALARM:**
- Revisar threshold (quizás es muy bajo)
- Verificar que treat_missing_data = "notBreaching"

**Metric Filter no captura eventos:**
- Verificar que el log pattern es exacto
- Revisar logs manualmente en CloudWatch Logs

---

## 📚 Próximos Pasos

Después de implementar las alarmas básicas:
1. ✅ Implementar Lambda Powertools (mejor logging)
2. ✅ Agregar más alarmas según necesidad
3. ✅ Configurar PagerDuty o Slack para notificaciones

---

**Última actualización:** 2025-11-14
**Autor:** CloudAcademy DevOps Team
