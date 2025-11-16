# 📋 Plan de Mejoras Pendientes

**Fecha:** 2025-01-14
**Estado actual:** 17 mejoras implementadas + 1 optimización DynamoDB
**Pendientes:** 10 items (6 alta prioridad, 4 opcionales)

---

## ✅ Estado Actual

### **Implementado y Funcionando:**
- ✅ 17 mejoras de código (fundamentos + performance + security)
- ✅ Query con GSI en CourseCatalog (DynamoDB Optimization #7)
- ✅ Tablas Users y Categories con GSI
- ✅ Script de empaquetado automatizado
- ✅ Security Headers (7 headers)
- ✅ Response Compression gzip
- ✅ Connection Pooling boto3
- ✅ Circuit Breaker + Retry
- ✅ Validación robusta

---

## 🎯 Pendientes - Alta Prioridad

### **1. Backfill entity_type en CourseCatalog** ⭐ URGENTE

**Problema:** Items existentes no tienen atributo `entity_type` que necesita el GSI

**Solución:**
```python
# Script de migración
import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('CourseCatalog')

# Scan TODOS los items
response = table.scan()
items = response['Items']

for item in items:
    if 'entity_type' not in item:
        # Determinar entity_type según SK
        if item['SK'] == 'METADATA':
            entity_type = 'COURSE_METADATA'
        elif item['SK'].startswith('SECTION#'):
            entity_type = 'COURSE_SECTION'
        else:
            continue

        # Update item con entity_type
        table.update_item(
            Key={'PK': item['PK'], 'SK': item['SK']},
            UpdateExpression='SET entity_type = :et',
            ExpressionAttributeValues={':et': entity_type}
        )

print(f"Backfill completado: {len(items)} items actualizados")
```

**Tiempo:** 30 minutos
**Costo:** $0 (updates gratuitos)
**Impacto:** ✅ GSI funciona con items existentes

---

### **2. Poblar Tabla Categories** ⭐ ALTA

**Objetivo:** Crear categorías iniciales desde admin panel

**Categorías sugeridas:**
```python
categories = [
    {
        'category_id': 'bedrock',
        'name': 'Amazon Bedrock',
        'slug': 'bedrock',
        'description': 'IA generativa con Amazon Bedrock',
        'icon': 'https://...',
        'is_active': True,
        'display_order': 1
    },
    {
        'category_id': 'security',
        'name': 'Security',
        'slug': 'security',
        'description': 'Seguridad en AWS',
        'icon': 'https://...',
        'is_active': True,
        'display_order': 2
    },
    {
        'category_id': 'networking',
        'name': 'Networking',
        'slug': 'networking',
        'description': 'Redes en AWS',
        'icon': 'https://...',
        'is_active': True,
        'display_order': 3
    },
    # ... más categorías
]

# Insertar en DynamoDB
for cat in categories:
    categories_table.put_item(Item={
        'PK': f"CATEGORY#{cat['category_id']}",
        'SK': 'METADATA',
        **cat,
        'created_at': datetime.utcnow().isoformat()
    })
```

**Tiempo:** 1 hora (crear UI admin + seed data)
**Costo:** $0
**Impacto:** ✅ Gestión dinámica de categorías

---

### **3. CloudWatch Alarms Básicas** ⭐ ALTA

**Documentado en:** `docs/CLOUDWATCH_ALARMS.md`

**4 alarmas críticas a crear:**

#### **Alarma 1: Lambda Errors**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name lambda-errors-tutor-handler \
  --alarm-description "Errors en tutor-handler" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=tutor-handler \
  --evaluation-periods 1
```

#### **Alarma 2: Lambda Duration (Latencia)**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name lambda-high-duration-courses-handler \
  --metric-name Duration \
  --namespace AWS/Lambda \
  --statistic Average \
  --period 300 \
  --threshold 1000 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=FunctionName,Value=courses-handler
```

#### **Alarma 3: DynamoDB Throttling**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name dynamodb-throttling \
  --metric-name UserErrors \
  --namespace AWS/DynamoDB \
  --statistic Sum \
  --period 60 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

#### **Alarma 4: Circuit Breaker Open**
```bash
# Métrica custom (necesita log metric filter primero)
aws logs put-metric-filter \
  --log-group-name /aws/lambda/tutor-handler \
  --filter-name circuit-breaker-open \
  --filter-pattern '"Circuit breaker is OPEN"' \
  --metric-transformations \
    metricName=CircuitBreakerOpen,\
    metricNamespace=CloudAcademy,\
    metricValue=1
```

**Tiempo:** 1 hora
**Costo:** $0.50/mes (4 alarmas)
**Impacto:** ✅ Monitoreo proactivo, detección temprana de problemas

---

### **4. DynamoDB BatchGetItem** 🟡 MEDIA

**Documentado en:** `docs/DYNAMODB_OPTIMIZATIONS_GUIDE.md` (Optimization #1)

**Objetivo:** Reducir API calls en `GET /api/courses/{id}`

**Implementación:**
```python
# lambdas/tutor-handler/utils/dynamodb_client.py

def batch_get_course_items(self, course_id, section_ids):
    """
    Obtiene metadata del curso + múltiples secciones en 1 API call

    ANTES: 1 GetItem (metadata) + 1 Query (sections) = 2 calls
    DESPUÉS: 1 BatchGetItem = 1 call (-50% API calls)
    """
    keys = [{'PK': f'COURSE#{course_id}', 'SK': 'METADATA'}]

    for sid in section_ids:
        keys.append({'PK': f'COURSE#{course_id}', 'SK': f'SECTION#{sid}'})

    response = self.dynamodb.batch_get_item(
        RequestItems={
            self.courses_table.table_name: {'Keys': keys}
        }
    )

    items = response['Responses'][self.courses_table.table_name]

    # Separar metadata y sections
    metadata = next(i for i in items if i['SK'] == 'METADATA')
    sections = [i for i in items if i['SK'].startswith('SECTION#')]

    return {'metadata': metadata, 'sections': sections}
```

**Usar en handler:**
```python
# lambdas/courses-handler/lambda_function.py

def handle_get_course(course_id):
    # Si conocemos los section_ids (ej: del metadata), usar batch
    metadata = get_course_metadata(course_id)
    section_count = metadata.get('total_sections', 0)
    section_ids = list(range(section_count))  # [0, 1, 2, ...]

    result = batch_get_course_items(course_id, section_ids)
    return success_response(result)
```

**Tiempo:** 2 horas
**Costo:** $0 (mismo costo, menos calls)
**Impacto:** Latencia -30%, mejor throughput

---

### **5. DynamoDB TransactWriteItems** 🟡 MEDIA

**Documentado en:** `docs/DYNAMODB_OPTIMIZATIONS_GUIDE.md` (Optimization #3)

**Objetivo:** Updates atómicos sin race conditions

**Implementación:**
```python
# lambdas/tutor-handler/utils/dynamodb_client.py

def update_checkpoint_progress_atomic(self, user_id, course_id, section_id, score, passed):
    """
    Update progress + usage atómicamente

    Garantiza: Ambos updates ocurren o ninguno (all-or-nothing)
    """
    timestamp = datetime.utcnow().isoformat()

    client = self.dynamodb.meta.client
    client.transact_write_items(
        TransactItems=[
            # 1. Update UserProgress
            {
                'Update': {
                    'TableName': 'UserProgress',
                    'Key': {
                        'PK': {'S': f'USER#{user_id}'},
                        'SK': {'S': f'COURSE#{course_id}'}
                    },
                    'UpdateExpression': 'SET checkpoints_completed.#sid = :cp',
                    'ExpressionAttributeNames': {'#sid': str(section_id)},
                    'ExpressionAttributeValues': {
                        ':cp': {'M': {
                            'score': {'N': str(score)},
                            'passed': {'BOOL': passed},
                            'timestamp': {'S': timestamp}
                        }}
                    }
                }
            },
            # 2. Increment UserUsage (atómico con #1)
            {
                'Update': {
                    'TableName': 'UserUsage',
                    'Key': {
                        'user_id': {'S': user_id},
                        'period': {'S': timestamp[:10]}  # YYYY-MM-DD
                    },
                    'UpdateExpression': 'ADD #count :inc SET last_request = :ts',
                    'ExpressionAttributeNames': {'#count': 'count'},
                    'ExpressionAttributeValues': {
                        ':inc': {'N': '1'},
                        ':ts': {'S': timestamp}
                    }
                }
            }
        ]
    )
```

**Tiempo:** 2 horas
**Costo:** $0 (mismo costo que 2 updates)
**Impacto:** ✅ Zero race conditions, data consistency perfecto

---

### **6. Lambda Layers para Cold Start** 🟢 BAJA

**Documentado en:** `docs/LAMBDA_LAYERS_GUIDE.md`

**Scripts ya creados:**
- `scripts/build_layers.sh` ✅
- `scripts/deploy_layers.sh` ✅

**Solo falta ejecutar:**
```bash
cd scripts

# 1. Build layers
./build_layers.sh
# Output:
#   dist/shared-code-layer.zip (~50KB)
#   dist/dependencies-layer.zip (~30MB boto3+powertools)

# 2. Deploy layers a AWS
./deploy_layers.sh
# Output: Layer ARNs

# 3. Actualizar Lambdas en Terraform para usar layers
# terraform/lambda.tf
resource "aws_lambda_function" "tutor_handler" {
  layers = [
    "arn:aws:lambda:us-east-1:123456:layer:shared-code:1",
    "arn:aws:lambda:us-east-1:123456:layer:dependencies:1"
  ]
}

# 4. Terraform apply
cd terraform && terraform apply
```

**Tiempo:** 1 hora (ejecutar scripts + actualizar Terraform)
**Costo:** $0 (layers son gratis)
**Impacto:** Cold start 3-5s → 500ms (-80%)

---

## 🔵 Pendientes - Baja Prioridad (Opcional)

### **7. AWS WAF** 📄 Solo Documentado

**Documentado en:** `docs/AWS_WAF_GUIDE.md`

**Cuándo implementar:** Si tenés ataques o necesitás compliance

**Configuración Terraform completa en docs**, solo falta aplicar:
```hcl
# terraform/waf.tf (copiar del guide)
resource "aws_wafv2_web_acl" "cloudacademy_api" {
  # Rate limiting, AWS Managed Rules, IP blacklist
}
```

**Tiempo:** 2 horas
**Costo:** $10/mes ($0-2 en Free Tier)

---

### **8. Bedrock Guardrails** 📄 Solo Documentado

**Documentado en:** `docs/BEDROCK_GUARDRAILS_GUIDE.md`

**Cuándo implementar:** Si querés mejor content filtering ML-powered

**Pasos:**
1. Crear Guardrail en Bedrock Console (copiar config del guide)
2. Actualizar `bedrock_client.py` para usar guardrail_id
3. Deprecar `content_validator.py` custom

**Tiempo:** 4 horas
**Costo:** $0.01 per 1000 requests

---

### **9. ElastiCache Redis** 📄 Documentado

**Cuándo implementar:** Solo si tráfico >50M requests/mes O costos DynamoDB >$20/mes

**No implementar aún** porque:
- Tráfico actual probablemente <10M req/mes
- DynamoDB con GSI ya es rápido (50ms)
- Redis costaría $15/mes vs $2.50/mes DynamoDB actual

**Tiempo:** 1 semana
**Costo:** $15-30/mes

---

### **10. EventBridge / Step Functions / VPC** 📄 Documentados

**Cuándo implementar:** Post-POC, arquitecturas enterprise

**No necesario ahora** porque:
- EventBridge: Solo si múltiples microservicios
- Step Functions: Solo si workflows multi-paso complejos
- VPC: Solo si compliance SOC2/HIPAA estricto

**Tiempo:** 2-4 semanas cada uno
**Costo:** Variable

---

## 📅 Roadmap Recomendado

### **Sprint 1: Crítico (Esta semana - 4h total)** ⭐

```
Lunes (1h):
  ✅ Backfill entity_type en items existentes

Martes (1h):
  ✅ Poblar tabla Categories

Miércoles (2h):
  ✅ Crear 4 CloudWatch Alarms básicas

RESULTADO: Sistema funcionando 100%, monitoreado
```

---

### **Sprint 2: Optimizaciones DynamoDB (Próxima semana - 4h)** 🟡

```
Lunes-Martes (2h):
  ✅ Implementar BatchGetItem

Miércoles-Jueves (2h):
  ✅ Implementar TransactWriteItems

RESULTADO: -30% latencia, zero race conditions
```

---

### **Sprint 3: Cold Start (Si es problema - 1h)** 🟢

```
Viernes (1h):
  ✅ Deploy Lambda Layers (scripts ya listos)

RESULTADO: Cold start -80% (3-5s → 500ms)
```

---

### **Sprint 4: Opcional (Si necesario)** 🔵

```
Solo implementar si:
  - AWS WAF: Tenés ataques
  - Bedrock Guardrails: Querés mejor filtering
  - ElastiCache: Tráfico >50M req/mes
```

---

## 📊 Priorización por ROI

### **Quick Wins (implementar YA):**

| Item | Tiempo | Costo | ROI | Prioridad |
|------|--------|-------|-----|-----------|
| Backfill entity_type | 30min | $0 | ⭐⭐⭐⭐⭐ | URGENTE |
| CloudWatch Alarms | 1h | $0.50/mes | ⭐⭐⭐⭐⭐ | ALTA |
| Poblar Categories | 1h | $0 | ⭐⭐⭐⭐ | ALTA |

### **High Impact (próxima semana):**

| Item | Tiempo | Costo | ROI | Prioridad |
|------|--------|-------|-----|-----------|
| BatchGetItem | 2h | $0 | ⭐⭐⭐⭐ | MEDIA |
| TransactWriteItems | 2h | $0 | ⭐⭐⭐⭐ | MEDIA |
| Lambda Layers | 1h | $0 | ⭐⭐⭐ | BAJA |

### **Opcional (si necesario):**

| Item | Tiempo | Costo | ROI | Cuándo |
|------|--------|-------|-----|--------|
| AWS WAF | 2h | $10/mes | ⭐⭐ | Si hay ataques |
| Bedrock Guardrails | 4h | $0.01/1k | ⭐⭐ | Si querés mejor filtering |
| ElastiCache Redis | 1 semana | $15/mes | ⭐ | Si tráfico >50M req/mes |

---

## ✅ Checklist Rápido

### **Implementar esta semana (4h):**
- [ ] Backfill entity_type (30min)
- [ ] Poblar Categories (1h)
- [ ] CloudWatch Alarms (1h)
- [ ] Validar que GSI funciona con items viejos (30min)

### **Implementar próxima semana (4h):**
- [ ] BatchGetItem (2h)
- [ ] TransactWriteItems (2h)

### **Considerar (si necesario):**
- [ ] Lambda Layers (1h) - Solo si cold start es problema
- [ ] AWS WAF (2h) - Solo si hay ataques
- [ ] Bedrock Guardrails (4h) - Solo si querés mejor filtering

### **NO implementar ahora:**
- [ ] ElastiCache Redis - Esperar hasta >50M req/mes
- [ ] EventBridge - Post-POC
- [ ] Step Functions - Post-POC
- [ ] VPC - Post-POC

---

## 🎯 Objetivo Final

**Después de Sprint 1 + Sprint 2 (8h total):**

```
✅ Sistema 100% funcional
✅ GSI funcionando con todos los items
✅ Categorías dinámicas gestionables
✅ Monitoreo proactivo con alarmas
✅ BatchGetItem implementado (-30% latencia)
✅ TransactWriteItems implementado (zero race conditions)

Estado: Production-ready, escalable, monitoreado
```

---

**Generado:** 2025-01-14
**Próxima revisión:** Después de Sprint 1 (esta semana)
