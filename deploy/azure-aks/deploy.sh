#!/bin/bash
# =============================================================================
# Azure IPAM - AKS Deployment Script
# Creates all required Azure resources and deploys to AKS
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# =============================================================================
# Configuration - Update these values
# =============================================================================
RESOURCE_GROUP="${RESOURCE_GROUP:-rg-azure-ipam}"
LOCATION="${LOCATION:-eastus}"
AKS_CLUSTER_NAME="${AKS_CLUSTER_NAME:-aks-azure-ipam}"
ACR_NAME="${ACR_NAME:-acrAzureIpam$(openssl rand -hex 4)}"
KEY_VAULT_NAME="${KEY_VAULT_NAME:-kv-azure-ipam-$(openssl rand -hex 4)}"
APP_NAME="azure-ipam"

# Service Principal for Azure resource access
SP_NAME="${SP_NAME:-sp-azure-ipam-reader}"

# App Registration for frontend authentication
APP_REG_NAME="${APP_REG_NAME:-Azure IPAM Frontend}"

# =============================================================================
# Pre-flight checks
# =============================================================================
print_step "Checking prerequisites..."

if ! command -v az &> /dev/null; then
    print_error "Azure CLI is not installed. Please install it first."
    exit 1
fi

if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed. Please install it first."
    exit 1
fi

if ! az account show &> /dev/null; then
    print_error "Not logged into Azure. Please run 'az login' first."
    exit 1
fi

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

print_success "Prerequisites verified"
echo "  Subscription: $SUBSCRIPTION_ID"
echo "  Tenant: $TENANT_ID"

# =============================================================================
# Create Resource Group
# =============================================================================
print_step "Creating resource group: $RESOURCE_GROUP"

az group create \
    --name "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --output none

print_success "Resource group created"

# =============================================================================
# Create Azure Container Registry
# =============================================================================
print_step "Creating Azure Container Registry: $ACR_NAME"

az acr create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$ACR_NAME" \
    --sku Basic \
    --admin-enabled false \
    --output none

ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)
print_success "ACR created: $ACR_LOGIN_SERVER"

# =============================================================================
# Create AKS Cluster
# =============================================================================
print_step "Creating AKS cluster: $AKS_CLUSTER_NAME (this may take 5-10 minutes)"

az aks create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$AKS_CLUSTER_NAME" \
    --node-count 2 \
    --node-vm-size Standard_DS2_v2 \
    --enable-managed-identity \
    --enable-addons monitoring \
    --attach-acr "$ACR_NAME" \
    --generate-ssh-keys \
    --network-plugin azure \
    --network-policy azure \
    --enable-cluster-autoscaler \
    --min-count 1 \
    --max-count 5 \
    --output none

print_success "AKS cluster created"

# Get AKS credentials
az aks get-credentials \
    --resource-group "$RESOURCE_GROUP" \
    --name "$AKS_CLUSTER_NAME" \
    --overwrite-existing

print_success "kubectl configured for AKS cluster"

# =============================================================================
# Enable Key Vault CSI Driver
# =============================================================================
print_step "Enabling Key Vault CSI driver addon"

az aks enable-addons \
    --resource-group "$RESOURCE_GROUP" \
    --name "$AKS_CLUSTER_NAME" \
    --addons azure-keyvault-secrets-provider \
    --output none

print_success "Key Vault CSI driver enabled"

# =============================================================================
# Create Key Vault
# =============================================================================
print_step "Creating Key Vault: $KEY_VAULT_NAME"

az keyvault create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$KEY_VAULT_NAME" \
    --location "$LOCATION" \
    --enable-rbac-authorization true \
    --output none

KEY_VAULT_ID=$(az keyvault show --name "$KEY_VAULT_NAME" --query id -o tsv)
print_success "Key Vault created"

# =============================================================================
# Create Service Principal for Azure resource access
# =============================================================================
print_step "Creating Service Principal: $SP_NAME"

# Check if SP already exists
SP_APP_ID=$(az ad sp list --display-name "$SP_NAME" --query "[0].appId" -o tsv 2>/dev/null)

