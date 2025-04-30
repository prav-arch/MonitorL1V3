#!/bin/bash
# Script to clean up existing deployments and apply new versions

# Function to safely delete a resource if it exists
safe_delete() {
  resource_type=$1
  resource_name=$2
  
  if kubectl get $resource_type $resource_name &>/dev/null; then
    echo "Deleting $resource_type/$resource_name..."
    kubectl delete $resource_type $resource_name
    sleep 2
  else
    echo "$resource_type/$resource_name not found, skipping deletion."
  fi
}

# Display current deployments and services
echo "Current deployments:"
kubectl get deployments
echo ""
echo "Current services:"
kubectl get services
echo ""
echo "Current pods:"
kubectl get pods
echo ""

# Ask for confirmation before proceeding
read -p "This will apply new deployments. Continue? (y/n): " confirm
if [[ $confirm != "y" && $confirm != "Y" ]]; then
    echo "Operation cancelled"
    exit 0
fi

# Safely delete existing deployments (both old and v2 versions)
echo "Checking for and deleting existing deployments..."
safe_delete deployment ollama
safe_delete deployment ollama-v2
safe_delete deployment l1-monitoring
safe_delete deployment l1-monitoring-v2
safe_delete deployment clickhouse
safe_delete deployment clickhouse-v2
safe_delete deployment postgres
safe_delete deployment postgres-v2

# Apply new deployments
echo "Applying new deployments..."
kubectl apply -f k8s/secrets/secrets.yaml
kubectl apply -f k8s/deployment-all-v2.yaml

# Wait for pods to be created
echo "Waiting for pods to be created..."
sleep 5

# Check if deployments exist before trying to wait for them
echo "Checking deployment status..."
kubectl get deployments

# Wait for deployments to be ready with error handling
wait_for_deployment() {
  deployment=$1
  if kubectl get deployment $deployment &>/dev/null; then
    echo "Waiting for deployment/$deployment to be ready..."
    kubectl rollout status deployment/$deployment --timeout=60s || echo "Warning: Timeout waiting for $deployment"
  else
    echo "Deployment $deployment not found, skipping wait."
  fi
}

wait_for_deployment ollama-v2
wait_for_deployment l1-monitoring-v2
wait_for_deployment clickhouse-v2
wait_for_deployment postgres-v2

# Display pod status
echo "Pod status:"
kubectl get pods -o wide

# Check for pods that are not running
echo "Checking for problematic pods..."
kubectl get pods | grep -v Running | grep -v Completed || echo "All pods are running or completed!"

echo ""
echo "Deployment complete. Use 'kubectl get pods' to monitor pod status."
echo "To check Ollama container logs: kubectl logs -f \$(kubectl get pods -l app=ollama -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo 'no-ollama-pod-found')"

# Check for scheduling issues
echo ""
echo "Checking for pod scheduling issues..."
for pod in $(kubectl get pods -o jsonpath='{.items[*].metadata.name}'); do
  echo "=== Pod: $pod ==="
  kubectl describe pod $pod | grep -A5 "Events:" | tail -n +2
  echo ""
done