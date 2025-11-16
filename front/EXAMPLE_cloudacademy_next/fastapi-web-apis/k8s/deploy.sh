#!/bin/bash

# CloudAcademy Web APIs Deployment Script
# Deploys the web APIs microservice to K3s cluster

set -e

# Configuration
NAMESPACE="cloudacademy"
SERVICE_NAME="cloudacademy-web-apis"
IMAGE_NAME="registry.cloud-it.com.ar/cloudacademy-web-apis:latest"
DOMAIN="web-api.cloudacademy.ar"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Check if kubectl is available
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    log_success "kubectl is available"
}

# Check if namespace exists
check_namespace() {
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_success "Namespace '$NAMESPACE' exists"
    else
        log_warning "Namespace '$NAMESPACE' does not exist, creating it..."
        kubectl create namespace "$NAMESPACE"
        log_success "Namespace '$NAMESPACE' created"
    fi
}

# Process secret template with environment variables
process_secret_template() {
    log_info "Processing secret template with environment variables..."
    
    # Check if required environment variables are set
    required_vars=("DB_HOST" "DB_USER" "DB_PASSWORD" "DB_NAME" "DB_PORT")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    # Encode values in base64 (compatible with different systems)
    export DB_HOST_B64=$(echo -n "$DB_HOST" | base64 | tr -d '\n')
    export DB_USER_B64=$(echo -n "$DB_USER" | base64 | tr -d '\n')
    export DB_PASSWORD_B64=$(echo -n "$DB_PASSWORD" | base64 | tr -d '\n')
    export DB_NAME_B64=$(echo -n "$DB_NAME" | base64 | tr -d '\n')
    export DB_PORT_B64=$(echo -n "$DB_PORT" | base64 | tr -d '\n')
    
    # Debug: Show encoded values (without password)
    log_info "Encoded values check:"
    echo "DB_HOST_B64 length: ${#DB_HOST_B64}"
    echo "DB_USER_B64 length: ${#DB_USER_B64}"
    echo "DB_NAME_B64 length: ${#DB_NAME_B64}"
    echo "DB_PORT_B64 length: ${#DB_PORT_B64}"
    
    log_success "Environment variables encoded and ready for deployment"
}

# Deploy secrets
deploy_secrets() {
    log_info "Deploying secrets..."
    
    # Process the secret template
    envsubst < secret.yaml > secret-processed.yaml
    
    # Apply the processed secret
    kubectl apply -f secret-processed.yaml
    
    # Clean up processed file
    rm -f secret-processed.yaml
    
    log_success "Secret deployed successfully"
}

# Apply Kubernetes manifests
apply_manifests() {
    log_info "Applying Kubernetes manifests..."
    
    # Apply in specific order
    kubectl apply -f deployment.yaml
    kubectl apply -f service.yaml
    kubectl apply -f ingress.yaml
    kubectl apply -f hpa.yaml
    
    log_success "All manifests applied successfully"
}

# Wait for deployment to be ready
wait_for_deployment() {
    log_info "Waiting for deployment to be ready..."
    
    if kubectl wait --for=condition=available --timeout=300s deployment/"$SERVICE_NAME" -n "$NAMESPACE"; then
        log_success "Deployment is ready"
    else
        log_error "Deployment failed to become ready within 5 minutes"
        kubectl describe deployment "$SERVICE_NAME" -n "$NAMESPACE"
        exit 1
    fi
}

# Check pod status
check_pods() {
    log_info "Checking pod status..."
    kubectl get pods -n "$NAMESPACE" -l app="$SERVICE_NAME"
    
    # Show logs of first pod for debugging
    POD_NAME=$(kubectl get pods -n "$NAMESPACE" -l app="$SERVICE_NAME" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    if [ -n "$POD_NAME" ]; then
        log_info "Showing logs from pod: $POD_NAME"
        kubectl logs "$POD_NAME" -n "$NAMESPACE" --tail=20
    fi
}

# Test service connectivity
test_service() {
    log_info "Testing service connectivity..."
    
    # Test internal service
    kubectl run test-pod --image=curlimages/curl --rm -it --restart=Never -n "$NAMESPACE" -- \
        curl -s "http://$SERVICE_NAME-service.$NAMESPACE.svc.cluster.local/health" || true
    
    log_info "Service test completed"
}

# Show deployment information
show_deployment_info() {
    echo ""
    log_success "=== CloudAcademy Web APIs Deployment Complete ==="
    echo ""
    echo "📍 Service Information:"
    echo "   - Service Name: $SERVICE_NAME"
    echo "   - Namespace: $NAMESPACE"
    echo "   - Domain: https://$DOMAIN"
    echo "   - Internal Service: http://$SERVICE_NAME-service.$NAMESPACE.svc.cluster.local"
    echo ""
    echo "📊 Resources:"
    echo "   - Deployment: $SERVICE_NAME"
    echo "   - Service: $SERVICE_NAME-service"
    echo "   - Ingress: $SERVICE_NAME-ingress"
    echo "   - HPA: $SERVICE_NAME-hpa"
    echo ""
    echo "🔧 Useful Commands:"
    echo "   - Check pods: kubectl get pods -n $NAMESPACE -l app=$SERVICE_NAME"
    echo "   - View logs: kubectl logs -f deployment/$SERVICE_NAME -n $NAMESPACE"
    echo "   - Port forward: kubectl port-forward service/$SERVICE_NAME-service 8080:80 -n $NAMESPACE"
    echo "   - Delete deployment: kubectl delete -f . -n $NAMESPACE"
    echo ""
}

# Main deployment function
main() {
    log_info "Starting CloudAcademy Web APIs deployment..."
    
    # Change to k8s directory
    cd "$(dirname "$0")"
    
    # Pre-flight checks
    check_kubectl
    check_namespace
    
    # Process environment variables
    process_secret_template
    
    # Deploy components
    deploy_secrets
    apply_manifests
    wait_for_deployment
    
    # Post-deployment checks
    check_pods
    test_service
    
    # Show information
    show_deployment_info
    
    log_success "Deployment completed successfully! 🚀"
}

# Run if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi