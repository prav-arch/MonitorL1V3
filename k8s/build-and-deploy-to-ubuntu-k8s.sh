#!/bin/bash
# Complete script to build and deploy the L1 Monitoring application to Ubuntu Kubernetes

# Set script to exit on error
set -e

# Variables
NAMESPACE="l1-monitoring"
APP_IMAGE_NAME="l1-monitoring:latest"
USE_MICROK8S=false
USE_LOCAL_REGISTRY=false
LOCAL_REGISTRY="localhost:32000"

# Function to print colored output
print_info() {
    echo -e "\e[1;34m[INFO] $1\e[0m"
}

print_success() {
    echo -e "\e[1;32m[SUCCESS] $1\e[0m"
}

print_error() {
    echo -e "\e[1;31m[ERROR] $1\e[0m"
}

print_warning() {
    echo -e "\e[1;33m[WARNING] $1\e[0m"
}

# Display banner
echo "============================================="
echo "  L1 Monitoring App - Kubernetes Deployment  "
echo "  for Ubuntu-based Kubernetes clusters       "
echo "============================================="
echo ""

# Parse command line args
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --microk8s) USE_MICROK8S=true ;;
        --use-local-registry) USE_LOCAL_REGISTRY=true ;;
        --namespace) NAMESPACE="$2"; shift ;;
        --help) 
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --microk8s             Configure for microk8s"
            echo "  --use-local-registry   Use local registry (for microk8s)"
            echo "  --namespace NAME       Set custom namespace (default: l1-monitoring)"
            echo "  --help                 Show this help"
            exit 0
            ;;
        *) print_error "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed. Please install it first."
    exit 1
fi

# Check if docker is installed 
if ! command -v docker &> /dev/null; then
    print_warning "Docker is not installed. Skipping image build."
    BUILD_IMAGE=false
else
    BUILD_IMAGE=true
fi

# Check connection to Kubernetes
print_info "Checking connection to Kubernetes cluster..."
if ! kubectl cluster-info &> /dev/null; then
    print_error "Cannot connect to Kubernetes cluster. Please check your configuration."
    exit 1
fi
print_success "Successfully connected to Kubernetes cluster"

# Configure for MicroK8s if needed
if [ "$USE_MICROK8S" = true ]; then
    print_info "Configuring for MicroK8s..."
    
    # Enable required addons
    print_info "Enabling required MicroK8s addons..."
    sudo microk8s enable dns storage ingress registry
    
    if [ "$USE_LOCAL_REGISTRY" = true ]; then
        # Get the registry address
        LOCAL_REGISTRY="localhost:32000"
        print_info "Using MicroK8s registry at $LOCAL_REGISTRY"
    fi
fi

# Build the application image
if [ "$BUILD_IMAGE" = true ]; then
    print_info "Building application Docker image..."
    
    # Check if Dockerfile exists
    if [ ! -f "Dockerfile" ]; then
        print_warning "Dockerfile not found in current directory. Skipping image build."
    else
        # Build the image
        docker build -t $APP_IMAGE_NAME .
        print_success "Docker image built successfully: $APP_IMAGE_NAME"
        
        # Push to local registry if needed
        if [ "$USE_LOCAL_REGISTRY" = true ]; then
            print_info "Pushing image to local registry..."
            LOCAL_IMAGE_NAME="$LOCAL_REGISTRY/$APP_IMAGE_NAME"
            docker tag $APP_IMAGE_NAME $LOCAL_IMAGE_NAME
            docker push $LOCAL_IMAGE_NAME
            print_success "Image pushed to local registry: $LOCAL_IMAGE_NAME"
            
            # Update image name for deployment
            APP_IMAGE_NAME=$LOCAL_IMAGE_NAME
        fi
    fi
fi

# Create namespace
print_info "Creating namespace: $NAMESPACE"
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Clean existing resources
print_info "Cleaning up existing resources in namespace: $NAMESPACE"
kubectl delete --all deployments --namespace=$NAMESPACE --ignore-not-found=true
kubectl delete --all services --namespace=$NAMESPACE --ignore-not-found=true
kubectl delete --all pods --namespace=$NAMESPACE --ignore-not-found=true
kubectl delete --all pvc --namespace=$NAMESPACE --ignore-not-found=true
kubectl delete --all configmaps --namespace=$NAMESPACE --ignore-not-found=true
kubectl delete --all secrets --namespace=$NAMESPACE --ignore-not-found=true
kubectl delete --all ingress --namespace=$NAMESPACE --ignore-not-found=true

