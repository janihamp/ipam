# Azure Permissions for IPAM

This document describes the Azure permissions required to run the IPAM tool, how to create the necessary custom role, and how to configure authentication.

## Table of Contents

- [Required Permissions](#required-permissions)
- [Custom Role Definition](#custom-role-definition)
- [Creating the Custom Role](#creating-the-custom-role)
- [Service Principal Setup](#service-principal-setup)
- [Managed Identity Setup](#managed-identity-setup)
- [Multi-Subscription Access](#multi-subscription-access)

---

## Required Permissions

The IPAM tool requires **read-only** access to the following Azure resources:

| Resource Type | Permission | Purpose |
|--------------|------------|---------|
| Public IP Addresses | `Microsoft.Network/publicIPAddresses/read` | List all public IPs |
| Virtual Networks | `Microsoft.Network/virtualNetworks/read` | List VNets and address spaces |
| Subnets | `Microsoft.Network/virtualNetworks/subnets/read` | List subnet configurations |
| Network Interfaces | `Microsoft.Network/networkInterfaces/read` | Get private IP assignments |
| Load Balancers | `Microsoft.Network/loadBalancers/read` | List LB IP configurations |
| Application Gateways | `Microsoft.Network/applicationGateways/read` | List AppGw IP configurations |
| Private Endpoints | `Microsoft.Network/privateEndpoints/read` | List private endpoint IPs |
| Private Link Services | `Microsoft.Network/privateLinkServices/read` | List private link IPs |
| NAT Gateways | `Microsoft.Network/natGateways/read` | List NAT gateway associations |
| Firewalls | `Microsoft.Network/firewallPolicies/read` | List firewall configurations |
| Bastion Hosts | `Microsoft.Network/bastionHosts/read` | List bastion IP configurations |
| Virtual Machines | `Microsoft.Compute/virtualMachines/read` | Get VM names for IP associations |
| Subscriptions | `Microsoft.Resources/subscriptions/read` | List accessible subscriptions |
| Resource Groups | `Microsoft.Resources/subscriptions/resourceGroups/read` | List resource groups |
| Activity Logs | `Microsoft.Insights/eventtypes/values/read` | Fetch network change events |
| Resource Graph | `Microsoft.ResourceGraph/resources/read` | Cross-subscription queries |

---

## Custom Role Definition

The following custom role provides the minimum required permissions:

```json
{
  "Name": "IPAM Reader",
  "Description": "Read-only access for Azure IP Address Management tool",
  "Actions": [
    "Microsoft.Network/publicIPAddresses/read",
    "Microsoft.Network/virtualNetworks/read",
    "Microsoft.Network/virtualNetworks/subnets/read",
    "Microsoft.Network/networkInterfaces/read",
    "Microsoft.Network/loadBalancers/read",
    "Microsoft.Network/applicationGateways/read",
    "Microsoft.Network/privateLinkServices/read",
    "Microsoft.Network/privateEndpoints/read",
    "Microsoft.Network/natGateways/read",
    "Microsoft.Network/firewallPolicies/read",
    "Microsoft.Network/bastionHosts/read",
    "Microsoft.Compute/virtualMachines/read",
    "Microsoft.Resources/subscriptions/read",
    "Microsoft.Resources/subscriptions/resourceGroups/read",
    "Microsoft.Insights/eventtypes/values/read",
    "Microsoft.ResourceGraph/resources/read"
  ],
  "NotActions": [],
  "DataActions": [],
  "NotDataActions": [],
  "AssignableScopes": [
    "/providers/Microsoft.Management/managementGroups/<YOUR_TENANT_ID>"
  ]
}
```

> **Note**: Replace `<YOUR_TENANT_ID>` with your Azure AD tenant ID. You can also scope to specific subscriptions instead of the entire tenant.

---

## Creating the Custom Role

### Option 1: Azure CLI

```bash
# Get your tenant ID
TENANT_ID=$(az account show --query tenantId -o tsv)

# Create the role definition file
cat > ipam-reader-role.json << EOF
{
  "Name": "IPAM Reader",
  "Description": "Read-only access for Azure IP Address Management tool",
  "Actions": [
    "Microsoft.Network/publicIPAddresses/read",
    "Microsoft.Network/virtualNetworks/read",
    "Microsoft.Network/virtualNetworks/subnets/read",
    "Microsoft.Network/networkInterfaces/read",
    "Microsoft.Network/loadBalancers/read",
    "Microsoft.Network/applicationGateways/read",
    "Microsoft.Network/privateLinkServices/read",
    "Microsoft.Network/privateEndpoints/read",
    "Microsoft.Network/natGateways/read",
    "Microsoft.Network/firewallPolicies/read",
    "Microsoft.Network/bastionHosts/read",
    "Microsoft.Compute/virtualMachines/read",
    "Microsoft.Resources/subscriptions/read",
    "Microsoft.Resources/subscriptions/resourceGroups/read",
    "Microsoft.Insights/eventtypes/values/read",
    "Microsoft.ResourceGraph/resources/read"
  ],
  "NotActions": [],
  "DataActions": [],
  "NotDataActions": [],
  "AssignableScopes": [
    "/providers/Microsoft.Management/managementGroups/$TENANT_ID"
  ]
}
EOF

# Create the role
az role definition create --role-definition @ipam-reader-role.json
```

### Option 2: Azure Portal

1. Go to **Azure Portal** → **Subscriptions** (or Management Groups)
2. Select **Access control (IAM)** → **Roles** → **+ Create**
3. Fill in:
   - **Name**: IPAM Reader
   - **Description**: Read-only access for Azure IP Address Management tool
4. In **Permissions** tab, add the actions listed above
5. In **Assignable scopes**, select your management group or subscription
6. Click **Create**

### Option 3: Bicep/Terraform

See the deployment folders for Infrastructure as Code examples:
- [Azure Static Web Apps](../deploy/azure-swa/)
- [Azure App Service](../deploy/azure-appservice/)
- [Azure Container Apps](../deploy/azure-container-apps/)
- [Azure Kubernetes Service](../deploy/azure-aks/)

---

## Service Principal Setup

For non-interactive authentication (APIs, automation):

### 1. Create Service Principal

```bash
# Create the service principal
az ad sp create-for-rbac --name "ipam-app" --skip-assignment

# Output:
# {
#   "appId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
#   "displayName": "ipam-app",
#   "password": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
#   "tenant": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
# }
```

**⚠️ Save these credentials securely!** The password is only shown once.

### 2. Assign the Custom Role

```bash
# Get your tenant ID for management group scope
TENANT_ID=$(az account show --query tenantId -o tsv)

# Assign role at management group scope (all subscriptions)
az role assignment create \
  --assignee "<APP_ID>" \
  --role "IPAM Reader" \
  --scope "/providers/Microsoft.Management/managementGroups/$TENANT_ID"

# Or assign at subscription scope
az role assignment create \
  --assignee "<APP_ID>" \
  --role "IPAM Reader" \
  --scope "/subscriptions/<SUBSCRIPTION_ID>"
```

### 3. Configure the Application

Set these environment variables in your deployment:

```bash
AZURE_TENANT_ID=<tenant>
AZURE_CLIENT_ID=<appId>
AZURE_CLIENT_SECRET=<password>
```

---

## Managed Identity Setup

For Azure-hosted deployments (recommended for production):

### 1. Enable Managed Identity

**For Azure Functions / App Service:**
```bash
az webapp identity assign --resource-group <RG> --name <APP_NAME>
# or
az functionapp identity assign --resource-group <RG> --name <APP_NAME>
```

**For Container Apps:**
```bash
az containerapp identity assign --resource-group <RG> --name <APP_NAME> --system-assigned
```

**For AKS:**
Use workload identity or pod identity.

### 2. Assign Role to Managed Identity

```bash
# Get the managed identity principal ID
PRINCIPAL_ID=$(az webapp identity show --resource-group <RG> --name <APP_NAME> --query principalId -o tsv)

# Assign the IPAM Reader role
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "IPAM Reader" \
  --scope "/providers/Microsoft.Management/managementGroups/<TENANT_ID>"
```

### 3. Update Application Code

No code changes needed! The Azure SDK's `DefaultAzureCredential` automatically uses managed identity when running in Azure.

---

## Multi-Subscription Access

### Option 1: Management Group Scope (Recommended)

Assign the role at the root management group (tenant level) to access all subscriptions:

```bash
az role assignment create \
  --assignee "<PRINCIPAL_ID>" \
  --role "IPAM Reader" \
  --scope "/providers/Microsoft.Management/managementGroups/<TENANT_ID>"
```

### Option 2: Multiple Subscription Assignments

Assign the role to each subscription individually:

```bash
for SUB_ID in sub1-id sub2-id sub3-id; do
  az role assignment create \
    --assignee "<PRINCIPAL_ID>" \
    --role "IPAM Reader" \
    --scope "/subscriptions/$SUB_ID"
done
```

### Option 3: Custom Management Group

Create a management group containing only the subscriptions you want to monitor:

```bash
# Create management group
az account management-group create --name "IPAM-Scope" --display-name "IPAM Monitored Subscriptions"

# Add subscriptions
az account management-group subscription add --name "IPAM-Scope" --subscription "<SUB_ID>"

# Assign role at this scope
az role assignment create \
  --assignee "<PRINCIPAL_ID>" \
  --role "IPAM Reader" \
  --scope "/providers/Microsoft.Management/managementGroups/IPAM-Scope"
```

---

## Azure AD App Registration (For Frontend Auth)

The frontend uses MSAL.js for user authentication. You need an app registration:

### 1. Create App Registration

```bash
az ad app create --display-name "Azure IPAM Dashboard" \
  --sign-in-audience AzureADMyOrg \
  --web-redirect-uris "http://localhost:3000" "https://your-production-url.com"
```

### 2. Add API Permissions

In Azure Portal → App Registrations → Your App → API Permissions:

1. **Add permission** → **Microsoft APIs** → **Azure Service Management**
2. Select `user_impersonation` (Delegated)
3. Click **Grant admin consent**

### 3. Configure Frontend

Set in your `.env` file:
```bash
VITE_AZURE_CLIENT_ID=<app-registration-client-id>
VITE_AZURE_TENANT_ID=<your-tenant-id>
```

---

## Troubleshooting

### "Authorization failed" or "Access Denied

1. Verify role assignment exists:
   ```bash
   az role assignment list --assignee "<PRINCIPAL_ID>" --all
   ```

2. Check role propagation (can take 5-10 minutes)

3. Verify scope is correct (management group vs subscription)

### "Resource not found" for some resources

- The identity may not have access to all subscriptions
- Check the `AssignableScopes` of the custom role

### Activity Logs not appearing

- Activity Log access requires `Microsoft.Insights/eventtypes/values/read`
- Logs are retained for 90 days by default

---

## Security Best Practices

1. **Use Managed Identity** in production instead of service principal secrets
2. **Scope minimally** - only grant access to necessary subscriptions
3. **Rotate secrets** regularly if using service principals
4. **Enable audit logging** for role assignments
5. **Use Conditional Access** policies for the app registration
6. **Review access** periodically using Access Reviews
