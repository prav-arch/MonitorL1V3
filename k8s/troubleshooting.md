# Kubernetes Deployment Troubleshooting Guide

## Handling "Spec is Immutable" Errors

When you get the error `spec is immutable after creation except resources.requests`, it means you're trying to modify fields in a Deployment that can't be changed after creation.

### Solution:

1. **Delete the old deployment before applying the new one:**
   ```bash
   kubectl delete deployment ollama
   kubectl apply -f k8s/deployments/ollama-v2-deployment.yaml
   ```

2. **Alternatively, use a new deployment name:**
   - This is why our v2 deployments use new names (ollama-v2, postgres-v2, etc.)
   - The clean-and-deploy.sh script handles this automatically

## Common Deployment Issues and Solutions

### 1. "deployment not found" errors

**Problem:** When running `kubectl delete deployment <name>`, you get an error that the deployment doesn't exist.

**Solution:** 
- This is normal if the deployment hasn't been created yet
- The updated clean-and-deploy.sh script checks for existence before deleting
- You can safely ignore these errors and proceed to apply the new deployments

### 2. Pods staying in "Pending" state

**Problem:** Pods created but remain in "Pending" state indefinitely.

**Solutions:**
- Check for PVC issues: `kubectl describe pvc`
- Check node capacity: `kubectl describe nodes`
- Check for taints: `kubectl describe nodes | grep Taints`
- Use emptyDir volume instead of PVC (already implemented in v2 deployments)
- Add appropriate tolerations (already implemented in v2 deployments)

### 3. "CrashLoopBackOff" errors

**Problem:** Pods start but keep crashing and restarting.

**Solutions:**
- Check logs: `kubectl logs <pod-name>`
- Check for resource constraints: `kubectl describe pod <pod-name>`
- Verify container configuration: `kubectl describe pod <pod-name> | grep -A20 Containers:`

### 4. Service connectivity issues

**Problem:** Services can't communicate with each other.

**Solutions:**
- Verify services exist: `kubectl get services`
- Check service endpoints: `kubectl get endpoints`
- Try direct curl from a pod: `kubectl exec -it <pod-name> -- curl http://<service-name>:<port>`

## Debugging Commands

```bash
# Check pod status with details
kubectl get pods -o wide

# Describe a pod to see events and issues
kubectl describe pod <pod-name>

# Check logs
kubectl logs <pod-name>

# Execute a command in a pod
kubectl exec -it <pod-name> -- /bin/bash

# Check persistent volume claims
kubectl get pvc

# Check node capacity
kubectl describe nodes

# Check cluster events
kubectl get events --sort-by='.lastTimestamp'
```

## Storage Class Issues

If your cluster doesn't have a default storage class or the specified storage class doesn't exist:

1. **Check available storage classes:**
   ```bash
   kubectl get storageclass
   ```

2. **Update the PVC specification:**
   - Use an available storage class: `storageClassName: <available-class>`
   - Or use an empty string for the default provisioner: `storageClassName: ""`
   - Or use emptyDir for temporary storage (already implemented for Ollama)

## Recreating the Entire Deployment

If you want to start fresh:

```bash
# Delete all resources
kubectl delete -f k8s/deployment-all-v2.yaml

# Wait a moment
sleep 10

# Apply again
kubectl apply -f k8s/deployment-all-v2.yaml
```