"""
Utilidades para construir respuestas HTTP de API Gateway

Funciones compartidas para crear respuestas HTTP consistentes
con headers CORS apropiados.

Features:
- CORS headers automáticos
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- Compresión gzip automática para responses >1KB (opcional)
- Serialización custom para Decimal y otros tipos
"""

import json
import gzip
import base64
from decimal import Decimal


def get_security_headers():
    """
    Retorna security headers para prevenir vulnerabilidades comunes

    Headers implementados:
    - Content-Security-Policy: Prevenir XSS y code injection
    - X-Frame-Options: Prevenir clickjacking
    - Strict-Transport-Security: Force HTTPS (HSTS)
    - X-Content-Type-Options: Prevenir MIME sniffing
    - X-XSS-Protection: Protección XSS del browser
    - Referrer-Policy: Controlar información de referrer
    - Permissions-Policy: Deshabilitar features del browser no usadas

    Returns:
        dict: Security headers para agregar a response

    References:
        - OWASP Secure Headers: https://owasp.org/www-project-secure-headers/
        - Mozilla Observatory: https://observatory.mozilla.org/
        - securityheaders.com: https://securityheaders.com/
    """
    return {
        # Content Security Policy
        # Para API backend que solo retorna JSON, política restrictiva
        # Si necesitás cargar recursos externos, ajustar según necesidad
        'Content-Security-Policy': (
            "default-src 'none'; "
            "frame-ancestors 'none'"
        ),

        # Prevenir clickjacking - No permitir iframe embed
        'X-Frame-Options': 'DENY',

        # Force HTTPS por 1 año (incluye subdomains)
        # Browser recordará forzar HTTPS por 31536000 segundos (1 año)
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',

        # Prevenir MIME type sniffing
        # Browser debe respetar Content-Type exacto
        'X-Content-Type-Options': 'nosniff',

        # XSS Protection (legacy, pero bueno tenerlo para browsers viejos)
        # mode=block: Bloquear página si XSS detectado
        'X-XSS-Protection': '1; mode=block',

        # Referrer Policy
        # strict-origin-when-cross-origin: Enviar origin solo en HTTPS->HTTPS
        'Referrer-Policy': 'strict-origin-when-cross-origin',

        # Permissions Policy (antes Feature-Policy)
        # Deshabilitar features del browser no necesarias
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    }


def get_cors_headers(origin=None, cors_methods=None):
    """
    Retorna CORS headers con whitelist de origins permitidos (SECURITY: CRITICAL-3)

    Previene ataques CSRF validando el origin contra una whitelist.
    Solo origins específicos son permitidos, NO wildcards.

    Args:
        origin: Origin header del request (ej: "https://proyectos.cloudacademy.ar")
        cors_methods: Métodos HTTP permitidos (default: 'GET,POST,PUT,DELETE,OPTIONS')

    Returns:
        dict: CORS headers si origin es válido, dict vacío si no

    Security:
        - CRITICAL: Elimina wildcard (*) para prevenir CSRF
        - Valida origin contra whitelist explícita
        - Habilita credentials solo para origins confiables
        - Origins no permitidos NO reciben CORS headers (request falla en browser)

    Examples:
        >>> get_cors_headers('https://proyectos.cloudacademy.ar')
        {
            'Access-Control-Allow-Origin': 'https://proyectos.cloudacademy.ar',
            'Access-Control-Allow-Credentials': 'true',
            ...
        }

        >>> get_cors_headers('https://evil.com')  # Origin no permitido
        {}  # Sin CORS headers → browser bloquea request
    """
    # Whitelist de origins permitidos (SECURITY: Sin wildcards)
    ALLOWED_ORIGINS = [
        'http://localhost:3000',              # Desarrollo local
        'http://localhost:3001',              # Desarrollo local (puerto alternativo)
        'https://proyectos.cloudacademy.ar',  # Producción
        'https://app.cloudacademy.ar',        # App principal (si existe)
        'https://admin.cloudacademy.ar',      # Admin panel (si existe)
    ]

    if cors_methods is None:
        cors_methods = 'GET,POST,PUT,DELETE,OPTIONS'

    # Validar origin contra whitelist
    if origin and origin in ALLOWED_ORIGINS:
        # Origin confiable: retornar CORS headers con credentials
        return {
            'Access-Control-Allow-Origin': origin,  # Reflejar origin específico (NO *)
            'Access-Control-Allow-Credentials': 'true',  # Permitir cookies/auth headers
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Request-ID',
            'Access-Control-Allow-Methods': cors_methods,
            'Access-Control-Max-Age': '3600'  # Cache preflight por 1 hora
        }

    # Origin no confiable o no presente: NO agregar CORS headers
    # Esto causa que el browser bloquee el request (comportamiento seguro)
    return {}


