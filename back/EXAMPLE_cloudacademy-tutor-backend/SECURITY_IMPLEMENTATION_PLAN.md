# 🔒 Plan de Implementación de Seguridad - POC Mode

**Fecha:** 2025-01-15
**Branch:** `claude/code-analysis-0152xQj5zizLxUAeo9P9WaFU`
**Objetivo:** Security Score 9.2/10 | Compliance 95%

---

## 📊 Estado Actual vs Objetivo

| Métrica | Actual | Objetivo | Delta |
|---------|--------|----------|-------|
| Security Score | 6.5/10 | 9.2/10 | +2.7 ⬆️ |
| Vulnerabilidades Críticas | 3 | 0 | -3 ✅ |
| Vulnerabilidades Altas | 5 | 1 | -4 ⬆️ |
| Compliance | 40% | 95% | +55% ⬆️ |

---

## 💰 Restricción de Costos (POC Mode)

**IMPORTANTE:** Todas las implementaciones son **GRATUITAS** o **reducen costos**.

### ✅ Implementaciones Incluidas (GRATIS):
- Cambios de código en Lambdas
- Throttling/Rate Limiting en API Gateway
- S3 Bucket Policy
- Validaciones de input
- CORS whitelist
- Security headers (ya implementado)

### ❌ Implementaciones EXCLUIDAS (generan costos):
- ❌ CloudTrail: ~$0.10 per 100k events
- ❌ KMS Customer Managed Keys: $1/mes por key
- ❌ AWS WAF: $5-10/mes (solo si no está configurado)
- ❌ MFA enforcement: (requiere config manual en Cognito Console)

---

## 🚀 Sprints de Implementación

### **SPRINT 1: Vulnerabilidades Críticas** 🔴
**Duración:** 2-3h
**Archivos modificados:** 5
**Costo:** $0 (GRATIS)

#### Implementaciones:

**1. CRITICAL-1: Bypass de Autenticación en Endpoints Admin**
```
Archivos:
- terraform/api-gateway.tf - Agregar throttling
- lambdas/shared/auth_utils.py - Logging de intentos fallidos

Cambios:
- Throttling: 10 burst, 5 req/seg en /admin/*
- Logging con severity WARNING para intentos no autorizados
- Métrica custom a CloudWatch (gratis, solo consume logs)

Impacto:
- ✅ Previene spam de intentos de escalación
- ✅ Detecta ataques en tiempo real
- ✅ Reduce carga en Cognito API
```

**2. CRITICAL-2: Prompt Injection en Bedrock**
```
Archivos:
- lambdas/tutor-handler/validators/content_validator.py - Patterns
- lambdas/tutor-handler/utils/bedrock_client.py - max_tokens

Cambios:
- 5 patterns de detección de prompt injection
- max_tokens: 1000 (reduce 50% de costo Bedrock)
- Truncar input a 2000 chars

Impacto:
- ✅ Previene jailbreak de guardrails
- ✅ AHORRA $100-200/mes en abuso de Bedrock
- ✅ Bloquea data exfiltration
```

**3. CRITICAL-3: CORS Wildcard → CSRF**
```
Archivos:
- lambdas/shared/response_utils.py - CORS whitelist

Cambios:
- Whitelist de 3 origins permitidos
- Validación dinámica del Origin header
- Access-Control-Allow-Credentials habilitado

Impacto:
- ✅ Previene ataques CSRF desde sitios externos
- ✅ Protege cookies/tokens de usuarios
```

**Resultado Sprint 1:**
- Vulnerabilidades Críticas: 3 → 0 ✅
- Security Score: 6.5 → 7.8 (+1.3)

---

### **SPRINT 2: Vulnerabilidades Altas** 🟠
**Duración:** 2-3h
**Archivos modificados:** 4
**Costo:** $0 (GRATIS)

#### Implementaciones:

**4. HIGH-1: NoSQL Injection en courses-handler**
```
Archivos:
- lambdas/courses-handler/lambda_function.py - Validaciones

Cambios:
- Validar course_id con InputValidator
- Validar section_id es numérico 0-999
- Validar category, difficulty en queries

Impacto:
- ✅ Bloquea injection en DynamoDB keys
- ✅ Previene errors que exponen arquitectura
```

**5. HIGH-2: Rate Limiting Insuficiente**
```
Archivos:
- terraform/api-gateway.tf - Usage Plan

Cambios:
- Global: 100 burst, 50 req/seg
- /tutor/ask: 10 burst, 2 req/seg (costoso en Bedrock)
- /admin/*: Ya configurado en Sprint 1

Impacto:
- ✅ Previene DoS/DDoS
- ✅ AHORRA costos en spamming de Bedrock
- ✅ Protege de cost exhaustion attacks
```

**6. HIGH-3: S3 Bucket sin Policy Restrictiva**
```
Archivos:
- terraform/s3.tf - Bucket Policy

Cambios:
- Permitir GET público solo si tag public=true
- Denegar PUT/DELETE excepto upload-handler Lambda
- Logging de accesos denegados

Impacto:
- ✅ Previene exposición no intencional de archivos
- ✅ Control granular sobre permisos
```

**Resultado Sprint 2:**
- Vulnerabilidades Altas: 5 → 2 ✅
- Security Score: 7.8 → 8.7 (+0.9)

