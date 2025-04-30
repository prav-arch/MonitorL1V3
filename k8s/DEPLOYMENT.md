# Kubernetes Deployment Guide for L1 Monitoring Application

This guide provides detailed steps to deploy the L1 Monitoring application with RAG-enabled LLM capabilities on a Kubernetes cluster.

## Prerequisites

- A working Kubernetes cluster (with a minimum of 8GB RAM and 4 CPU cores)
- `kubectl` installed and configured to work with your cluster
- Docker installed (for building the application image)
- Container registry access (DockerHub, GCR, ECR, etc.)

## Setup Steps

### 1. Prepare Secrets

1. Create a copy of the secrets template:
   ```bash
   cp k8s/secrets/secrets-template.yaml k8s/secrets/secrets.yaml
   ```

2. Edit the `secrets.yaml` file to include your base64-encoded secrets:
   ```bash
   # Generate base64 encoded values
   echo -n "postgres" | base64  # For postgres-db
   echo -n "pguser" | base64    # For postgres-user
   echo -n "secure-password" | base64  # For postgres-password
   
   # For database-url, format is: postgresql://username:password@postgres-service:5432/dbname
   echo -n "postgresql://pguser:secure-password@postgres-service:5432/postgres" | base64
   ```

3. Apply the secrets to your cluster:
   ```bash
   kubectl apply -f k8s/secrets/secrets.yaml
   ```

### 2. Create Persistent Volumes

1. Apply the persistent volume claims:
   ```bash
   kubectl apply -f k8s/volumes/persistent-volume-claims.yaml
   ```

### 3. Deploy PostgreSQL

1. Create the PostgreSQL deployment and service:
   ```bash
   kubectl apply -f k8s/deployments/postgres-deployment.yaml
   kubectl apply -f k8s/services/postgres-service.yaml
   ```

2. Wait for PostgreSQL to start:
   ```bash
   kubectl wait --for=condition=ready pod -l app=postgres --timeout=120s
   ```

### 4. Deploy OLLAMA

1. Create the OLLAMA initialization ConfigMap:
   ```bash
   kubectl apply -f k8s/configmaps/ollama-init.yaml
   ```

2. Deploy OLLAMA:
   ```bash
   kubectl apply -f k8s/deployments/ollama-deployment.yaml
   kubectl apply -f k8s/services/ollama-service.yaml
   ```

3. This will take some time as OLLAMA downloads the model (llama2 is ~4GB in size)
   ```bash
   # You can monitor the progress with:
   kubectl logs -f deployment/ollama -c init-ollama
   ```

### 5. Build and Push the Application Image

1. Build the Docker image:
   ```bash
   # Copy requirements from k8s directory
   cp k8s/deployment-requirements.txt requirements.txt
   
   # Build the image
   docker build -t yourusername/l1-monitoring:latest .
   
   # Push to your registry
   docker push yourusername/l1-monitoring:latest
   ```

2. Update the image reference in `k8s/deployments/app-deployment.yaml` to match your registry path.

### 6. Deploy the Application

1. Deploy the application:
   ```bash
   kubectl apply -f k8s/deployments/app-deployment.yaml
   kubectl apply -f k8s/services/app-service.yaml
   ```

### 7. Expose the Application

1. Update the hostname in the ingress configuration to match your domain:
   Edit `k8s/ingress/app-ingress.yaml` and replace `l1-monitoring.your-domain.com` with your actual domain.

2. Apply the ingress:
   ```bash
   kubectl apply -f k8s/ingress/app-ingress.yaml
   ```

## Verify the Deployment

1. Check that all pods are running:
   ```bash
   kubectl get pods
   ```

2. Test the application:
   ```bash
   # Forward the port locally if you don't have an ingress set up yet
   kubectl port-forward svc/l1-monitoring-service 8080:80
   
   # Access the application at http://localhost:8080
   ```

## Monitoring and Troubleshooting

### View Application Logs
```bash
kubectl logs -f deployment/l1-monitoring
```

### View OLLAMA Logs
```bash
kubectl logs -f deployment/ollama
```

### Check Database Status
```bash
kubectl exec -it $(kubectl get pod -l app=postgres -o jsonpath="{.items[0].metadata.name}") -- psql -U pguser -d postgres -c "SELECT COUNT(*) FROM log_entries;"
```

### Scale the Application
To scale the application horizontally:
```bash
kubectl scale deployment l1-monitoring --replicas=3
```

## Updating the Application

1. Build and push a new version of the image:
   ```bash
   docker build -t yourusername/l1-monitoring:v2 .
   docker push yourusername/l1-monitoring:v2
   ```

2. Update the deployment:
   ```bash
   # Edit the image tag in the deployment
   kubectl set image deployment/l1-monitoring l1-monitoring-app=yourusername/l1-monitoring:v2
   ```

## Database Backups

To back up the PostgreSQL database:
```bash
kubectl exec -it $(kubectl get pod -l app=postgres -o jsonpath="{.items[0].metadata.name}") -- pg_dump -U pguser postgres > backup.sql
```

## Resource Requirements

- Application: 512MB RAM, 0.5 CPU per replica
- OLLAMA: 4GB RAM, 2 CPU
- PostgreSQL: 512MB RAM, 0.5 CPU

Adjust resource requests and limits in the deployment files based on your workload.

## Security Considerations

1. Use network policies to restrict communication between pods
2. Regularly update images to patch security vulnerabilities
3. Use Secrets for sensitive configuration
4. Implement TLS for all external endpoints

## Production Recommendations

1. Set up a monitoring solution (Prometheus + Grafana)
2. Configure alerts for resource utilization
3. Implement automated database backups
4. Use horizontal pod autoscaling for the application
5. Set up log aggregation (ELK stack or similar)