# Wait for resources to be deleted
print_info "Waiting for resources to be deleted..."
sleep 5

# Check for default storage class
print_info "Checking for default storage class..."
if kubectl get storageclass | grep -q "(default)"; then
    print_success "Default storage class found"
    STORAGE_CLASS=""
elif kubectl get storageclass | grep -q "microk8s-hostpath"; then
    print_success "MicroK8s hostpath storage class found"
    STORAGE_CLASS="microk8s-hostpath"
else
    print_warning "No default storage class found. Using emptyDir for all volumes."
    USE_EMPTY_DIR=true
fi

# Create secrets
print_info "Creating secrets in namespace: $NAMESPACE"
cat <<EOF | kubectl apply -f - -n $NAMESPACE
apiVersion: v1
kind: Secret
metadata:
  name: l1-monitoring-secrets
type: Opaque
data:
  postgres-db: cG9zdGdyZXM=        # postgres
  postgres-user: cG9zdGdyZXM=       # postgres
  postgres-password: cG9zdGdyZXM=   # postgres
  clickhouse-user: ZGVmYXVsdA==     # default
  clickhouse-password: 
  ollama-api-key: 
  app-secret-key: bDFtb25pdG9yaW5nc2VjcmV0a2V5  # l1monitoringsecretkey
EOF

# Create persistent volume claims (if not using emptyDir)
if [ "$USE_EMPTY_DIR" != true ]; then
    print_info "Creating persistent volume claims in namespace: $NAMESPACE"
    
    # Create PVC for PostgreSQL
    cat <<EOF | kubectl apply -f - -n $NAMESPACE
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
  storageClassName: ${STORAGE_CLASS}
EOF
    
    # Create PVC for ClickHouse
    cat <<EOF | kubectl apply -f - -n $NAMESPACE
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: clickhouse-data-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 40Gi
  storageClassName: ${STORAGE_CLASS}
EOF
fi

# Create all deployments and services
print_info "Applying all deployments and services..."

# Create a temporary deployment file with updated image name
temp_deployment_file=$(mktemp)

# Get the deployment script
cp k8s/fresh-namespace-deployment.sh $temp_deployment_file

# Update the image name if needed
if [ "$BUILD_IMAGE" = true ] && [ "$USE_LOCAL_REGISTRY" = true ]; then
    sed -i "s|image: l1-monitoring:latest|image: $APP_IMAGE_NAME|g" $temp_deployment_file
fi

# If using emptyDir, update volume configurations
if [ "$USE_EMPTY_DIR" = true ]; then
    sed -i 's|persistentVolumeClaim:|emptyDir: {}|g' $temp_deployment_file
    sed -i 's|claimName: postgres-data-pvc||g' $temp_deployment_file
    sed -i 's|claimName: clickhouse-data-pvc||g' $temp_deployment_file
fi

# Execute the script
bash $temp_deployment_file

# Clean up the temporary file
rm $temp_deployment_file

# Check status of deployments
print_info "Checking deployment status..."
kubectl get deployments -n $NAMESPACE

# Check status of pods
print_info "Checking pod status..."
kubectl get pods -n $NAMESPACE

# Final instructions
echo ""
print_success "===================================================="
print_success " L1 Monitoring application deployed to namespace: $NAMESPACE"
print_success "===================================================="
echo ""
print_info "To monitor pod status, run:"
echo "  kubectl get pods -n $NAMESPACE -w"
echo ""
print_info "To check Ollama logs, run:"
echo "  kubectl logs -f \$(kubectl get pods -n $NAMESPACE -l app=ollama -o jsonpath='{.items[0].metadata.name}') -n $NAMESPACE"
echo ""
print_info "To access the application using port-forward, run:"
echo "  kubectl port-forward svc/l1-monitoring 8080:80 -n $NAMESPACE"
echo "  Then open http://localhost:8080 in your browser"
echo ""
print_info "To create a NodePort service for external access, run:"
echo "  kubectl patch svc l1-monitoring -p '{\"spec\":{\"type\":\"NodePort\"}}' -n $NAMESPACE"
echo "  kubectl get svc l1-monitoring -n $NAMESPACE  # To get the port number"
echo ""
print_info "To check for any scheduling issues, run:"
echo "  kubectl describe pods -n $NAMESPACE | grep -A10 'Events:'"