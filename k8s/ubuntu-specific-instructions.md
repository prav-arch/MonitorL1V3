# Ubuntu Kubernetes Deployment Instructions

## Prerequisites for Ubuntu

Before running the deployment script, ensure your Ubuntu system meets these requirements:

1. Docker is installed and running
2. Kubernetes is installed (either minikube, microk8s, or kubeadm)
3. kubectl is configured to connect to your cluster

## Installation Options on Ubuntu

### Option 1: Using microk8s (Recommended for new users)

```bash
# Install microk8s
sudo snap install microk8s --classic

# Add your user to the microk8s group
sudo usermod -a -G microk8s $USER
sudo chown -f -R $USER ~/.kube
newgrp microk8s

# Enable required addons
microk8s enable dns dashboard storage ingress

# Configure kubectl to use microk8s
mkdir -p ~/.kube
microk8s config > ~/.kube/config
chmod 600 ~/.kube/config

# Verify installation
kubectl get nodes
```

### Option 2: Using kubeadm (For multi-node clusters)

```bash
# Install prerequisites
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl

# Add Kubernetes repository
curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/kubernetes-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/kubernetes-archive-keyring.gpg] https://apt.kubernetes.io/ kubernetes-xenial main" | sudo tee /etc/apt/sources.list.d/kubernetes.list

# Install kubeadm, kubelet, and kubectl
sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl

# Initialize Kubernetes cluster (on master node)
sudo kubeadm init --pod-network-cidr=10.244.0.0/16

# Set up kubectl
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Install network plugin (Flannel)
kubectl apply -f https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml

# Verify installation
kubectl get nodes
```

## Storage Class Configuration

If you're using microk8s, the storage class is automatically created. For kubeadm, you may need to create a storage class:

```bash
# Create storage class for local storage
cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-storage
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer
EOF
```

To update the deployment script to use this storage class:

```bash
# Replace the PVC sections in the script with:
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
  storageClassName: local-storage  # Update this line
```

## Ubuntu-Specific Deployment Steps

1. **Prepare the deployment directory**:
   ```bash
   mkdir -p ~/l1-monitoring-deploy
   cd ~/l1-monitoring-deploy
   ```

2. **Copy the deployment script**:
   ```bash
   cp /path/to/k8s/fresh-namespace-deployment.sh .
   chmod +x fresh-namespace-deployment.sh
   ```

3. **Build the L1 Monitoring application image** (if not using a pre-built image):
   ```bash
   # From your application source directory
   docker build -t l1-monitoring:latest .
   
   # For microk8s, use the built-in registry
   docker tag l1-monitoring:latest localhost:32000/l1-monitoring:latest
   docker push localhost:32000/l1-monitoring:latest
   
   # Update the image reference in the deployment script
   sed -i 's|image: l1-monitoring:latest|image: localhost:32000/l1-monitoring:latest|g' fresh-namespace-deployment.sh
   ```

4. **Run the deployment script**:
   ```bash
   ./fresh-namespace-deployment.sh
   ```

5. **Monitor the deployment**:
   ```bash
   kubectl get pods -n l1-monitoring -w
   ```

## Ubuntu Networking Considerations

If deploying on a single Ubuntu node:

1. For local access, use port-forwarding:
   ```bash
   kubectl port-forward svc/l1-monitoring 8080:80 -n l1-monitoring
   ```

2. For network access, create a NodePort service:
   ```bash
   kubectl patch svc l1-monitoring -p '{"spec":{"type":"NodePort"}}' -n l1-monitoring
   ```

3. To find the NodePort:
   ```bash
   kubectl get svc l1-monitoring -n l1-monitoring
   ```

4. Then access the application at `http://<ubuntu-ip>:<node-port>`

## Troubleshooting Ubuntu-Specific Issues

### Issue: Docker registry access

If you see `ImagePullBackOff` errors:

```bash
# For microk8s, ensure the registry addon is enabled
microk8s enable registry

# Check if pods can pull images
kubectl describe pod <pod-name> -n l1-monitoring
```

### Issue: Resource constraints

If using a small Ubuntu VM with limited resources:

```bash
# Update resource requests in the deployment script
# Replace requests for all containers with smaller values:
resources:
  requests:
    memory: "256Mi"  # Reduced from 512Mi
    cpu: "100m"      # Reduced from 250m
  limits:
    memory: "512Mi"  # Reduced from 1Gi
    cpu: "250m"      # Reduced from 500m
```

### Issue: Networking problems

If services can't communicate:

```bash
# Check service DNS resolution
kubectl run -it --rm debug --image=ubuntu:20.04 --restart=Never -n l1-monitoring -- bash
apt-get update && apt-get install -y dnsutils curl
nslookup postgres.l1-monitoring.svc.cluster.local
curl -v http://l1-monitoring.l1-monitoring.svc.cluster.local
```