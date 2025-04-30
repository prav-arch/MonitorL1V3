#!/bin/bash
# Script to clean up existing deployments and apply new versions

# Display current deployments and services
echo "Current deployments:"
kubectl get deployments
echo ""
echo "Current services:"
kubectl get services
echo ""

# Ask for confirmation before proceeding
read -p "This will delete existing deployments and create new ones. Continue? (y/n): " confirm
if [[ $confirm != "y" && $confirm != "Y" ]]; then
    echo "Operation cancelled"
    exit 0
fi

# Delete existing deployments
echo "Deleting existing deployments..."
kubectl delete deployment ollama || true
kubectl delete deployment l1-monitoring || true
kubectl delete deployment clickhouse || true
kubectl delete deployment postgres || true

# Delete existing services (optional - uncomment if needed)
# echo "Deleting existing services..."
# kubectl delete service ollama || true
# kubectl delete service l1-monitoring || true
# kubectl delete service clickhouse || true
# kubectl delete service postgres || true

# Apply new deployments
echo "Applying new deployments..."
kubectl apply -f k8s/deployment-all-v2.yaml

# Wait for deployments to be ready
echo "Waiting for deployments to be ready..."
kubectl rollout status deployment/ollama-v2
kubectl rollout status deployment/l1-monitoring-v2
kubectl rollout status deployment/clickhouse-v2
kubectl rollout status deployment/postgres-v2

# Display pod status
echo "Pod status:"
kubectl get pods

echo ""
echo "Deployment complete. Use 'kubectl get pods' to monitor pod status."
echo "To check Ollama container logs: kubectl logs -f \$(kubectl get pods -l app=ollama -o jsonpath='{.items[0].metadata.name}')"