def success_response(data, status_code=200, cors_methods=None, enable_compression=True, origin=None):
    """
    Construye respuesta HTTP exitosa con CORS headers y compresión opcional

    Args:
        data: dict o cualquier objeto serializable a JSON
        status_code: código HTTP (default 200)
        cors_methods: string con métodos CORS permitidos
                     (default: 'GET,POST,PUT,DELETE,OPTIONS')
        enable_compression: Si True, comprime con gzip si body >1KB (default True)

    Returns:
        dict: Response formateado para API Gateway con:
            - statusCode
            - headers (con CORS, + Content-Encoding si comprimido)
            - body (JSON string o base64 si comprimido)
            - isBase64Encoded (True si comprimido)

    Examples:
        >>> success_response({'message': 'OK'})
        {
            'statusCode': 200,
            'headers': {...},
            'body': '{"message": "OK"}'
        }

        >>> # Response grande (>1KB) se comprime automáticamente
        >>> success_response({'courses': [...]})  # Lista grande
        {
            'statusCode': 200,
            'headers': {..., 'Content-Encoding': 'gzip'},
            'body': '<base64-encoded-gzip>',
            'isBase64Encoded': True
        }

        >>> # Deshabilitar compresión si es necesario
        >>> success_response({'data': ...}, enable_compression=False)
    """
    if cors_methods is None:
        cors_methods = 'GET,POST,PUT,DELETE,OPTIONS'

    # Serializar a JSON
    body_json = json.dumps(data, ensure_ascii=False, default=_json_serializer)

    # Headers base: Content-Type
    headers = {
        'Content-Type': 'application/json'
    }

    # SECURITY (CRITICAL-3): Agregar CORS headers con whitelist validation
    cors_headers = get_cors_headers(origin=origin, cors_methods=cors_methods)
    headers.update(cors_headers)

    # Agregar security headers
    headers.update(get_security_headers())

    # Comprimir si está habilitado y el body es >1KB
    if enable_compression and len(body_json) > 1024:
        compressed_body = gzip.compress(body_json.encode('utf-8'))
        encoded_body = base64.b64encode(compressed_body).decode('utf-8')

        headers['Content-Encoding'] = 'gzip'

        return {
            'statusCode': status_code,
            'headers': headers,
            'body': encoded_body,
            'isBase64Encoded': True
        }

    # Response sin compresión
    return {
        'statusCode': status_code,
        'headers': headers,
        'body': body_json
    }


def sanitize_error_message(status_code, message):
    """
    Sanitiza mensajes de error para NO exponer detalles técnicos (SECURITY: MEDIUM-4)

    Previene info leakage de:
    - Stack traces y paths internos
    - Nombres de tablas DynamoDB
    - Estructura de código
    - Errores de dependencias (boto3, etc.)

    Args:
        status_code: Código HTTP de error
        message: Mensaje de error original (puede contener detalles técnicos)

    Returns:
        str: Mensaje sanitizado seguro para mostrar al usuario

    Security:
        - Errores 500: Mensaje genérico (NO exponer stack traces)
        - Errores 4xx: Permitir mensaje específico (seguro)
        - Loggear mensaje original internamente para debugging

    Examples:
        >>> sanitize_error_message(500, "DynamoDB ValidationException: The provided key...")
        "Internal server error. Please try again later."

        >>> sanitize_error_message(404, "Course xyz not found")
        "Course xyz not found"  # Seguro exponer
    """
    # Errores de servidor (5xx): Mensaje genérico para NO exponer arquitectura
    if 500 <= status_code < 600:
        # NO exponer detalles técnicos al usuario
        # El mensaje original YA está logueado en CloudWatch
        return "Internal server error. Please try again later."

    # Errores de cliente (4xx): Permitir mensaje específico (generalmente seguro)
    # Pero detectar y sanitizar patterns peligrosos
    dangerous_patterns = [
        r'DynamoDB',
        r'boto3',
        r'ClientError',
        r'ValidationException',
        r'ResourceNotFoundException',
        r'/var/task/',
        r'lambda_function\.py',
        r'Traceback',
    ]

    import re
    for pattern in dangerous_patterns:
        if re.search(pattern, message, re.IGNORECASE):
            # Si el mensaje contiene info técnica, sanitizar
            return "An error occurred. Please contact support if this persists."

    # Mensaje seguro: no contiene info técnica
    return message


