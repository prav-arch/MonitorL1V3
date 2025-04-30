# Deploying L1 Monitoring Application on Kubernetes with ClickHouse

This guide walks through the process of deploying the L1 Monitoring application on a Kubernetes cluster using ClickHouse as the primary database.

## Prerequisites

Before proceeding, ensure you have the following:

- A running Kubernetes cluster (minikube, GKE, EKS, AKS, etc.)
- `kubectl` installed and configured to connect to your cluster
- Storage provisioner for persistent volumes (depends on your cluster)

## Deployment Components

The deployment includes the following components:

1. **ClickHouse Database** - Primary database for high-performance log analytics
2. **PostgreSQL Database** - Fallback database when ClickHouse is not available
3. **OLLAMA Service** - For local LLM integration (Llama2 model)
4. **L1 Monitoring Application** - Main application container
5. **Ingress** - For external access (if supported by your cluster)

## Deployment Steps

### 1. Prepare Secrets

Edit the secrets template file:

```bash
cd k8s
cp secrets/secrets-template.yaml secrets/secrets.yaml
```

Open `secrets/secrets.yaml` and fill in the actual values for all secrets. Make sure to Base64 encode all values:

```bash
echo -n "your-value" | base64
```

Important secrets to configure:

- **ClickHouse Credentials**: CLICKHOUSE_HOST, CLICKHOUSE_PORT, CLICKHOUSE_DB, CLICKHOUSE_USER, CLICKHOUSE_PASSWORD
- **PostgreSQL Credentials**: DATABASE_URL, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
- **OLLAMA Configuration**: OLLAMA_HOST, OLLAMA_PORT
- **App Configuration**: FLASK_SECRET_KEY

### 2. Deploy Using the Script

Run the deployment script:

```bash
cd k8s
./deploy-with-clickhouse.sh
```

This script will:
- Create persistent volume claims
- Apply secrets
- Deploy ClickHouse database
- Deploy PostgreSQL database as fallback
- Deploy OLLAMA service
- Deploy the L1 Monitoring application
- Configure ingress (if supported)

### 3. Manual Deployment

If you prefer to deploy manually, follow these steps:

```bash
# 1. Create persistent volume claims
kubectl apply -f volumes/persistent-volume-claims.yaml

# 2. Apply secrets
kubectl apply -f secrets/secrets.yaml

# 3. Deploy ClickHouse
kubectl apply -f deployments/clickhouse-deployment.yaml
kubectl apply -f services/clickhouse-service.yaml

# 4. Deploy PostgreSQL as fallback
kubectl apply -f deployments/postgres-deployment.yaml
kubectl apply -f services/postgres-service.yaml

# 5. Deploy OLLAMA
kubectl apply -f configmaps/ollama-init.yaml
kubectl apply -f deployments/ollama-deployment.yaml
kubectl apply -f services/ollama-service.yaml

# 6. Deploy application
kubectl apply -f deployments/app-deployment.yaml
kubectl apply -f services/app-service.yaml

# 7. Deploy ingress
kubectl apply -f ingress/app-ingress.yaml
```

## Accessing the Application

### With Ingress

If your cluster supports ingress and the ingress deployment was successful, you can access the application at the ingress address:

```bash
kubectl get ingress app-ingress
```

Use the IP address or hostname provided in the output.

### Without Ingress

Use port-forwarding to access the application:

```bash
kubectl port-forward svc/l1-monitoring 5000:5000
```

Then access the application at http://localhost:5000

## Checking Deployment Status

```bash
# Check deployments
kubectl get deployments

# Check pods
kubectl get pods

# Check services
kubectl get svc

# View application logs
kubectl logs deployment/l1-monitoring

# View ClickHouse logs
kubectl logs deployment/clickhouse
```

## Scaling the Application

To scale the application horizontally:

```bash
kubectl scale deployment/l1-monitoring --replicas=3
```

## Advanced Configuration

### Resource Limits

The default resource limits are set to:
- L1 Monitoring App: 512Mi memory, 200m CPU 
- ClickHouse: 1Gi memory, 500m CPU
- PostgreSQL: 256Mi memory, 100m CPU
- OLLAMA: 2Gi memory, 1000m CPU

Adjust these values in the respective deployment YAML files based on your workload requirements.

### ClickHouse Configuration

For advanced ClickHouse configuration, you can create a ConfigMap with custom ClickHouse settings and mount it to the ClickHouse container.

## Troubleshooting

### Database Connection Issues

If the application cannot connect to ClickHouse:

1. Check ClickHouse pod status:
   ```bash
   kubectl describe pod -l app=clickhouse
   ```

2. View ClickHouse logs:
   ```bash
   kubectl logs deployment/clickhouse
   ```

3. Verify the secrets are correctly set:
   ```bash
   kubectl describe deployment l1-monitoring
   ```

4. Test ClickHouse connection directly:
   ```bash
   kubectl exec -it deployment/clickhouse -- clickhouse-client -h localhost
   ```

### Application Not Starting

1. Check application logs:
   ```bash
   kubectl logs deployment/l1-monitoring
   ```

2. Check for pending volumes:
   ```bash
   kubectl get pvc
   ```

3. Verify the container image is correct in the deployment:
   ```bash
   kubectl describe deployment l1-monitoring
   ```

## Security Considerations

- The default configuration uses secrets for sensitive information
- For production use, consider integrating with a secret management solution like HashiCorp Vault
- Implement proper network policies to restrict communication between pods
- Enable TLS for ingress in production environments