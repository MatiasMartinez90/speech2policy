#!/bin/bash

###############################################################################
# Script de Migración de Categorías a DynamoDB (Bash version)
#
# Este script migra las categorías hardcoded a DynamoDB usando curl.
# Es una alternativa más simple al script TypeScript.
#
# Uso:
#   ./scripts/migrate-categories.sh YOUR_JWT_TOKEN
#
# O con variable de entorno:
#   export MIGRATION_AUTH_TOKEN="your-jwt-token"
#   ./scripts/migrate-categories.sh
###############################################################################

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
API_URL="${NEXT_PUBLIC_TUTOR_API_URL:-https://mpomvd5y24.execute-api.us-east-1.amazonaws.com/prod/api}"
AUTH_TOKEN="${1:-${MIGRATION_AUTH_TOKEN}}"

echo -e "${BLUE}🚀 Iniciando migración de categorías a DynamoDB${NC}\n"
echo -e "${BLUE}📍 API URL: ${API_URL}${NC}"

if [ -z "$AUTH_TOKEN" ]; then
    echo -e "${RED}❌ ERROR: Token de autenticación no proporcionado${NC}\n"
    echo "Uso:"
    echo "  ./scripts/migrate-categories.sh YOUR_JWT_TOKEN"
    echo ""
    echo "O configurar variable de entorno:"
    echo "  export MIGRATION_AUTH_TOKEN=\"your-jwt-token\""
    echo "  ./scripts/migrate-categories.sh"
    echo ""
    echo "Para obtener el token:"
    echo "1. Inicia sesión en la aplicación como admin"
    echo "2. Abre DevTools > Application > Local Storage"
    echo "3. Busca: CognitoIdentityServiceProvider.{clientId}.{user}.idToken"
    echo "4. Copia el valor del token"
    exit 1
fi

echo -e "${GREEN}🔑 Token: Configurado ✓${NC}\n"

# Contador de resultados
SUCCESS=0
SKIPPED=0
FAILED=0

# Función para crear categoría
create_category() {
    local category_data="$1"
    local category_name="$2"

    echo -e "${BLUE}📤 Migrando: ${category_name}${NC}"

    response=$(curl -s -w "\n%{http_code}" -X POST \
        "${API_URL}/categories" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${AUTH_TOKEN}" \
        -d "$category_data")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "201" ]; then
        echo -e "   ${GREEN}✅ Migrada exitosamente${NC}"
        ((SUCCESS++))
    elif [ "$http_code" = "409" ]; then
        echo -e "   ${YELLOW}⚠️  Ya existe (saltada)${NC}"
        ((SKIPPED++))
    else
        echo -e "   ${RED}❌ Error HTTP ${http_code}${NC}"
        echo -e "   ${RED}   Response: ${body}${NC}"
        ((FAILED++))
    fi

    sleep 0.5
}

echo -e "${BLUE}📋 Categorías a migrar: 7${NC}\n"

# 1. Bedrock
create_category '{
  "label": "Bedrock",
  "emoji": "🤖",
  "color": "from-purple-500 to-blue-600",
  "description": "Amazon Bedrock & RAG - Build AI chatbots with generative AI",
  "architecture": [
    {"icon": "📚", "title": "Knowledge Base", "description": "Document ingestion, chunking, embedding generation con Bedrock", "color": "from-blue-500 to-cyan-600"},
    {"icon": "🔍", "title": "Retrieval System", "description": "Vector search, similarity matching, context selection", "color": "from-purple-500 to-pink-600"},
    {"icon": "🤖", "title": "Generation Layer", "description": "Claude integration, prompt engineering, response synthesis", "color": "from-green-500 to-teal-600"}
  ],
  "level": "advanced",
  "display_order": 1,
  "featured": true,
  "course_count": 8
}' "Bedrock"

# 2. Security
create_category '{
  "label": "Security",
  "emoji": "🔒",
  "color": "from-red-500 to-orange-600",
  "description": "IAM, WAF, Shield - Secure your AWS infrastructure",
  "architecture": [
    {"icon": "🔐", "title": "Identity & Access", "description": "IAM policies, roles, MFA, identity federation y SSO", "color": "from-red-500 to-pink-600"},
    {"icon": "🛡️", "title": "Network Protection", "description": "WAF, Shield, Security Groups, Network ACLs", "color": "from-orange-500 to-red-600"},
    {"icon": "📊", "title": "Monitoring & Compliance", "description": "CloudTrail, GuardDuty, Security Hub, Config", "color": "from-purple-500 to-blue-600"}
  ],
  "level": "intermediate",
  "display_order": 2,
  "featured": true,
  "course_count": 18
}' "Security"

