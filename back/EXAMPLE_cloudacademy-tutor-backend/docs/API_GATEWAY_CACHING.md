# ⚡ API Gateway Caching - Quick Win

**Tiempo:** 30 minutos
**Costo:** $0.02/hora = ~$15/mes (500MB cache)
**Impacto:** Latencia 500ms → 50ms (90% mejora)

---

## 📋 ¿Qué es API Gateway Caching?

API Gateway puede **cachear responses** antes de invocar Lambda:

```
Request → API Gateway → Cache HIT? → Return cached response (50ms)
                      ↓ Cache MISS?
                      → Lambda → DynamoDB → Response (500ms) → Cache for TTL
```

**Ventajas:**
- ✅ Lambda NO se invoca si hay cache hit (ahorro $$$)
- ✅ DynamoDB NO se lee si hay cache hit (ahorro $$$)
- ✅ Latencia 10x menor
- ✅ Menos carga en backend
- ✅ Configuración en minutos (AWS Console)

---

## 🎯 Endpoints Ideales para Cache

| Endpoint | TTL Recomendado | Cache? | Razón |
|----------|-----------------|--------|-------|
| `GET /api/courses` | 5 minutos | ✅ SÍ | Catálogo no cambia frecuentemente |
| `GET /api/courses/{id}` | 10 minutos | ✅ SÍ | Contenido estático de curso |
| `GET /api/courses/{id}/sections/{sid}` | 10 minutos | ✅ SÍ | Contenido de sección |
| `GET /api/categories` | 30 minutos | ✅ SÍ | Metadata casi estática |
| `POST /api/tutor/ask` | - | ❌ NO | Cada request único |
| `POST /api/tutor/checkpoint` | - | ❌ NO | Validación dinámica |
| `GET /api/user/progress` | 1 minuto | ⚠️ CUIDADO | Puede ser stale |

---

## 🛠️ Implementación AWS Console

### **Paso 1: Habilitar Cache**

```bash
1. Ir a API Gateway Console
2. Seleccionar tu API
3. Click en "Stages" → "prod"
4. Tab "Settings"
5. Sección "Cache Settings":
   - Enable API cache: ✅
   - Cache capacity: 0.5 GB ($15/mes)
   - Cache TTL: 300 seconds (5 minutos)
6. Click "Save Changes"
```

### **Paso 2: Configurar Cache por Endpoint**

```bash
1. En "Stages" → "prod" → Expandir resources
2. Seleccionar endpoint (ej: GET /api/courses)
3. Click en "GET" method
4. Tab "Settings"
5. Sección "Cache Settings":
   - Enable method cache: ✅
   - Cache TTL: 300 (5 minutos para courses)
   - Cache key parameters: (ninguno si no hay query params)
6. Si endpoint usa query params (ej: ?category=bedrock):
   - Agregar "category" a cache key parameters
   - Esto cachea por categoría (bedrock, security, etc)
```

### **Paso 3: Cache Invalidation (Opcional)**

Cuando publicas un curso nuevo, invalidar cache:

```bash
aws apigateway flush-stage-cache \
  --rest-api-id abc123 \
  --stage-name prod
```

O invalidar un endpoint específico desde Lambda:

```python
import boto3

def invalidate_cache_after_course_update(course_id):
    """Invalidar cache cuando se actualiza un curso"""
    client = boto3.client('apigateway')

    # Flush cache completo (invalidar todo)
    client.flush_stage_cache(
        restApiId='abc123',
        stageName='prod'
    )

    logger.info(f"Cache invalidated after course {course_id} update")
```

---

## 📊 Configuración Terraform

```hcl
# infrastructure/api_gateway.tf

resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.prod.id
  rest_api_id   = aws_api_gateway_rest_api.cloudacademy_api.id
  stage_name    = "prod"

  # Cache settings
  cache_cluster_enabled = true
  cache_cluster_size    = "0.5"  # GB (opciones: 0.5, 1.6, 6.1, 13.5, 28.4, 58.2, 118, 237)

  # Variables de entorno para Lambda
  variables = {
    CACHE_TTL = "300"
  }
}

resource "aws_api_gateway_method_settings" "courses_list" {
  rest_api_id = aws_api_gateway_rest_api.cloudacademy_api.id
  stage_name  = aws_api_gateway_stage.prod.stage_name
  method_path = "courses/GET"

  settings {
    # Cache settings
    caching_enabled       = true
    cache_ttl_in_seconds  = 300  # 5 minutos
    cache_data_encrypted  = false  # No necesario para data pública

    # Cache key parameters (si endpoint usa query params)
    # Esto permite cachear por valor de query param
    # Ej: ?category=bedrock vs ?category=security son caches separados
  }
}

resource "aws_api_gateway_method_settings" "course_detail" {
  rest_api_id = aws_api_gateway_rest_api.cloudacademy_api.id
  stage_name  = aws_api_gateway_stage.prod.stage_name
  method_path = "courses/{id}/GET"

  settings {
    caching_enabled       = true
    cache_ttl_in_seconds  = 600  # 10 minutos (contenido más estable)
  }
}

# NO cachear endpoints dinámicos
resource "aws_api_gateway_method_settings" "tutor_ask" {
  rest_api_id = aws_api_gateway_rest_api.cloudacademy_api.id
  stage_name  = aws_api_gateway_stage.prod.stage_name
  method_path = "tutor/ask/POST"

  settings {
    caching_enabled = false  # Cada request es único
  }
}
```

