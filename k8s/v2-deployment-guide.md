# Step-by-Step Guide to Apply v2 Deployments

## Prerequisites
- Make sure you have `kubectl` configured to access your cluster
- You should be in the root directory of the project

## Step 1: Check current state
First, check what resources currently exist in your cluster:

```bash
kubectl get deployments
kubectl get services
kubectl get pods
```

## Step 2: Apply the new deployment file
Apply the new v2 deployment file without deleting anything first:

```bash
kubectl apply -f k8s/deployment-all-v2.yaml
```

This will create all new resources with the v2 suffix. You might see warnings about existing resources (like services) that are unchanged - this is normal.

## Step 3: Check the status of the new deployments
After applying, check if the new deployments are created:

```bash
kubectl get deployments
```

You should see the new deployments with -v2 in their names alongside any existing deployments.

## Step 4: Monitor pod creation
Watch the pods as they are created:

```bash
kubectl get pods -w
```

Press Ctrl+C to exit the watch mode once all pods are Running.

## Step 5: Check for issues
If any pods are stuck in Pending or CrashLoopBackOff, check their details:

```bash
kubectl describe pod <pod-name>
```

For pods with CrashLoopBackOff, check their logs:

```bash
kubectl logs <pod-name>
```

## Step 6: Verify new deployments work
Test that the new services are working correctly:

```bash
# Test the main application
kubectl port-forward svc/l1-monitoring 8080:80
# In another terminal or browser, access http://localhost:8080

# Test Ollama service
kubectl port-forward svc/ollama 8081:11434
# In another terminal: curl http://localhost:8081/api/health
```

## Step 7: Delete old deployments (optional)
Only after confirming the new deployments work, delete the old ones:

```bash
kubectl delete deployment ollama
kubectl delete deployment l1-monitoring
kubectl delete deployment clickhouse
kubectl delete deployment postgres
```

## Step 8: Troubleshooting

### Volume Issues
If pods are stuck in Pending state due to PVC issues, edit the deployment to use emptyDir instead:

```bash
kubectl edit deployment <deployment-name>
```

Find the `volumes` section and replace PVC with emptyDir (similar to Ollama's configuration).

### Resource Constraints
If nodes don't have enough resources, reduce requests in the deployment:

```bash
kubectl edit deployment <deployment-name>
```

Find the `resources.requests` section and lower memory/CPU values.

### Pod Scheduling Issues
If pods won't schedule due to taints, add appropriate tolerations (similar to those in the Ollama deployment).

## Step 9: Cleaning up (in case of problems)
If you need to start over completely:

```bash
# Delete all v2 resources
kubectl delete -f k8s/deployment-all-v2.yaml

# Wait for resources to be deleted
sleep 10

# Apply again
kubectl apply -f k8s/deployment-all-v2.yaml
```