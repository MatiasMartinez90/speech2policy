#!/bin/bash

# ============================================
# Script de Limpieza de Recursos Huérfanos AWS
# CloudAcademy - Opción A Deployment
# ============================================
#
# ADVERTENCIA: Este script ELIMINARÁ recursos de AWS.
# Solo ejecutar DESPUÉS de verificar que el nuevo deployment funciona correctamente.
#
# Uso:
#   ./scripts/cleanup-old-resources.sh --dry-run   # Ver qué se eliminaría
#   ./scripts/cleanup-old-resources.sh --confirm   # Eliminar realmente
#

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
DRY_RUN=true
REGION="us-east-1"

# Parse argumentos
if [ "$1" == "--confirm" ]; then
    DRY_RUN=false
    echo -e "${RED}⚠️  MODO DESTRUCTIVO ACTIVADO${NC}"
elif [ "$1" == "--dry-run" ]; then
    DRY_RUN=true
    echo -e "${BLUE}ℹ️  MODO DRY-RUN (solo mostrar, no eliminar)${NC}"
else
    echo "Uso: $0 [--dry-run | --confirm]"
    exit 1
fi

echo ""
echo "============================================"
echo "🧹 CloudAcademy - Limpieza de Recursos Viejos"
echo "============================================"
echo ""

# ============================================
# Función helper para logging
# ============================================
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================
# Función para confirmar acción
# ============================================
confirm() {
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY-RUN]${NC} Se eliminaría: $1"
        return 1
    else
        read -p "¿Eliminar $1? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            return 0
        else
            log_warning "Omitido: $1"
            return 1
        fi
    fi
}

# ============================================
# 1. LIMPIAR S3 BUCKETS VIEJOS
# ============================================
echo ""
log_info "🗑️  Buscando S3 buckets viejos..."

# Listar todos los website buckets
OLD_BUCKETS=$(aws s3 ls | grep "website-bucket-" | awk '{print $3}' || echo "")

if [ -z "$OLD_BUCKETS" ]; then
    log_info "No se encontraron buckets viejos"
else
    echo "Buckets encontrados:"
    echo "$OLD_BUCKETS"
    echo ""

    # Obtener el bucket actual del terraform state
    CURRENT_BUCKET=""
    if [ -f "terraform/frontend/.terraform/terraform.tfstate" ]; then
        CURRENT_BUCKET=$(cd terraform/frontend && terraform output -raw website_bucket_name 2>/dev/null || echo "")
    fi

    log_info "Bucket actual en uso: ${CURRENT_BUCKET}"
    echo ""

    for bucket in $OLD_BUCKETS; do
        # No eliminar el bucket actual
        if [ "$bucket" == "$CURRENT_BUCKET" ]; then
            log_success "✓ Mantener bucket actual: $bucket"
            continue
        fi

        # Verificar si está en uso por CloudFront
        CF_USING_BUCKET=$(aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[?DomainName=='${bucket}.s3.amazonaws.com']].Id" --output text 2>/dev/null || echo "")

        if [ -n "$CF_USING_BUCKET" ]; then
            log_warning "⚠️  Bucket $bucket está en uso por CloudFront: $CF_USING_BUCKET"
            log_warning "   Primero elimina la distribución CloudFront"
            continue
        fi

        if confirm "S3 Bucket: $bucket"; then
            log_info "Eliminando bucket: $bucket"

            # Vaciar bucket primero
            aws s3 rm s3://$bucket --recursive 2>/dev/null || true

            # Eliminar versionado
            aws s3api delete-bucket-versioning --bucket $bucket 2>/dev/null || true

            # Eliminar bucket
            aws s3 rb s3://$bucket --force 2>/dev/null || log_error "Error eliminando $bucket"

            log_success "✓ Bucket eliminado: $bucket"
        fi
    done
fi

# ============================================
# 2. LIMPIAR COGNITO USER POOLS VIEJOS
# ============================================
echo ""
log_info "👥 Buscando Cognito User Pools viejos..."