# 3. Networking
create_category '{
  "label": "Networking",
  "emoji": "🌐",
  "color": "from-blue-500 to-cyan-600",
  "description": "VPC, Route 53, CDN - Build scalable network architectures",
  "architecture": [
    {"icon": "🏗️", "title": "VPC Architecture", "description": "Subnets, routing tables, NAT, Internet Gateway", "color": "from-blue-500 to-indigo-600"},
    {"icon": "🌍", "title": "DNS & CDN", "description": "Route 53, CloudFront, edge locations, caching", "color": "from-cyan-500 to-blue-600"},
    {"icon": "⚖️", "title": "Load Balancing", "description": "ALB, NLB, target groups, health checks", "color": "from-green-500 to-teal-600"}
  ],
  "level": "intermediate",
  "display_order": 3,
  "featured": true,
  "course_count": 16
}' "Networking"

# 4. Compute
create_category '{
  "label": "Compute",
  "emoji": "⚡",
  "color": "from-yellow-500 to-orange-600",
  "description": "EC2, Lambda, ECS - Deploy and scale compute resources",
  "architecture": [
    {"icon": "🖥️", "title": "Virtual Machines", "description": "EC2 instances, AMI, auto scaling, placement groups", "color": "from-yellow-500 to-orange-600"},
    {"icon": "⚡", "title": "Serverless", "description": "Lambda functions, API Gateway, event-driven architecture", "color": "from-purple-500 to-pink-600"},
    {"icon": "🐳", "title": "Containers", "description": "ECS, EKS, Fargate, container orchestration", "color": "from-blue-500 to-cyan-600"}
  ],
  "level": "intermediate",
  "display_order": 4,
  "featured": false,
  "course_count": 20
}' "Compute"

# 5. AWS Cloud Practitioner
create_category '{
  "label": "AWS Cloud Practitioner",
  "emoji": "☁️",
  "color": "from-orange-500 to-yellow-600",
  "description": "AWS CLF-C02 Certification - Master cloud fundamentals",
  "architecture": [
    {"icon": "🌩️", "title": "Cloud Concepts", "description": "AWS global infrastructure, regions, availability zones", "color": "from-blue-500 to-cyan-600"},
    {"icon": "🔧", "title": "Core Services", "description": "Compute, storage, database, networking fundamentals", "color": "from-orange-500 to-yellow-600"},
    {"icon": "💰", "title": "Billing & Support", "description": "Pricing models, cost optimization, support plans", "color": "from-green-500 to-teal-600"}
  ],
  "level": "beginner",
  "display_order": 5,
  "featured": true,
  "course_count": 24
}' "AWS Cloud Practitioner"

# 6. DevOps
create_category '{
  "label": "DevOps",
  "emoji": "⚙️",
  "color": "from-green-500 to-teal-600",
  "description": "CI/CD, Terraform, Docker - Automate your infrastructure",
  "architecture": [
    {"icon": "🔄", "title": "CI/CD Pipeline", "description": "CodePipeline, CodeBuild, CodeDeploy, automated testing", "color": "from-green-500 to-emerald-600"},
    {"icon": "🏗️", "title": "Infrastructure as Code", "description": "Terraform, CloudFormation, configuration management", "color": "from-blue-500 to-indigo-600"},
    {"icon": "📊", "title": "Monitoring & Logging", "description": "CloudWatch, X-Ray, logging strategies, alerting", "color": "from-orange-500 to-red-600"}
  ],
  "level": "advanced",
  "display_order": 6,
  "featured": true,
  "course_count": 28
}' "DevOps"

# 7. Databases
create_category '{
  "label": "Databases",
  "emoji": "🗄️",
  "color": "from-indigo-500 to-purple-600",
  "description": "RDS, DynamoDB, Aurora - Design scalable data solutions",
  "architecture": [
    {"icon": "🗄️", "title": "Relational Databases", "description": "RDS, Aurora, backup strategies, read replicas", "color": "from-blue-500 to-indigo-600"},
    {"icon": "⚡", "title": "NoSQL Solutions", "description": "DynamoDB, DocumentDB, key-value stores, indexing", "color": "from-purple-500 to-pink-600"},
    {"icon": "🚀", "title": "Caching & Performance", "description": "ElastiCache, DAX, query optimization, partitioning", "color": "from-orange-500 to-red-600"}
  ],
  "level": "intermediate",
  "display_order": 7,
  "featured": false,
  "course_count": 15
}' "Databases"

# Resumen
echo -e "\n${BLUE}================================================================${NC}"
echo -e "${BLUE}📊 RESUMEN DE MIGRACIÓN${NC}"
echo -e "${BLUE}================================================================${NC}\n"
echo -e "${GREEN}✅ Exitosas:    ${SUCCESS}${NC}"
echo -e "${YELLOW}⚠️  Saltadas:    ${SKIPPED}${NC}"
echo -e "${RED}❌ Fallidas:    ${FAILED}${NC}"
echo -e "${BLUE}📊 Total:       $((SUCCESS + SKIPPED + FAILED))${NC}\n"

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ Migración completada con errores${NC}\n"
    exit 1
else
    echo -e "${GREEN}✨ Migración completada exitosamente!${NC}\n"
    exit 0
fi
