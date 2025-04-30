# Kubernetes Deployment Structure for L1 Monitoring Application

This directory contains all the necessary Kubernetes configuration files to deploy the L1 Monitoring application with local LLM capabilities.

## File Structure

```
k8s/
├── configmaps/
│   └── ollama-init.yaml              # Init script for OLLAMA model download
├── deployments/
│   ├── app-deployment.yaml           # L1 Monitoring app deployment
│   ├── ollama-deployment.yaml        # OLLAMA LLM service deployment
│   └── postgres-deployment.yaml      # PostgreSQL database deployment
├── services/
│   ├── app-service.yaml              # L1 Monitoring app service
│   ├── ollama-service.yaml           # OLLAMA LLM service
│   └── postgres-service.yaml         # PostgreSQL database service
├── volumes/
│   └── persistent-volume-claims.yaml # PVCs for both OLLAMA and PostgreSQL
├── secrets/
│   └── secrets-template.yaml         # Template for required secrets
├── ingress/
│   └── app-ingress.yaml              # Ingress for external access
├── deployment-requirements.txt       # Python dependencies for the app container
├── deploy.sh                         # Deployment automation script
├── DEPLOYMENT.md                     # Detailed deployment instructions
└── README.md                         # This file
```

## Components Overview

### 1. Application (L1 Monitoring)

The main application that provides log analysis and AI-powered suggestions.

- **Deployment**: `deployments/app-deployment.yaml`
- **Service**: `services/app-service.yaml`
- **Ingress**: `ingress/app-ingress.yaml`
- **Dependencies**: PostgreSQL, OLLAMA

### 2. OLLAMA LLM Service

Provides local large language model capabilities through OLLAMA.

- **Deployment**: `deployments/ollama-deployment.yaml`
- **Service**: `services/ollama-service.yaml`
- **Config**: `configmaps/ollama-init.yaml`
- **Storage**: Uses PVC for model storage

### 3. PostgreSQL Database

Stores log entries and analysis data.

- **Deployment**: `deployments/postgres-deployment.yaml`
- **Service**: `services/postgres-service.yaml`
- **Storage**: Uses PVC for database files

## Deployment

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

Quick start:
```bash
# Update the secrets template with your values
cp secrets/secrets-template.yaml secrets/secrets.yaml
# Edit secrets.yaml with your base64 encoded values

# Make the deployment script executable
chmod +x deploy.sh

# Run the deployment script
./deploy.sh
```

## Resource Requirements

| Component | CPU Request | Memory Request | CPU Limit | Memory Limit |
|-----------|------------|----------------|-----------|--------------|
| L1 Monitoring | 100m | 256Mi | 500m | 512Mi |
| OLLAMA | 1000m | 2Gi | 2000m | 4Gi |
| PostgreSQL | 100m | 256Mi | 500m | 512Mi |

Adjust these values in the deployment YAML files based on your cluster resources and workload.

## Customization

### Scaling the Application

To handle more traffic, you can increase the replicas in `deployments/app-deployment.yaml`:

```yaml
spec:
  replicas: 3  # Increase this number for more instances
```

### Changing OLLAMA Model

To use a different LLM model, update:

1. The init script in `configmaps/ollama-init.yaml`
2. The `OLLAMA_MODEL` environment variable in `deployments/app-deployment.yaml`

### Custom Domain

Update the host value in `ingress/app-ingress.yaml` with your domain name.

## Troubleshooting

See the [DEPLOYMENT.md](DEPLOYMENT.md) file for troubleshooting tips and common issues.