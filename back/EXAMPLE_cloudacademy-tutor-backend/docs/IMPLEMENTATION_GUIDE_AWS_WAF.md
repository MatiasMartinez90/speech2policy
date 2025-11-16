# 🛡️ Guía de Implementación: AWS WAF (Web Application Firewall)

**Tiempo estimado:** 1-2 horas (versión Budget) | 2-3 horas (versión completa)
**Dificultad:** 🟡 Media
**Prioridad:** ⭐⭐ Media (Seguridad + Rate Limiting)

---

## 💰 Versión Budget vs Completa

Esta guía ofrece **2 opciones de implementación:**

### **🟢 Versión BUDGET (Recomendada para empezar)**
**Costo:** ~$7/mes
**Reglas:** Solo las 2 esenciales
- ✅ Rate Limiting (protección DDoS)
- ✅ OWASP Core Rule Set (SQL injection, XSS)

### **🔵 Versión COMPLETA**
**Costo:** ~$9/mes
**Reglas:** Las 2 esenciales + 2 extras
- ✅ Rate Limiting
- ✅ OWASP Core Rule Set
- ✅ IP Reputation List (IPs conocidas como maliciosas)
- ✅ Known Bad Inputs (patrones de ataque conocidos)

**💡 Recomendación:** Empezá con la **versión Budget**. Las 2 reglas esenciales cubren 90% de los casos. Agregá las extras solo si detectás ataques sofisticados.

---

## 📋 ¿Qué vamos a implementar?

Vamos a configurar **AWS WAF** en tu API Gateway con las **2 reglas esenciales:**
1. **Rate limiting** - Prevenir abuso (máx 100 req/5min por IP)
2. **OWASP Top 10** - Protección contra SQL injection, XSS, etc.

**Opcional (versión completa):**
3. **IP Reputation List** - Bloquear IPs maliciosas conocidas
4. **Known Bad Inputs** - Patrones de ataque conocidos

---

## 🎯 Beneficios

### **ANTES (sin WAF):**
- ❌ Vulnerable a ataques DDoS (alguien puede hacer 10,000 requests/segundo)
- ❌ Sin protección contra SQL injection, XSS
- ❌ Costos de Lambda pueden dispararse por tráfico malicioso
- ❌ No hay forma de bloquear IPs problemáticas
- ❌ Bedrock API puede sobrecargarse (ataques cuestan $$$)

### **DESPUÉS (con WAF):**
- ✅ Rate limiting automático (100 req/5min por IP)
- ✅ Protección OWASP Top 10 (AWS Managed Rules)
- ✅ IP blocking automático tras detectar patrones maliciosos
- ✅ Reducción 90% en costos de tráfico malicioso
- ✅ Dashboard de seguridad en CloudWatch

**ROI:** Previene potencial factura de $1,000+ por ataque DDoS

---

## 📊 Arquitectura de Protección

```
Internet → CloudFront (opcional) → WAF → API Gateway → Lambdas
                                    │
                                    ├── Rate Limit Rules (100 req/5min)
                                    ├── OWASP Managed Rules (SQL injection, XSS)
                                    ├── IP Reputation List (AWS-managed)
                                    └── Custom Rules (bloquear /admin sin auth)
```

---

## 🔒 Reglas de WAF

### **🟢 ESENCIALES (Versión Budget - $7/mes)**

#### **1. Rate Limiting por IP**
**Qué protege:** Ataques DDoS, scrapers, bots maliciosos
**Threshold:** Máximo 100 requests en 5 minutos por IP
**Acción:** BLOCK (devuelve 403 Forbidden)
**Costo:** $1/mes

#### **2. AWS Managed Rules - OWASP Core Rule Set**
**Qué protege:**
- SQL Injection (`' OR 1=1--`)
- Cross-Site Scripting (`<script>alert('XSS')</script>`)
- Path Traversal (`../../../etc/passwd`)
- Remote Code Execution
**Acción:** BLOCK
**Costo:** $1/mes

---

### **🔵 OPCIONALES (Versión Completa - +$2/mes)**

#### **3. AWS IP Reputation List**
**Qué protege:** IPs conocidas como maliciosas (botnet, scanners)
**Actualización:** Automática por AWS
**Acción:** BLOCK
**Costo:** $1/mes

#### **4. Known Bad Inputs**
**Qué protege:** Patrones de ataque conocidos (OGNL injection, etc.)
**Actualización:** Automática por AWS
**Acción:** BLOCK
**Costo:** $1/mes

---

