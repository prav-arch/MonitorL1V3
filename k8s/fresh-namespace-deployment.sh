#!/bin/bash
# Complete deployment script for L1 Monitoring application
# Creates a dedicated namespace and deploys all components

# Define namespace for deployment
NAMESPACE="l1-monitoring"

# Create namespace if it doesn't exist
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
  echo "Creating namespace: $NAMESPACE"
  kubectl create namespace $NAMESPACE
else
  echo "Namespace $NAMESPACE already exists"
fi

# Clean up any existing deployments in the namespace
echo "Cleaning up existing resources in namespace: $NAMESPACE"
kubectl delete --all deployments --namespace=$NAMESPACE
kubectl delete --all services --namespace=$NAMESPACE
kubectl delete --all pods --namespace=$NAMESPACE
kubectl delete --all pvc --namespace=$NAMESPACE
kubectl delete --all configmaps --namespace=$NAMESPACE
kubectl delete --all secrets --namespace=$NAMESPACE
kubectl delete --all ingress --namespace=$NAMESPACE

# Wait for resources to be deleted
echo "Waiting for resources to be deleted..."
sleep 5

# Create secrets
echo "Creating secrets in namespace: $NAMESPACE"
cat <<EOF | kubectl apply -f - -n $NAMESPACE
apiVersion: v1
kind: Secret
metadata:
  name: l1-monitoring-secrets
type: Opaque
data:
  postgres-db: cG9zdGdyZXM=        # postgres
  postgres-user: cG9zdGdyZXM=       # postgres
  postgres-password: cG9zdGdyZXM=   # postgres
  clickhouse-user: ZGVmYXVsdA==     # default
  clickhouse-password: 
  ollama-api-key: 
  app-secret-key: bDFtb25pdG9yaW5nc2VjcmV0a2V5  # l1monitoringsecretkey
EOF

# Create persistent volume claims
echo "Creating persistent volume claims in namespace: $NAMESPACE"
cat <<EOF | kubectl apply -f - -n $NAMESPACE
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
EOF

cat <<EOF | kubectl apply -f - -n $NAMESPACE
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: clickhouse-data-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 40Gi
EOF

# Create PostgreSQL deployment
echo "Creating PostgreSQL deployment in namespace: $NAMESPACE"
cat <<EOF | kubectl apply -f - -n $NAMESPACE
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  labels:
    app: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      # Add tolerations for scheduling flexibility
      tolerations:
      - key: "node.kubernetes.io/not-ready"
        operator: "Exists"
        effect: "NoExecute"
        tolerationSeconds: 300
      - key: "node.kubernetes.io/unreachable"
        operator: "Exists"
        effect: "NoExecute"
        tolerationSeconds: 300
      containers:
      - name: postgres
        image: postgres:14
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_DB
          value: "postgres"
        - name: POSTGRES_USER
          value: "postgres"
        - name: POSTGRES_PASSWORD
          value: "postgres"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
          subPath: postgres-data
      volumes:
      - name: postgres-data
        persistentVolumeClaim:
          claimName: postgres-data-pvc
EOF

# Create PostgreSQL service
echo "Creating PostgreSQL service in namespace: $NAMESPACE"
cat <<EOF | kubectl apply -f - -n $NAMESPACE
apiVersion: v1
kind: Service
metadata:
  name: postgres
  labels:
    app: postgres
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
    name: postgres
  type: ClusterIP
EOF

# Create ClickHouse deployment
echo "Creating ClickHouse deployment in namespace: $NAMESPACE"
cat <<EOF | kubectl apply -f - -n $NAMESPACE
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clickhouse
  labels:
    app: clickhouse
