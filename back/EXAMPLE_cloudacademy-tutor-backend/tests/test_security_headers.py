"""
Test script para validar Security Headers

Verifica que:
1. Todos los security headers están presentes
2. Valores de headers son correctos
3. Headers se aplican a success_response()
4. Headers se aplican a error_response()
5. CORS headers siguen funcionando
6. Compression sigue funcionando con security headers
"""

import sys
import os
import json

# Agregar directorio shared al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../lambdas'))

from shared.response_utils import success_response, error_response, get_security_headers


def test_security_headers_present():
    """Test: Verificar que get_security_headers() retorna todos los headers"""
    print("\n🧪 Test 1: Security headers function")

    headers = get_security_headers()

    required_headers = [
        'Content-Security-Policy',
        'X-Frame-Options',
        'Strict-Transport-Security',
        'X-Content-Type-Options',
        'X-XSS-Protection',
        'Referrer-Policy',
        'Permissions-Policy'
    ]

    for header in required_headers:
        assert header in headers, f"❌ Missing header: {header}"
        assert headers[header], f"❌ Empty value for header: {header}"
        print(f"   ✅ {header}: {headers[header][:50]}...")

    print("✅ PASS: Todos los security headers presentes")


def test_success_response_has_security_headers():
    """Test: Success response incluye security headers"""
    print("\n🧪 Test 2: Success response con security headers")

    data = {'message': 'OK', 'status': 'success'}
    response = success_response(data)

    # Verificar headers
    headers = response['headers']

    # Security headers
    assert 'Content-Security-Policy' in headers, "❌ Missing CSP header"
    assert 'X-Frame-Options' in headers, "❌ Missing X-Frame-Options"
    assert 'Strict-Transport-Security' in headers, "❌ Missing HSTS"
    assert 'X-Content-Type-Options' in headers, "❌ Missing X-Content-Type-Options"

    # CORS headers (should still work)
    assert 'Access-Control-Allow-Origin' in headers, "❌ Missing CORS origin"
    assert headers['Access-Control-Allow-Origin'] == '*', "❌ Wrong CORS origin"

    # Content-Type
    assert headers['Content-Type'] == 'application/json', "❌ Wrong Content-Type"

    print("✅ PASS: Success response tiene security headers + CORS")
    print(f"   Total headers: {len(headers)}")


def test_error_response_has_security_headers():
    """Test: Error response incluye security headers"""
    print("\n🧪 Test 3: Error response con security headers")

    response = error_response(404, 'Resource not found')

    # Verificar headers
    headers = response['headers']

    # Security headers
    assert 'Content-Security-Policy' in headers, "❌ Missing CSP header"
    assert 'X-Frame-Options' in headers, "❌ Missing X-Frame-Options"
    assert 'Strict-Transport-Security' in headers, "❌ Missing HSTS"

    # CORS headers
    assert 'Access-Control-Allow-Origin' in headers, "❌ Missing CORS origin"

    # Body
    body = json.loads(response['body'])
    assert body['error'] == 'Resource not found', "❌ Wrong error message"
    assert body['statusCode'] == 404, "❌ Wrong status code"

    print("✅ PASS: Error response tiene security headers + CORS")


