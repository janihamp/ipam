# Azure IPAM - Kubernetes Deployment

This guide covers deploying Azure IPAM to a Kubernetes cluster.

## Prerequisites

- Kubernetes cluster (1.24+)
- kubectl configured to access your cluster
- Container registry with pushed images
- Ingress controller installed (nginx-ingress recommended)

## Directory Structure

```
kubernetes/
├── base/                    # Base Kustomize configuration
│   ├── kustomization.yaml
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── api-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   ├── pdb.yaml
│   └── network-policy.yaml
└── overlays/
    ├── dev/                 # Development environment
    └── prod/                # Production environment
```

## Quick Start

### 1. Build and Push Images

```bash
# Build images
cd deploy/docker
docker-compose build

# Tag for your registry
docker tag azure-ipam-api:latest yourregistry.azurecr.io/azure-ipam-api:v1.0.0
docker tag azure-ipam-frontend:latest yourregistry.azurecr.io/azure-ipam-frontend:v1.0.0

# Push to registry
docker push yourregistry.azurecr.io/azure-ipam-api:v1.0.0
docker push yourregistry.azurecr.io/azure-ipam-frontend:v1.0.0
```

### 2. Configure Secrets

Create the secret with your Azure credentials:

```bash
kubectl create namespace azure-ipam

kubectl create secret generic azure-ipam-secrets \
  --namespace azure-ipam \
  --from-literal=AZURE_TENANT_ID=<your-tenant-id> \
  --from-literal=AZURE_CLIENT_ID=<your-sp-client-id> \
  --from-literal=AZURE_CLIENT_SECRET=<your-sp-secret> \
  --from-literal=VITE_AZURE_TENANT_ID=<your-tenant-id> \
  --from-literal=VITE_AZURE_CLIENT_ID=<your-app-client-id> \
  --from-literal=AZURE_STORAGE_CONNECTION="UseDevelopmentStorage=true"
```

### 3. Update Image References

Edit `base/kustomization.yaml` to point to your registry:

```yaml
images:
  - name: azure-ipam-api
    newName: yourregistry.azurecr.io/azure-ipam-api
    newTag: v1.0.0
  - name: azure-ipam-frontend
    newName: yourregistry.azurecr.io/azure-ipam-frontend
    newTag: v1.0.0
```

### 4. Deploy

```bash
# Preview the manifests
kubectl kustomize deploy/kubernetes/base

# Apply to cluster
kubectl apply -k deploy/kubernetes/base

# Check status
kubectl get all -n azure-ipam
```

### 5. Configure Ingress

Update `base/ingress.yaml` with your domain:

```yaml
spec:
  rules:
    - host: ipam.yourdomain.com
      http:
        paths:
          ...
```

## Architecture

```
                    ┌─────────────┐
                    │   Ingress   │
                    │  Controller │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              │
       ┌─────────┐   ┌─────────┐         │
       │ /api/*  │   │   /*    │         │
       └────┬────┘   └────┬────┘         │
            │              │              │
            ▼              ▼              │
    ┌───────────────┐ ┌───────────────┐  │
    │  API Service  │ │Frontend Svc   │  │
    │   (ClusterIP) │ │  (ClusterIP)  │  │
    └───────┬───────┘ └───────┬───────┘  │
            │                  │          │
    ┌───────▼───────┐ ┌───────▼───────┐  │
    │   API Pods    │ │ Frontend Pods │  │
    │   (2-10)      │ │    (2-5)      │  │
    └───────┬───────┘ └───────────────┘  │
            │                             │
            ▼                             │
    ┌───────────────┐                    │
    │    Azure      │◄───────────────────┘
    │   Resources   │
    └───────────────┘
```

## Configuration

### Environment-Specific Overlays

Create environment-specific configurations using Kustomize overlays:

**Development Overlay** (`overlays/dev/kustomization.yaml`):

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

namespace: azure-ipam-dev

patches:
  - patch: |
      - op: replace
        path: /spec/replicas
        value: 1
    target:
      kind: Deployment

images:
  - name: azure-ipam-api
    newName: yourregistry.azurecr.io/azure-ipam-api
    newTag: dev-latest
```

**Production Overlay** (`overlays/prod/kustomization.yaml`):

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

namespace: azure-ipam

patches:
  - patch: |
      - op: replace
        path: /spec/replicas
        value: 3
    target:
      kind: Deployment
      name: azure-ipam-api

images:
  - name: azure-ipam-api
    newName: yourregistry.azurecr.io/azure-ipam-api
    newTag: v1.0.0
```

### Resource Limits

Adjust resource requests/limits in `api-deployment.yaml` and `frontend-deployment.yaml`:

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

## Commands Reference

```bash
# Deploy
kubectl apply -k deploy/kubernetes/base

# Check status
kubectl get all -n azure-ipam
kubectl get ingress -n azure-ipam

# View logs
kubectl logs -n azure-ipam -l app.kubernetes.io/component=api -f
kubectl logs -n azure-ipam -l app.kubernetes.io/component=frontend -f

# Scale manually
kubectl scale deployment azure-ipam-api -n azure-ipam --replicas=3

# Update image
kubectl set image deployment/azure-ipam-api \
  api=yourregistry.azurecr.io/azure-ipam-api:v1.1.0 \
  -n azure-ipam

# Rollback
kubectl rollout undo deployment/azure-ipam-api -n azure-ipam

# Delete
kubectl delete -k deploy/kubernetes/base
```

## TLS Configuration

### Using cert-manager

1. Install cert-manager
2. Create a ClusterIssuer for Let's Encrypt
3. Update ingress annotations and TLS section

```yaml
metadata:
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
    - hosts:
        - ipam.yourdomain.com
      secretName: azure-ipam-tls
```

### Using existing certificate

```bash
kubectl create secret tls azure-ipam-tls \
  --namespace azure-ipam \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem
```

## Troubleshooting

### Pods not starting

```bash
# Check pod status
kubectl describe pod -n azure-ipam -l app.kubernetes.io/component=api

# Check events
kubectl get events -n azure-ipam --sort-by='.lastTimestamp'
```

### API returning errors

```bash
# Check API logs
kubectl logs -n azure-ipam -l app.kubernetes.io/component=api --tail=100

# Exec into pod for debugging
kubectl exec -it -n azure-ipam deployment/azure-ipam-api -- sh
```

### Ingress not working

```bash
# Check ingress status
kubectl describe ingress azure-ipam-ingress -n azure-ipam

# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller
```