spec:
  replicas: 1
  selector:
    matchLabels:
      app: clickhouse
  template:
    metadata:
      labels:
        app: clickhouse
    spec:
      # Add tolerations for scheduling flexibility
      tolerations:
      - key: "node.kubernetes.io/not-ready"
        operator: "Exists"
        effect: "NoExecute"
        tolerationSeconds: 300
      - key: "node.kubernetes.io/unreachable"
        operator: "Exists"
        effect: "NoExecute"
        tolerationSeconds: 300
      containers:
      - name: clickhouse
        image: clickhouse/clickhouse-server:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 8123  # HTTP port
          name: http
        - containerPort: 9000  # Native port
          name: native
        resources:
          requests:
            memory: "1Gi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "500m"
        volumeMounts:
        - name: clickhouse-data
          mountPath: /var/lib/clickhouse
        env:
        - name: CLICKHOUSE_USER
          value: "default"
        - name: CLICKHOUSE_PASSWORD
          value: ""
        - name: CLICKHOUSE_DB
          value: "default"
        livenessProbe:
          httpGet:
            path: /ping
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ping
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
      volumes:
      - name: clickhouse-data
        persistentVolumeClaim:
          claimName: clickhouse-data-pvc
EOF

# Create ClickHouse service
echo "Creating ClickHouse service in namespace: $NAMESPACE"
cat <<EOF | kubectl apply -f - -n $NAMESPACE
apiVersion: v1
kind: Service
metadata:
  name: clickhouse
  labels:
    app: clickhouse
spec:
  selector:
    app: clickhouse
  ports:
  - port: 8123
    targetPort: 8123
    name: http
  - port: 9000
    targetPort: 9000
    name: native
  type: ClusterIP
EOF

# Create Ollama deployment with emptyDir for easier scheduling
echo "Creating Ollama deployment in namespace: $NAMESPACE"
cat <<EOF | kubectl apply -f - -n $NAMESPACE
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ollama
  labels:
    app: ollama
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ollama
  template:
    metadata:
      labels:
        app: ollama
    spec:
      # Add tolerations for common taints
      tolerations:
      - key: "node.kubernetes.io/not-ready"
        operator: "Exists"
        effect: "NoExecute"
        tolerationSeconds: 300
      - key: "node.kubernetes.io/unreachable"
        operator: "Exists"
        effect: "NoExecute"
        tolerationSeconds: 300
      # Add more specific tolerations based on your cluster's taints
      - key: "node-role.kubernetes.io/master"
        operator: "Exists"
        effect: "NoSchedule"
      containers:
      - name: ollama-service
        image: ollama/ollama:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 11434
          name: api
        resources:
          requests:
            memory: "1Gi"
            cpu: "250m"
          limits:
            memory: "4Gi"
            cpu: "1000m"
        volumeMounts:
        - name: ollama-data
          mountPath: /root/.ollama
        lifecycle:
          postStart:
            exec:
              command: 
              - "/bin/sh"
              - "-c"
              - "ollama serve & sleep 30 && ollama pull llama2 || true"
        readinessProbe:
          httpGet:
            path: /api/health
            port: 11434
          initialDelaySeconds: 60
          periodSeconds: 10
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 10
      volumes:
      - name: ollama-data
        # Use emptyDir for easier scheduling
        emptyDir: {}
EOF

# Create Ollama service
echo "Creating Ollama service in namespace: $NAMESPACE"
cat <<EOF | kubectl apply -f - -n $NAMESPACE
apiVersion: v1
kind: Service
metadata:
  name: ollama
  labels:
    app: ollama
spec:
  selector:
    app: ollama
  ports:
  - port: 11434
    targetPort: 11434
    name: api
  type: ClusterIP
EOF