def test_security_headers_values():
    """Test: Verificar valores específicos de security headers"""
    print("\n🧪 Test 4: Valores correctos de security headers")

    headers = get_security_headers()

    # CSP - Backend API solo retorna JSON
    assert "default-src 'none'" in headers['Content-Security-Policy'], \
        "❌ CSP debería tener default-src 'none' para API backend"

    # X-Frame-Options
    assert headers['X-Frame-Options'] == 'DENY', \
        "❌ X-Frame-Options debería ser DENY"

    # HSTS - 1 año
    assert 'max-age=31536000' in headers['Strict-Transport-Security'], \
        "❌ HSTS debería tener max-age de 1 año (31536000)"
    assert 'includeSubDomains' in headers['Strict-Transport-Security'], \
        "❌ HSTS debería incluir subdomains"

    # X-Content-Type-Options
    assert headers['X-Content-Type-Options'] == 'nosniff', \
        "❌ X-Content-Type-Options debería ser nosniff"

    # X-XSS-Protection
    assert '1' in headers['X-XSS-Protection'] and 'block' in headers['X-XSS-Protection'], \
        "❌ X-XSS-Protection debería estar enabled con mode=block"

    # Referrer-Policy
    assert 'strict-origin' in headers['Referrer-Policy'], \
        "❌ Referrer-Policy debería ser strict-origin-when-cross-origin"

    print("✅ PASS: Valores de security headers correctos")


def test_compression_with_security_headers():
    """Test: Compression sigue funcionando con security headers"""
    print("\n🧪 Test 5: Compression + Security headers")

    # Crear data grande para forzar compresión
    data = {
        'items': [
            {'id': i, 'name': f'Item {i}', 'description': f'Description {i} ' * 20}
            for i in range(50)
        ]
    }

    response = success_response(data)

    # Verificar compresión
    assert response.get('isBase64Encoded') == True, \
        "❌ Response grande debería estar comprimido"
    assert response['headers'].get('Content-Encoding') == 'gzip', \
        "❌ Debería tener Content-Encoding: gzip"

    # Verificar security headers presentes incluso con compresión
    headers = response['headers']
    assert 'Content-Security-Policy' in headers, \
        "❌ Security headers deberían estar presentes con compresión"
    assert 'X-Frame-Options' in headers, \
        "❌ Security headers deberían estar presentes con compresión"

    print("✅ PASS: Compression funciona con security headers")
    print(f"   Content-Encoding: {headers.get('Content-Encoding')}")
    print(f"   isBase64Encoded: {response.get('isBase64Encoded')}")


def test_cors_still_works():
    """Test: CORS headers no son afectados por security headers"""
    print("\n🧪 Test 6: CORS compatibility")

    # Test con métodos CORS custom
    response = success_response({'data': 'test'}, cors_methods='GET,POST')

    headers = response['headers']

    # CORS headers
    assert headers['Access-Control-Allow-Origin'] == '*'
    assert headers['Access-Control-Allow-Methods'] == 'GET,POST'
    assert 'Content-Type,Authorization' in headers['Access-Control-Allow-Headers']

    # Security headers también presentes
    assert 'Content-Security-Policy' in headers
    assert 'X-Frame-Options' in headers

    print("✅ PASS: CORS y Security headers coexisten correctamente")


def print_sample_headers():
    """Mostrar ejemplo de headers completos"""
    print("\n📋 Sample Response Headers:")
    print("=" * 60)

    response = success_response({'message': 'OK'})
    headers = response['headers']

    for key, value in sorted(headers.items()):
        print(f"{key}: {value}")

    print("=" * 60)


def run_all_tests():
    """Ejecutar todos los tests"""
    print("=" * 60)
    print("🚀 Testing Security Headers Implementation")
    print("=" * 60)

    try:
        test_security_headers_present()
        test_success_response_has_security_headers()
        test_error_response_has_security_headers()
        test_security_headers_values()
        test_compression_with_security_headers()
        test_cors_still_works()

        print("\n" + "=" * 60)
        print("✅ TODOS LOS TESTS PASARON")
        print("=" * 60)

        print_sample_headers()

        print("\n💡 Próximos pasos:")
        print("   1. Deploy a staging/producción")
        print("   2. Verificar headers con: curl -I https://api-url/endpoint")
        print("   3. Test con securityheaders.com")
        print("   4. Score objetivo: A+ 🎯\n")

        return True

    except AssertionError as e:
        print(f"\n❌ TEST FALLÓ: {str(e)}")
        return False

    except Exception as e:
        print(f"\n❌ ERROR INESPERADO: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
