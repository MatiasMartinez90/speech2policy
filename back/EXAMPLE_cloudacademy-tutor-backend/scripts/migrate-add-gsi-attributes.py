#!/usr/bin/env python3
"""
Script de Migración: Agregar atributos entity_type y created_at
=================================================================

Propósito:
  Poblar los atributos entity_type y created_at en todos los items
  existentes de la tabla CourseCatalog para habilitar el uso del GSI.

Atributos agregados:
  - entity_type: "COURSE_METADATA" | "COURSE_SECTION"
  - created_at: ISO timestamp (usa el timestamp actual si no existe)

Ejecución:
  python3 scripts/migrate-add-gsi-attributes.py [--dry-run]

Opciones:
  --dry-run: Muestra qué cambios se harían sin aplicarlos
"""

import boto3
import sys
from datetime import datetime, timezone
from botocore.exceptions import ClientError

# Configuración
TABLE_NAME = "CourseCatalog"
REGION = "us-east-1"

def get_entity_type(sk):
    """Determinar el tipo de entidad basado en el SK"""
    if sk == "METADATA":
        return "COURSE_METADATA"
    elif sk.startswith("SECTION#"):
        return "COURSE_SECTION"
    else:
        return "UNKNOWN"

def migrate_items(dry_run=False):
    """Migrar todos los items agregando entity_type y created_at"""

    dynamodb = boto3.resource('dynamodb', region_name=REGION)
    table = dynamodb.Table(TABLE_NAME)

    print(f"🔍 Escaneando tabla {TABLE_NAME}...")
    print(f"📋 Modo: {'DRY RUN (solo lectura)' if dry_run else 'APLICANDO CAMBIOS'}")
    print("-" * 60)

    # Scan de toda la tabla
    response = table.scan()
    items = response['Items']

    # Manejar paginación si hay muchos items
    while 'LastEvaluatedKey' in response:
        response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        items.extend(response['Items'])

    print(f"✅ Encontrados {len(items)} items en total\n")

    # Contadores
    stats = {
        'total': len(items),
        'metadata': 0,
        'sections': 0,
        'already_migrated': 0,
        'to_migrate': 0,
        'errors': 0
    }

    # Procesar cada item
    for item in items:
        pk = item.get('PK')
        sk = item.get('SK')

        # Verificar si ya tiene los atributos
        has_entity_type = 'entity_type' in item
        has_created_at = 'created_at' in item

        if has_entity_type and has_created_at:
            stats['already_migrated'] += 1
            continue

        # Determinar entity_type
        entity_type = get_entity_type(sk)

        if entity_type == "COURSE_METADATA":
            stats['metadata'] += 1
        elif entity_type == "COURSE_SECTION":
            stats['sections'] += 1

        # Usar created_at existente o timestamp actual
        if has_created_at:
            created_at = item['created_at']
        else:
            # Usar timestamp actual como fallback
            created_at = datetime.now(timezone.utc).isoformat()

        stats['to_migrate'] += 1

        print(f"📝 {pk} / {sk}")
        print(f"   → entity_type: {entity_type}")
        print(f"   → created_at: {created_at}")

        # Aplicar cambios si no es dry-run
        if not dry_run:
            try:
                table.update_item(
                    Key={'PK': pk, 'SK': sk},
                    UpdateExpression='SET entity_type = :et, created_at = :ca',
                    ExpressionAttributeValues={
                        ':et': entity_type,
                        ':ca': created_at
                    }
                )
                print(f"   ✅ Actualizado\n")
            except ClientError as e:
                print(f"   ❌ Error: {e}\n")
                stats['errors'] += 1
        else:
            print(f"   🔍 Dry-run: No se aplicaron cambios\n")

    # Resumen
    print("\n" + "=" * 60)
    print("📊 RESUMEN DE MIGRACIÓN")
    print("=" * 60)
    print(f"Total de items:              {stats['total']}")
    print(f"  - Metadata de cursos:      {stats['metadata']}")
    print(f"  - Secciones:               {stats['sections']}")
    print(f"  - Ya migrados:             {stats['already_migrated']}")
    print(f"  - Por migrar:              {stats['to_migrate']}")

    if not dry_run:
        print(f"  - Errores:                 {stats['errors']}")
        if stats['errors'] == 0 and stats['to_migrate'] > 0:
            print("\n✅ Migración completada exitosamente!")
        elif stats['to_migrate'] == 0:
            print("\n✅ Todos los items ya estaban migrados!")
    else:
        print("\n🔍 Dry-run completado. Ejecuta sin --dry-run para aplicar cambios.")

    print("=" * 60)

    return stats

def verify_gsi():
    """Verificar que el GSI esté creado y activo"""

    dynamodb = boto3.client('dynamodb', region_name=REGION)

    try:
        response = dynamodb.describe_table(TableName=TABLE_NAME)
        table = response['Table']

        # Buscar el GSI
        gsi_name = "entity_type-created_at-index"
        gsi_found = False
        gsi_status = None

        if 'GlobalSecondaryIndexes' in table:
            for gsi in table['GlobalSecondaryIndexes']:
                if gsi['IndexName'] == gsi_name:
                    gsi_found = True
                    gsi_status = gsi['IndexStatus']
                    break

        print("\n" + "=" * 60)
        print("🔍 VERIFICACIÓN DEL GSI")
        print("=" * 60)

        if gsi_found:
            print(f"✅ GSI '{gsi_name}' encontrado")
            print(f"   Status: {gsi_status}")

            if gsi_status == 'ACTIVE':
                print("   ✅ GSI está ACTIVO y listo para usar")
            else:
                print(f"   ⚠️  GSI está en estado {gsi_status}, esperando activación...")
        else:
            print(f"❌ GSI '{gsi_name}' NO encontrado")
            print("   Asegúrate de aplicar los cambios de Terraform primero")

        print("=" * 60 + "\n")

        return gsi_found and gsi_status == 'ACTIVE'

    except ClientError as e:
        print(f"❌ Error verificando GSI: {e}")
        return False

if __name__ == '__main__':
    # Verificar argumentos
    dry_run = '--dry-run' in sys.argv

    print("\n" + "=" * 60)
    print("🚀 MIGRACIÓN: Agregar atributos para GSI")
    print("=" * 60 + "\n")

    # Verificar que el GSI existe
    gsi_ready = verify_gsi()

    if not gsi_ready:
        print("⚠️  ADVERTENCIA: El GSI no está activo todavía.")
        print("   La migración puede continuar, pero el GSI no estará")
        print("   disponible hasta que termine de construirse.\n")

        if not dry_run:
            response = input("¿Continuar de todas formas? (s/n): ")
            if response.lower() != 's':
                print("❌ Migración cancelada")
                sys.exit(1)

    # Ejecutar migración
    try:
        stats = migrate_items(dry_run=dry_run)

        if not dry_run and stats['errors'] == 0:
            print("\n✅ ¡Migración exitosa!")
            print("\nPróximos pasos:")
            print("1. Verificar que el GSI esté ACTIVO")
            print("2. Actualizar el Lambda para usar query en lugar de scan")
            print("3. Desplegar el Lambda actualizado")
            print("4. Probar los endpoints")

    except Exception as e:
        print(f"\n❌ Error durante la migración: {e}")
        sys.exit(1)
