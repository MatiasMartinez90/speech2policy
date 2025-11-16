# 🛡️ AWS WAF - Web Application Firewall

**Proyecto:** CloudAcademy Tutor Backend
**Fecha:** 2025-01-14
**Status:** 📋 Documentado (Ready para implementar)

---

## 📋 ¿Qué es AWS WAF?

AWS WAF (Web Application Firewall) protege tu API Gateway contra ataques comunes:
- ✅ SQL Injection
- ✅ Cross-Site Scripting (XSS)
- ✅ Rate Limiting (protección DDoS)
- ✅ Bot detection
- ✅ Geo-blocking
- ✅ IP blacklisting/whitelisting

**Costo:** $5-10/mes para POC (Free Tier disponible primeros 12 meses)

---

## 🎯 Protecciones Recomendadas para POC

### **1. Rate Limiting** ⚠️ CRÍTICO

**Problema:** Usuarios/bots haciendo miles de requests por segundo

**Solución:**
```
- 100 requests/5min por IP (usuarios normales)
- 2000 requests/5min total (protección global)
- 10 requests/min para endpoints críticos (admin, upload)
```

**Ejemplo bloqueado:**
```bash
# Atacante intentando enumerar cursos
for i in {1..1000}; do
  curl https://api.cloudacademy.com/courses/$i
done
# ❌ Bloqueado después de request 100
```

---

### **2. AWS Managed Rules** ⚠️ CRÍTICO

**Problema:** Ataques conocidos (SQL injection, XSS, etc.)

**Solución:** Usar reglas pre-configuradas por AWS

**Core Rule Set:**
- SQL Injection detection
- Cross-Site Scripting (XSS)
- Local File Inclusion (LFI)
- Remote Code Execution (RCE)
- Path Traversal

**Ejemplo bloqueado:**
```http
POST /api/tutor/ask
{
  "question": "'; DROP TABLE users; --"
}
# ❌ Bloqueado por SQL Injection rule
```

---

### **3. IP Rate-Based Rule**

**Problema:** IP específica abusando del servicio

**Solución:**
```
Si IP hace >200 requests en 5min → Bloquear por 10min
```

**Uso:** Protección contra scrapers, credential stuffing

---

### **4. Bot Control** (Opcional)

**Problema:** Bots automatizados consumiendo recursos

**Solución:** AWS Managed Bot Control (detecta browsers reales vs bots)

**Costo:** $10/mes adicional (skip para POC)

---

## 🏗️ Arquitectura WAF

```
┌─────────────┐
│   Usuario   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│   CloudFront    │ (Opcional - para caching)
└──────┬──────────┘
       │
       ▼
┌─────────────────────────────┐
│     AWS WAF Web ACL         │
│ ┌─────────────────────────┐ │
│ │ Rate Limiting Rules     │ │ ← 100 req/5min por IP
│ ├─────────────────────────┤ │
│ │ Managed Rules (Core)    │ │ ← SQL Injection, XSS
│ ├─────────────────────────┤ │
│ │ IP Blacklist (Custom)   │ │ ← IPs maliciosos
│ ├─────────────────────────┤ │
│ │ Geo Blocking (Optional) │ │ ← Países específicos
│ └─────────────────────────┘ │
└──────┬──────────────────────┘
       │ ✅ Allowed
       ▼
┌─────────────────┐
│   API Gateway   │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Lambda Handler │
└─────────────────┘
```

---

## 📝 Implementación Paso a Paso

### **Paso 1: Crear Web ACL**

**AWS Console:**
1. Ir a **WAF & Shield** → **Web ACLs** → **Create web ACL**
2. Name: `cloudacademy-api-waf`
3. Resource type: **Regional resources** (API Gateway)
4. Region: `us-east-1`
5. Associated AWS resources → Add → Seleccionar API Gateway
6. Next

**AWS CLI:**
```bash
# Crear Web ACL
aws wafv2 create-web-acl \
  --name cloudacademy-api-waf \
  --scope REGIONAL \
  --region us-east-1 \
  --default-action Allow={} \
  --description "WAF for CloudAcademy API Gateway" \
  --rules file://waf-rules.json
```

---

### **Paso 2: Agregar Rate Limiting**