# Listar todos los user pools
USER_POOLS=$(aws cognito-idp list-user-pools --max-results 10 --region $REGION --query 'UserPools[*].[Id,Name]' --output text || echo "")

if [ -z "$USER_POOLS" ]; then
    log_info "No se encontraron User Pools"
else
    # Obtener el user pool actual
    CURRENT_USER_POOL=""
    if [ -f "terraform/backend/.terraform/terraform.tfstate" ]; then
        CURRENT_USER_POOL=$(cd terraform/backend && terraform output -raw cognito_user_pool_id 2>/dev/null || echo "")
    fi

    log_info "User Pool actual en uso: ${CURRENT_USER_POOL}"
    echo ""

    echo "$USER_POOLS" | while read pool_id pool_name; do
        # No eliminar el pool actual
        if [ "$pool_id" == "$CURRENT_USER_POOL" ]; then
            log_success "✓ Mantener User Pool actual: $pool_name ($pool_id)"
            continue
        fi

        # Solo eliminar pools que no son el actual
        if confirm "Cognito User Pool: $pool_name ($pool_id)"; then
            log_info "Eliminando User Pool: $pool_name"

            # Primero eliminar el dominio asociado
            DOMAIN=$(aws cognito-idp describe-user-pool --user-pool-id $pool_id --query 'UserPool.Domain' --output text 2>/dev/null || echo "")
            if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "None" ]; then
                aws cognito-idp delete-user-pool-domain --domain $DOMAIN --user-pool-id $pool_id 2>/dev/null || true
                log_info "  Dominio eliminado: $DOMAIN"
            fi

            # Eliminar user pool
            aws cognito-idp delete-user-pool --user-pool-id $pool_id 2>/dev/null || log_error "Error eliminando $pool_id"

            log_success "✓ User Pool eliminado: $pool_name"
        fi
    done
fi

# ============================================
# 3. LIMPIAR CLOUDFRONT DISTRIBUTIONS VIEJAS
# ============================================
echo ""
log_info "☁️  Buscando CloudFront distributions viejas..."

# Listar distribuciones
DISTRIBUTIONS=$(aws cloudfront list-distributions --query 'DistributionList.Items[*].[Id,Comment,Status]' --output text || echo "")

if [ -z "$DISTRIBUTIONS" ]; then
    log_info "No se encontraron distribuciones"
else
    # Obtener distribución actual
    CURRENT_CF=""
    if [ -f "terraform/frontend/.terraform/terraform.tfstate" ]; then
        CURRENT_CF=$(cd terraform/frontend && terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "")
    fi

    log_info "CloudFront actual en uso: ${CURRENT_CF}"
    echo ""

    echo "$DISTRIBUTIONS" | while read cf_id cf_comment cf_status; do
        # No eliminar la distribución actual
        if [ "$cf_id" == "$CURRENT_CF" ]; then
            log_success "✓ Mantener CloudFront actual: $cf_id ($cf_status)"
            continue
        fi

        if confirm "CloudFront Distribution: $cf_id ($cf_status)"; then
            log_warning "⚠️  Deshabilitar CloudFront antes de eliminar"
            log_info "   1. Obtener config:"
            echo "      aws cloudfront get-distribution-config --id $cf_id > cf-config.json"
            log_info "   2. Modificar Enabled=false en cf-config.json"
            log_info "   3. Actualizar distribución:"
            echo "      aws cloudfront update-distribution --id $cf_id --if-match <ETag> --distribution-config file://cf-config.json"
            log_info "   4. Esperar deploy (15-20 min)"
            log_info "   5. Eliminar:"
            echo "      aws cloudfront delete-distribution --id $cf_id --if-match <ETag>"
            echo ""
            log_warning "   CloudFront no se puede eliminar automáticamente (requiere deshabilitar primero)"
        fi
    done
fi

# ============================================
# 4. LIMPIAR LAMBDA FUNCTIONS VIEJAS
# ============================================
echo ""
log_info "⚡ Buscando Lambda functions viejas..."