## ✅ Pre-requisitos

- [x] API Gateway desplegado
- [x] Endpoints públicos funcionando
- [ ] Terraform instalado (o usar AWS Console)
- [ ] Presupuesto: ~$7/mes (Budget) | ~$9/mes (Completa)

---

## 🚀 Paso a Paso - Implementación

### **Paso 1: Crear Web ACL (10 min)**

**Opción A: AWS Console (Más fácil para principiantes)**

1. Ir a AWS Console → WAF & Shield → Web ACLs → Create web ACL
2. Configurar:
   - **Name:** `cloudacademy-api-waf`
   - **Resource type:** Regional resources (API Gateway)
   - **Region:** us-east-1 (tu región)
3. **Associate AWS resources:**
   - Type: API Gateway
   - Name: `cloudacademy-api` (tu API Gateway)
4. Next

---

**Opción B: Terraform (Versión Budget - 2 reglas)**

Crear archivo `terraform/waf.tf`:

```hcl
# ============================================================================
# WAF Web ACL - VERSIÓN BUDGET ($7/mes)
# Solo 2 reglas esenciales: Rate Limiting + OWASP
# ============================================================================

resource "aws_wafv2_web_acl" "api_waf" {
  name  = "cloudacademy-api-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # =========================================
  # REGLA 1: Rate Limiting (ESENCIAL)
  # =========================================
  rule {
    name     = "RateLimitRule"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 100  # Máx 100 req/5min por IP
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
    }
  }

  # =========================================
  # REGLA 2: OWASP Core Rule Set (ESENCIAL)
  # =========================================
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
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "AWSManagedRulesCommonRuleSet"
    }
  }

  # =========================================
  # REGLAS OPCIONALES (+$2/mes)
  # Descomenta si querés protección extra
  # =========================================

  # # Regla 3: IP Reputation List (+$1/mes)
  # rule {
  #   name     = "AWSManagedRulesAmazonIpReputationList"
  #   priority = 3
  #
  #   override_action {
  #     none {}
  #   }
  #
  #   statement {
  #     managed_rule_group_statement {
  #       vendor_name = "AWS"
  #       name        = "AWSManagedRulesAmazonIpReputationList"
  #     }
  #   }
  #
  #   visibility_config {
  #     sampled_requests_enabled   = true
  #     cloudwatch_metrics_enabled = true
  #     metric_name                = "IpReputationList"
  #   }
  # }

  # # Regla 4: Known Bad Inputs (+$1/mes)
  # rule {
  #   name     = "AWSManagedRulesKnownBadInputsRuleSet"
  #   priority = 4
  #
  #   override_action {
  #     none {}
  #   }
  #
  #   statement {
  #     managed_rule_group_statement {
  #       vendor_name = "AWS"
  #       name        = "AWSManagedRulesKnownBadInputsRuleSet"
  #     }
  #   }
  #
  #   visibility_config {
  #     sampled_requests_enabled   = true
  #     cloudwatch_metrics_enabled = true
  #     metric_name                = "KnownBadInputs"
  #   }
  # }

  visibility_config {
    sampled_requests_enabled   = true
    cloudwatch_metrics_enabled = true
    metric_name                = "cloudacademy-api-waf"
  }

  tags = {
    Name = "cloudacademy-api-waf"
  }
}

# Asociar Web ACL con API Gateway
resource "aws_wafv2_web_acl_association" "api_gateway" {
  resource_arn = aws_apigatewayv2_stage.prod.arn
  web_acl_arn  = aws_wafv2_web_acl.api_waf.arn
}
```

Ejecutar:
```bash
cd terraform
terraform apply
```

---

### **Paso 2: Configurar Rate Limiting (5 min)**

Si usaste AWS Console:

1. En el Web ACL → Add rules → Add my own rules and rule groups
2. **Rule type:** Rate-based rule
3. **Name:** `RateLimitRule`
4. **Rate limit:** `100`
5. **Criteria:** IP address
6. **Action:** Block
7. Add rule

---

### **Paso 3: Agregar OWASP Managed Rules (5 min)**

Si usaste AWS Console:

1. Add rules → Add managed rule groups
2. **AWS managed rule groups:**
   - ✅ Core rule set (OWASP Top 10)
   - ✅ Known bad inputs
   - ✅ Amazon IP reputation list
3. Capacity used: ~1,500 WCUs (dentro del límite de 1,500 gratuitos)
4. Add rules

---

### **Paso 4: Configurar Logging (10 min)**

Para auditar requests bloqueados.

