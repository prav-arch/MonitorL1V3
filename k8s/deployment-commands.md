# Kubernetes Deployment Commands

## Handling "Spec is Immutable" Errors

When you get the error "spec is immutable after creation except resources.requests", it means you're trying to modify fields in a Deployment that can't be changed after creation. To fix this, follow these steps:

### 1. Delete the existing deployment

```bash
kubectl delete deployment ollama
```

### 2. Apply the new deployment with the updated configuration

```bash
kubectl apply -f k8s/deployments/ollama-v2-deployment.yaml
```

### 3. Verify the deployment is running

```bash
kubectl get pods
```

## Using the Combined Deployment File

For a fresh installation using the combined deployment file:

```bash
kubectl apply -f k8s/deployment-all.yaml
```

## Handling Specific Components

To deploy components individually:

```bash
# Secrets
kubectl apply -f k8s/secrets/secrets.yaml

# Persistent Volumes
kubectl apply -f k8s/volumes/persistent-volume-claims.yaml

# Postgres
kubectl apply -f k8s/deployments/postgres-deployment.yaml
kubectl apply -f k8s/services/postgres-service.yaml

# ClickHouse
kubectl apply -f k8s/deployments/clickhouse-deployment.yaml
kubectl apply -f k8s/services/clickhouse-service.yaml

# Ollama (v2 - updated version)
kubectl apply -f k8s/deployments/ollama-v2-deployment.yaml
kubectl apply -f k8s/services/ollama-service.yaml

# Main App
kubectl apply -f k8s/deployments/app-deployment.yaml
kubectl apply -f k8s/services/app-service.yaml

# Ingress
kubectl apply -f k8s/ingress/app-ingress.yaml
```

## Troubleshooting Commands

```bash
# Check the status of pods
kubectl get pods

# Check pod details (useful for troubleshooting)
kubectl describe pod <pod-name>

# View logs from a pod
kubectl logs <pod-name>

# Execute a command inside a pod (useful for debugging)
kubectl exec -it <pod-name> -- /bin/sh

# Check if Ollama is running
kubectl exec -it <ollama-pod-name> -- curl http://localhost:11434/api/health

# Manually pull a model
kubectl exec -it <ollama-pod-name> -- ollama pull llama2
```

## Note on the Ollama Model

The Llama2 model is approximately 4GB in size and will be downloaded to the container's `/root/.ollama` directory when the pod starts. With the current configuration using `emptyDir`, this data will be lost if the pod is restarted or rescheduled.

When you're ready for a more permanent solution, you can switch back to using a PersistentVolumeClaim by modifying the volumes section in the deployment YAML.