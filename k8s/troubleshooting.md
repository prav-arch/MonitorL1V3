# Kubernetes Deployment Troubleshooting Guide

This guide provides solutions for common issues encountered when deploying the L1 Monitoring application in Kubernetes.

## Pods Stuck in Pending State

If pods are in a pending state, the most common causes are:

1. **Resource constraints**: The node might not have enough CPU or memory to schedule the pod
   
   **Solution**: Reduce resource requests in the deployment YAML files:
   ```yaml
   resources:
     requests:
       memory: "512Mi"  # Reduce from original value
       cpu: "250m"      # Reduce from original value
   ```

2. **PersistentVolumeClaims not being fulfilled**:
   
   **Solution 1**: Use an existing StorageClass or set it to empty string:
   ```bash
   kubectl get storageclass
   ```
   
   ```yaml
   # Option 1: Use an existing storage class
   storageClassName: <your-storage-class>
   
   # Option 2: Use the default storage class by setting empty string
   storageClassName: ""
   
   # Option 3: Use emptyDir instead of PVC for transient storage
   volumes:
   - name: data-volume
     emptyDir: {}
   ```
   
   **Solution 2**: For testing, use `emptyDir` instead of PVCs as a temporary solution:
   ```yaml
   volumes:
   - name: ollama-data
     # Use emptyDir instead of PVC
     emptyDir: {}
   ```
   
   Note: `emptyDir` data will be lost when the pod is deleted or restarted.

3. **Node taints preventing scheduling**:
   
   **Solution**: Add tolerations to your deployment that match the taints on your nodes:
   ```yaml
   tolerations:
   - key: "node.kubernetes.io/not-ready"
     operator: "Exists"
     effect: "NoExecute"
     tolerationSeconds: 300
   - key: "node.kubernetes.io/unreachable"
     operator: "Exists"
     effect: "NoExecute"
     tolerationSeconds: 300
   # Add more based on your cluster's taints
   - key: "node-role.kubernetes.io/master"
     operator: "Exists"
     effect: "NoSchedule"
   ```
   
   To find the taints on your nodes, run:
   ```bash
   kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints
   ```

4. **Image pull issues**:
   
   **Solution**: Ensure images are available and policy is set to IfNotPresent:
   ```yaml
   imagePullPolicy: IfNotPresent
   ```
   
   For private images, create a pull secret:
   ```bash
   kubectl create secret docker-registry regcred --docker-server=<your-registry> --docker-username=<username> --docker-password=<password>
   ```

## LLM Model Download Issues

For Ollama LLM downloads:

1. **Model not downloading**:
   
   **Solution**: Verify if the Ollama pod is running correctly:
   ```bash
   kubectl logs -f <ollama-pod-name>
   ```
   
   If you need to manually pull models after deployment:
   ```bash
   kubectl exec -it <ollama-pod-name> -- /bin/sh
   ollama pull llama2
   ```

2. **Insufficient storage for models**:
   
   **Solution**: Increase the PVC size for Ollama:
   ```yaml
   resources:
     requests:
       storage: 50Gi  # Increase from original 30Gi
   ```

## Secret Issues

1. **Base64 encoding problems**:
   
   **Solution**: Use proper base64 encoding for secrets:
   ```bash
   echo -n "your-value" | base64
   ```
   
   Then update the secret YAML file with the encoded values.

2. **Secret not found errors**:
   
   **Solution**: Verify that all secret references match the actual secret name:
   ```bash
   kubectl get secrets
   ```
   
   Make sure the secret is in the same namespace as your deployment.

## Service Connection Issues

1. **Pods can't communicate with each other**:
   
   **Solution**: Verify service DNS names are correct:
   - Services should be accessed by their name: `http://service-name:port`
   - For cross-namespace services: `http://service-name.namespace:port`

2. **Health check failures**:
   
   **Solution**: Adjust readiness/liveness probe settings:
   ```yaml
   readinessProbe:
     httpGet:
       path: /health  # Ensure this path is correct for your app
       port: 5000
     initialDelaySeconds: 60  # Increase this value
     periodSeconds: 10
     failureThreshold: 5
   ```

## Debugging Commands

Useful commands for troubleshooting:

```bash
# Check pod status
kubectl get pods

# Get detailed pod information
kubectl describe pod <pod-name>

# View pod logs
kubectl logs <pod-name>

# Check persistent volume claims
kubectl get pvc

# Check services
kubectl get services

# Execute commands in a pod
kubectl exec -it <pod-name> -- /bin/sh

# Forward a port to a service (for testing)
kubectl port-forward svc/<service-name> 8080:80
```

## Final Note for Ollama Model Storage

The Llama2 model is downloaded and stored in the Ollama container at `/root/.ollama`. This directory is mounted to the persistent volume claim `ollama-data-pvc`. The model is downloaded automatically when the pod starts using the lifecycle hook, which runs:

```bash
ollama serve & sleep 30 && ollama pull llama2 || true
```

The model size is approximately 4GB, so ensure you have allocated sufficient storage in your PVC.