LAMBDAS=$(aws lambda list-functions --region $REGION --query 'Functions[?starts_with(FunctionName, `PostConfirmation`) || starts_with(FunctionName, `cloudacademy`)].[FunctionName]' --output text || echo "")

if [ -z "$LAMBDAS" ]; then
    log_info "No se encontraron Lambdas viejas"
else
    CURRENT_LAMBDA=""
    if [ -f "terraform/backend/.terraform/terraform.tfstate" ]; then
        CURRENT_LAMBDA=$(cd terraform/backend && terraform show -json 2>/dev/null | grep -o '"function_name":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
    fi

    log_info "Lambda actual en uso: ${CURRENT_LAMBDA}"
    echo ""

    for lambda in $LAMBDAS; do
        if [ "$lambda" == "$CURRENT_LAMBDA" ]; then
            log_success "✓ Mantener Lambda actual: $lambda"
            continue
        fi

        if confirm "Lambda Function: $lambda"; then
            aws lambda delete-function --function-name $lambda --region $REGION 2>/dev/null || log_error "Error eliminando $lambda"
            log_success "✓ Lambda eliminada: $lambda"
        fi
    done
fi

# ============================================
# 5. LIMPIAR IAM ROLES VIEJOS
# ============================================
echo ""
log_info "🔐 Buscando IAM Roles viejos..."

IAM_ROLES=$(aws iam list-roles --query 'Roles[?starts_with(RoleName, `post_confirmation`) || starts_with(RoleName, `cloudacademy`)].[RoleName]' --output text || echo "")

if [ -z "$IAM_ROLES" ]; then
    log_info "No se encontraron IAM Roles viejos"
else
    CURRENT_ROLE=""
    if [ -f "terraform/backend/.terraform/terraform.tfstate" ]; then
        CURRENT_ROLE=$(cd terraform/backend && terraform show -json 2>/dev/null | grep -o '"role_name":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
    fi

    log_info "IAM Role actual en uso: ${CURRENT_ROLE}"
    echo ""

    for role in $IAM_ROLES; do
        if [ "$role" == "$CURRENT_ROLE" ]; then
            log_success "✓ Mantener IAM Role actual: $role"
            continue
        fi

        if confirm "IAM Role: $role"; then
            # Detach managed policies
            ATTACHED_POLICIES=$(aws iam list-attached-role-policies --role-name $role --query 'AttachedPolicies[*].PolicyArn' --output text 2>/dev/null || echo "")
            for policy in $ATTACHED_POLICIES; do
                aws iam detach-role-policy --role-name $role --policy-arn $policy 2>/dev/null || true
            done

            # Delete inline policies
            INLINE_POLICIES=$(aws iam list-role-policies --role-name $role --query 'PolicyNames[*]' --output text 2>/dev/null || echo "")
            for policy in $INLINE_POLICIES; do
                aws iam delete-role-policy --role-name $role --policy-name $policy 2>/dev/null || true
            done

            # Delete role
            aws iam delete-role --role-name $role 2>/dev/null || log_error "Error eliminando role $role"
            log_success "✓ IAM Role eliminado: $role"
        fi
    done
fi

# ============================================
# RESUMEN FINAL
# ============================================
echo ""
echo "============================================"
if [ "$DRY_RUN" = true ]; then
    log_info "✅ DRY-RUN completado - Nada fue eliminado"
    echo ""
    log_warning "Para eliminar realmente, ejecuta:"
    echo "  ./scripts/cleanup-old-resources.sh --confirm"
else
    log_success "✅ Limpieza completada"
fi
echo "============================================"
echo ""

# ============================================
# COSTOS AHORRADOS
# ============================================
echo "💰 Estimación de costos reducidos:"
echo "   - S3 buckets: ~\$1-2/mes por bucket eliminado"
echo "   - Cognito User Pools: ~\$2/mes por pool eliminado"
echo "   - CloudFront: ~\$10/mes por distribución eliminada"
echo "   - Lambda + IAM: <\$1/mes"
echo ""