# Create main application deployment
echo "Creating L1 Monitoring application deployment in namespace: $NAMESPACE"
cat <<EOF | kubectl apply -f - -n $NAMESPACE
apiVersion: apps/v1
kind: Deployment
metadata:
  name: l1-monitoring
  labels:
    app: l1-monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: l1-monitoring
  template:
    metadata:
      labels:
        app: l1-monitoring
    spec:
      # Add tolerations for scheduling flexibility
      tolerations:
      - key: "node.kubernetes.io/not-ready"
        operator: "Exists"
        effect: "NoExecute"
        tolerationSeconds: 300
      - key: "node.kubernetes.io/unreachable"
        operator: "Exists"
        effect: "NoExecute"
        tolerationSeconds: 300
      containers:
      - name: l1-monitoring-app
        image: l1-monitoring:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 5000
          name: http
        env:
        # Primary ClickHouse Database Configuration
        - name: USE_CLICKHOUSE
          value: "true"
        - name: CLICKHOUSE_HOST
          value: "clickhouse.${NAMESPACE}.svc.cluster.local"
        - name: CLICKHOUSE_PORT
          value: "8123"
        - name: CLICKHOUSE_DB
          value: "default"
        - name: CLICKHOUSE_USER
          value: "default"
        - name: CLICKHOUSE_PASSWORD
          value: ""
        - name: CLICKHOUSE_URL
          value: "http://clickhouse.${NAMESPACE}.svc.cluster.local:8123"
          
        # Fallback PostgreSQL Database Configuration
        - name: DATABASE_URL
          value: "postgresql://postgres:postgres@postgres.${NAMESPACE}.svc.cluster.local:5432/postgres"
      
        # OLLAMA Configuration
        - name: OLLAMA_HOST
          value: "ollama.${NAMESPACE}.svc.cluster.local"
        - name: OLLAMA_PORT
          value: "11434"
        - name: OLLAMA_URL
          value: "http://ollama.${NAMESPACE}.svc.cluster.local:11434"
        - name: OLLAMA_MODEL
          value: "llama2"
      
        # App Configuration
        - name: FLASK_SECRET_KEY
          value: "l1monitoringsecretkey"
      
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        readinessProbe:
          httpGet:
            path: /api/health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /api/health
            port: 5000
          initialDelaySeconds: 45
          periodSeconds: 15
EOF

# Create main application service
echo "Creating L1 Monitoring application service in namespace: $NAMESPACE"
cat <<EOF | kubectl apply -f - -n $NAMESPACE
apiVersion: v1
kind: Service
metadata:
  name: l1-monitoring
  labels:
    app: l1-monitoring
spec:
  selector:
    app: l1-monitoring
  ports:
  - port: 80
    targetPort: 5000
    name: http
  type: ClusterIP
EOF

# Create ingress
echo "Creating Ingress in namespace: $NAMESPACE"
cat <<EOF | kubectl apply -f - -n $NAMESPACE
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: l1-monitoring-ingress
  annotations:
    kubernetes.io/ingress.class: "nginx"
spec:
  rules:
  - host: l1-monitoring.example.com  # Replace with your actual domain
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: l1-monitoring
            port:
              number: 80
EOF

# Wait for pods to start
echo "Waiting for pods to start in namespace: $NAMESPACE"
sleep 5

# Check deployment status
echo "Current deployments in namespace: $NAMESPACE"
kubectl get deployments -n $NAMESPACE

echo "Current pods in namespace: $NAMESPACE"
kubectl get pods -n $NAMESPACE

# Instructions for verifying the deployment
echo ""
echo "================================================"
echo "Deployment to namespace '$NAMESPACE' is complete!"
echo "================================================"
echo ""
echo "To monitor pod status, run:"
echo "  kubectl get pods -n $NAMESPACE -w"
echo ""
echo "To check Ollama logs, run:"
echo "  kubectl logs -f \$(kubectl get pods -n $NAMESPACE -l app=ollama -o jsonpath='{.items[0].metadata.name}') -n $NAMESPACE"
echo ""
echo "To access the application using port-forward, run:"
echo "  kubectl port-forward svc/l1-monitoring 8080:80 -n $NAMESPACE"
echo "  Then open http://localhost:8080 in your browser"
echo ""
echo "To create a NodePort service for external access (if needed), run:"
echo "  kubectl patch svc l1-monitoring -p '{\"spec\":{\"type\":\"NodePort\"}}' -n $NAMESPACE"
echo ""
echo "To check for any scheduling issues, run:"
echo "  kubectl describe pods -n $NAMESPACE | grep -A10 'Events:'"