if [ -z "$SP_APP_ID" ]; then
    SP_OUTPUT=$(az ad sp create-for-rbac \
        --name "$SP_NAME" \
        --role Reader \
        --scopes "/subscriptions/$SUBSCRIPTION_ID" \
        --output json)
    
    SP_APP_ID=$(echo "$SP_OUTPUT" | jq -r '.appId')
    SP_PASSWORD=$(echo "$SP_OUTPUT" | jq -r '.password')
    
    print_success "Service Principal created"
else
    print_warning "Service Principal already exists, creating new secret"
    SP_PASSWORD=$(az ad sp credential reset --id "$SP_APP_ID" --query password -o tsv)
fi

# Add custom IPAM role permissions (Network Reader permissions)
az role assignment create \
    --assignee "$SP_APP_ID" \
    --role "Network Contributor" \
    --scope "/subscriptions/$SUBSCRIPTION_ID" \
    --output none 2>/dev/null || true

# =============================================================================
# Create App Registration for Frontend
# =============================================================================
print_step "Creating App Registration for frontend authentication"

# Check if app registration exists
FRONTEND_APP_ID=$(az ad app list --display-name "$APP_REG_NAME" --query "[0].appId" -o tsv 2>/dev/null)

if [ -z "$FRONTEND_APP_ID" ]; then
    FRONTEND_APP_ID=$(az ad app create \
        --display-name "$APP_REG_NAME" \
        --sign-in-audience AzureADMyOrg \
        --web-redirect-uris "https://${AKS_CLUSTER_NAME}.${LOCATION}.cloudapp.azure.com/" \
        --enable-id-token-issuance true \
        --query appId -o tsv)
    
    print_success "App Registration created: $FRONTEND_APP_ID"
else
    print_warning "App Registration already exists: $FRONTEND_APP_ID"
fi

# =============================================================================
# Store secrets in Key Vault
# =============================================================================
print_step "Storing secrets in Key Vault"

az keyvault secret set \
    --vault-name "$KEY_VAULT_NAME" \
    --name "azure-tenant-id" \
    --value "$TENANT_ID" \
    --output none

az keyvault secret set \
    --vault-name "$KEY_VAULT_NAME" \
    --name "azure-client-id" \
    --value "$SP_APP_ID" \
    --output none

az keyvault secret set \
    --vault-name "$KEY_VAULT_NAME" \
    --name "azure-client-secret" \
    --value "$SP_PASSWORD" \
    --output none

az keyvault secret set \
    --vault-name "$KEY_VAULT_NAME" \
    --name "vite-azure-tenant-id" \
    --value "$TENANT_ID" \
    --output none

az keyvault secret set \
    --vault-name "$KEY_VAULT_NAME" \
    --name "vite-azure-client-id" \
    --value "$FRONTEND_APP_ID" \
    --output none

print_success "Secrets stored in Key Vault"

# =============================================================================
# Grant AKS access to Key Vault
# =============================================================================
print_step "Granting AKS managed identity access to Key Vault"

# Get the identity for the Key Vault secrets provider
AKS_PRINCIPAL_ID=$(az aks show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$AKS_CLUSTER_NAME" \
    --query "addonProfiles.azureKeyvaultSecretsProvider.identity.clientId" \
    -o tsv)

az role assignment create \
    --assignee "$AKS_PRINCIPAL_ID" \
    --role "Key Vault Secrets User" \
    --scope "$KEY_VAULT_ID" \
    --output none

print_success "Key Vault access configured"

# =============================================================================
# Build and Push Docker Images
# =============================================================================
print_step "Building and pushing Docker images to ACR"

# Get the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Login to ACR
az acr login --name "$ACR_NAME"

# Build and push API image
print_step "Building API image..."
docker build \
    -t "$ACR_LOGIN_SERVER/azure-ipam-api:latest" \
    -f "$PROJECT_ROOT/deploy/docker/Dockerfile.api" \
    "$PROJECT_ROOT"

docker push "$ACR_LOGIN_SERVER/azure-ipam-api:latest"
print_success "API image pushed"

# Build and push Frontend image
print_step "Building Frontend image..."
docker build \
    -t "$ACR_LOGIN_SERVER/azure-ipam-frontend:latest" \
    -f "$PROJECT_ROOT/deploy/docker/Dockerfile.frontend" \
    --build-arg VITE_AZURE_TENANT_ID="$TENANT_ID" \
    --build-arg VITE_AZURE_CLIENT_ID="$FRONTEND_APP_ID" \
    "$PROJECT_ROOT"

docker push "$ACR_LOGIN_SERVER/azure-ipam-frontend:latest"
print_success "Frontend image pushed"

# =============================================================================
# Deploy to AKS
# =============================================================================
print_step "Deploying to AKS"

# Create namespace
kubectl create namespace azure-ipam 2>/dev/null || true

# Apply Kustomize overlay with AKS-specific configuration
cd "$SCRIPT_DIR"

# Update the kustomization with correct values
cat > kustomization.yaml << EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../kubernetes/base

namespace: azure-ipam

patches:
  - path: patches/secret-provider-class.yaml

images:
  - name: azure-ipam-api
    newName: $ACR_LOGIN_SERVER/azure-ipam-api
    newTag: latest
  - name: azure-ipam-frontend
    newName: $ACR_LOGIN_SERVER/azure-ipam-frontend
    newTag: latest
EOF

# Create SecretProviderClass for Key Vault
mkdir -p patches
cat > patches/secret-provider-class.yaml << EOF
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: azure-ipam-secrets-kv
  namespace: azure-ipam
spec:
  provider: azure
  parameters:
    usePodIdentity: "false"
    useVMManagedIdentity: "true"
    userAssignedIdentityID: "$AKS_PRINCIPAL_ID"
    keyvaultName: "$KEY_VAULT_NAME"
    objects: |
      array:
        - |
          objectName: azure-tenant-id
          objectType: secret
        - |
          objectName: azure-client-id
          objectType: secret
        - |
          objectName: azure-client-secret
          objectType: secret
        - |
          objectName: vite-azure-tenant-id
          objectType: secret
        - |
          objectName: vite-azure-client-id
          objectType: secret
    tenantId: "$TENANT_ID"
  secretObjects:
    - secretName: azure-ipam-secrets
      type: Opaque
      data:
        - objectName: azure-tenant-id
          key: AZURE_TENANT_ID
        - objectName: azure-client-id
          key: AZURE_CLIENT_ID
        - objectName: azure-client-secret
          key: AZURE_CLIENT_SECRET
        - objectName: vite-azure-tenant-id
          key: VITE_AZURE_TENANT_ID
        - objectName: vite-azure-client-id
          key: VITE_AZURE_CLIENT_ID
EOF

# Apply the manifests
kubectl apply -k .

print_success "Application deployed to AKS"

# =============================================================================
# Install NGINX Ingress Controller
# =============================================================================
print_step "Installing NGINX Ingress Controller"

kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.4/deploy/static/provider/cloud/deploy.yaml

# Wait for ingress controller to be ready
kubectl wait --namespace ingress-nginx \
    --for=condition=ready pod \
    --selector=app.kubernetes.io/component=controller \
    --timeout=120s

INGRESS_IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

print_success "Ingress controller installed"

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Resources Created:"
echo "  - Resource Group: $RESOURCE_GROUP"
echo "  - AKS Cluster: $AKS_CLUSTER_NAME"
echo "  - Container Registry: $ACR_LOGIN_SERVER"
echo "  - Key Vault: $KEY_VAULT_NAME"
echo "  - Service Principal: $SP_NAME ($SP_APP_ID)"
echo "  - App Registration: $APP_REG_NAME ($FRONTEND_APP_ID)"
echo ""
echo "Access the application:"
echo "  - URL: http://$INGRESS_IP"
echo ""
echo "Update App Registration redirect URI:"
echo "  az ad app update --id $FRONTEND_APP_ID --web-redirect-uris \"http://$INGRESS_IP/\""
echo ""
echo "Monitor the deployment:"
echo "  kubectl get pods -n azure-ipam -w"
echo "  kubectl logs -n azure-ipam -l app.kubernetes.io/component=api -f"
echo ""
