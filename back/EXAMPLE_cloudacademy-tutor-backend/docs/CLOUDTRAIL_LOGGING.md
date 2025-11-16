# 📝 CloudTrail Logging - Auditoría Completa

**Tiempo:** 30 minutos
**Costo:** $2/mes primeros 100k eventos (luego $0.10 per 100k)
**Impacto:** Compliance, auditoría, detección de amenazas

---

## 📋 ¿Qué es CloudTrail?

CloudTrail registra **TODAS** las acciones en tu cuenta AWS:

✅ **Quién** hizo qué acción (IAM user/role)
✅ **Cuándo** (timestamp preciso)
✅ **Desde dónde** (IP address, user agent)
✅ **Qué cambió** (antes/después)
✅ **Si falló** (errores, denials)

**Casos de uso:**
- 🔍 Investigar incidentes de seguridad
- 📊 Compliance audits (SOC2, ISO27001)
- 🚨 Detectar actividad sospechosa
- 📈 Analizar usage patterns

---

## 🎯 Eventos Críticos a Auditar

| Evento | Severidad | Alertar? | Ejemplo |
|--------|-----------|----------|---------|
| **CreateUser** | 🔴 Alta | ✅ SÍ | Usuario nuevo creado |
| **DeleteTable** | 🔴 Alta | ✅ SÍ | Tabla DynamoDB eliminada |
| **PutBucketPolicy** | 🔴 Alta | ✅ SÍ | Permisos S3 cambiados |
| **UpdateFunctionCode** | 🟡 Media | ⚠️ Revisar | Lambda actualizada |
| **ConsoleLogin** | 🟢 Baja | ❌ NO | Login normal |
| **GetObject (S3)** | 🟢 Baja | ❌ NO | Read normal |

---

## 🛠️ Implementación

### **Paso 1: Habilitar CloudTrail (Console)**

```bash
1. Ir a CloudTrail Console
2. Click "Create trail"
3. Trail name: cloudacademy-audit-trail
4. Storage location: New S3 bucket
   - Bucket name: cloudacademy-cloudtrail-logs-{account-id}
   - Prefix: cloudtrail/
5. Log file SSE-KMS encryption: Enabled
6. Log file validation: Enabled ✅ (detectar tampering)
7. SNS notification: Enabled (opcional)
8. CloudWatch Logs: Enabled
   - Log group: /aws/cloudtrail/cloudacademy
   - IAM role: New (auto-create)
9. Event type: Management events + Data events
   - Management events: Read + Write ✅
   - Data events:
     - S3: Write events only (GetObject genera mucho ruido)
     - Lambda: Invoke events (opcional)
     - DynamoDB: PutItem, DeleteItem
10. Click "Create trail"
```

### **Paso 2: Configurar con Terraform**

```hcl
# infrastructure/cloudtrail.tf

resource "aws_cloudtrail" "cloudacademy_audit" {
  name                          = "cloudacademy-audit-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail_logs.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true

  # Enviar logs a CloudWatch para alarmas
  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
  cloud_watch_logs_role_arn  = aws_iam_role.cloudtrail_cloudwatch.arn

  # Eventos de management (IAM, Lambda, DynamoDB, etc)
  event_selector {
    read_write_type           = "All"
    include_management_events = true

    # Data events: DynamoDB
    data_resource {
      type   = "AWS::DynamoDB::Table"
      values = ["arn:aws:dynamodb:*:*:table/*"]
    }

    # Data events: Lambda Invoke (opcional, genera mucho log)
    # data_resource {
    #   type   = "AWS::Lambda::Function"
    #   values = ["arn:aws:lambda:*:*:function/*"]
    # }
  }

  tags = {
    Name        = "cloudacademy-audit-trail"
    Environment = "prod"
  }
}

resource "aws_s3_bucket" "cloudtrail_logs" {
  bucket = "cloudacademy-cloudtrail-logs-${data.aws_caller_identity.current.account_id}"

  lifecycle_rule {
    enabled = true

    # Mover a Glacier después de 90 días
    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    # Eliminar después de 7 años (compliance)
    expiration {
      days = 2555
    }
  }

  versioning {
    enabled = true
  }

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}

resource "aws_s3_bucket_policy" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSCloudTrailAclCheck"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cloudtrail_logs.arn
      },
      {
        Sid    = "AWSCloudTrailWrite"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail_logs.arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}

resource "aws_cloudwatch_log_group" "cloudtrail" {
  name              = "/aws/cloudtrail/cloudacademy"
  retention_in_days = 90
}
```

