# L1 Monitoring Namespace Deployment

This document explains how to deploy the L1 Monitoring application to a dedicated namespace in a Kubernetes cluster.

## Namespace Purpose

Using a dedicated namespace for the L1 Monitoring application has several benefits:

1. **Isolation:** Keeps the application resources separate from other applications
2. **Resource Management:** Allows for namespace-level resource quotas if needed
3. **Access Control:** Enables more granular RBAC policies
4. **Organization:** Makes it easier to manage all related components

## Deployment Script

The `fresh-namespace-deployment.sh` script provides a complete deployment solution:

- Creates a dedicated namespace (`l1-monitoring`) if it doesn't exist
- Cleans up any existing resources in the namespace
- Deploys all components with proper service discovery
- Uses fully qualified domain names for inter-service communication
- Includes all necessary tolerations for scheduling pods
- Configures resource limits and requests appropriately
- Includes readiness and liveness probes for all services

## Ubuntu Kubernetes Considerations

For Ubuntu-based Kubernetes clusters:

1. **Storage Classes:** 
   - Ubuntu with microk8s uses `microk8s-hostpath` storage class
   - Ubuntu with kubeadm typically has no default storage class, may need to install one

2. **CNI Plugin:**
   - Default CNI is often Calico or Flannel
   - Services use `<service-name>.<namespace>.svc.cluster.local` convention

3. **Node Taints:**
   - Control plane nodes are often tainted with `node-role.kubernetes.io/master:NoSchedule`
   - Our deployment includes tolerations for this taint

## Verification

After deployment, verify that all pods are running:

```bash
kubectl get pods -n l1-monitoring
```

Expected output (all pods should eventually show STATUS as "Running"):

```
NAME                             READY   STATUS    RESTARTS   AGE
clickhouse-xxxxxxxxxx-xxxxx      1/1     Running   0          1m
l1-monitoring-xxxxxxxxxx-xxxxx   1/1     Running   0          1m
ollama-xxxxxxxxxx-xxxxx          1/1     Running   0          1m
postgres-xxxxxxxxxx-xxxxx        1/1     Running   0          1m
```

## Troubleshooting

Common issues and solutions:

1. **Image Pull Errors:**
   ```bash
   # Check for image pull issues
   kubectl describe pod <pod-name> -n l1-monitoring | grep -A10 "Events:"
   
   # Solution: Ensure the image exists or is accessible
   # You may need to build and push the l1-monitoring image to a registry
   ```

2. **Resource Constraints:**
   ```bash
   # Check if pods are pending due to insufficient resources
   kubectl describe pod <pod-name> -n l1-monitoring | grep -A10 "Events:"
   
   # Solution: Adjust resource requests in deployment
   # Or add nodes to your cluster
   ```

3. **PVC Issues:**
   ```bash
   # Check PVC status
   kubectl get pvc -n l1-monitoring
   
   # Solution: Modify script to use appropriate storage class
   # Or use emptyDir for non-persistent storage
   ```

## Accessing the Application

Once deployed, you can access the application using:

```bash
# Port forward to access the app locally
kubectl port-forward svc/l1-monitoring 8080:80 -n l1-monitoring

# Then open http://localhost:8080 in your browser
```

Or expose with a NodePort:

```bash
kubectl patch svc l1-monitoring -p '{"spec":{"type":"NodePort"}}' -n l1-monitoring
kubectl get svc l1-monitoring -n l1-monitoring  # Note the assigned NodePort

# Access via Node IP and port
# http://<node-ip>:<node-port>
```