**Terraform:**

```hcl
# CloudWatch Log Group para WAF
resource "aws_cloudwatch_log_group" "waf_logs" {
  name              = "aws-waf-logs-cloudacademy-api"
  retention_in_days = 7

  tags = {
    Name = "waf-logs"
  }
}

# Configurar logging en Web ACL
resource "aws_wafv2_web_acl_logging_configuration" "api_waf_logging" {
  resource_arn            = aws_wafv2_web_acl.api_waf.arn
  log_destination_configs = [aws_cloudwatch_log_group.waf_logs.arn]

  redacted_fields {
    single_header {
      name = "authorization"  # No loguear tokens de auth
    }
  }
}
```

**AWS Console:**

1. Web ACL → Logging and metrics → Enable logging
2. **Logging destination:** CloudWatch Logs
3. **Log group:** Create new → `aws-waf-logs-cloudacademy-api`
4. **Redacted fields:** Authorization header
5. Save

---

### **Paso 5: Crear Regla Custom para Proteger /admin (15 min)**

**Terraform:**

```hcl
# Regla custom: Rate limit específico para /admin
resource "aws_wafv2_web_acl" "api_waf" {
  # ... configuración existente ...

  rule {
    name     = "ProtectAdminEndpoints"
    priority = 0  # Mayor prioridad

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 10  # Solo 10 req/5min para /admin
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            search_string         = "/admin"
            positional_constraint = "STARTS_WITH"

            field_to_match {
              uri_path {}
            }

            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
          }
        }
      }
    }

    visibility_config {
      sampled_requests_enabled   = true
      cloudwatch_metrics_enabled = true
      metric_name                = "ProtectAdminEndpoints"
    }
  }
}
```

**AWS Console:**

1. Add rules → Add my own rules
2. **Rule type:** Rate-based rule
3. **Name:** `ProtectAdminEndpoints`
4. **Rate limit:** `10`
5. **Scope-down statement:**
   - Field to match: URI path
   - Match type: Starts with string
   - String to match: `/admin`
6. Action: Block
7. Add rule

---

## 🧪 Testing - Verificar que Funciona

### **Test 1: Rate Limiting**

Forzar el rate limit con un loop:

```bash
# Test: 101 requests en 1 minuto (debe bloquear)
for i in {1..101}; do
  curl -s https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api/courses > /dev/null
  echo "Request $i"
done
```

**Resultado esperado:**
- Primeros 100 requests: 200 OK
- Request 101+: **403 Forbidden** con mensaje de WAF

**Verificar en WAF Dashboard:**
1. WAF & Shield → Web ACLs → cloudacademy-api-waf
2. Overview → Deberías ver "Blocked requests" > 0

---

### **Test 2: SQL Injection (OWASP Rule)**

Intentar SQL injection:

```bash
# Request malicioso
curl "https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api/courses?id=' OR 1=1--"
```

**Resultado esperado:**
- **403 Forbidden** - Bloqueado por regla OWASP

**Verificar en logs:**
```bash
# CloudWatch Logs Insights
fields @timestamp, httpRequest.uri, action, terminatingRuleId
| filter action = "BLOCK"
| sort @timestamp desc
| limit 20
```

Deberías ver:
```json
{
  "action": "BLOCK",
  "terminatingRuleId": "AWSManagedRulesCommonRuleSet",
  "httpRequest": {
    "uri": "/api/courses?id=' OR 1=1--"
  }
}
```

---

### **Test 3: Endpoints Legítimos (No deberían bloquearse)**

Requests normales deben funcionar:

```bash
# Request válido
curl https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api/courses
# 200 OK ✅

# Request con auth válida
curl https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api/tutor/progress \
  -H "Authorization: Bearer VALID_TOKEN"
# 200 OK ✅
```

---

### **Test 4: Protección de /admin**

Intentar abusar de /admin:

```bash
# 11 requests en 1 minuto
for i in {1..11}; do
  curl -s https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api/admin/courses
  echo "Request $i to /admin"
done
```

**Resultado esperado:**
- Primeros 10 requests: 401 Unauthorized (no hay token, pero pasan WAF)
- Request 11+: **403 Forbidden** (bloqueado por WAF)

---

## 📊 Dashboard de Seguridad (Bonus - 10 min)

Crear dashboard visual en CloudWatch:

1. CloudWatch → Dashboards → Create dashboard
2. Name: `CloudAcademy-WAF-Security`
3. Add widgets:

**Widget 1: Allowed vs Blocked Requests**
- Type: Line graph
- Metric: `AWS/WAFV2` → `AllowedRequests` y `BlockedRequests`
- Period: 5 minutes

**Widget 2: Rate Limit Triggers**
- Type: Number
- Metric: `AWS/WAFV2` → `RateLimitRule` (Count)

**Widget 3: Top Blocked IPs**
- Type: Log Insights query
- Query:
```sql
fields httpRequest.clientIp, action
| filter action = "BLOCK"
| stats count() as blocked_count by httpRequest.clientIp
| sort blocked_count desc
| limit 10
```

**Widget 4: OWASP Rule Triggers**
- Type: Bar chart
- Metric: `AWS/WAFV2` → `AWSManagedRulesCommonRuleSet`

---

## 💰 Costos

### **🟢 Versión BUDGET (Recomendada)**

| Concepto | Precio |
|----------|--------|
| Web ACL (fijo) | $5/mes |
| Rate Limiting rule | $1/mes |
| OWASP Core Rule Set | $1/mes |
| Requests (100k/mes) | $0.06 |
| **TOTAL** | **~$7/mes** |

**Ahorro vs versión completa:** $2/mes

---

### **🔵 Versión COMPLETA**

| Concepto | Precio |
|----------|--------|
| Web ACL (fijo) | $5/mes |
| 4 Rules | $4/mes |
| Requests (100k/mes) | $0.06 |
| **TOTAL** | **~$9/mes** |

---

### **💡 ROI**
- Prevenir 1 ataque DDoS puede ahorrarte **$100-1,000** en costos de Lambda/Bedrock
- Proteger contra scraping malicioso: **$50-500/mes** en requests bloqueados
- ROI positivo desde el primer mes

### **Cuándo actualizar a versión completa:**
- Si detectás IPs maliciosas recurrentes → Agregar IP Reputation List
- Si ves patrones de ataque sofisticados en logs → Agregar Known Bad Inputs
- Costo extra: solo $2/mes

---

## ✅ Checklist de Implementación

### **🟢 Versión Budget (Esencial)**
- [ ] Web ACL creado y asociado a API Gateway
- [ ] Regla de Rate Limiting configurada (100 req/5min)
- [ ] OWASP Managed Rules agregadas
- [ ] Logging configurado en CloudWatch
- [ ] Test de rate limiting exitoso (request 101 bloqueado)
- [ ] Test de SQL injection bloqueado
- [ ] Dashboard de seguridad creado

### **🔵 Versión Completa (Opcional +$2/mes)**
- [ ] IP Reputation List habilitada
- [ ] Known Bad Inputs agregados

---

## 🎯 Criterios de Éxito

✅ **Implementación exitosa si:**
1. Web ACL aparece en API Gateway → Stages → prod → Web ACL
2. Test de rate limiting bloquea request 101
3. SQL injection es bloqueado (403)
4. Requests legítimos funcionan normalmente
5. CloudWatch Logs muestra requests bloqueados

✅ **Seguridad mejorada si:**
- No más de 100 requests por IP en 5 minutos
- SQL injection y XSS son bloqueados automáticamente
- Dashboard muestra métricas de seguridad en tiempo real
- Logs permiten auditar ataques

---

## 🚨 Troubleshooting

### **Requests legítimos bloqueados:**
- **Causa:** Reglas OWASP demasiado estrictas
- **Fix:** Agregar excepciones en la regla:
  ```hcl
  excluded_rule {
    name = "SizeRestrictions_BODY"  # Excluir si tienes POST grandes
  }
  ```

### **Rate limit muy bajo:**
- **Síntoma:** Usuarios reales bloqueados
- **Fix:** Aumentar límite de 100 a 200:
  ```hcl
  limit = 200
  ```

### **WAF no bloquea nada:**
- **Verificar:** Web ACL está asociado al API Gateway
- **Verificar:** Default action es "Allow" (correcto)
- **Verificar:** Reglas tienen action "Block" (no Count)

### **Logs no aparecen:**
- **Verificar:** Log group name empieza con `aws-waf-logs-`
- **Verificar:** WAF tiene permisos para escribir a CloudWatch Logs
- **Esperar:** Latencia de 1-2 minutos

---

## 📈 Mejoras Futuras (Bonus)

### **1. Geo-blocking (bloquear países específicos)**

```hcl
rule {
  name     = "GeoBlockRule"
  priority = 5

  action {
    block {}
  }

  statement {
    geo_match_statement {
      country_codes = ["CN", "RU"]  # Bloquear China y Rusia
    }
  }

  visibility_config {
    sampled_requests_enabled   = true
    cloudwatch_metrics_enabled = true
    metric_name                = "GeoBlockRule"
  }
}
```