---

## 🚨 Alarmas de Seguridad

### **Alarma 1: Root Account Usage**

```bash
# Filtro métrico
aws logs put-metric-filter \
  --log-group-name /aws/cloudtrail/cloudacademy \
  --filter-name root-account-usage \
  --filter-pattern '{ $.userIdentity.type = "Root" && $.userIdentity.invokedBy NOT EXISTS && $.eventType != "AwsServiceEvent" }' \
  --metric-transformations \
    metricName=RootAccountUsage,metricNamespace=CloudTrail,metricValue=1

# Alarma
aws cloudwatch put-metric-alarm \
  --alarm-name root-account-used \
  --alarm-description "Root account was used!" \
  --metric-name RootAccountUsage \
  --namespace CloudTrail \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1
```

### **Alarma 2: Unauthorized API Calls**

```bash
aws logs put-metric-filter \
  --log-group-name /aws/cloudtrail/cloudacademy \
  --filter-name unauthorized-api-calls \
  --filter-pattern '{ ($.errorCode = "*UnauthorizedOperation") || ($.errorCode = "AccessDenied*") }' \
  --metric-transformations \
    metricName=UnauthorizedAPICalls,metricNamespace=CloudTrail,metricValue=1

aws cloudwatch put-metric-alarm \
  --alarm-name unauthorized-api-calls-spike \
  --metric-name UnauthorizedAPICalls \
  --namespace CloudTrail \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

### **Alarma 3: IAM Policy Changes**

```bash
aws logs put-metric-filter \
  --log-group-name /aws/cloudtrail/cloudacademy \
  --filter-name iam-policy-changes \
  --filter-pattern '{ ($.eventName = PutUserPolicy) || ($.eventName = PutRolePolicy) || ($.eventName = PutGroupPolicy) || ($.eventName = CreatePolicy) || ($.eventName = DeletePolicy) }' \
  --metric-transformations \
    metricName=IAMPolicyChanges,metricNamespace=CloudTrail,metricValue=1

aws cloudwatch put-metric-alarm \
  --alarm-name iam-policy-changed \
  --metric-name IAMPolicyChanges \
  --namespace CloudTrail \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold
```

### **Alarma 4: DynamoDB Table Deleted**

```bash
aws logs put-metric-filter \
  --log-group-name /aws/cloudtrail/cloudacademy \
  --filter-name dynamodb-table-deleted \
  --filter-pattern '{ ($.eventName = DeleteTable) }' \
  --metric-transformations \
    metricName=DynamoDBTableDeleted,metricNamespace=CloudTrail,metricValue=1

aws cloudwatch put-metric-alarm \
  --alarm-name dynamodb-table-deleted \
  --metric-name DynamoDBTableDeleted \
  --namespace CloudTrail \
  --statistic Sum \
  --period 60 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold
```

---

## 🔍 Queries CloudWatch Logs Insights

### **Query 1: Ver todas las acciones de un usuario**

```sql
fields @timestamp, eventName, userIdentity.principalId, sourceIPAddress, errorCode
| filter userIdentity.principalId = "AIDAI123456789"
| sort @timestamp desc
| limit 100
```

### **Query 2: Errores de autorización**

```sql
fields @timestamp, eventName, userIdentity.arn, errorCode, errorMessage
| filter errorCode like /Access|Unauthorized/
| stats count() by eventName, errorCode
| sort count desc
```

### **Query 3: Cambios en DynamoDB**

```sql
fields @timestamp, eventName, requestParameters.tableName, userIdentity.arn
| filter eventSource = "dynamodb.amazonaws.com"
| filter eventName in ["CreateTable", "DeleteTable", "UpdateTable"]
| sort @timestamp desc
```

### **Query 4: Lambda updates**

```sql
fields @timestamp, eventName, requestParameters.functionName, userIdentity.arn
| filter eventSource = "lambda.amazonaws.com"
| filter eventName in ["UpdateFunctionCode", "UpdateFunctionConfiguration", "DeleteFunction"]
| sort @timestamp desc
```

---

## 💰 Costos

```
CloudTrail:
- Primeros 100k eventos management: Gratis
- Eventos management adicionales: $2.00 per 100k
- Eventos data: $0.10 per 100k

