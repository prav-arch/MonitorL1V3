# L1 Monitoring Kubernetes Deployment

This directory contains all the necessary Kubernetes configuration files for deploying the L1 Monitoring application stack.

## Quick Start

For a simplified deployment, use the combined deployment file:

```bash
kubectl apply -f deployment-all.yaml
```

This single file includes all necessary components:
- Secret configurations
- Persistent Volume Claims
- PostgreSQL database
- ClickHouse database
- Ollama LLM service
- Main L1 Monitoring application
- Ingress configuration

## Individual Component Deployment

If you prefer to deploy components individually, use the files in their respective directories:

1. First deploy the secrets:
```bash
kubectl apply -f secrets/secrets.yaml
```

2. Then create the persistent volume claims:
```bash
kubectl apply -f volumes/persistent-volume-claims.yaml
```

3. Deploy the database components:
```bash
kubectl apply -f deployments/postgres-deployment.yaml
kubectl apply -f services/postgres-service.yaml
kubectl apply -f deployments/clickhouse-deployment.yaml
kubectl apply -f services/clickhouse-service.yaml
```

4. Deploy the Ollama LLM service:
```bash
kubectl apply -f deployments/ollama-deployment.yaml
kubectl apply -f services/ollama-service.yaml
```

5. Finally, deploy the main application:
```bash
kubectl apply -f deployments/app-deployment.yaml
kubectl apply -f services/app-service.yaml
kubectl apply -f ingress/app-ingress.yaml
```

## Configuration Notes

- The application is configured to use ClickHouse as the primary database with PostgreSQL as a fallback
- Default credentials are used for development (see secrets.yaml)
- Customize the domain name in the ingress configuration before deploying to production
- Resource limits are set conservatively and may need adjustment based on your cluster capacity

## Monitoring the Deployment

Check the status of your pods:
```bash
kubectl get pods
```

View the logs of a specific pod:
```bash
kubectl logs <pod-name>
```

Port-forward to access the application locally:
```bash
kubectl port-forward svc/l1-monitoring 8080:80
```
Then access the application at http://localhost:8080