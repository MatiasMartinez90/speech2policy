#!/bin/bash

#===============================================================================
# Script: package-lambdas.sh
# Purpose: Empaquetar lambdas incluyendo el módulo shared/
# Usage: ./scripts/package-lambdas.sh
#===============================================================================

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LAMBDAS_DIR="$PROJECT_ROOT/lambdas"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Lambda Packaging Script${NC}"
echo -e "${BLUE}========================================${NC}"

# Lista de lambdas a empaquetar
LAMBDAS=(
    "tutor-handler"
    "courses-handler"
    "admin-handler"
    "categories-handler"
    "progress-handler"
    "sections-handler"
    "upload-handler"
)

# Función para empaquetar un lambda
package_lambda() {
    local lambda_name=$1
    echo -e "\n${YELLOW}📦 Empaquetando ${lambda_name}...${NC}"

    local lambda_dir="$LAMBDAS_DIR/$lambda_name"
    local zip_file="$LAMBDAS_DIR/${lambda_name}.zip"
    local temp_dir="$LAMBDAS_DIR/.temp-${lambda_name}"

    # Limpiar archivos anteriores
    rm -f "$zip_file"
    rm -rf "$temp_dir"

    # Crear directorio temporal
    mkdir -p "$temp_dir"

    # Copiar archivos del lambda (excepto __pycache__, .pyc, tests)
    echo "  Copiando archivos del lambda..."
    rsync -a --exclude='__pycache__' \
             --exclude='*.pyc' \
             --exclude='.pytest_cache' \
             --exclude='tests' \
             "$lambda_dir/" "$temp_dir/"

    # Copiar módulo shared/ al directorio temporal
    echo "  Copiando módulo shared/..."
    cp -r "$LAMBDAS_DIR/shared" "$temp_dir/"

    # Limpiar __pycache__ del shared copiado
    find "$temp_dir/shared" -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
    find "$temp_dir/shared" -name "*.pyc" -delete 2>/dev/null || true

    # Crear ZIP
    echo "  Creando ZIP..."
    cd "$temp_dir"
    zip -rq "$zip_file" . > /dev/null
    cd - > /dev/null

    # Limpiar directorio temporal
    rm -rf "$temp_dir"

    # Mostrar tamaño
    local size=$(du -h "$zip_file" | cut -f1)
    echo -e "${GREEN}  ✅ ${lambda_name}.zip creado ($size)${NC}"
}

# Empaquetar todos los lambdas
for lambda in "${LAMBDAS[@]}"; do
    package_lambda "$lambda"
done

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Todos los lambdas empaquetados${NC}"
echo -e "${GREEN}========================================${NC}"

# Listar ZIPs creados
echo -e "\n${BLUE}ZIPs creados:${NC}"
ls -lh "$LAMBDAS_DIR"/*.zip | awk '{print "  " $9 " (" $5 ")"}'

echo -e "\n${YELLOW}💡 Próximo paso:${NC}"
echo -e "   cd terraform && terraform apply"