S3 Storage:
- Logs: ~$0.023/GB/mes (Standard)
- Glacier (después 90 días): ~$0.004/GB/mes

CloudWatch Logs:
- Ingestion: $0.50 per GB
- Storage: $0.03 per GB/mes

Ejemplo típico (100k eventos/día):
- CloudTrail: $2/mes
- S3 storage: ~$1/mes
- CloudWatch Logs: ~$5/mes
- TOTAL: ~$8/mes
```

---

## 📊 Dashboard de Auditoría

```python
# Script para generar reporte semanal de actividad sospechosa

import boto3
from datetime import datetime, timedelta

def generate_security_report():
    """
    Genera reporte semanal de eventos de seguridad
    """
    cloudtrail = boto3.client('cloudtrail')
    logs = boto3.client('logs')

    # Últimos 7 días
    start_time = datetime.utcnow() - timedelta(days=7)

    # Query 1: Root account usage
    root_events = logs.start_query(
        logGroupName='/aws/cloudtrail/cloudacademy',
        startTime=int(start_time.timestamp()),
        endTime=int(datetime.utcnow().timestamp()),
        queryString='fields @timestamp, eventName | filter userIdentity.type = "Root"'
    )

    # Query 2: Failed logins
    failed_logins = logs.start_query(
        logGroupName='/aws/cloudtrail/cloudacademy',
        startTime=int(start_time.timestamp()),
        endTime=int(datetime.utcnow().timestamp()),
        queryString='fields @timestamp, sourceIPAddress | filter eventName = "ConsoleLogin" and errorCode = "Failed authentication"'
    )

    # Query 3: IAM changes
    iam_changes = logs.start_query(
        logGroupName='/aws/cloudtrail/cloudacademy',
        startTime=int(start_time.timestamp()),
        endTime=int(datetime.utcnow().timestamp()),
        queryString='fields @timestamp, eventName, userIdentity.arn | filter eventSource = "iam.amazonaws.com" and eventName in ["CreateUser", "DeleteUser", "AttachUserPolicy"]'
    )

    # Generar reporte
    report = f"""
    🔒 CloudAcademy Security Report ({start_time.date()} - {datetime.utcnow().date()})

    ⚠️ Root Account Usage: {len(root_events)} times
    🚫 Failed Logins: {len(failed_logins)} attempts
    👤 IAM Changes: {len(iam_changes)} actions

    📊 Top Actions:
    {get_top_actions(logs)}
    """

    # Enviar a Slack/Email
    send_to_slack(report)
```

---

## ✅ Checklist Implementación

- [ ] Habilitar CloudTrail en AWS Console
- [ ] Configurar S3 bucket para logs
- [ ] Habilitar log file validation
- [ ] Configurar CloudWatch Logs integration
- [ ] Crear metric filters para eventos críticos
- [ ] Crear alarmas para root usage, unauthorized calls, IAM changes
- [ ] Configurar lifecycle policy en S3 (Glacier después 90 días)
- [ ] Testing: Generar evento de prueba y verificar en CloudWatch
- [ ] Documentar proceso de investigación de incidentes
- [ ] Configurar reporte semanal automático (opcional)

---

## 🎯 Recomendación

**Para tu proyecto:**

✅ **SÍ implementar CloudTrail** porque:
- Costo bajo (~$8/mes)
- Compliance requirement (SOC2, ISO27001)
- Detectar actividad sospechosa
- Debugging de permisos IAM

**Quick wins:**
1. Habilitar CloudTrail (5 min)
2. Crear alarma root account usage (10 min)
3. Crear alarma IAM changes (10 min)
4. Listo para compliance básico ✅

---

**Última actualización:** 2025-01-14
**Status:** ✅ RECOMENDADO - Implementar ASAP (~$8/mes)