**Console:**
1. Add rules → Add my own rules and rule groups
2. Rule type: **Rate-based rule**
3. Name: `RateLimitPerIP`
4. Rate limit: `100`
5. Evaluation window: `5 minutes`
6. Action: **Block**
7. Add rule

**Terraform:**
```hcl
# waf.tf

resource "aws_wafv2_web_acl" "api_waf" {
  name  = "cloudacademy-api-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Rule 1: Rate limiting por IP
  rule {
    name     = "RateLimitPerIP"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 100  # requests
        aggregate_key_type = "IP"

        # Ventana de evaluación: 5 minutos
        evaluation_window_sec = 300
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitPerIP"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "cloudacademy-api-waf"
    sampled_requests_enabled   = true
  }
}
```

---

### **Paso 3: Agregar AWS Managed Rules**

**Console:**
1. Add rules → Add managed rule groups
2. AWS managed rule groups → Free rule groups
3. Seleccionar:
   - ✅ **Core rule set** (SQL Injection, XSS, etc.)
   - ✅ **Known bad inputs** (Malicious patterns)
   - ✅ **Linux operating system** (Path traversal, LFI)
4. Add rule

**Terraform:**
```hcl
# Agregar a aws_wafv2_web_acl.api_waf

  # Rule 2: AWS Managed - Core Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"

        # Excluir reglas con falsos positivos (si es necesario)
        # excluded_rule {
        #   name = "SizeRestrictions_BODY"
        # }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # Rule 3: AWS Managed - Known Bad Inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesKnownBadInputsRuleSet"
      sampled_requests_enabled   = true
    }
  }
```

---

### **Paso 4: IP Blacklist (Custom)**

**Terraform:**
```hcl
# IP Set para blacklist
resource "aws_wafv2_ip_set" "blacklist" {
  name               = "cloudacademy-ip-blacklist"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"

  # IPs maliciosos conocidos
  addresses = [
    "203.0.113.0/24",  # Ejemplo
    "198.51.100.42/32"
  ]
}

# Rule que bloquea IPs en blacklist
# Agregar a aws_wafv2_web_acl.api_waf
  rule {
    name     = "BlockBlacklistedIPs"
    priority = 4

    action {
      block {}
    }

    statement {
      ip_set_reference_statement {
        arn = aws_wafv2_ip_set.blacklist.arn
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "BlockBlacklistedIPs"
      sampled_requests_enabled   = true
    }
  }
```

---

### **Paso 5: Geo Blocking (Opcional)**

Bloquear países específicos si no tienes usuarios allí:

**Terraform:**
```hcl
  # Rule: Bloquear países
  rule {
    name     = "GeoBlocking"
    priority = 5

    action {
      block {}
    }

    statement {
      geo_match_statement {
        # Códigos ISO de países a bloquear
        country_codes = ["CN", "RU", "KP"]  # China, Rusia, Corea del Norte
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "GeoBlocking"
      sampled_requests_enabled   = true
    }
  }
```

**Nota:** Solo usar si estás seguro de no tener usuarios en esos países

---

### **Paso 6: Asociar WAF a API Gateway**

**Console:**
1. Ir a **API Gateway** → Tu API → **Stages** → `prod`
2. Web Application Firewall (WAF)
3. Seleccionar: `cloudacademy-api-waf`
4. Save

**Terraform:**
```hcl
# Asociar WAF a API Gateway
resource "aws_wafv2_web_acl_association" "api_gateway" {
  resource_arn = aws_api_gatewayv2_stage.prod.arn
  web_acl_arn  = aws_wafv2_web_acl.api_waf.arn
}
```

---

### **Paso 7: Habilitar Logging**

**Terraform:**
```hcl
# Kinesis Firehose para WAF logs
resource "aws_kinesis_firehose_delivery_stream" "waf_logs" {
  name        = "aws-waf-logs-cloudacademy"
  destination = "extended_s3"

  extended_s3_configuration {
    role_arn   = aws_iam_role.firehose_role.arn
    bucket_arn = aws_s3_bucket.waf_logs.arn
    prefix     = "waf-logs/"

    # Comprimir logs
    compression_format = "GZIP"
  }
}

# Habilitar logging en WAF
resource "aws_wafv2_web_acl_logging_configuration" "waf_logging" {
  resource_arn            = aws_wafv2_web_acl.api_waf.arn
  log_destination_configs = [aws_kinesis_firehose_delivery_stream.waf_logs.arn]
}

# S3 bucket para logs
resource "aws_s3_bucket" "waf_logs" {
  bucket = "cloudacademy-waf-logs"

  lifecycle_rule {
    enabled = true
    expiration {
      days = 30  # Retener 30 días
    }
  }
}
```

