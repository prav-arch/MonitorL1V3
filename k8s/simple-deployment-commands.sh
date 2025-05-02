#!/bin/bash
# Simple deployment commands without any interactive prompts
# Use this script if you want to just apply the v2 deployments without deleting anything

# Display what we're going to do
echo "This script will apply the v2 deployment files without deleting any existing resources."
echo "Any existing deployments with the same names will remain untouched."
echo "New deployments with -v2 suffix will be created alongside existing ones."
echo ""

# Apply the deployments
echo "Applying v2 deployments..."
kubectl apply -f k8s/deployment-all-v2.yaml

# Display current state
echo ""
echo "Current deployments:"
kubectl get deployments
echo ""
echo "Current pods:"
kubectl get pods
echo ""
echo "Current services:"
kubectl get services

echo ""
echo "Deployment complete! The new deployments have -v2 in their names."
echo "Once you verify they're working correctly, you can delete the old ones with:"
echo "kubectl delete deployment ollama"
echo "kubectl delete deployment l1-monitoring"
echo "kubectl delete deployment clickhouse"
echo "kubectl delete deployment postgres"
echo ""
echo "To check Ollama container logs: kubectl logs \$(kubectl get pods -l app=ollama -o jsonpath='{.items[0].metadata.name}')"