**Cuándo usar:** Si detectas tráfico malicioso desde países específicos

---

### **2. IP Whitelist para admins**

```hcl
# Permitir solo ciertas IPs para /admin
rule {
  name     = "AdminIPWhitelist"
  priority = 0  # Máxima prioridad

  action {
    allow {}
  }

  statement {
    and_statement {
      statement {
        byte_match_statement {
          search_string         = "/admin"
          positional_constraint = "STARTS_WITH"
          field_to_match { uri_path {} }
          text_transformation { priority = 0; type = "LOWERCASE" }
        }
      }

      statement {
        ip_set_reference_statement {
          arn = aws_wafv2_ip_set.admin_whitelist.arn
        }
      }
    }
  }

  visibility_config {
    sampled_requests_enabled   = true
    cloudwatch_metrics_enabled = true
    metric_name                = "AdminIPWhitelist"
  }
}

# IP Set de admins
resource "aws_wafv2_ip_set" "admin_whitelist" {
  name               = "admin-ip-whitelist"
  scope              = "REGIONAL"
  ip_address_version = "IPV4"

  addresses = [
    "203.0.113.0/32",  # IP de tu oficina
    "198.51.100.0/32"  # IP de tu casa
  ]
}
```

---

### **3. CloudWatch Alarm para ataques**

```hcl
resource "aws_cloudwatch_metric_alarm" "waf_attack_detected" {
  alarm_name          = "WAF-Attack-Detected"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = "300"  # 5 minutos
  statistic           = "Sum"
  threshold           = "100"  # Más de 100 requests bloqueados
  alarm_description   = "WAF bloqueó más de 100 requests en 5 min"
  alarm_actions       = [aws_sns_topic.alarms.arn]

  dimensions = {
    WebACL = aws_wafv2_web_acl.api_waf.name
    Region = "us-east-1"
    Rule   = "ALL"
  }
}
```

**Beneficio:** Notificación inmediata cuando hay un ataque en curso

---

### **4. Integrar con AWS Shield Advanced (Opcional - $3,000/mes)**

Si tu proyecto crece y necesitas protección DDoS de nivel enterprise:

- Shield Advanced incluye:
  - Protección DDoS L3/L4/L7
  - Equipo de respuesta a incidentes (DRT)
  - Reembolso de costos de scaling durante ataque
  - Protección de CloudFront, Route 53, ELB

**Cuándo considerarlo:** Facturación > $10k/mes y aplicación crítica

---

## 📚 Queries Útiles de CloudWatch Logs Insights

### **Top IPs bloqueadas:**
```sql
fields httpRequest.clientIp, action, terminatingRuleId
| filter action = "BLOCK"
| stats count() as blocked_count by httpRequest.clientIp, terminatingRuleId
| sort blocked_count desc
| limit 20
```

### **Requests bloqueados por regla OWASP:**
```sql
fields @timestamp, httpRequest.uri, httpRequest.clientIp
| filter terminatingRuleId like /AWSManagedRulesCommonRuleSet/
| sort @timestamp desc
| limit 50
```

### **Rate limit triggers:**
```sql
fields @timestamp, httpRequest.clientIp, httpRequest.uri
| filter terminatingRuleId = "RateLimitRule"
| stats count() as triggers by httpRequest.clientIp
| sort triggers desc
```

### **SQL Injection attempts:**
```sql
fields @timestamp, httpRequest.clientIp, httpRequest.uri
| filter httpRequest.uri like /OR 1=1/ or httpRequest.uri like /UNION SELECT/
| sort @timestamp desc
```

---

## 🔗 Referencias

- [AWS WAF Documentation](https://docs.aws.amazon.com/waf/)
- [AWS Managed Rules](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Rate-Based Rules](https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based.html)
- [WAF Pricing Calculator](https://aws.amazon.com/waf/pricing/)

---

## 🎓 Próximos Pasos

Después de implementar WAF básico:
1. ✅ Monitorear dashboard de seguridad semanalmente
2. ✅ Ajustar rate limits según uso real
3. ✅ Agregar IP whitelist para admins si es necesario
4. ✅ Configurar alarma de CloudWatch para ataques
5. ✅ Revisar logs de WAF mensualmente para patrones

---

**Última actualización:** 2025-11-14
**Autor:** CloudAcademy DevOps Team
