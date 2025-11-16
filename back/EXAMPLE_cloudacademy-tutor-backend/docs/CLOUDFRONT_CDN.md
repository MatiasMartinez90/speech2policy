# 🌐 CloudFront CDN - Performance Global

**Tiempo:** 1-2 horas
**Costo:** $0.085/GB + $0.01/10k requests = ~$5-10/mes
**Impacto:** Latencia global -80%, HTTPS gratis, DDoS protection

---

## 📋 ¿Qué es CloudFront?

CloudFront es el **CDN (Content Delivery Network)** de AWS que:

✅ **Cachea contenido** en 400+ edge locations globales
✅ **Reduce latencia** para usuarios de todo el mundo
✅ **Protege contra DDoS** automáticamente
✅ **HTTPS gratis** con certificado AWS
✅ **Compresión automática** (Gzip, Brotli)

```
Usuario (Argentina) → CloudFront Edge (São Paulo) → Cache HIT → 50ms
                                                   ↓ Cache MISS
                                                   → API Gateway (us-east-1) → 500ms
```

---

## 🎯 Casos de Uso

| Contenido | Sin CloudFront | Con CloudFront | Mejora |
|-----------|----------------|----------------|--------|
| **API responses** (courses) | 500ms | 50ms | 90% ⬇️ |
| **Imágenes de cursos** | 300ms | 30ms | 90% ⬇️ |
| **Frontend (React/Vue)** | 200ms | 20ms | 90% ⬇️ |
| **Archivos estáticos** (CSS, JS) | 150ms | 15ms | 90% ⬇️ |

---

## 🛠️ Arquitectura

### **Antes (Sin CloudFront):**
```
Usuario → API Gateway → Lambda → DynamoDB
          (500ms desde Argentina)
```

### **Después (Con CloudFront):**
```
Usuario → CloudFront Edge (local) → Cache HIT? → Return (50ms)
                                  ↓ Cache MISS?
                                  → API Gateway → Lambda → DynamoDB
                                  → Cache for TTL → Return (500ms primera vez)
```

---

## 📦 Configuración

### **Opción 1: CloudFront + API Gateway (Backend)**

```bash
# 1. Crear distribution
aws cloudfront create-distribution \
  --distribution-config '{
    "Comment": "CloudAcademy API CDN",
    "Enabled": true,
    "Origins": {
      "Items": [{
        "Id": "api-gateway",
        "DomainName": "abc123.execute-api.us-east-1.amazonaws.com",
        "OriginPath": "/prod",
        "CustomOriginConfig": {
          "HTTPPort": 80,
          "HTTPSPort": 443,
          "OriginProtocolPolicy": "https-only",
          "OriginSSLProtocols": {
            "Items": ["TLSv1.2"]
          }
        }
      }]
    },
    "DefaultCacheBehavior": {
      "TargetOriginId": "api-gateway",
      "ViewerProtocolPolicy": "redirect-to-https",
      "AllowedMethods": {
        "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
      },
      "CachedMethods": {
        "Items": ["GET", "HEAD", "OPTIONS"]
      },
      "Compress": true,
      "DefaultTTL": 300,
      "MinTTL": 0,
      "MaxTTL": 3600,
      "ForwardedValues": {
        "QueryString": true,
        "Headers": {
          "Items": ["Authorization", "Accept"]
        }
      }
    },
    "CacheBehaviors": {
      "Items": [
        {
          "PathPattern": "/api/courses*",
          "TargetOriginId": "api-gateway",
          "ViewerProtocolPolicy": "https-only",
          "Compress": true,
          "DefaultTTL": 600,
          "MinTTL": 0,
          "MaxTTL": 3600
        },
        {
          "PathPattern": "/api/tutor/*",
          "TargetOriginId": "api-gateway",
          "ViewerProtocolPolicy": "https-only",
          "Compress": false,
          "DefaultTTL": 0,
          "MinTTL": 0,
          "MaxTTL": 0
        }
      ]
    }
  }'
```

### **Opción 2: CloudFront + S3 (Frontend)**

