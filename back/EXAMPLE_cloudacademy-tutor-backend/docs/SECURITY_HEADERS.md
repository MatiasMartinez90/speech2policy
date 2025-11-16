# 🛡️ Security Headers - Protección Browser

**Tiempo:** 15 minutos
**Costo:** $0 (gratis)
**Impacto:** Prevenir XSS, clickjacking, MITM attacks

---

## 📋 ¿Qué son Security Headers?

HTTP headers que le dicen al browser cómo comportarse:

✅ **Content-Security-Policy (CSP)** - Prevenir XSS
✅ **X-Frame-Options** - Prevenir clickjacking
✅ **Strict-Transport-Security (HSTS)** - Force HTTPS
✅ **X-Content-Type-Options** - Prevenir MIME sniffing
✅ **Referrer-Policy** - Controlar referrer leaks
✅ **Permissions-Policy** - Controlar browser features

---

## 🎯 Headers Recomendados

| Header | Valor | Protege Contra |
|--------|-------|----------------|
| **Content-Security-Policy** | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'` | XSS, code injection |
| **X-Frame-Options** | `DENY` | Clickjacking |
| **Strict-Transport-Security** | `max-age=31536000; includeSubDomains` | MITM, protocol downgrade |
| **X-Content-Type-Options** | `nosniff` | MIME sniffing |
| **X-XSS-Protection** | `1; mode=block` | Reflected XSS |
| **Referrer-Policy** | `strict-origin-when-cross-origin` | Privacy leaks |
| **Permissions-Policy** | `geolocation=(), microphone=(), camera=()` | Unwanted features |

---

## 🛠️ Implementación

### **Opción 1: Lambda Response (Backend)**

Agregar headers en `shared/response_utils.py`:

```python
# lambdas/shared/response_utils.py

def get_security_headers():
    """
    Security headers para todas las responses

    Previene: XSS, clickjacking, MITM, MIME sniffing
    """
    return {
        # CORS (ya existente)
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',

        # Security headers (NUEVO)
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://cognito-idp.us-east-1.amazonaws.com",
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',

        # Existing headers
        'Content-Type': 'application/json'
    }


def success_response(data, status_code=200, cors_methods=None, enable_compression=True):
    """Response con security headers"""

    headers = get_security_headers()

    # Override CORS methods si se especifica
    if cors_methods:
        headers['Access-Control-Allow-Methods'] = cors_methods

    # ... resto del código (compression, etc)

    return {
        'statusCode': status_code,
        'headers': headers,  # Incluye security headers ✅
        'body': body_json
    }
```

### **Opción 2: CloudFront Response Headers Policy**

Más eficiente (headers agregados en Edge, no Lambda):

```hcl
# infrastructure/cloudfront.tf

resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name = "cloudacademy-security-headers"

  security_headers_config {
    # Content Security Policy
    content_security_policy {
      content_security_policy = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.amazonaws.com"
      override                = true
    }

    # Frame Options (clickjacking protection)
    frame_options {
      frame_option = "DENY"
      override     = true
    }

    # Strict Transport Security (force HTTPS)
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    # Content Type Options (MIME sniffing protection)
    content_type_options {
      override = true
    }

    # XSS Protection
    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }

    # Referrer Policy
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
  }

  # CORS headers
  cors_config {
    access_control_allow_origins {
      items = ["*"]  # O especificar dominios: ["https://cloudacademy.com"]
    }

    access_control_allow_headers {
      items = ["Content-Type", "Authorization", "Accept"]
    }

    access_control_allow_methods {
      items = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    }

    access_control_allow_credentials = false
    origin_override                  = true
  }
}

# Asociar policy a CloudFront distribution
resource "aws_cloudfront_distribution" "cloudacademy" {
  # ... otras configuraciones

  default_cache_behavior {
    # ... otras configuraciones
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
  }
}
```

### **Opción 3: API Gateway Response Headers**

```hcl
# infrastructure/api_gateway.tf

resource "aws_api_gateway_gateway_response" "default_4xx" {
  rest_api_id   = aws_api_gateway_rest_api.cloudacademy_api.id
  response_type = "DEFAULT_4XX"

  response_parameters = {
    "gatewayresponse.header.Content-Security-Policy"    = "'default-src self'"
    "gatewayresponse.header.X-Frame-Options"            = "'DENY'"
    "gatewayresponse.header.Strict-Transport-Security"  = "'max-age=31536000'"
    "gatewayresponse.header.X-Content-Type-Options"     = "'nosniff'"
    "gatewayresponse.header.X-XSS-Protection"           = "'1; mode=block'"
    "gatewayresponse.header.Referrer-Policy"            = "'strict-origin-when-cross-origin'"
  }
}

resource "aws_api_gateway_gateway_response" "default_5xx" {
  rest_api_id   = aws_api_gateway_rest_api.cloudacademy_api.id
  response_type = "DEFAULT_5XX"

  response_parameters = {
    "gatewayresponse.header.Content-Security-Policy"    = "'default-src self'"
    "gatewayresponse.header.X-Frame-Options"            = "'DENY'"
    "gatewayresponse.header.Strict-Transport-Security"  = "'max-age=31536000'"
    "gatewayresponse.header.X-Content-Type-Options"     = "'nosniff'"
  }
}
```