---

## 🧪 Testing de WAF

### **Test 1: Rate Limiting**

```bash
# Hacer 150 requests rápidos (excede límite de 100/5min)
for i in {1..150}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    https://api.cloudacademy.com/api/courses
done

# Output:
# 200 (primeras 100 requests)
# 403 (siguientes 50 requests - bloqueadas por WAF)
```

### **Test 2: SQL Injection Bloqueado**

```bash
curl -X POST https://api.cloudacademy.com/api/tutor/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "'; DROP TABLE users; --"}'

# Output:
# HTTP 403 Forbidden
# {
#   "message": "Forbidden"
# }
```

### **Test 3: XSS Bloqueado**

```bash
curl -X POST https://api.cloudacademy.com/api/courses \
  -H "Content-Type: application/json" \
  -d '{"course_name": "<script>alert(1)</script>"}'

# Output:
# HTTP 403 Forbidden
```

---

## 📊 Monitoring de WAF

### **CloudWatch Metrics**

Dashboard para monitorear:
```
- AllowedRequests (métrica count)
- BlockedRequests (métrica count)
- CountedRequests (métrica count si usas "count" mode)

Por regla:
- RateLimitPerIP blocked count
- AWSManagedRulesCommonRuleSet blocked count
```

**CloudWatch Dashboard:**
```hcl
resource "aws_cloudwatch_dashboard" "waf" {
  dashboard_name = "CloudAcademy-WAF"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/WAFV2", "BlockedRequests", { stat = "Sum" }],
            [".", "AllowedRequests", { stat = "Sum" }]
          ]
          period = 300
          stat   = "Sum"
          region = "us-east-1"
          title  = "WAF Requests"
        }
      }
    ]
  })
}
```

---

## 💰 Costos Estimados

| Item | Cantidad | Costo/mes |
|------|----------|-----------|
| Web ACL | 1 | $5.00 |
| Rules | 4 (Rate + 3 Managed) | $4.00 |
| Requests | 1M/mes | $0.60 |
| Logging (opcional) | 1GB logs | $1.00 |
| **Total POC** | | **~$10/mes** |

**Free Tier (primeros 12 meses):**
- 1 Web ACL gratis
- 10 reglas gratis
- 1M requests gratis

**Resultado:** $0-2/mes en primeros 12 meses ✅

---

## 🎯 Reglas Avanzadas (Opcional)

### **Bloquear User-Agents Específicos**

```hcl
  rule {
    name     = "BlockBadUserAgents"
    priority = 6

    action {
      block {}
    }

    statement {
      byte_match_statement {
        search_string         = "BadBot"
        field_to_match {
          single_header {
            name = "user-agent"
          }
        }
        text_transformation {
          priority = 0
          type     = "LOWERCASE"
        }
        positional_constraint = "CONTAINS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "BlockBadUserAgents"
      sampled_requests_enabled   = true
    }
  }
```

---

## 📚 Referencias

- [AWS WAF Docs](https://docs.aws.amazon.com/waf/)
- [Managed Rules](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups.html)
- [Rate Limiting](https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based.html)
- [Terraform WAF](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl)

---

## ✅ Checklist de Implementación

- [ ] Crear Web ACL en WAF
- [ ] Agregar rate limiting rule (100 req/5min)
- [ ] Agregar AWS Managed Rules (Core + Bad Inputs)
- [ ] (Opcional) Crear IP blacklist
- [ ] (Opcional) Configurar geo-blocking
- [ ] Asociar WAF a API Gateway
- [ ] Habilitar logging a S3
- [ ] Crear CloudWatch Dashboard
- [ ] Testear rate limiting funciona
- [ ] Testear SQL injection bloqueado
- [ ] Configurar alarmas para BlockedRequests >100/5min

---

**Última actualización:** 2025-01-14
**Branch:** `claude/code-analysis-0152xQj5zizLxUAeo9P9WaFU`
**Status:** 📋 Ready para implementar
**Costo:** ~$10/mes ($0-2/mes en Free Tier)
