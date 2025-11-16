#!/bin/bash

# CloudAcademy FastAPI Backend Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="cloudacademy"
APP_NAME="fastapi-bedrock"
DOCKER_IMAGE="your-registry/fastapi-bedrock:latest"

echo -e "${BLUE}🚀 CloudAcademy FastAPI Backend Deployment${NC}"
echo -e "${BLUE}===========================================${NC}"

# Function to check if kubectl is available
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        echo -e "${RED}❌ kubectl is not installed or not in PATH${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ kubectl is available${NC}"
}

# Function to check if we can connect to cluster
check_cluster() {
    if ! kubectl cluster-info &> /dev/null; then
        echo -e "${RED}❌ Cannot connect to Kubernetes cluster${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Connected to Kubernetes cluster${NC}"
}

# Function to create namespace if it doesn't exist
create_namespace() {
    if kubectl get namespace $NAMESPACE &> /dev/null; then
        echo -e "${YELLOW}⚠️  Namespace '$NAMESPACE' already exists${NC}"
    else
        echo -e "${BLUE}📁 Creating namespace '$NAMESPACE'...${NC}"
        kubectl apply -f namespace.yaml
        echo -e "${GREEN}✅ Namespace created${NC}"
    fi
}

# Function to create secrets
create_secrets() {
    echo -e "${BLUE}🔐 Setting up secrets...${NC}"
    
    if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
        echo -e "${YELLOW}⚠️  AWS credentials not set in environment variables${NC}"
        echo -e "${YELLOW}   Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY${NC}"
        echo -e "${YELLOW}   Or create the secret manually:${NC}"
        echo -e "${YELLOW}   kubectl create secret generic fastapi-bedrock-secrets \\${NC}"
        echo -e "${YELLOW}     --namespace=$NAMESPACE \\${NC}"
        echo -e "${YELLOW}     --from-literal=AWS_ACCESS_KEY_ID=your-key \\${NC}"
        echo -e "${YELLOW}     --from-literal=AWS_SECRET_ACCESS_KEY=your-secret${NC}"
    else
        echo -e "${BLUE}🔑 Creating AWS credentials secret...${NC}"
        kubectl create secret generic fastapi-bedrock-secrets \
            --namespace=$NAMESPACE \
            --from-literal=AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
            --from-literal=AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
            --dry-run=client -o yaml | kubectl apply -f -
        echo -e "${GREEN}✅ AWS credentials secret created${NC}"
    fi
}

# Function to deploy application
deploy_app() {
    echo -e "${BLUE}🚢 Deploying FastAPI application...${NC}"
    
    # Apply all manifests
    kubectl apply -f configmap.yaml
    kubectl apply -f deployment.yaml
    kubectl apply -f service.yaml
    kubectl apply -f ingress.yaml
    kubectl apply -f hpa.yaml
    
    # Optional: Apply network policy if your cluster supports it
    if kubectl get crd networkpolicies.networking.k8s.io &> /dev/null; then
        kubectl apply -f networkpolicy.yaml
        echo -e "${GREEN}✅ Network policy applied${NC}"
    else
        echo -e "${YELLOW}⚠️  NetworkPolicy CRD not found, skipping...${NC}"
    fi
    
    # Optional: Apply service monitor if Prometheus is installed
    if kubectl get crd servicemonitors.monitoring.coreos.com &> /dev/null; then
        kubectl apply -f servicemonitor.yaml
        echo -e "${GREEN}✅ Service monitor applied${NC}"
    else
        echo -e "${YELLOW}⚠️  ServiceMonitor CRD not found, skipping...${NC}"
    fi
    
    echo -e "${GREEN}✅ Application deployed${NC}"
}

# Function to check deployment status
check_deployment() {
    echo -e "${BLUE}🔍 Checking deployment status...${NC}"
    
    # Wait for deployment to be ready
    echo -e "${BLUE}⏳ Waiting for deployment to be ready...${NC}"
    kubectl wait --for=condition=available --timeout=300s deployment/$APP_NAME -n $NAMESPACE
    
    # Get pod status
    echo -e "${BLUE}📊 Pod status:${NC}"
    kubectl get pods -n $NAMESPACE -l app=$APP_NAME
    
    # Get service info
    echo -e "${BLUE}🌐 Service info:${NC}"
    kubectl get svc -n $NAMESPACE -l app=$APP_NAME
    
    # Get ingress info
    echo -e "${BLUE}🚪 Ingress info:${NC}"
    kubectl get ingress -n $NAMESPACE -l app=$APP_NAME
}

# Function to show logs
show_logs() {
    echo -e "${BLUE}📋 Recent logs:${NC}"
    kubectl logs -n $NAMESPACE -l app=$APP_NAME --tail=20
}

# Function to port forward for local testing
port_forward() {
    echo -e "${BLUE}🔗 Setting up port forward for local testing...${NC}"
    echo -e "${YELLOW}   Access the API at: http://localhost:8080${NC}"
    echo -e "${YELLOW}   Press Ctrl+C to stop${NC}"
    kubectl port-forward -n $NAMESPACE svc/fastapi-bedrock-service 8080:80
}

# Main execution
main() {
    echo -e "${BLUE}🔍 Pre-flight checks...${NC}"
    check_kubectl
    check_cluster
    
    echo -e "\n${BLUE}🛠️  Setting up infrastructure...${NC}"
    create_namespace
    create_secrets
    
    echo -e "\n${BLUE}🚀 Deploying application...${NC}"
    deploy_app
    
    echo -e "\n${BLUE}✅ Checking results...${NC}"
    check_deployment
    
    echo -e "\n${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${BLUE}===========================================${NC}"
    echo -e "${GREEN}✅ FastAPI Backend is now running in K8s${NC}"
    echo -e "${BLUE}📚 Next steps:${NC}"
    echo -e "${YELLOW}   1. Update your DNS to point to the ingress${NC}"
    echo -e "${YELLOW}   2. Test the API endpoints${NC}"
    echo -e "${YELLOW}   3. Update frontend to use the new API URL${NC}"
    echo -e "\n${BLUE}🔧 Useful commands:${NC}"
    echo -e "${YELLOW}   kubectl get pods -n $NAMESPACE${NC}"
    echo -e "${YELLOW}   kubectl logs -f -n $NAMESPACE -l app=$APP_NAME${NC}"
    echo -e "${YELLOW}   kubectl exec -it -n $NAMESPACE deployment/$APP_NAME -- /bin/bash${NC}"
    echo -e "\n${BLUE}🌐 Local testing:${NC}"
    echo -e "${YELLOW}   Run: $0 port-forward${NC}"
}

# Handle command line arguments
case "${1:-}" in
    "port-forward")
        port_forward
        ;;
    "logs")
        show_logs
        ;;
    "status")
        check_deployment
        ;;
    "help"|"-h"|"--help")
        echo -e "${BLUE}Usage: $0 [command]${NC}"
        echo -e "${BLUE}Commands:${NC}"
        echo -e "${YELLOW}  (no args)    - Full deployment${NC}"
        echo -e "${YELLOW}  port-forward - Forward port for local testing${NC}"
        echo -e "${YELLOW}  logs         - Show recent logs${NC}"
        echo -e "${YELLOW}  status       - Check deployment status${NC}"
        echo -e "${YELLOW}  help         - Show this help${NC}"
        ;;
    *)
        main
        ;;
esac