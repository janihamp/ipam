# Azure IPAM - AKS Deployment

This guide covers deploying Azure IPAM to Azure Kubernetes Service (AKS) with production-ready configurations including:

- Azure Container Registry (ACR) integration
- Azure Key Vault for secrets management
- Managed Identity authentication
- Horizontal Pod Autoscaling
- Network policies
- Optional Application Gateway Ingress Controller

## Prerequisites

- Azure CLI 2.50+
- kubectl
- Docker
- Bicep CLI (included with Azure CLI)
- Azure subscription with Owner/Contributor access

## Quick Start

### Option 1: Automated Deployment Script

The fastest way to deploy everything:

```bash
cd deploy/azure-aks

# Make script executable
chmod +x deploy.sh

# Run deployment (creates all Azure resources)
./deploy.sh
```

### Option 2: Step-by-Step Deployment

#### 1. Deploy Infrastructure with Bicep

```bash
# Set variables
RESOURCE_GROUP="rg-azure-ipam"
LOCATION="eastus"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Deploy infrastructure
az deployment group create \
    --resource-group $RESOURCE_GROUP \
    --template-file infrastructure/main.bicep \
    --parameters infrastructure/parameters.json

# Get outputs
az deployment group show \
    --resource-group $RESOURCE_GROUP \
    --name main \
    --query properties.outputs
```

#### 2. Configure kubectl

```bash
AKS_NAME="aks-azure-ipam"
az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_NAME
```

#### 3. Create Service Principal for Azure Access

```bash
# Create service principal with Reader access
SP_OUTPUT=$(az ad sp create-for-rbac \
    --name "sp-azure-ipam-reader" \
    --role Reader \
    --scopes /subscriptions/$(az account show --query id -o tsv))

# Store in Key Vault
KEY_VAULT_NAME=$(az deployment group show \
    --resource-group $RESOURCE_GROUP \
    --name main \
    --query properties.outputs.keyVaultName.value -o tsv)

az keyvault secret set --vault-name $KEY_VAULT_NAME \
    --name "azure-tenant-id" \
    --value $(az account show --query tenantId -o tsv)

az keyvault secret set --vault-name $KEY_VAULT_NAME \
    --name "azure-client-id" \
    --value $(echo $SP_OUTPUT | jq -r '.appId')

az keyvault secret set --vault-name $KEY_VAULT_NAME \
    --name "azure-client-secret" \
    --value $(echo $SP_OUTPUT | jq -r '.password')
```

#### 4. Create App Registration for Frontend

```bash
# Create app registration
FRONTEND_APP_ID=$(az ad app create \
    --display-name "Azure IPAM Frontend" \
    --sign-in-audience AzureADMyOrg \
    --web-redirect-uris "https://your-domain.com/" \
    --enable-id-token-issuance true \
    --query appId -o tsv)

# Store in Key Vault
az keyvault secret set --vault-name $KEY_VAULT_NAME \
    --name "vite-azure-tenant-id" \
    --value $(az account show --query tenantId -o tsv)

az keyvault secret set --vault-name $KEY_VAULT_NAME \
    --name "vite-azure-client-id" \
    --value $FRONTEND_APP_ID
```

#### 5. Build and Push Images

```bash
ACR_NAME=$(az deployment group show \
    --resource-group $RESOURCE_GROUP \
    --name main \
    --query properties.outputs.acrName.value -o tsv)

# Login to ACR
az acr login --name $ACR_NAME

# Build and push
docker build -t $ACR_NAME.azurecr.io/azure-ipam-api:v1.0.0 \
    -f ../docker/Dockerfile.api ../../api
docker push $ACR_NAME.azurecr.io/azure-ipam-api:v1.0.0

docker build -t $ACR_NAME.azurecr.io/azure-ipam-frontend:v1.0.0 \
    -f ../docker/Dockerfile.frontend ../../frontend
docker push $ACR_NAME.azurecr.io/azure-ipam-frontend:v1.0.0
```

#### 6. Update Kustomization

Edit `kustomization.yaml` with your ACR name:

```yaml
images:
  - name: azure-ipam-api
    newName: <your-acr-name>.azurecr.io/azure-ipam-api
    newTag: v1.0.0
```

Edit `secret-provider-class.yaml` with your Key Vault details.

#### 7. Deploy to AKS

```bash
kubectl apply -k .
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            Azure Cloud                                   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Azure Kubernetes Service                       │   │
│  │                                                                   │   │
│  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │   │
│  │   │   Ingress   │───▶│  Frontend   │───▶│        API          │ │   │
│  │   │ Controller  │    │   Pods      │    │       Pods          │ │   │
│  │   └─────────────┘    └─────────────┘    └──────────┬──────────┘ │   │
│  │                              │                      │            │   │
│  │                    ┌─────────▼──────────────────────▼─────────┐ │   │
│  │                    │        Secrets CSI Driver                │ │   │
│  │                    └─────────────────────┬────────────────────┘ │   │
│  └──────────────────────────────────────────┼────────────────────────┘   │
│                                              │                            │
│  ┌────────────────┐  ┌────────────────────┐ │  ┌─────────────────────┐  │
│  │     Azure      │  │    Azure Key       │◀┘  │  Azure Resources    │  │
│  │ Container      │  │      Vault         │     │  (VNets, IPs, etc.) │  │
│  │  Registry      │  └────────────────────┘     └─────────────────────┘  │
│  └────────────────┘                                                       │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

## Key Vault Secrets

Required secrets in Key Vault:

| Secret Name | Description |
|-------------|-------------|
| `azure-tenant-id` | Azure AD tenant ID |
| `azure-client-id` | Service Principal client ID |
| `azure-client-secret` | Service Principal secret |
| `vite-azure-tenant-id` | Tenant ID for frontend auth |
| `vite-azure-client-id` | App Registration client ID |

## Monitoring

### Azure Monitor

The deployment enables Azure Monitor for containers. View metrics in:

1. Azure Portal → AKS → Insights
2. Azure Portal → Log Analytics

### Queries

```kusto
// Pod CPU usage
Perf
| where ObjectName == "K8SContainer" and CounterName == "cpuUsageNanoCores"
| where Namespace == "azure-ipam"
| summarize avg(CounterValue) by bin(TimeGenerated, 5m), ContainerName
| render timechart

// API errors
ContainerLogV2
| where LogMessage contains "error"
| where Namespace == "azure-ipam"
| project TimeGenerated, ContainerName, LogMessage
```

## Scaling

### Manual Scaling

```bash
kubectl scale deployment azure-ipam-api -n azure-ipam --replicas=5
```

### Autoscaler Configuration

Edit `../kubernetes/base/hpa.yaml`:

```yaml
spec:
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## TLS Configuration

### Using Azure Key Vault Certificates

1. Import certificate to Key Vault
2. Reference in ingress:

```yaml
annotations:
  appgw.ingress.kubernetes.io/appgw-ssl-certificate: "your-cert-name"
```

### Using cert-manager

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.3/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
EOF
```

## Cleanup

```bash
# Delete Kubernetes resources
kubectl delete -k .

# Delete Azure resources
az group delete --name rg-azure-ipam --yes --no-wait

# Delete App Registration
az ad app delete --id <frontend-app-id>

# Delete Service Principal
az ad sp delete --id <service-principal-id>
```

## Troubleshooting

### Pods not starting

```bash
# Check pod status
kubectl describe pod -n azure-ipam -l app.kubernetes.io/component=api

# Check secrets provider class
kubectl get secretproviderclass -n azure-ipam
kubectl describe secretproviderclass azure-ipam-keyvault -n azure-ipam
```

### Key Vault access issues

```bash
# Verify managed identity permissions
az role assignment list --scope /subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.KeyVault/vaults/<kv-name>

# Check CSI driver logs
kubectl logs -n kube-system -l app=secrets-store-csi-driver
```

### ACR pull errors

```bash
# Verify AKS can access ACR
az aks check-acr --name aks-azure-ipam --resource-group rg-azure-ipam --acr <acr-name>.azurecr.io
```