```hcl
# Terraform: infrastructure/cloudfront.tf

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"  # US, Canada, Europe (más barato)

  origin {
    domain_name = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id   = "S3-frontend"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.frontend.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    target_origin_id       = "S3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    # Cache estático por 1 año (con versioning en filenames)
    min_ttl     = 0
    default_ttl = 31536000
    max_ttl     = 31536000

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  # Cache behavior para API (proxy a API Gateway)
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    target_origin_id = "api-gateway"

    viewer_protocol_policy = "https-only"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    compress               = true

    min_ttl     = 0
    default_ttl = 300    # 5 minutos para API
    max_ttl     = 3600   # 1 hora máximo

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Accept", "Content-Type"]

      cookies {
        forward = "none"
      }
    }
  }

  # Custom error pages
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"  # SPA routing
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
    # O usar certificado custom:
    # acm_certificate_arn = aws_acm_certificate.cloudacademy.arn
    # ssl_support_method  = "sni-only"
  }
}
```

---

## 🔧 Cache Behaviors por Endpoint

```hcl
# /api/courses - Cacheable (10 min)
{
  "PathPattern": "/api/courses*",
  "DefaultTTL": 600,
  "Compress": true
}

# /api/tutor/* - NO cacheable (dinámico)
{
  "PathPattern": "/api/tutor/*",
  "DefaultTTL": 0,
  "Compress": true  # Comprimir pero no cachear
}

# Imágenes - Cacheable (1 año)
{
  "PathPattern": "*.jpg|*.png|*.webp",
  "DefaultTTL": 31536000,
  "Compress": true
}

# Frontend assets - Cacheable (1 año con versioning)
{
  "PathPattern": "*.js|*.css",
  "DefaultTTL": 31536000,
  "Compress": true
}
```

---

## 🧪 Testing

```bash
# Ver headers de cache
curl -I https://d123abc.cloudfront.net/api/courses

# Output:
# X-Cache: Hit from cloudfront (cache hit)
# X-Cache: Miss from cloudfront (cache miss)
# Age: 120 (segundos desde cache)

# Invalidar cache manualmente
aws cloudfront create-invalidation \
  --distribution-id E123ABC \
  --paths "/api/courses*" "/api/categories*"
```

---

## 💰 Costos

```
Data Transfer OUT:
- Primeros 10 TB/mes: $0.085/GB
- Siguientes 40 TB/mes: $0.080/GB

Requests:
- HTTP: $0.0075 per 10k requests
- HTTPS: $0.0100 per 10k requests

Invalidations:
- Primeras 1000/mes: Gratis
- Adicionales: $0.005 per path

Ejemplo (100k requests, 1GB transfer):
- Requests: 100k × $0.01/10k = $1
- Transfer: 1GB × $0.085 = $0.085
- TOTAL: ~$1.10/mes
```

---

## ✅ Ventajas Adicionales

1. **HTTPS Gratis** - Certificado SSL incluido
2. **DDoS Protection** - AWS Shield Standard incluido
3. **Compresión automática** - Gzip/Brotli sin configurar Lambda
4. **Edge locations** - 400+ ubicaciones globales
5. **Cache invalidation** - Purge manual cuando publicas contenido
6. **Custom domains** - api.cloudacademy.com con Route53
7. **WAF integration** - Combinar con AWS WAF (Mejora #14)

---

## 🎯 Recomendación

**SÍ implementar CloudFront si:**
- ✅ Tenés usuarios globales (fuera de us-east-1)
- ✅ Querés HTTPS gratis
- ✅ Necesitás DDoS protection
- ✅ Frontend estático en S3

**NO implementar CloudFront si:**
- ❌ Solo usuarios locales (misma región que API)
- ❌ Tráfico muy bajo (<1M req/mes)
- ❌ POC inicial (optimización prematura)

Para tu proyecto: **Considerar después de tener tráfico real**. Es más crítico si tenés frontend web que API backend.

---

**Última actualización:** 2025-01-14
**Status:** Documentado - Implementar cuando tengas tráfico global