---

## 🧪 Testing

### **Test con curl:**

```bash
curl -I https://api.cloudacademy.com/courses

# Expected headers:
HTTP/2 200
content-security-policy: default-src 'self'; script-src 'self' 'unsafe-inline'
x-frame-options: DENY
strict-transport-security: max-age=31536000; includeSubDomains
x-content-type-options: nosniff
x-xss-protection: 1; mode=block
referrer-policy: strict-origin-when-cross-origin
```

### **Test con securityheaders.com:**

```bash
# Analizar headers automáticamente
https://securityheaders.com/?q=https://api.cloudacademy.com

# Score objetivo: A+ (todas las headers implementadas)
```

### **Test con Mozilla Observatory:**

```bash
https://observatory.mozilla.org/analyze/api.cloudacademy.com

# Score objetivo: A (90+)
```

---

## 🎯 CSP (Content Security Policy) Detallado

### **CSP para Backend API:**

```
Content-Security-Policy: default-src 'none'; frame-ancestors 'none'
```

Significado:
- `default-src 'none'` - No cargar nada (API solo retorna JSON)
- `frame-ancestors 'none'` - No embeddable en iframes

### **CSP para Frontend (React/Vue):**

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https:;
  font-src 'self' data: https://fonts.gstatic.com;
  connect-src 'self' https://*.execute-api.us-east-1.amazonaws.com https://cognito-idp.us-east-1.amazonaws.com;
  frame-ancestors 'self';
```

**NOTA:** `'unsafe-inline'` y `'unsafe-eval'` son necesarios para React en desarrollo. En producción usar nonces o hashes.

---

## 🔍 CORS Refinado

Reemplazar `Access-Control-Allow-Origin: *` por dominios específicos:

```python
# lambdas/shared/response_utils.py

def get_cors_origin(event):
    """
    Retorna CORS origin permitido basado en el origin del request

    Previene: CORS abuse
    """
    allowed_origins = [
        'https://cloudacademy.com',
        'https://www.cloudacademy.com',
        'https://app.cloudacademy.com',
        'http://localhost:3000',  # Development
        'http://localhost:5173',  # Vite dev
    ]

    request_origin = event.get('headers', {}).get('origin', '')

    if request_origin in allowed_origins:
        return request_origin
    else:
        # Default: primer origin permitido (producción)
        return allowed_origins[0]


def success_response(data, event=None, status_code=200):
    """Response con CORS refinado"""

    headers = {
        'Access-Control-Allow-Origin': get_cors_origin(event) if event else '*',
        'Access-Control-Allow-Credentials': 'true',  # Si usás cookies
        # ... otros headers
    }

    # ... resto del código
```

---

## 💰 Costos

**$0 (gratis)** - Headers son metadata, no cuestan nada.

---

## ✅ Checklist Implementación

- [ ] Agregar `get_security_headers()` a `shared/response_utils.py`
- [ ] Actualizar `success_response()` para incluir security headers
- [ ] Actualizar `error_response()` para incluir security headers
- [ ] Testing: Verificar headers con curl
- [ ] Testing: Scan con securityheaders.com (objetivo: A+)
- [ ] Testing: Scan con Mozilla Observatory (objetivo: A)
- [ ] Refinar CORS: Reemplazar `*` por dominios específicos
- [ ] CSP: Agregar nonces para scripts inline (producción)
- [ ] HSTS Preload: Registrar dominio en hstspreload.org (opcional)
- [ ] Documentar headers en README

---

## 🎯 Recomendación

**Para tu proyecto:**

✅ **SÍ implementar Security Headers** porque:
- $0 costo
- 15 minutos implementación
- Compliance (OWASP, SOC2)
- Previene ataques comunes (XSS, clickjacking)

**Quick wins:**
1. Agregar headers a `response_utils.py` (10 min)
2. Test con securityheaders.com (2 min)
3. Refinar CSP según necesidad (3 min)

---

**Última actualización:** 2025-01-14
**Status:** ✅ RECOMENDADO - Implementar ASAP ($0, 15min)