def error_response(status_code, message, cors_methods=None, origin=None, log_details=None):
    """
    Construye respuesta HTTP de error con CORS headers

    Args:
        status_code: código HTTP de error (400, 401, 403, 404, 500, etc.)
        message: mensaje de error descriptivo
        cors_methods: string con métodos CORS permitidos
                     (default: 'GET,POST,PUT,DELETE,OPTIONS')
        origin: Origin header del request (para CORS validation)
        log_details: Detalles técnicos adicionales para logging interno (NO se envían al usuario)

    Returns:
        dict: Response formateado para API Gateway con:
            - statusCode (error code)
            - headers (con CORS validado)
            - body (JSON con 'error' sanitizado y 'statusCode')

    Security:
        - Mensajes de error sanitizados (NO exponer stack traces en 500 errors)
        - Detalles técnicos solo en logs de CloudWatch, NO en response

    Examples:
        >>> error_response(404, 'User not found')
        {
            'statusCode': 404,
            'headers': {...},
            'body': '{"error": "User not found", "statusCode": 404}'
        }

        >>> error_response(500, 'DynamoDB error...', log_details='Full stack trace')
        {
            'statusCode': 500,
            'headers': {...},
            'body': '{"error": "Internal server error. Please try again later.", "statusCode": 500}'
        }
    """
    import logging
    logger = logging.getLogger()

    # SECURITY (MEDIUM-4): Sanitizar mensaje de error
    sanitized_message = sanitize_error_message(status_code, message)

    # Si el mensaje fue sanitizado, loguear el original para debugging
    if sanitized_message != message:
        logger.error(f"Error sanitizado: Original='{message}', Sanitizado='{sanitized_message}'")

    # Si hay detalles adicionales, loguearlos (NO enviar al usuario)
    if log_details:
        logger.error(f"Error details (internal only): {log_details}")

    if cors_methods is None:
        cors_methods = 'GET,POST,PUT,DELETE,OPTIONS'

    # Headers base: Content-Type
    headers = {
        'Content-Type': 'application/json'
    }

    # SECURITY (CRITICAL-3): Agregar CORS headers con whitelist validation
    cors_headers = get_cors_headers(origin=origin, cors_methods=cors_methods)
    headers.update(cors_headers)

    # Agregar security headers
    headers.update(get_security_headers())

    return {
        'statusCode': status_code,
        'headers': headers,
        'body': json.dumps({
            'error': sanitized_message,  # Mensaje sanitizado (seguro)
            'statusCode': status_code
        }, ensure_ascii=False)
    }


def _json_serializer(obj):
    """
    Serializador custom para json.dumps que maneja tipos especiales

    Maneja:
    - Decimal -> int o float
    - datetime -> isoformat string
    - Cualquier otro tipo -> str

    Args:
        obj: Objeto a serializar

    Returns:
        Versión serializable del objeto

    Raises:
        TypeError: Si el objeto no puede ser serializado
    """
    if isinstance(obj, Decimal):
        # Convertir Decimal a int si es entero, sino a float
        if obj % 1 == 0:
            return int(obj)
        else:
            return float(obj)

    # Intentar convertir a string como último recurso
    try:
        return str(obj)
    except Exception:
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


# Alias para compatibilidad con código existente
build_response = success_response


# ============================================================================
# Notas sobre Response Compression
# ============================================================================

"""
GZIP Compression Overview:

La compresión gzip reduce el tamaño de las respuestas HTTP automáticamente
cuando el body es >1KB, resultando en:
- Reducción ~70% del data transfer
- Menor costo de AWS (data transfer out)
- Respuestas más rápidas en redes lentas
- Compatible con todos los browsers modernos

Cómo funciona:
1. success_response() serializa data a JSON
2. Si len(json) > 1024 bytes, comprime con gzip
3. Codifica en base64 (requerido por API Gateway)
4. Agrega header Content-Encoding: gzip
5. Agrega isBase64Encoded: True
6. El browser/client descomprime automáticamente

Threshold de 1KB:
- Responses pequeños (<1KB) no se comprimen
- Overhead de compresión no vale la pena para payloads chicos
- Ejemplos que NO se comprimen: error messages, confirmaciones simples
- Ejemplos que SÍ se comprimen: listas de cursos, secciones con contenido

Compatibilidad:
- ✅ Todos los browsers modernos (Chrome, Firefox, Safari, Edge)
- ✅ Fetch API, Axios, XMLHttpRequest
- ✅ cURL (--compressed flag)
- ✅ Postman (auto-decomprime)

Deshabilitar compresión:
Pasar enable_compression=False si:
- Testing/debugging (ver JSON raw)
- Responses que ya vienen comprimidos
- Integraciones legacy que no soportan gzip

Ejemplos:
    # Automático (comprime si >1KB)
    return success_response({'courses': courses})

    # Forzar sin compresión
    return success_response(data, enable_compression=False)

Costos estimados:
- Sin compresión: 1GB data transfer out = $0.09
- Con compresión: ~300MB data transfer out = $0.027
- Ahorro: ~70% en costos de data transfer

Monitoring:
Verificar en CloudWatch Logs:
- "Content-Encoding: gzip" en response headers
- isBase64Encoded: true en response
- Body size before/after compression

Testing:
    import gzip
    import base64
    import json

    # Simular response grande
    data = {'courses': [{'id': i, 'name': f'Course {i}'} for i in range(100)]}
    response = success_response(data)

    # Verificar compresión
    if response.get('isBase64Encoded'):
        print("✅ Response comprimida")
        print(f"Headers: {response['headers']}")

        # Descomprimir para verificar
        compressed = base64.b64decode(response['body'])
        decompressed = gzip.decompress(compressed)
        original = json.loads(decompressed)
        print(f"✅ Decompresión exitosa: {len(original['courses'])} cursos")
"""
