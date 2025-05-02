# v2 Deployment Troubleshooting Guide

## Common Issues and Solutions

### 1. `spec is immutable after creation except resources.requests` error

**Problem:** When trying to update an existing deployment, Kubernetes rejects the change because some fields are immutable.

**Solution:** 
- Use a new deployment name with a suffix like `-v2`
- All of our v2 deployments use this naming strategy already
- Apply with `kubectl apply -f k8s/deployment-all-v2.yaml`

### 2. `deployment not found` error

**Problem:** When trying to delete a deployment that doesn't exist, you get an error.

**Solution:**
- This is expected if you're trying to delete deployments that don't exist yet
- Ignore these errors and proceed with applying the new deployments
- Use the `safe_delete()` function in the updated `clean-and-deploy.sh` script

### 3. PVC issues with `ClickHouse` or `Postgres`

**Problem:** Pods remain in `Pending` state because the PVC can't be provisioned.

**Solutions:**
- Check available storage classes: `kubectl get storageclass`
- Modify the PVC to use an available storageClass
- For testing, use emptyDir instead of PVC:

```yaml
volumes:
- name: data-volume
  emptyDir: {}
```

### 4. Ollama pod crashes or fails to start

**Problem:** The Ollama pod starts but keeps crashing with `CrashLoopBackOff`.

**Solutions:**
- Check logs: `kubectl logs $(kubectl get pods -l app=ollama -o jsonpath='{.items[0].metadata.name}')`
- Verify it has enough resources (our v2 deployment already reduced requirements)
- Make sure the container can pull the Llama2 model (check network connectivity)

### 5. Pods won't schedule due to taints

**Problem:** Pods remain in `Pending` state with a message about node taints.

**Solution:**
- Our v2 deployments already include common tolerations
- If needed, check your node taints: `kubectl describe nodes | grep Taint`
- Add any specific tolerations needed for your cluster

## Quick Fixes

### To debug a specific pod:

```bash
# Get pod details including events
kubectl describe pod <pod-name>

# Check logs
kubectl logs <pod-name>

# Execute commands inside the pod
kubectl exec -it <pod-name> -- /bin/sh
```

### To verify Ollama is running:

```bash
# Get the Ollama pod name
OLLAMA_POD=$(kubectl get pods -l app=ollama -o jsonpath='{.items[0].metadata.name}')

# Check the health endpoint
kubectl exec $OLLAMA_POD -- curl -s http://localhost:11434/api/health

# Check available models
kubectl exec $OLLAMA_POD -- curl -s http://localhost:11434/api/tags
```

### To check storage issues:

```bash
# List persistent volume claims and their status
kubectl get pvc

# Check events related to storage
kubectl get events | grep -i volume
```

### Complete reset if needed:

```bash
# Delete everything
kubectl delete -f k8s/deployment-all-v2.yaml

# Delete PVC if needed (will delete data!)
kubectl delete pvc postgres-data-pvc
kubectl delete pvc clickhouse-data-pvc

# Start fresh
kubectl apply -f k8s/deployment-all-v2.yaml
```