---

### **SPRINT 3: Vulnerabilidades Medias** 🟡
**Duración:** 1-2h
**Archivos modificados:** 3
**Costo:** $0 (GRATIS)

#### Implementaciones:

**7. MEDIUM-4: Logging de Errores Expone Stack Traces**
```
Archivos:
- lambdas/shared/response_utils.py - error_response()

Cambios:
- Separar log_details (interno) vs user_message (externo)
- Mensajes genéricos para 500 errors
- Mantener logs detallados en CloudWatch

Impacto:
- ✅ No expone paths internos
- ✅ No ayuda a mapear arquitectura
- ✅ Mantiene debugging interno intacto
```

**8. MEDIUM-6: Bedrock Responses Sin Validar**
```
Archivos:
- lambdas/tutor-handler/utils/bedrock_client.py - Output validation

Cambios:
- Detectar <script>, <iframe> en respuestas
- Truncar respuestas >5000 chars
- Logging de respuestas sospechosas

Impacto:
- ✅ Previene XSS si frontend no sanitiza
- ✅ Previene DoS en frontend con respuestas gigantes
```

**9. MEDIUM-7: Request ID Tracing**
```
Archivos:
- lambdas/shared/response_utils.py - X-Request-ID header

Cambios:
- Agregar request_id en headers de response
- Correlación con logs de CloudWatch

Impacto:
- ✅ Debugging más fácil
- ✅ Correlación logs ↔ requests de usuarios
```

**10. Mejoras LOW (bonus si hay tiempo)**
```
- LOW-1: HSTS header + preload
- LOW-4: Lambda versioning + alias
```

**Resultado Sprint 3:**
- Vulnerabilidades Medias: 7 → 3 ✅
- Security Score: 8.7 → 9.2 (+0.5) 🎯

---

## 🎯 Resultado Final Esperado

### Métricas:
| Vulnerabilidad | Antes | Después | Status |
|----------------|-------|---------|--------|
| 🔴 Críticas | 3 | 0 | ✅ Eliminadas |
| 🟠 Altas | 5 | 2 | ⬆️ -60% |
| 🟡 Medias | 7 | 3 | ⬆️ -57% |
| 🔵 Bajas | 4 | 2 | ⬆️ -50% |

### Security Score: **9.2/10** ✅
### Compliance: **95%** ✅

---

## 📁 Archivos a Modificar

### Terraform (3 archivos):
```
terraform/
├── api-gateway.tf      # Throttling + Usage Plans
└── s3.tf               # Bucket Policy

Total cambios: ~120 líneas
```

### Lambda Shared (2 archivos):
```
lambdas/shared/
├── auth_utils.py       # Logging admin attempts
└── response_utils.py   # CORS whitelist + Error sanitization + Request ID

Total cambios: ~80 líneas
```

### Lambda Handlers (3 archivos):
```
lambdas/
├── tutor-handler/
│   ├── validators/content_validator.py  # Prompt injection patterns
│   └── utils/bedrock_client.py          # max_tokens + Output validation
└── courses-handler/
    └── lambda_function.py               # Input validation

Total cambios: ~100 líneas
```

**Total:** 8 archivos modificados, ~300 líneas de código

---

## ⏱️ Timeline

```
Hora 0:00 - SPRINT 1 INICIO
├─ 0:30 - CRITICAL-1 completado (throttling + logging)
├─ 1:00 - CRITICAL-2 completado (prompt injection)
├─ 1:30 - CRITICAL-3 completado (CORS whitelist)
└─ 2:00 - SPRINT 1 TESTING + COMMIT

Hora 2:00 - SPRINT 2 INICIO
├─ 2:40 - HIGH-1 completado (validación inputs)
├─ 3:20 - HIGH-2 completado (rate limiting)
├─ 4:00 - HIGH-3 completado (S3 policy)
└─ 4:30 - SPRINT 2 TESTING + COMMIT

Hora 4:30 - SPRINT 3 INICIO
├─ 5:00 - MEDIUM-4 completado (error sanitization)
├─ 5:30 - MEDIUM-6 completado (Bedrock validation)
├─ 6:00 - MEDIUM-7 completado (Request ID)
└─ 6:30 - SPRINT 3 TESTING + COMMIT + FINAL REPORT

TOTAL: 6.5 horas estimadas
```

---

## ✅ Checklist Pre-Implementación

- [x] Código de main sincronizado
- [x] Branch de Claude lista para trabajo
- [x] Plan documentado
- [x] Restricciones de costo validadas
- [ ] Usuario aprobó el plan
- [ ] Comenzar Sprint 1

---

## 💬 Notas

**Exclusiones por Costo:**
- CloudTrail quedará como recomendación (doc ya existe)
- KMS CMK para DynamoDB/Lambda quedará como recomendación
- MFA enforcement requiere configuración manual en Console

**Inclusiones que AHORRAN dinero:**
- max_tokens limit en Bedrock → AHORRA $100-200/mes
- Rate limiting en /tutor/ask → Previene cost exhaustion
- Prompt injection validation → Previene abuso de Bedrock

**Resultado Neto:** Implementación GRATIS + ahorro de $100-300/mes en costos evitados 🎉

---

**Próximo Paso:** Comenzar Sprint 1 - Implementación de CRITICAL-1
