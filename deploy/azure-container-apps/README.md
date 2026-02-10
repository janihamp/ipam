# Azure Container Apps Deployment

This deployment option uses Azure Container Apps for a fully serverless, production-ready deployment of Azure IPAM.

## Prerequisites

### 1. Create an Azure AD App Registration (Required)

The ARM template cannot create App Registrations (Microsoft Graph API limitation). You must create one manually:

1. Go to **Azure Portal** → **Microsoft Entra ID** → **App registrations**
2. Click **New registration**
3. Configure:
   - **Name**: `Azure-IPAM-Frontend`
   - **Supported account types**: `Accounts in this organizational directory only`
   - **Redirect URI**: Leave blank for now (will add after deployment)
4. Click **Register**
5. Copy the **Application (client) ID** - you'll need this for deployment

### 2. Configure API Permissions

1. In your App Registration, go to **API permissions**
2. Add these permissions:
   - `User.Read` (Microsoft Graph - Delegated)
3. Click **Grant admin consent** if required

### 3. Enable ID tokens

1. Go to **Authentication**
2. Under **Implicit grant and hybrid flows**, check:
   - ✅ ID tokens

## Deploy to Azure

Click the button below to deploy Azure IPAM:

[![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fbenarch%2FAzure-IPAM%2Fmain%2Fdeploy%2Fazure-container-apps%2Fazuredeploy.json)

### Deployment Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `location` | Azure region for deployment | Resource group location |
| `appName` | Base name for all resources (3-20 chars) | `azure-ipam` |
| `frontendClientId` | Your App Registration Client ID | **Required** |
| `createCustomRole` | Create IPAM Reader custom role | `true` |
| `repoUrl` | GitHub repository URL | `https://github.com/benarch/Azure-IPAM.git` |
| `repoBranch` | Branch to deploy from | `main` |

## Post-Deployment Steps

### 1. Add Redirect URI to App Registration

After deployment completes:

1. Go to your App Registration in Entra ID
2. Click **Authentication** → **Add a platform** → **Single-page application**
3. Add the Frontend URL from deployment outputs:
   ```
   https://ca-azure-ipam-fe.<hash>.<region>.azurecontainerapps.io
   ```
4. Click **Save**

### 2. Grant IPAM Reader Role (if needed)

If you need to scan additional subscriptions:

```bash
# Get the Managed Identity Principal ID from deployment outputs
MANAGED_IDENTITY_PRINCIPAL_ID="<from-outputs>"

# Assign at subscription level
az role assignment create \
  --assignee $MANAGED_IDENTITY_PRINCIPAL_ID \
  --role "IPAM Reader - <suffix>" \
  --scope "/subscriptions/<target-subscription-id>"
```

## Manual Deployment (Azure CLI)

```bash
# Login to Azure
az login

# Create resource group
az group create --name rg-azure-ipam --location eastus

# Deploy the template
az deployment group create \
  --resource-group rg-azure-ipam \
  --template-file azuredeploy.json \
  --parameters frontendClientId="<your-client-id>"

# Get deployment outputs
az deployment group show \
  --resource-group rg-azure-ipam \
  --name azuredeploy \
  --query properties.outputs
```

## What Gets Deployed

| Resource | Description |
|----------|-------------|
| **User-Assigned Managed Identity** | Used by API for Azure authentication |
| **Azure Container Registry** | Stores container images |
| **Log Analytics Workspace** | Collects logs and metrics |
| **Container Apps Environment** | Hosts the container apps |
| **API Container App** | Azure Functions backend (port 7071) |
| **Frontend Container App** | React dashboard (port 8080) |
| **IPAM Reader Role** | Custom role for read-only access |
| **Role Assignments** | ACR Pull, IPAM Reader |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Azure Container Apps                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐        ┌─────────────────────────┐    │
│  │    Frontend     │        │          API            │    │
│  │  (React + Vite) │───────▶│   (Azure Functions)     │    │
│  │   Port 8080     │        │      Port 7071          │    │
│  └─────────────────┘        └───────────┬─────────────┘    │
│                                         │                   │
│                                         ▼                   │
│                             ┌───────────────────────┐      │
│                             │   Managed Identity    │      │
│                             │   (IPAM Reader Role)  │      │
│                             └───────────┬───────────┘      │
│                                         │                   │
└─────────────────────────────────────────┼───────────────────┘
                                          │
                                          ▼
                              ┌───────────────────────┐
                              │    Azure Resources    │
                              │  (VNets, Subnets,     │
                              │   Public IPs, etc.)   │
                              └───────────────────────┘
```

## Troubleshooting

### Build Failed
Check the deployment script logs:
```bash
az deployment-scripts show-log \
  --resource-group rg-azure-ipam \
  --name buildContainerImages
```

### CORS Errors
The API is configured with CORS allowing all origins. For production, restrict to your frontend domain.

### Authentication Issues
1. Verify the App Registration Client ID is correct
2. Ensure the redirect URI matches exactly
3. Check that ID tokens are enabled

## Costs

Estimated costs (consumption-based):

- **Container Apps**: ~$0.000016/vCPU-second, ~$0.000002/GiB-second
- **Container Registry (Basic)**: ~$5/month
- **Log Analytics**: ~$2.76/GB ingested

For light usage, expect ~$10-20/month.

## Clean Up

To remove all resources:

```bash
az group delete --name rg-azure-ipam --yes --no-wait
```

**Note**: Custom role definitions at subscription level must be deleted separately:
```bash
az role definition delete --name "IPAM Reader - <suffix>"
```
