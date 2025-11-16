"""
Test script para validar Response Compression

Verifica que:
1. Responses pequeños (<1KB) NO se comprimen
2. Responses grandes (>1KB) SÍ se comprimen
3. Compresión/descompresión funciona correctamente
4. Headers correctos (Content-Encoding: gzip)
"""

import sys
import os
import json
import gzip
import base64

# Agregar directorio shared al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../lambdas'))

from shared.response_utils import success_response, error_response


def test_small_response_not_compressed():
    """Test: Response pequeño NO debe comprimirse"""
    print("\n🧪 Test 1: Response pequeño (<1KB) NO debe comprimirse")

    data = {'message': 'OK', 'status': 'success'}
    response = success_response(data)

    # Verificar que NO está comprimido
    assert 'isBase64Encoded' not in response or response.get('isBase64Encoded') == False, \
        "❌ Response pequeño NO debería estar comprimido"

    assert 'Content-Encoding' not in response['headers'], \
        "❌ No debería tener header Content-Encoding"

    # Verificar que el body es JSON directo
    body = json.loads(response['body'])
    assert body['message'] == 'OK', "❌ Body JSON inválido"

    print("✅ PASS: Response pequeño NO se comprimió")
    print(f"   Body size: {len(response['body'])} bytes")


def test_large_response_compressed():
    """Test: Response grande (>1KB) SÍ debe comprimirse"""
    print("\n🧪 Test 2: Response grande (>1KB) SÍ debe comprimirse")

    # Crear lista grande de cursos (>1KB)
    data = {
        'courses': [
            {
                'id': i,
                'name': f'Course {i}',
                'description': f'This is a detailed description for course {i} ' * 10,
                'sections': list(range(1, 11)),
                'difficulty': 'Intermediate'
            }
            for i in range(50)
        ],
        'total': 50,
        'page': 1
    }

    response = success_response(data)

    # Verificar que SÍ está comprimido
    assert response.get('isBase64Encoded') == True, \
        "❌ Response grande DEBERÍA estar comprimido"

    assert response['headers'].get('Content-Encoding') == 'gzip', \
        "❌ Debería tener header Content-Encoding: gzip"

    # Calcular tamaños
    uncompressed_size = len(json.dumps(data, ensure_ascii=False))
    compressed_size = len(response['body'])

    # Descomprimir y verificar integridad
    compressed_bytes = base64.b64decode(response['body'])
    decompressed_bytes = gzip.decompress(compressed_bytes)
    decompressed_data = json.loads(decompressed_bytes.decode('utf-8'))

    assert len(decompressed_data['courses']) == 50, "❌ Datos corruptos después de descomprimir"
    assert decompressed_data['courses'][0]['id'] == 0, "❌ Datos incorrectos"

    compression_ratio = (1 - compressed_size / uncompressed_size) * 100

    print("✅ PASS: Response grande se comprimió correctamente")
    print(f"   Tamaño original: {uncompressed_size:,} bytes")
    print(f"   Tamaño comprimido (base64): {compressed_size:,} bytes")
    print(f"   Ratio compresión: {compression_ratio:.1f}%")
    print(f"   ✅ Descompresión exitosa: {len(decompressed_data['courses'])} cursos")


def test_compression_disabled():
    """Test: Deshabilitar compresión manualmente"""
    print("\n🧪 Test 3: Deshabilitar compresión manualmente")

    # Crear data grande pero deshabilitar compresión
    data = {'courses': [{'id': i, 'name': f'Course {i}'} for i in range(100)]}
    response = success_response(data, enable_compression=False)

    # Verificar que NO está comprimido
    assert 'isBase64Encoded' not in response or response.get('isBase64Encoded') == False, \
        "❌ Compresión debería estar deshabilitada"

    # Verificar que el body es JSON directo
    body = json.loads(response['body'])
    assert len(body['courses']) == 100, "❌ Body JSON inválido"

    print("✅ PASS: Compresión deshabilitada funciona correctamente")


def test_error_response_not_compressed():
    """Test: Error responses NO se comprimen (típicamente <1KB)"""
    print("\n🧪 Test 4: Error responses NO se comprimen")

    response = error_response(404, 'Course not found')

    # Verificar que NO está comprimido
    assert 'isBase64Encoded' not in response or response.get('isBase64Encoded') == False, \
        "❌ Error response NO debería estar comprimido"

    # Verificar que el body es JSON directo
    body = json.loads(response['body'])
    assert body['error'] == 'Course not found', "❌ Error body inválido"

    print("✅ PASS: Error response NO se comprimió")


def test_threshold_boundary():
    """Test: Verificar threshold exacto de 1KB"""
    print("\n🧪 Test 5: Verificar threshold de 1KB")

    # Crear payload justo debajo de 1KB
    small_data = {'data': 'x' * 1000}
    response_small = success_response(small_data)

    assert 'isBase64Encoded' not in response_small or response_small.get('isBase64Encoded') == False, \
        "❌ 1000 bytes NO debería comprimirse"

    # Crear payload justo arriba de 1KB
    large_data = {'data': 'x' * 1100}
    response_large = success_response(large_data)

    assert response_large.get('isBase64Encoded') == True, \
        "❌ 1100 bytes DEBERÍA comprimirse"

    print("✅ PASS: Threshold de 1KB funciona correctamente")
    print(f"   <1KB: NO comprimido ✓")
    print(f"   >1KB: SÍ comprimido ✓")


def run_all_tests():
    """Ejecutar todos los tests"""
    print("=" * 60)
    print("🚀 Testing Response Compression (Mejora #12)")
    print("=" * 60)

    try:
        test_small_response_not_compressed()
        test_large_response_compressed()
        test_compression_disabled()
        test_error_response_not_compressed()
        test_threshold_boundary()

        print("\n" + "=" * 60)
        print("✅ TODOS LOS TESTS PASARON")
        print("=" * 60)
        print("\n💡 Beneficios de compresión:")
        print("   - Reducción ~70% en data transfer")
        print("   - Menor costo AWS")
        print("   - Respuestas más rápidas")
        print("   - Compatible con todos los browsers\n")

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