---

## 🧪 Testing Cache

### **Test 1: Verificar Cache Hit**

```bash
# Request 1: Cache MISS (primera vez)
time curl -H "Accept: application/json" \
  https://abc123.execute-api.us-east-1.amazonaws.com/prod/api/courses

# Duration: ~500ms (Lambda + DynamoDB)
# Response headers: X-Cache: Miss from cloudfront

# Request 2: Cache HIT (segunda vez, dentro de TTL)
time curl -H "Accept: application/json" \
  https://abc123.execute-api.us-east-1.amazonaws.com/prod/api/courses

# Duration: ~50ms (solo API Gateway cache)
# Response headers: X-Cache: Hit from cloudfront
```

### **Test 2: Cache Invalidation**

```bash
# 1. Request para cachear
curl https://api/courses

# 2. Actualizar un curso (admin)
curl -X PUT https://api/admin/courses/terraform-101 -d '{"title": "New Title"}'

# 3. Lambda invalida cache automáticamente
# (implementar en admin-handler)

# 4. Request debe traer data nueva (cache miss)
curl https://api/courses
```

---

## 💰 Costos

| Tamaño Cache | Costo/hora | Costo/mes | Requests/mes |
|--------------|------------|-----------|--------------|
| **0.5 GB** | $0.020 | ~$15 | ~10M |
| 1.6 GB | $0.038 | ~$28 | ~50M |
| 6.1 GB | $0.200 | ~$146 | ~200M |

**Ahorro por cache hit:**
- Lambda invocation: $0.20 per 1M requests
- DynamoDB read: $0.25 per 1M requests
- **Total ahorrado:** $0.45 per 1M cache hits

**Break-even:**
```
Costo cache: $15/mes
Ahorro: $0.45 per 1M cache hits

Break-even: 33M cache hits/mes (66% cache hit rate de 50M requests)

Si tenés >50M requests/mes con >66% cache hit → Vale la pena
Si tenés <50M requests/mes → NO vale la pena aún
```

---

## ⚠️ Consideraciones

### **Cache Invalidation Strategy**

**Opción 1: TTL Automático (Recomendado para POC)**
- Cache expira después de TTL (5-10 min)
- Simple, sin código extra
- Posible data stale por max 10 minutos

**Opción 2: Manual Invalidation**
- Admin publica curso → Lambda invalida cache
- Data siempre fresca
- Requiere implementación en admin handlers

**Opción 3: Cache Tags (Avanzado)**
- Invalidar solo cache de curso específico
- Más eficiente que flush completo
- Requiere CloudFront (no API Gateway nativo)

### **Cache Key Parameters**

Si endpoint usa query params, agregar a cache key:

```bash
# Endpoint: GET /api/courses?category=bedrock&difficulty=Intermediate

Cache keys:
- category
- difficulty

Resultado: Cache separado por cada combinación
- bedrock + Intermediate (cache 1)
- bedrock + Advanced (cache 2)
- security + Intermediate (cache 3)
```

---

## 📈 Monitoreo

### **CloudWatch Metrics**

```bash
# Cache hit rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name CacheHitCount \
  --dimensions Name=ApiName,Value=cloudacademy-api \
  --start-time 2025-01-14T00:00:00Z \
  --end-time 2025-01-14T23:59:59Z \
  --period 3600 \
  --statistics Sum

# Cache miss rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name CacheMissCount \
  --dimensions Name=ApiName,Value=cloudacademy-api

# Calcular cache hit %
cache_hit_rate = CacheHitCount / (CacheHitCount + CacheMissCount) * 100
```

### **CloudWatch Alarms**

```bash
# Alarma si cache hit rate < 50%
aws cloudwatch put-metric-alarm \
  --alarm-name api-gateway-low-cache-hit-rate \
  --alarm-description "Cache hit rate below 50%" \
  --metric-name CacheHitCount \
  --namespace AWS/ApiGateway \
  --statistic Sum \
  --period 3600 \
  --threshold 50 \
  --comparison-operator LessThanThreshold
```

---

## ✅ Checklist Implementación

- [ ] Habilitar cache en API Gateway stage (prod)
- [ ] Configurar cache size (0.5GB para empezar)
- [ ] Configurar TTL global (300s = 5 min)
- [ ] Habilitar cache en GET /api/courses (TTL 300s)
- [ ] Habilitar cache en GET /api/courses/{id} (TTL 600s)
- [ ] Habilitar cache en GET /api/categories (TTL 1800s)
- [ ] Configurar cache key parameters para endpoints con query params
- [ ] Implementar cache invalidation en admin handlers (opcional)
- [ ] Configurar CloudWatch alarms para cache hit rate
- [ ] Testing: Verificar cache hits con curl
- [ ] Monitorear costos primeros 7 días
- [ ] Ajustar TTLs según necesidad

---

## 🎯 Recomendación

**Para tu proyecto:**

1. **Si tráfico <10M req/mes:** NO implementar (overhead no justificado)
2. **Si tráfico 10-50M req/mes:** Considerar (break-even ~33M)
3. **Si tráfico >50M req/mes:** SÍ implementar (ahorro significativo)

**Alternativa gratis:** Response Compression ya implementada (Mejora #12) da similar UX improvement sin costo.

---

**Última actualización:** 2025-01-14
**Status:** Documentado - Implementar solo si tráfico >10M req/mes
